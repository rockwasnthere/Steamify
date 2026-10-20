// Steamify Event Handlers
window.Steamify = window.Steamify || {};

window.Steamify.events = (() => {
    const { MATCH_DISPLAY_LIMIT, MATCH_FETCH_LIMIT, PARTY_COLORS, MY_PARTY_COLOR } = window.Steamify.constants;
    const { calcAvg, sortByKills, filterMaps, formatMatchDate, downscaleImage } = window.Steamify.utils;
    const state = window.Steamify.state;
    const { faceitApi, faceitInternalApi, fetchMatchData, fetchPartyData, bulkGetCached } = window.Steamify.api;
    const templates = window.Steamify.templates;

    // Map a FACEIT rating to its tier color class (thresholds + colors sampled from faceit.com)
    const ratingClass = (r) =>
        r < 0.90 ? 'faceit_rating_red'
            : r < 1.30 ? 'faceit_rating_neutral'
                : r < 1.80 ? 'faceit_rating_green'
                    : 'faceit_rating_gold';

    // Load per-match ELO change + FACEIT rating from the match-rounds stats API.
    // Replaces the old stats/v1/stats/time call: match-rounds is a superset — same
    // elo_delta data PLUS faceit_rating — on the same host via the same proxy, so no
    // extra request. Matches are keyed by FACEIT match id (robust to ordering/gaps).
    const loadEloHistory = async () => {
        try {
            const data = await faceitInternalApi(
                `https://api.faceit.com/statistics/v1/cs2/players/${state.faceitPlayerID}/match-rounds?limit=${MATCH_FETCH_LIMIT}`
            );
            const rounds = data?.payload?.cs2?.match_rounds;
            if (!rounds?.length) return;

            // match_id -> { eloAfter, delta, rating }
            const byId = {};
            rounds.forEach(r => {
                const delta = parseInt(r.elo_delta);
                byId[r.match_id] = {
                    eloAfter: (parseInt(r.elo_before) || 0) + (isNaN(delta) ? 0 : delta),
                    delta,
                    rating: parseFloat(r.faceit_rating)
                };
            });

            const ratings = [];
            let totalDelta = 0;
            document.querySelectorAll('.faceit_match_elo[data-match-faceit-id]').forEach(eloEl => {
                const info = byId[eloEl.dataset.matchFaceitId];
                if (!info) return;
                const card = eloEl.closest('.faceit_match_card');

                // ELO change (unchanged behavior)
                if (!isNaN(info.delta)) {
                    const sign = info.delta > 0 ? '+' : '';
                    const cls = info.delta >= 0 ? 'stat_increase' : 'stat_decrease';
                    eloEl.innerHTML = `<span class="faceit_elo_val">${info.eloAfter}</span><span class="${cls}">${sign}${info.delta}</span>`;
                    totalDelta += info.delta;
                }

                // FACEIT rating (new)
                if (Number.isFinite(info.rating)) {
                    ratings.push(info.rating);
                    const rCls = ratingClass(info.rating);
                    const rEl = card?.querySelector('.faceit_match_rating');
                    if (rEl) rEl.innerHTML = `<span class="${rCls}">${info.rating.toFixed(2)}</span>`;
                }
            });

            // Total ELO swing on the load header (unchanged)
            const loadEl = document.querySelector('.faceit_stats_load');
            if (loadEl) {
                const sign = totalDelta > 0 ? '+' : '';
                const cls = totalDelta >= 0 ? 'stat_increase' : 'stat_decrease';
                loadEl.insertAdjacentHTML('beforeend', ` <span class="faceit_elo_total ${cls}">(${sign}${totalDelta} ELO)</span>`);
            }

            // Last-30 average rating in the showcase header
            if (ratings.length) {
                const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
                const avgEl = document.querySelector('.faceit_avg_rating');
                if (avgEl) {
                    avgEl.textContent = avg.toFixed(2);
                    avgEl.classList.add(ratingClass(avg));
                }
            }
        } catch (e) { /* match-rounds stats are optional */ }
    };

    // Aggregate party mate stats across matches and render squad summary
    const loadPartyStats = async () => {
        const limit = Math.min(state.matchesList.length, MATCH_DISPLAY_LIMIT);

        const nicknameMap = {};
        for (let i = 0; i < limit; i++) {
            const teams = state.matchList[i]?.match?.teams?.[0];
            if (!teams) continue;
            [0, 1].forEach(t => teams[t]?.players?.forEach(p => { nicknameMap[p.player_id] = p.nickname; }));
        }

        const responses = await Promise.allSettled(
            Array.from({ length: limit }, (_, i) => {
                const id = state.matchList[i]?.match?.id;
                return id ? fetchPartyData(id) : Promise.resolve(null);
            })
        );

        const squadStats = {};
        responses.forEach((result, i) => {
            if (result.status !== 'fulfilled' || !result.value) return;
            const parties = result.value?.payload?.parties;
            if (!parties?.length) return;
            const myParty = parties.find(p => p.users.includes(state.faceitPlayerID) && p.users.length > 1);
            if (!myParty) return;
            const isWin = state.matchList[i]?.match?.winner === 1;
            myParty.users.forEach(playerId => {
                if (playerId === state.faceitPlayerID) return;
                if (!squadStats[playerId]) squadStats[playerId] = { nickname: nicknameMap[playerId] || '?', games: 0, wins: 0 };
                squadStats[playerId].games++;
                if (isWin) squadStats[playerId].wins++;
            });
        });

        const sorted = Object.entries(squadStats).sort((a, b) => b[1].games - a[1].games).slice(0, 5);
        if (!sorted.length) return;

        const playerData = await Promise.allSettled(sorted.map(([id]) =>
            faceitApi(`/players/${id}`).then(data => ({
                elo: data?.games?.cs2?.faceit_elo ?? null,
                level: data?.games?.cs2?.skill_level ?? null
            })).catch(() => ({ elo: null, level: null }))
        ));

        const items = sorted.map(([, s], idx) => {
            const wr = Math.round((s.wins / s.games) * 100);
            const pd = playerData[idx].status === 'fulfilled' ? playerData[idx].value : { elo: null, level: null };
            return templates.squadPlayerLayout(s.nickname, pd.level, pd.elo, s.games, wr);
        }).join('');

        const statsContent = document.querySelector('.faceit_stats_content');
        if (statsContent) {
            statsContent.insertAdjacentHTML('afterbegin', templates.squadSectionLayout(items));
        }
    };

    // Get last 30 games
    const getLastGames = async () => {
        const limit = Math.min(state.matchesList.length, MATCH_DISPLAY_LIMIT);
        const matches = state.matchesList.slice(0, limit);
        const loadEl = document.querySelector('.faceit_stats_load');
        let loadingCounter = 0;

        // Process a single match's data (stats + metadata)
        const processMatch = (i, matchEntry, statsData, metaData) => {
            // Process metadata
            if (metaData) {
                matchEntry.finished_at = formatMatchDate(metaData.finished_at);
                try { matchEntry.demo_url = metaData.demo_url[0]; } catch (e) { matchEntry.demo_url = 'empty'; }
            } else {
                matchEntry.finished_at = '---';
                matchEntry.demo_url = 'empty';
            }

            // Process stats
            if (!statsData) {
                matchEntry.noStats = 1;
                return;
            }
            if (statsData) {
                for (const match of statsData.rounds) {
                    const roundStats = match.round_stats;
                    const { Map: map, Score: score } = roundStats;
                    let playersList = [];

                    matchEntry.match.teams = [match.teams];

                    for (const team of match.teams) {
                        const { team_id, team_stats: { Team: team_name } } = team;

                        for (const player of team.players) {
                            const { player_id, player_stats } = player;
                            playersList.push(player_id);

                            if (player_id === state.faceitPlayerID && matchEntry.match.id === matches[i].match_id) {
                                matchEntry.team_name = team_name;
                                matchEntry.team_id = team_id;
                                matchEntry.score = score;
                                matchEntry.map = map;
                                matchEntry.faceit_url = `https://www.faceit.com/en/cs2/room/${matches[i].match_id}`;
                                matchEntry.assists = player_stats['Assists'];
                                matchEntry.deaths = player_stats['Deaths'];
                                matchEntry.kills = player_stats['Kills'];
                                matchEntry.kda = player_stats['K/D Ratio'];
                                matchEntry.kr = player_stats['K/R Ratio'];
                                matchEntry.hs = player_stats['Headshots'];
                                matchEntry.adr = player_stats['ADR'];
                                matchEntry.hs_percent = player_stats['Headshots %'];
                                matchEntry.mvps = player_stats['MVPs'];
                                matchEntry.tripple = player_stats['Triple Kills'];
                                matchEntry.quadro = player_stats['Quadro Kills'];
                                matchEntry.penta = player_stats['Penta Kills'];
                            }
                        }
                    }
                    if (!playersList.includes(state.faceitPlayerID)) matchEntry.leaver = 1;
                }
            }
        };

        // Fast path: check if all matches are already cached (single storage read)
        const matchIds = matches.map(m => m.match_id);
        const cached = await bulkGetCached(matchIds);
        const allCached = cached.every(c => c !== null);

        const storeMatchResult = (i, result) => {
            const matchEntry = state.matchList[i];
            processMatch(i, matchEntry, result.stats, result.meta);
            matchEntry.afk = result.afk || [];
            matchEntry.leavers = result.leavers || [];
            matchEntry.voteKicked = result.voteKicked || [];
        };

        if (allCached) {
            // Instant — process all from cache, no network requests
            cached.forEach((result, i) => storeMatchResult(i, result));
        } else {
            // Fetch with live progress counter
            await Promise.all(matches.map((m, i) => {
                if (cached[i]) {
                    storeMatchResult(i, cached[i]);
                    loadingCounter++;
                    if (loadEl) loadEl.textContent = `LOADING... [${loadingCounter - 1}]`;
                    return Promise.resolve();
                }
                return fetchMatchData(m.match_id).then(result => {
                    storeMatchResult(i, result);
                    loadingCounter++;
                    if (loadEl) loadEl.textContent = `LOADING... [${loadingCounter - 1}]`;
                });
            }));
        }

        // Update header
        if (loadEl) loadEl.textContent = `LAST ${limit} GAMES`;

        // Render all match cards
        const HS = [], KD = [], Kills = [];
        const matchesList = document.querySelector('.faceit_matches_list');

        for (let i = 0; i < limit; i++) {
            const match = state.matchList[i];

            // No stats available (tournament forfeit, AFK, etc.)
            if (match.noStats) {
                const pid = state.faceitPlayerID;
                const playerAfk = (match.afk || []).includes(pid);
                const playerLeft = (match.leavers || []).includes(pid);
                const playerKicked = (match.voteKicked || []).includes(pid);
                const isTournament = match.match.competition_type !== 'matchmaking';

                let label, badgeClass;
                if (playerAfk) { label = 'AFK'; badgeClass = 'afk'; }
                else if (playerLeft) { label = 'LEFT'; badgeClass = 'leaver'; }
                else if (playerKicked) { label = 'KICKED'; badgeClass = 'kicked'; }
                else if (isTournament) { label = 'FORFEIT'; badgeClass = null; }
                else { label = 'NO STATS'; badgeClass = null; }

                if (badgeClass) {
                    matchesList.insertAdjacentHTML('beforeend', templates.abandonedCardLayout(i, match.match.id, label, badgeClass));
                } else {
                    const tooltip = match.match.competition_name || '';
                    matchesList.insertAdjacentHTML('beforeend', templates.noStatsCardLayout(i, match.match.id, match.match.winner, label, tooltip));
                }
                continue;
            }

            if (match.match.teams[0] === undefined) continue;

            const teamA = match.match.teams[0][0];
            const teamB = match.match.teams[0][1];
            const isWinner = match.match.winner;
            const winnerID = match.match.winner_id;

            if (!match.leaver) {
                KD.push(parseFloat(match.kda));
                HS.push(parseFloat(match.hs_percent));
                Kills.push(parseFloat(match.kills));
            }

            // Check if viewed player was AFK/leaver/kicked in this match
            const pid = state.faceitPlayerID;
            const playerAfk = (match.afk || []).includes(pid);
            const playerLeft = (match.leavers || []).includes(pid);
            const playerKicked = (match.voteKicked || []).includes(pid);

            if (match.leaver || playerAfk || playerLeft || playerKicked) {
                const label = playerAfk ? 'AFK' : playerKicked ? 'KICKED' : playerLeft ? 'LEFT' : 'ABANDONED';
                const badgeClass = playerAfk ? 'afk' : playerKicked ? 'kicked' : playerLeft ? 'leaver' : 'leaver';
                matchesList.insertAdjacentHTML('beforeend', templates.abandonedCardLayout(i, match.match.id, label, badgeClass));
            } else {
                matchesList.insertAdjacentHTML('beforeend', templates.matchCardLayout(i, match, isWinner, winnerID, teamA, teamB));

                // Add player rows
                const teamAPlayers = [...teamA.players].sort(sortByKills);
                const teamBPlayers = [...teamB.players].sort(sortByKills);

                const teamAContainer = document.querySelector(`[data-match-team="${i}_A"]`);
                const teamBContainer = document.querySelector(`[data-match-team="${i}_B"]`);

                if (teamAContainer) {
                    teamAPlayers.forEach(p => teamAContainer.insertAdjacentHTML('afterbegin', templates.playersLayout(i, 'A', p)));
                }
                if (teamBContainer) {
                    teamBPlayers.forEach(p => teamBContainer.insertAdjacentHTML('afterbegin', templates.playersLayout(i, 'B', p)));
                }

                // Apply AFK/leaver/kicked badges to player rows
                const details = document.querySelector(`.faceit_match_details[data-id="${i}"]`);
                if (details) {
                    const applyBadge = (playerIds, badgeClass, badgeText) => {
                        playerIds.forEach(pid => {
                            const row = details.querySelector(`a[data-player_id="${pid}"]`)?.closest('.faceit_player_row');
                            if (row) {
                                row.classList.add(badgeClass);
                                row.querySelector('.faceit_player_name')?.insertAdjacentHTML('beforeend',
                                    `<span class="faceit_player_badge ${badgeClass}_badge">${badgeText}</span>`);
                            }
                        });
                    };
                    applyBadge(match.afk || [], 'faceit_player_afk', 'AFK');
                    applyBadge(match.leavers || [], 'faceit_player_leaver', 'LEFT');
                    applyBadge(match.voteKicked || [], 'faceit_player_kicked', 'KICKED');
                }
            }
        }

        // Update averages
        if (HS.length > 0) {
            const lastHSEl = document.querySelector('.lastHS');
            const lastKDEl = document.querySelector('.lastKD');
            const lastKillsEl = document.querySelector('.lastKills');
            if (lastHSEl) lastHSEl.textContent = calcAvg(HS).toFixed(0);
            if (lastKDEl) lastKDEl.textContent = calcAvg(KD).toFixed(2);
            if (lastKillsEl) lastKillsEl.textContent = Math.round(calcAvg(Kills));
        }

        loadEloHistory();
        loadPartyStats().then(() => {
            // Add bottom spacing only if no squad section was added
            if (!document.querySelector('.faceit_squad_section') && loadEl) {
                loadEl.style.marginBottom = '12px';
            }
        });
    };

    // Open player Steam profile via FACEIT API
    const getSteamId64 = async (playerEl) => {
        const playerId = playerEl.dataset.player_id;
        playerEl.style.cursor = 'wait';
        try {
            const data = await faceitApi(`/players/${playerId}`);
            playerEl.style.cursor = 'pointer';
            window.open(`https://steamcommunity.com/profiles/${data.steam_id_64}`, '_blank', 'noopener,noreferrer');
        } catch (e) {
            playerEl.style.cursor = 'pointer';
        }
    };

    // Show sponsor banner
    const showSponsor = async () => {
        const { steamify_sponsor_hidden } = await chrome.storage.local.get('steamify_sponsor_hidden');
        // Also check legacy localStorage for users who hid before the migration
        if (steamify_sponsor_hidden || localStorage.getItem('steamify_sponsor_hidden') === '1') return;

        const targets = document.querySelectorAll('.not_found, .faceit_content');
        targets.forEach(el => el.insertAdjacentHTML('afterbegin', templates.sponsorLayout()));

        const sponsorBtn = document.querySelector('.why-sponsor-button');
        const popup = document.getElementById('sponsorExplainerPopup');
        const closeBtn = document.querySelector('.popup-close');
        const hideBtn = document.querySelector('.sponsor-hide-button');
        const popupHideBtn = document.querySelector('.popup-hide-button');

        const hideSponsor = () => {
            chrome.storage.local.set({ steamify_sponsor_hidden: true });
            document.querySelector('.sponsor-container-faceit')?.remove();
            if (popup) popup.style.display = 'none';
        };

        sponsorBtn?.addEventListener('click', () => { if (popup) popup.style.display = 'flex'; });
        closeBtn?.addEventListener('click', () => { if (popup) popup.style.display = 'none'; });
        popup?.addEventListener('click', (e) => { if (e.target === popup) popup.style.display = 'none'; });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && popup?.style.display === 'flex') popup.style.display = 'none';
        });
        hideBtn?.addEventListener('click', hideSponsor);
        popupHideBtn?.addEventListener('click', hideSponsor);
    };

    // Apply the current banner background choice to the live DOM
    const applyBg = () => {
        const banner = document.querySelector('.faceit_level_banner');
        if (!banner) return;
        const mode = state.bgMode;
        banner.classList.toggle('faceit_bg_none', mode === 'none');
        if (mode === 'none') {
            banner.style.backgroundImage = 'none';
        } else if (mode === 'custom' && state.bgImage) {
            banner.style.backgroundImage = `url('${state.bgImage}')`;
        } else {
            banner.style.backgroundImage = state.faceitCover ? `url("${state.faceitCover}")` : 'none';
        }
        document.querySelectorAll('.faceit_bg_opt[data-bg]').forEach(opt => {
            const radio = opt.querySelector('input');
            if (radio) radio.checked = opt.dataset.bg === mode;
        });
    };

    // Hide the background settings menu
    const closeBgMenu = () => {
        const m = document.querySelector('.faceit_bg_menu');
        if (m) m.style.display = 'none';
    };

    // Register all delegated event handlers
    const registerEventHandlers = () => {
        // Load / toggle last 30 games
        document.addEventListener('click', (e) => {
            if (e.target.closest('.faceit_stats_load')) {
                if (!document.querySelector('.faceit_match_card')) {
                    getLastGames();
                } else {
                    const isHiding = document.querySelector('.faceit_matches_list')?.style.display !== 'none';
                    document.querySelectorAll('.faceit_matches_list, .faceit_squad_section').forEach(el => {
                        el.style.display = isHiding ? 'none' : '';
                    });
                    const loadEl = document.querySelector('.faceit_stats_load');
                    const hasSquads = !!document.querySelector('.faceit_squad_section');
                    if (loadEl) loadEl.style.marginBottom = (!isHiding && !hasSquads) ? '12px' : '';
                }
            }
        });

        // Expand match details
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.faceit_match_card:not(.faceit_stats_leaver)');
            if (!card) return;
            if (e.target.closest('a')) return;

            const matchID = card.dataset.matchId;
            const arrow = card.querySelector('.faceit_match_expand');
            const details = document.querySelector(`.faceit_match_details[data-id="${matchID}"]`);
            if (!arrow || !details) return;

            const isVisible = details.style.display !== 'none';
            arrow.textContent = isVisible ? '\u25BE' : '\u25B4';
            details.style.display = isVisible ? 'none' : '';

            // Load party data once on first expand
            if (!isVisible && !details.dataset.partiesLoaded) {
                details.dataset.partiesLoaded = 'true';
                const faceitMatchId = state.matchList[matchID]?.match?.id;
                if (!faceitMatchId) return;

                fetchPartyData(faceitMatchId).then(data => {
                    const parties = data?.payload?.parties;
                    if (!parties?.length) return;
                    let otherIdx = 0;
                    parties.forEach(party => {
                        if (party.users.length < 2) return;
                        const color = party.partyId === parties.find(p => p.users.includes(state.faceitPlayerID))?.partyId
                            ? MY_PARTY_COLOR
                            : PARTY_COLORS[otherIdx++ % PARTY_COLORS.length];
                        party.users.forEach(playerId => {
                            const row = details.querySelector(`a[data-player_id="${playerId}"]`)?.closest('.faceit_player_row');
                            if (!row) return;
                            row.classList.add('faceit_player_party');
                            row.style.setProperty('--pcolor', color);
                            row.dataset.partyColor = color;
                        });
                    });
                }).catch(() => {});
            }
        });

        // Party hover highlighting
        document.addEventListener('mouseenter', (e) => {
            if (!e.target.closest) return;
            const partyEl = e.target.closest('.faceit_player_party');
            if (!partyEl) return;
            const color = partyEl.dataset.partyColor;
            const details = partyEl.closest('.faceit_match_details');
            if (!details) return;
            details.querySelectorAll(`.faceit_player_party[data-party-color="${color}"]`).forEach(el => el.classList.add('faceit_party_hover'));
        }, true);

        document.addEventListener('mouseleave', (e) => {
            if (!e.target.closest) return;
            const partyEl = e.target.closest('.faceit_player_party');
            if (!partyEl) return;
            const color = partyEl.dataset.partyColor;
            const details = partyEl.closest('.faceit_match_details');
            if (!details) return;
            details.querySelectorAll(`.faceit_player_party[data-party-color="${color}"]`).forEach(el => el.classList.remove('faceit_party_hover'));
        }, true);

        // Open player Steam profile
        document.addEventListener('click', (e) => {
            const link = e.target.closest('.text-primary');
            if (link) getSteamId64(link);
        });

        // Toggle maps dropdown
        document.addEventListener('click', (e) => {
            const cog = e.target.closest('.faceit_maps_cog');
            if (cog) {
                e.stopPropagation();
                const dropdown = document.querySelector('.faceit_maps_dropdown');
                if (!dropdown) return;
                if (dropdown.style.display === 'none') {
                    const rect = cog.getBoundingClientRect();
                    dropdown.style.top = (rect.bottom + 4) + 'px';
                    dropdown.style.left = rect.left + 'px';
                    dropdown.style.display = '';
                } else {
                    dropdown.style.display = 'none';
                }
                return;
            }

            // Close dropdown when clicking outside
            if (!e.target.closest('.faceit_maps_header') && !e.target.closest('.faceit_maps_dropdown')) {
                const dropdown = document.querySelector('.faceit_maps_dropdown');
                if (dropdown) dropdown.style.display = 'none';
            }
        });

        // Map filter toggle
        document.addEventListener('change', (e) => {
            const input = e.target.closest('.faceit_maps_option input');
            if (!input) return;
            const map = input.value;
            if (input.checked) {
                if (!state.mapsVeto.includes(map)) state.mapsVeto.push(map);
            } else {
                const idx = state.mapsVeto.indexOf(map);
                if (idx > -1) state.mapsVeto.splice(idx, 1);
            }
            chrome.storage.local.set({ steamify_maps_veto: state.mapsVeto });
            // Re-render maps
            const mapsContainer = document.querySelector('.faceit_maps');
            if (mapsContainer && state.faceitSegments) {
                mapsContainer.innerHTML = '';
                const filtered = state.faceitSegments.filter(s => filterMaps(s, state.mapsVeto));
                filtered.forEach(map => mapsContainer.insertAdjacentHTML('beforeend', templates.mapsLayout(map)));
            }
        });

        // Toggle banner background settings menu (+ close on outside click)
        document.addEventListener('click', (e) => {
            const cog = e.target.closest('.faceit_bg_cog');
            const menu = document.querySelector('.faceit_bg_menu');
            if (!menu) return;
            if (cog) {
                e.stopPropagation();
                if (menu.style.display === 'none') {
                    menu.style.display = '';
                    const rect = cog.getBoundingClientRect();
                    menu.style.top = (rect.bottom + 4) + 'px';
                    menu.style.left = Math.max(8, rect.right - menu.offsetWidth) + 'px';
                } else {
                    menu.style.display = 'none';
                }
                return;
            }
            if (!e.target.closest('.faceit_bg_settings')) menu.style.display = 'none';
        });

        // Select banner background mode (FACEIT default / None — Custom is handled on file change)
        document.addEventListener('click', (e) => {
            const opt = e.target.closest('.faceit_bg_opt[data-bg]');
            if (!opt) return;
            const mode = opt.dataset.bg;
            if (mode === 'custom') {
                document.querySelector('.faceit_bg_file')?.click(); // opens the file picker; applied once a file is chosen
                return;
            }
            state.bgMode = mode;
            chrome.storage.local.set({ steamify_bg_mode: mode });
            applyBg();
            closeBgMenu();
        });

        // Custom background chosen from disk — downscale, persist, and apply
        document.addEventListener('change', (e) => {
            const input = e.target.closest('.faceit_bg_file');
            if (!input || !input.files || !input.files[0]) return;
            downscaleImage(input.files[0]).then(dataUrl => {
                state.bgImage = dataUrl;
                state.bgMode = 'custom';
                chrome.storage.local.set({ steamify_bg_image: dataUrl, steamify_bg_mode: 'custom' }, () => {
                    if (chrome.runtime.lastError) {
                        // Too large to persist — still applied for this session
                        console.warn('Steamify: could not save background —', chrome.runtime.lastError.message);
                    }
                });
                applyBg();
                closeBgMenu();
            }).catch(() => {});
            input.value = ''; // allow re-selecting the same file later
        });

        // Details button — toggle stats visibility
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.faceit_details_btn');
            if (!btn) return;
            const showcase = document.querySelector('.showcase_faceit');
            const visible = showcase && getComputedStyle(showcase).display !== 'none';
            document.querySelectorAll('.showcase_faceit, .game_info_stats, .faceit_stats_content').forEach(el => {
                el.style.display = visible ? 'none' : '';
            });
            const banner = document.querySelector('.faceit_level_banner');
            const wrap = document.querySelector('.showcase_faceit_content');
            if (banner) banner.classList.toggle('faceit_stats_collapsed', visible);
            if (wrap) wrap.classList.toggle('faceit_stats_collapsed_wrap', visible);
            btn.textContent = visible ? '\u25B4 Stats' : '\u25BE Stats';
        });

        // Compare button
        document.addEventListener('click', async (e) => {
            const btn = e.target.closest('.faceit_compare_btn:not(.faceit_details_btn)');
            if (!btn) return;
            if (document.querySelector('.faceit_compare_overlay')) return;

            const showModal = (myProfile, myElo, myLevel, myStats) => {
                document.body.insertAdjacentHTML('beforeend', templates.compareModalLayout(
                    state.viewedPlayerStore.data, state.viewedPlayerStore.elo, state.viewedPlayerStore.level, state.viewedPlayerStore.lifetime,
                    myProfile, myElo, myLevel, myStats.lifetime,
                    state.viewedPlayerStore.segments, myStats.segments
                ));
            };

            if (state.myCompareCache) {
                const { myProfile, myElo, myLevel, myStats } = state.myCompareCache;
                showModal(myProfile, myElo, myLevel, myStats);
                return;
            }

            btn.textContent = 'Loading...';
            try {
                const myProfile = await faceitApi(`/players?game=cs2&game_player_id=${state.comparedSteamID}`);
                const myStats = await faceitApi(`/players/${myProfile.player_id}/stats/cs2`);
                const myElo = myProfile.games?.cs2?.faceit_elo ?? '?';
                const myLevel = myProfile.games?.cs2?.skill_level ?? 1;
                state.myCompareCache = { myProfile, myElo, myLevel, myStats };
                showModal(myProfile, myElo, myLevel, myStats);
            } catch (e) {
                btn.textContent = 'No Faceit account';
                setTimeout(() => btn.textContent = '\u2696 Compare', 2000);
                return;
            }
            btn.textContent = '\u2696 Compare';
        });

        // Close compare modal
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('faceit_compare_overlay') || e.target.classList.contains('faceit_cmp_close')) {
                document.querySelector('.faceit_compare_overlay')?.remove();
            }
        });

        // Close compare modal on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelector('.faceit_compare_overlay')?.remove();
            }
        });
    };

    return { registerEventHandlers, getLastGames, loadEloHistory, loadPartyStats, showSponsor };
})();
