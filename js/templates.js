// Steamify HTML Templates
window.Steamify = window.Steamify || {};

window.Steamify.templates = (() => {
    const { EMOTE_SOTSAD, ELEMENT_VERIFIED, ALL_MAPS, SPONSOR_LINK } = window.Steamify.constants;
    const { escapeHtml, getLevelColor, filterMaps } = window.Steamify.utils;

    const notFoundElement = () =>
        `<div class="showcase_content_bg showcase_stats_row not_found">Faceit account wasn\`t found${EMOTE_SOTSAD}</div>`;

    const matchesNotFoundElement = () =>
        `<div class="showcase_content_bg showcase_stats_row not_found">No matches found${EMOTE_SOTSAD}</div>`;

    const loadingElement = () =>
        `<div class="showcase_content_bg showcase_stats_row steamify-loader-wrap"><div class="steamify-loader"></div></div>`;

    const noCsElement = () =>
        `<div class="showcase_content_bg showcase_stats_row not_found">No cs stats on Faceit${EMOTE_SOTSAD}</div>`;

    const showcaseLayout = (lifetime, profile, elo, level, win, lose, lastHS, lastKD, verified, currentStreak, isWinStreak, registeredDate) => {
        const glowColor = getLevelColor(level);
        const nickname = escapeHtml(profile.nickname);
        const country = escapeHtml(profile.country);
        const coverImage = escapeHtml(profile.cover_image);
        const membership = escapeHtml(profile.memberships[0]);

        // Banner background: honor the user's override ('faceit' | 'none' | 'custom')
        const bgMode = window.Steamify.state.bgMode || 'faceit';
        const bannerBg = bgMode === 'none'
            ? 'none'
            : (bgMode === 'custom' && window.Steamify.state.bgImage)
                ? `url('${window.Steamify.state.bgImage}')`
                : `url(${coverImage})`;
        const bgNoneClass = bgMode === 'none' ? ' faceit_bg_none' : '';
        const bgOpt = (val, label) =>
            `<div class="faceit_bg_opt" data-bg="${val}"><input type="radio" name="steamify_bg" tabindex="-1"${bgMode === val ? ' checked' : ''}> ${label}</div>`;
        const matchCount = parseInt(lifetime['Matches']) || 0;
        const displayMatches = Math.min(matchCount, 30);
        const winrate = displayMatches > 0 ? Math.round((win / displayMatches) * 100) : 0;

        return `
        <div class="showcase_faceit_content">
            <div class="showcase_stats">
                <div class="faceit_level_banner${bgNoneClass}" style="background-image: ${bannerBg};">
                    <div class="faceit_level_banner_content">
                        <a class="faceit_level_icon" target="_blank" href="https://faceit.com/en/players/${nickname}" style="filter: drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 0 16px ${glowColor});">
                            <img src="${chrome.runtime.getURL(`images/lvl_${level}.svg`)}" class="faceit_level_img">
                        </a>
                        <div class="faceit_level_info">
                            <div class="faceit_level_name">
                                <img class="faceit_level_flag" src="https://community.fastly.steamstatic.com/public/images/countryflags/${country}.gif">
                                <a class="text-white" target="_blank" href="https://faceit.com/en/players/${nickname}">${nickname}</a>
                                ${verified ? ELEMENT_VERIFIED : ''}
                            </div>
                            <div class="faceit_level_sub"><span class="faceit_level_elo">${escapeHtml(elo)} ELO</span> · <span class="faceit_level_membership" data-tooltip-html="FACEIT membership">${membership}</span>${registeredDate ? ` · <span class="faceit_level_registered" data-tooltip-html="Registered on FACEIT">since ${escapeHtml(registeredDate)}</span>` : ''}</div>
                        </div>
                        <div class="faceit_bg_settings">
                            <span class="faceit_bg_cog" title="Banner background">&#9881;</span>
                            <div class="faceit_bg_menu" style="display:none;">
                                ${bgOpt('faceit', 'FACEIT default')}
                                ${bgOpt('custom', 'Custom image…')}
                                ${bgOpt('none', 'None')}
                                <input type="file" accept="image/*" class="faceit_bg_file" hidden>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="showcase_faceit">
                    <div class="showcase_faceit_header">
                        <span class="text-white">LAST 30</span> <span>/ OVERALL</span>
                    </div>
                    <div class="showcase_faceit_boxes">
                        <a class="showcase_stat showcase_stat_bordered" data-tooltip-html="Matches played w/o leaves">
                            <div class="value">${escapeHtml(lifetime['Matches'])}</div>
                            <div class="label">Matches</div>
                        </a>
                        <a class="showcase_stat showcase_stat_bordered">
                            <div class="value"><span class="text-white">${winrate}%</span> / ${escapeHtml(lifetime['Win Rate %'])}%</div>
                            <div class="label">Winrate</div>
                        </a>
                        <a class="showcase_stat showcase_stat_bordered">
                            <div class="value"><span class="text-white lastKD">${escapeHtml(lastKD)}</span> / ${escapeHtml(lifetime['Average K/D Ratio'])}</div>
                            <div class="label">K/D</div>
                        </a>
                        <a class="showcase_stat showcase_stat_bordered" data-tooltip-html="Last 30 average FACEIT rating">
                            <div class="value"><span class="faceit_avg_rating">?</span></div>
                            <div class="label">Rating</div>
                        </a>
                        <a class="showcase_stat showcase_stat_bordered">
                            <div class="value"><span class="text-white lastHS">${escapeHtml(lastHS)}</span> / ${escapeHtml(lifetime['Average Headshots %'])}%</div>
                            <div class="label">HS %</div>
                        </a>
                        <a class="showcase_stat showcase_stat_bordered">
                            <div class="value"><span>${escapeHtml(lifetime['ADR'])}</span></div>
                            <div class="label">ADR</div>
                        </a>
                        <a class="showcase_stat showcase_stat_bordered" data-tooltip-html="Last 30 avg. kills">
                            <div class="value"><span class="text-white lastKills">?</span></div>
                            <div class="label">Avg Kills</div>
                        </a>
                        <a class="showcase_stat showcase_stat_bordered" data-tooltip-html="Current streak / Max. win streak">
                            <div class="value"><span class="${isWinStreak ? 'win' : 'lose'}">${isWinStreak ? '&#9650;' : '&#9660;'} ${currentStreak}</span> / ${escapeHtml(lifetime['Longest Win Streak'])}</div>
                            <div class="label">Streak</div>
                        </a>
                    </div>
                </div>
            </div>
        </div>
        <div style="clear: left;"></div>
        <div class="game_info_stats">
            <div class="faceit_maps_header">
                MAPS PLAYED
                <span class="faceit_maps_cog" title="Filter maps">&#9881;</span>
                <div class="faceit_maps_dropdown" style="display:none;">
                    ${ALL_MAPS.map(m => `<label class="faceit_maps_option"><input type="checkbox" value="${escapeHtml(m)}" ${window.Steamify.state.mapsVeto.includes(m) ? 'checked' : ''}> ${escapeHtml(m)}</label>`).join('')}
                </div>
            </div>
            <div class="faceit_maps"></div>
            <div class="game_info_faceit_header faceit_stats_load">CLICK TO LOAD LAST 30 GAMES STATS</div>
        </div>
        `;
    };

    const statsLayout = () =>
        `<div class="faceit_stats_content"><div class="faceit_matches_list"></div></div>`;

    const playersLayout = (matchID, team, player) => {
        const ps = player.player_stats;
        const nickname = escapeHtml(player.nickname);
        const isSelf = player.player_id === window.Steamify.state.faceitPlayerID;
        return `
        <div class="faceit_player_row${isSelf ? ' faceit_player_self' : ''}">
            <span class="faceit_player_name">
                <a class="text-primary" data-player_id="${escapeHtml(player.player_id)}">[Steam]</a>
                <a href="https://www.faceit.com/en/players/${nickname}" target="_blank" class="text-faceit">${nickname}</a>
            </span>
            <span class="faceit_player_stat">${escapeHtml(ps['Kills'])}-${escapeHtml(ps['Assists'])}-${escapeHtml(ps['Deaths'])}</span>
            <span class="faceit_player_stat"><span class="stat_${(ps['K/D Ratio'] < 1) ? 'decrease' : 'increase'}">${escapeHtml(ps['K/D Ratio'])}</span></span>
            <span class="faceit_player_stat"><span class="stat_${(ps['K/R Ratio'] < 1) ? 'decrease' : 'increase'}">${escapeHtml(ps['K/R Ratio'])}</span></span>
            <span class="faceit_player_stat">${escapeHtml(ps['Headshots %'])}% (${escapeHtml(ps['Headshots'])})</span>
            <span class="faceit_player_stat">${escapeHtml(ps['ADR'])}</span>
            <span class="faceit_player_stat"><span class="${(ps['MVPs'] > 0) ? 'text-white' : ''}">${escapeHtml(ps['MVPs'])}</span></span>
            <span class="faceit_player_stat"><span class="${(ps['Triple Kills'] > 0) ? 'text-white' : ''}">${escapeHtml(ps['Triple Kills'])}</span></span>
            <span class="faceit_player_stat"><span class="${(ps['Quadro Kills'] > 0) ? 'text-white' : ''}">${escapeHtml(ps['Quadro Kills'])}</span></span>
            <span class="faceit_player_stat"><span class="${(ps['Penta Kills'] > 0) ? 'text-white' : ''}">${escapeHtml(ps['Penta Kills'])}</span></span>
        </div>`;
    };

    const mapsLayout = (map) => {
        const losses = parseInt(map.stats['Matches']) - parseInt(map.stats['Wins']);
        const wrClass = (parseInt(map.stats['Win Rate %']) >= 50) ? 'win' : 'lose';
        const kdClass = (map.stats['Average K/D Ratio'] >= 1) ? 'win' : 'lose';
        return `
        <div class="faceit_map_box" style="background-image: url(${escapeHtml(map.img_small)})">
            <div class="faceit_map_name">${escapeHtml(map.label)}</div>
            <div class="faceit_map_stats_row">
                <span class="faceit_map_stat"><span class="win">${escapeHtml(map.stats['Wins'])}</span>:<span class="lose">${losses}</span></span>
                <span class="faceit_map_stat"><span class="faceit_map_stat_label">WR </span><span class="${wrClass}">${escapeHtml(map.stats['Win Rate %'])}%</span></span>
                <span class="faceit_map_stat"><span class="faceit_map_stat_label">K/D </span><span class="${kdClass}">${escapeHtml(map.stats['Average K/D Ratio'])}</span></span>
                <span class="faceit_map_stat"><span class="faceit_map_stat_label">ADR </span><span class="text-white">${escapeHtml(map.stats['ADR'] ?? 0)}</span></span>
            </div>
        </div>`;
    };

    const compareModalLayout = (profData, profElo, profLevel, profLifetime, myData, myElo, myLevel, myLifetime, profSegments, mySegments) => {
        const cmpRow = (label, aVal, bVal, higherIsBetter = true) => {
            const a = parseFloat(aVal), b = parseFloat(bVal);
            const aBetter = !isNaN(a) && !isNaN(b) && (higherIsBetter ? a > b : a < b);
            const bBetter = !isNaN(a) && !isNaN(b) && (higherIsBetter ? b > a : b < a);
            return `<div class="faceit_cmp_row">
                <span class="faceit_cmp_val ${aBetter ? 'faceit_cmp_win' : bBetter ? 'faceit_cmp_lose' : ''}">${escapeHtml(aVal)}</span>
                <span class="faceit_cmp_label">${escapeHtml(label)}</span>
                <span class="faceit_cmp_val faceit_cmp_val_r ${bBetter ? 'faceit_cmp_win' : aBetter ? 'faceit_cmp_lose' : ''}">${escapeHtml(bVal)}</span>
            </div>`;
        };

        const playerHdr = (d, elo, level, side) => {
            const gc = getLevelColor(level);
            const nickname = escapeHtml(d.nickname);
            return `<div class="faceit_cmp_player faceit_cmp_${side}">
                <a href="https://faceit.com/en/players/${nickname}" target="_blank" class="faceit_cmp_level_icon" style="filter:drop-shadow(0 0 6px ${gc})">
                    <img src="${chrome.runtime.getURL(`images/lvl_${level}.svg`)}" class="faceit_cmp_level_img">
                </a>
                <div class="faceit_cmp_player_info">
                    <div class="faceit_cmp_name"><a href="https://faceit.com/en/players/${nickname}" target="_blank">${nickname}</a></div>
                </div>
            </div>`;
        };

        const pEloNum = parseInt(profElo) || 0;
        const mEloNum = parseInt(myElo) || 0;
        const eloDiff = pEloNum - mEloNum;
        const eloDiffAbs = Math.abs(eloDiff);
        const eloDiffClass = eloDiff > 0 ? 'faceit_cmp_lose' : eloDiff < 0 ? 'faceit_cmp_win' : '';
        const eloDiffStr = eloDiffAbs > 0
            ? (eloDiff > 0 ? `&#9668; ${eloDiffAbs} ELO ahead` : `${eloDiffAbs} ELO ahead &#9658;`)
            : 'Equal ELO';

        const pWR = (profLifetime['Win Rate %'] ?? '\u2014') + '%';
        const mWR = (myLifetime['Win Rate %'] ?? '\u2014') + '%';
        const pKD = profLifetime['Average K/D Ratio'] ?? '\u2014';
        const mKD = myLifetime['Average K/D Ratio'] ?? '\u2014';
        const pHS = (profLifetime['Average Headshots %'] ?? '\u2014') + '%';
        const mHS = (myLifetime['Average Headshots %'] ?? '\u2014') + '%';
        const pADR = profLifetime['ADR'] ?? '\u2014';
        const mADR = myLifetime['ADR'] ?? '\u2014';
        const pM = profLifetime['Matches'] ?? '\u2014';
        const mM = myLifetime['Matches'] ?? '\u2014';
        const pWS = profLifetime['Longest Win Streak'] ?? '\u2014';
        const mWS = myLifetime['Longest Win Streak'] ?? '\u2014';

        const mapsVeto = window.Steamify.state.mapsVeto;
        const profMapIdx = {};
        (profSegments || []).filter(s => filterMaps(s, mapsVeto)).forEach(s => { profMapIdx[s.label] = s; });
        const myMapIdx = {};
        (mySegments || []).filter(s => filterMaps(s, mapsVeto)).forEach(s => { myMapIdx[s.label] = s; });
        const commonMaps = ALL_MAPS.filter(m => profMapIdx[m] && myMapIdx[m]);

        const mapSection = commonMaps.length ? `
            <div class="faceit_cmp_maps_section">
                <div class="faceit_cmp_section_hdr">MAP STATS</div>
                ${commonMaps.map(mapName => {
                    const pS = profMapIdx[mapName].stats;
                    const mS = myMapIdx[mapName].stats;
                    const pwr = parseFloat(pS['Win Rate %']), mwr = parseFloat(mS['Win Rate %']);
                    const pkd = parseFloat(pS['Average K/D Ratio']), mkd = parseFloat(mS['Average K/D Ratio']);
                    const pWRBetter = pwr > mwr, mWRBetter = mwr > pwr;
                    return `<div class="faceit_cmp_map_row" style="background-image:url(${escapeHtml(profMapIdx[mapName].img_small)})">
                        <div class="faceit_cmp_map_row_bg"></div>
                        <div class="faceit_cmp_map_side faceit_cmp_map_side_a">
                            <span class="faceit_cmp_map_matches">${escapeHtml(pS['Matches'])}</span>
                            <span class="faceit_cmp_map_wr ${pWRBetter ? 'faceit_cmp_win' : mWRBetter ? 'faceit_cmp_lose' : ''}">${escapeHtml(pS['Win Rate %'])}%</span>
                            <span class="faceit_cmp_map_kd ${pkd >= 1 ? 'stat_increase' : 'stat_decrease'}">${escapeHtml(pS['Average K/D Ratio'])}</span>
                            <span class="faceit_cmp_map_adr">${escapeHtml(pS['ADR'] ?? '\u2014')}</span>
                        </div>
                        <div class="faceit_cmp_map_name">${escapeHtml(mapName)}</div>
                        <div class="faceit_cmp_map_side faceit_cmp_map_side_b">
                            <span class="faceit_cmp_map_adr">${escapeHtml(mS['ADR'] ?? '\u2014')}</span>
                            <span class="faceit_cmp_map_kd ${mkd >= 1 ? 'stat_increase' : 'stat_decrease'}">${escapeHtml(mS['Average K/D Ratio'])}</span>
                            <span class="faceit_cmp_map_wr ${mWRBetter ? 'faceit_cmp_win' : pWRBetter ? 'faceit_cmp_lose' : ''}">${escapeHtml(mS['Win Rate %'])}%</span>
                            <span class="faceit_cmp_map_matches">${escapeHtml(mS['Matches'])}</span>
                        </div>
                    </div>`;
                }).join('')}
            </div>` : '';

        return `<div class="faceit_compare_overlay">
            <div class="faceit_compare_modal">
                <div class="faceit_cmp_header">
                    <span>COMPARE STATS</span>
                    <span class="faceit_cmp_close">&#10005;</span>
                </div>
                <div class="faceit_cmp_players">
                    ${playerHdr(profData, profElo, profLevel, 'a')}
                    <div class="faceit_cmp_vs">VS</div>
                    ${playerHdr(myData, myElo, myLevel, 'b')}
                </div>
                <div class="faceit_cmp_elo_diff">
                    <span class="faceit_cmp_elo_diff_val">${escapeHtml(profElo)} ELO</span>
                    <span class="faceit_cmp_elo_diff_main ${eloDiffClass}">${eloDiffStr}</span>
                    <span class="faceit_cmp_elo_diff_val faceit_cmp_elo_diff_val_r">${escapeHtml(myElo)} ELO</span>
                </div>
                <div class="faceit_cmp_rows">
                    ${cmpRow('WIN RATE', pWR, mWR)}
                    ${cmpRow('K/D RATIO', pKD, mKD)}
                    ${cmpRow('HS %', pHS, mHS)}
                    ${cmpRow('ADR', pADR, mADR)}
                    ${cmpRow('MATCHES', pM, mM)}
                    ${cmpRow('WIN STREAK', pWS, mWS)}
                </div>
                ${mapSection}
            </div>
        </div>`;
    };

    const matchCardLayout = (matchID, match, isWinner, winnerID, teamA, teamB) => {
        const isTournament = match.match.competition_type && match.match.competition_type !== 'matchmaking';
        const tournamentIcon = isTournament
            ? `<span class="faceit_match_cup" data-tooltip-html="${escapeHtml(match.match.competition_name)}">&#127942;</span>`
            : '';
        return `
        <div class="faceit_match_card faceit_stats_${isWinner ? 'win' : 'lose'}" data-match-id="${matchID}">
            ${tournamentIcon}
            <span class="faceit_match_result">${isWinner ? '<span class="stat_increase">W</span>' : '<span class="stat_decrease">L</span>'}</span>
            <span class="faceit_match_elo" data-match-faceit-id="${escapeHtml(match.match.id)}"></span>
            <span class="faceit_match_map">${escapeHtml(match.map)}</span>
            <span class="faceit_match_score">${escapeHtml(match.score)}</span>
            <span class="faceit_match_rating" data-tooltip-html="FACEIT rating"></span>
            <span class="faceit_match_stat">${escapeHtml(match.kills)}-${escapeHtml(match.assists)}-${escapeHtml(match.deaths)}</span>
            <span class="faceit_match_stat"><span class="faceit_match_stat_label">K/D </span><span class="stat_${(match.kda < 1) ? 'decrease' : 'increase'}">${escapeHtml(match.kda)}</span></span>
            <span class="faceit_match_stat"><span class="faceit_match_stat_label">K/R </span><span class="stat_${(match.kr < 1) ? 'decrease' : 'increase'}">${escapeHtml(match.kr)}</span></span>
            <span class="faceit_match_stat"><span class="faceit_match_stat_label">HS </span>${escapeHtml(match.hs_percent)}%</span>
            <span class="faceit_match_stat"><span class="faceit_match_stat_label">ADR </span>${escapeHtml(match.adr)}</span>
            <span class="faceit_match_date">${escapeHtml(match.finished_at)}</span>
            <a href="${escapeHtml(match.faceit_url)}" target="_blank" class="faceit_match_link" data-tooltip-html="View on FACEIT">&#128279;</a>
            <span class="faceit_match_expand" data-tooltip-html="Match details">&#9662;</span>
        </div>
        <div class="faceit_match_details" data-id="${matchID}" style="display:none">
            ${teamDetailsLayout(matchID, teamA, winnerID, 'A', 'faction1')}
            ${teamDetailsLayout(matchID, teamB, winnerID, 'B', 'faction2')}
        </div>`;
    };

    const teamDetailsLayout = (matchID, team, winnerID, side, faction) => {
        const teamName = escapeHtml(team.team_stats['Team']).toUpperCase();
        return `
        <div class="faceit_team_section">
            <div class="faceit_team_header">
                <span class="stat_${(winnerID === faction) ? 'increase' : 'decrease'}">${teamName} SCOREBOARD</span>
                <span>FINAL SCORE: <span class="text-white">${escapeHtml(team.team_stats['Final Score'])} <span data-tooltip-html="FIRST HALF">(${escapeHtml(team.team_stats['First Half Score'])}</span>:<span data-tooltip-html="SECOND HALF">${escapeHtml(team.team_stats['Second Half Score'])}</span> | <span data-tooltip-html="OVERTIME">${escapeHtml(team.team_stats['Overtime score'])}</span>)</span></span>
            </div>
            <div class="faceit_team_columns">
                <span class="faceit_player_name_col">PLAYER</span>
                <span class="faceit_player_stat_col">K-A-D</span>
                <span class="faceit_player_stat_col">K/D</span>
                <span class="faceit_player_stat_col">K/R</span>
                <span class="faceit_player_stat_col">HS</span>
                <span class="faceit_player_stat_col">ADR</span>
                <span class="faceit_player_stat_col">MVPs</span>
                <span class="faceit_player_stat_col">3K</span>
                <span class="faceit_player_stat_col">4K</span>
                <span class="faceit_player_stat_col">5K</span>
            </div>
            <div class="faceit_team_players" data-match-team="${matchID}_${side}"></div>
        </div>`;
    };

    const noStatsCardLayout = (matchID, matchId, isWinner, label, tooltip) => {
        const resultClass = isWinner ? 'stat_increase' : 'stat_decrease';
        const resultText = isWinner ? 'W' : 'L';
        const cardClass = isWinner ? 'faceit_stats_win' : 'faceit_stats_lose';
        const cupIcon = tooltip
            ? `<span class="faceit_match_cup" data-tooltip-html="${escapeHtml(tooltip)}">&#127942;</span>`
            : '';
        return `
        <div class="faceit_match_card faceit_stats_nostats ${cardClass}" data-match-id="${matchID}">
            ${cupIcon}
            <span class="faceit_match_result"><span class="${resultClass}">${resultText}</span></span>
            <span class="faceit_match_elo" data-match-faceit-id="${escapeHtml(matchId)}"></span>
            <span class="faceit_match_map">${escapeHtml(label)}</span>
            <span class="faceit_match_score"></span>
            <span class="faceit_match_rating" data-tooltip-html="FACEIT rating"></span>
            <span class="faceit_match_stat"></span>
            <span class="faceit_match_stat"></span>
            <span class="faceit_match_stat"></span>
            <span class="faceit_match_stat"></span>
            <span class="faceit_match_stat"></span>
            <span class="faceit_match_date"></span>
            <a href="https://faceit.com/en/cs2/room/${escapeHtml(matchId)}" target="_blank" class="faceit_match_link" data-tooltip-html="View on FACEIT">&#128279;</a>
            <span class="faceit_match_expand" style="visibility:hidden">&#9662;</span>
        </div>`;
    };

    const abandonedCardLayout = (matchID, matchId, label = 'ABANDONED', badgeClass = 'leaver') => {
        return `
        <div class="faceit_match_card faceit_stats_leaver" data-match-id="${matchID}">
            <span class="faceit_match_result"><span class="faceit_player_${badgeClass}_badge faceit_player_badge">${escapeHtml(label)}</span></span>
            <span class="faceit_match_abandoned"></span>
            <a href="https://faceit.com/en/cs2/room/${escapeHtml(matchId)}" target="_blank" class="faceit_match_link" data-tooltip-html="Check match on faceit">&#128279;</a>
            <span class="faceit_match_expand" style="visibility:hidden">&#9662;</span>
        </div>`;
    };

    const sponsorLayout = () => {
        return `
        <div class="sponsor-container sponsor-container-faceit">
            <a href="${SPONSOR_LINK}" target="_blank" class="sponsor-link-faceit">
                <img src="${chrome.runtime.getURL('images/sponsor_932x140.png')}" width="932" height="140" alt="Sponsor">
            </a>
            <div class="sponsor-bar">
                <div class="why-sponsor-button">Why do I see this ad?</div>
                <div class="sponsor-hide-button">&#10005; Hide</div>
            </div>
        </div>`;
    };

    const sponsorPopupLayout = () => {
        return `
        <div class="sponsor-explainer-popup" id="sponsorExplainerPopup">
            <div class="popup-content">
                <div class="popup-header">
                    <span>About This Ad</span>
                    <button class="popup-close">&times;</button>
                </div>
                <div class="popup-body">
                    <p class="popup-intro"><a href="https://chromewebstore.google.com/detail/steamify-faceit-stats-che/hgapfodjjnkkoebpfbcfhhenkklchngn" target="_blank" style="color:#fff;font-weight:700;text-decoration:none;">Steamify</a> is a passion project built and maintained by a solo developer — completely free.</p>
                    <p class="popup-intro">There are no hosting or API costs — the only thing that goes into this is personal time. This ad is a small way to get something back for the hours spent building and maintaining it.</p>
                    <ul>
                        <li>No tracking or personal data collection, ever</li>
                        <li>Only relevant gaming offers — nothing random</li>
                    </ul>
                    <p class="popup-intro popup-intro-note">If you'd rather not see it, no hard feelings — you can hide it forever below. But if you do keep it, thank you. It genuinely makes a difference. &#128591;</p>
                    <div class="popup-hide-button">&#10005; Hide this ad forever</div>
                </div>
            </div>
        </div>`;
    };

    const squadSectionLayout = (items) => {
        return `<div class="faceit_squad_section"><span class="faceit_squad_label">SQUAD</span>${items}</div>`;
    };

    const squadPlayerLayout = (nickname, level, elo, games, winrate) => {
        const cls = winrate >= 50 ? 'stat_increase' : 'stat_decrease';
        const levelHtml = level
            ? `<span class="faceit_squad_level" style="color:${getLevelColor(level)}">${level}</span>`
            : '';
        const eloHtml = elo ? `<span class="faceit_squad_elo">${escapeHtml(elo)}</span>` : '';
        return `<a href="https://www.faceit.com/en/players/${escapeHtml(nickname)}" target="_blank" class="faceit_squad_player">
            ${levelHtml}
            <span class="faceit_squad_name">${escapeHtml(nickname)}</span>
            ${eloHtml}
            <span class="faceit_squad_stat">${games}G <span class="${cls}">${winrate}%</span></span>
        </a>`;
    };

    return {
        notFoundElement, matchesNotFoundElement, loadingElement, noCsElement,
        showcaseLayout, statsLayout, playersLayout, mapsLayout,
        compareModalLayout, matchCardLayout, teamDetailsLayout,
        noStatsCardLayout, abandonedCardLayout, sponsorLayout, sponsorPopupLayout,
        squadSectionLayout, squadPlayerLayout
    };
})();
