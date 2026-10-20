// Steamify — Entry Point
(async function initSteamify() {
    const { MATCH_FETCH_LIMIT, MATCH_DISPLAY_LIMIT, BAN_STATUSES } = window.Steamify.constants;
    const { parseSteamID, getLoggedInSteamID, formatRegisteredDate, filterMaps, calcAvg } = window.Steamify.utils;
    const state = window.Steamify.state;
    const { faceitApi, bulkGetCached } = window.Steamify.api;
    const templates = window.Steamify.templates;
    const { registerEventHandlers, showSponsor } = window.Steamify.events;

    // Load saved map filter + banner background override
    const stored = await chrome.storage.local.get(['steamify_maps_veto', 'steamify_bg_mode', 'steamify_bg_image']);
    if (stored.steamify_maps_veto) {
        state.mapsVeto.length = 0;
        stored.steamify_maps_veto.forEach(m => state.mapsVeto.push(m));
    }
    if (stored.steamify_bg_mode) state.bgMode = stored.steamify_bg_mode;
    if (stored.steamify_bg_image) state.bgImage = stored.steamify_bg_image;

    // Append sponsor popup to body (always, regardless of guard — matches original behavior)
    document.body.insertAdjacentHTML('beforeend', templates.sponsorPopupLayout());

    // Guard against double-init
    if (document.querySelector('.faceit_maps')) return;

    // Parse Steam ID from page
    const steamID = parseSteamID();
    if (!steamID) return;

    // Show loading indicator
    const sponsorHidden = (await chrome.storage.local.get('steamify_sponsor_hidden')).steamify_sponsor_hidden
        || localStorage.getItem('steamify_sponsor_hidden') === '1';
    const profileContent = document.querySelector('.profile_content');
    if (!profileContent) return;

    const loaderHtml = templates.loadingElement();
    profileContent.insertAdjacentHTML('afterbegin', loaderHtml);
    const loader = document.querySelector('.steamify-loader-wrap');
    if (loader) loader.style.height = sponsorHidden ? '61px' : '236px';

    // Fetch player profile
    let playerProfile;
    try {
        playerProfile = await faceitApi(`/players?game=cs2&game_player_id=${steamID}`);
    } catch (e) {
        if (e.status === 404) {
            if (loader) loader.style.display = 'none';
            profileContent.insertAdjacentHTML('afterbegin', templates.notFoundElement());
            const row = document.querySelector('.showcase_stats_row');
            if (row) { row.style.display = 'flex'; row.style.justifyContent = 'center'; }
            showSponsor();
            return;
        }
        throw e;
    }

    state.faceitPlayerID = playerProfile.player_id;

    // Fetch bans in parallel (awaited later before rendering ban bar)
    const banPromise = faceitApi(`/players/${state.faceitPlayerID}/bans`)
        .then(data => data.items[0]?.reason || '')
        .catch(() => '');

    const verified = playerProfile.verified;
    const registeredDate = formatRegisteredDate(playerProfile.activated_at);

    // Get match history
    let historyData;
    try {
        historyData = await faceitApi(`/players/${state.faceitPlayerID}/history?from=0&game=cs2&limit=${MATCH_FETCH_LIMIT}`);
    } catch (e) {
        if (loader) loader.style.display = 'none';
        profileContent.insertAdjacentHTML('afterbegin', templates.matchesNotFoundElement());
        return;
    }

    state.matchesList = historyData.items;

    if (state.matchesList.length === 0) {
        if (loader) loader.style.display = 'none';
        profileContent.insertAdjacentHTML('afterbegin', templates.matchesNotFoundElement());
        const row = document.querySelector('.showcase_stats_row');
        if (row) { row.style.display = 'flex'; row.style.justifyContent = 'center'; }
        return;
    }

    // Setup private profiles
    const privateProfile = document.querySelector('.private_profile');
    if (privateProfile) {
        privateProfile.classList.add('DefaultTheme');
        const pc = privateProfile.querySelector('.profile_content');
        if (pc) pc.style.paddingBottom = '8px';
    }
    profileContent.style.minHeight = '434px';
    profileContent.insertAdjacentHTML('afterbegin', '<div class="showcase_content_bg showcase_stats_row faceit_content" style="display:none"></div>');
    const faceitContent = document.querySelector('.faceit_content');
    faceitContent.insertAdjacentHTML('beforeend', templates.statsLayout());

    // Process match history — calculate wins/losses
    let win = 0, lose = 0;
    const displayLimit = Math.min(state.matchesList.length, MATCH_DISPLAY_LIMIT);

    state.matchesList.forEach((match, matchID) => {
        state.matchList.push({
            match: {
                id: match.match_id,
                teams: {},
                competition_type: match.competition_type || 'matchmaking',
                competition_name: match.competition_name || ''
            }
        });

        if (matchID >= MATCH_DISPLAY_LIMIT) return;

        let found = false;
        for (const faction of Object.keys(match.teams)) {
            for (const player of match.teams[faction].players) {
                if (player.player_id === state.faceitPlayerID) {
                    const matchDetails = state.matchList[matchID].match;
                    if (match.results.winner === faction) {
                        win++;
                        matchDetails.winner = 1;
                    } else {
                        lose++;
                        matchDetails.winner = 0;
                    }
                    matchDetails.winner_id = match.results.winner;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }
    });

    // Calculate current streak
    let currentStreak = 0;
    let isWinStreak = true;
    if (state.matchList.length > 0 && state.matchList[0].match.winner !== undefined) {
        isWinStreak = state.matchList[0].match.winner === 1;
        for (let i = 0; i < state.matchList.length; i++) {
            if (state.matchList[i].match.winner === undefined) break;
            if ((state.matchList[i].match.winner === 1) === isWinStreak) {
                currentStreak++;
            } else {
                break;
            }
        }
    }

    if (state.matchesList.length < state.matchesLimit) state.matchesLimit = state.matchesList.length;

    // Check if player has CS2 on FACEIT
    if (!playerProfile.games['cs2']) {
        if (loader) loader.style.display = 'none';
        profileContent.insertAdjacentHTML('afterbegin', templates.noCsElement());
        return;
    }

    const profileElo = playerProfile.games.cs2.faceit_elo;
    const profileLevel = playerProfile.games.cs2.skill_level;

    // Fetch CS2 stats
    let statsData;
    try {
        statsData = await faceitApi(`/players/${state.faceitPlayerID}/stats/cs2`);
    } catch (e) {
        if (e.status === 404) {
            if (loader) loader.style.display = 'none';
            profileContent.insertAdjacentHTML('afterbegin', templates.noCsElement());
            return;
        }
        throw e;
    }

    const { lifetime, segments } = statsData;
    segments.sort((a, b) => parseInt(b.stats.Matches) - parseInt(a.stats.Matches));

    // Hide loader, render showcase
    if (loader) loader.style.display = 'none';
    state.faceitCover = playerProfile.cover_image; // remember the original FACEIT cover for the "FACEIT default" option
    faceitContent.insertAdjacentHTML('afterbegin', templates.showcaseLayout(
        lifetime, playerProfile, profileElo, profileLevel,
        win, lose, '?', '?', verified, currentStreak, isWinStreak, registeredDate
    ));

    // Store segments for map re-rendering
    state.faceitSegments = segments;

    // If all matches are cached, fill in K/D, HS%, Avg Kills instantly (no click needed)
    const matchIds = state.matchesList.slice(0, Math.min(state.matchesList.length, MATCH_DISPLAY_LIMIT)).map(m => m.match_id);
    const cached = await bulkGetCached(matchIds);
    if (cached.every(c => c !== null)) {
        const HS = [], KD = [], Kills = [];
        cached.forEach(({ stats }) => {
            if (!stats?.rounds?.[0]) return;
            for (const team of stats.rounds[0].teams) {
                const p = team.players.find(p => p.player_id === state.faceitPlayerID);
                if (p) {
                    KD.push(parseFloat(p.player_stats['K/D Ratio']));
                    HS.push(parseFloat(p.player_stats['Headshots %']));
                    Kills.push(parseFloat(p.player_stats['Kills']));
                    break;
                }
            }
        });
        if (HS.length > 0) {
            const lastHSEl = document.querySelector('.lastHS');
            const lastKDEl = document.querySelector('.lastKD');
            const lastKillsEl = document.querySelector('.lastKills');
            if (lastHSEl) lastHSEl.textContent = calcAvg(HS).toFixed(0);
            if (lastKDEl) lastKDEl.textContent = calcAvg(KD).toFixed(2);
            if (lastKillsEl) lastKillsEl.textContent = Math.round(calcAvg(Kills));
        }
    }

    // Render map stats
    const mapsContainer = document.querySelector('.faceit_maps');
    const filteredSegments = segments.filter(s => filterMaps(s, state.mapsVeto));
    filteredSegments.forEach(map => mapsContainer.insertAdjacentHTML('beforeend', templates.mapsLayout(map)));

    // Collapse by default
    document.querySelectorAll('.showcase_faceit, .game_info_stats, .faceit_stats_content').forEach(el => el.style.display = 'none');
    document.querySelector('.faceit_level_banner')?.classList.add('faceit_stats_collapsed');
    document.querySelector('.showcase_faceit_content')?.classList.add('faceit_stats_collapsed_wrap');

    // Center maps if fewer than veto count
    if (mapsContainer && mapsContainer.children.length < state.mapsVeto.length) {
        mapsContainer.style.justifyContent = 'center';
    }

    // Await ban data and show ban bar
    const banned = await banPromise;
    if (!BAN_STATUSES.includes(banned)) {
        faceitContent.style.paddingTop = '28px';
        faceitContent.insertAdjacentHTML('afterbegin', `<div class="faceit_banned" data-tooltip-html="Ban reason">Banned for: ${window.Steamify.utils.escapeHtml(banned)}</div>`);
    }

    // Store data for compare feature
    state.viewedPlayerStore = { data: playerProfile, lifetime, segments, elo: profileElo, level: profileLevel };

    // Show compare button if logged in and viewing someone else
    const myID = getLoggedInSteamID();
    if (myID && myID !== steamID) {
        state.comparedSteamID = myID;
        const bannerContent = document.querySelector('.faceit_level_banner_content');
        if (bannerContent) bannerContent.insertAdjacentHTML('beforeend', '<button class="faceit_compare_btn">\u2696 Compare</button>');
    }

    // Add details toggle button
    const bannerContent = document.querySelector('.faceit_level_banner_content');
    if (bannerContent) bannerContent.insertAdjacentHTML('beforeend', '<button class="faceit_compare_btn faceit_details_btn">\u25B4 Stats</button>');

    // Show content
    faceitContent.style.display = 'flex';

    // Show sponsor
    showSponsor();

    // Register all event handlers
    registerEventHandlers();
})();
