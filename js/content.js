const
    // Bearer faceit client side key
    BEARER = 'Bearer 2ca58611-1bf4-4b37-b0a9-042631fd9f80',

    // Faceit Open API v4 url
    API_URL = 'https://open.faceit.com/data/v4',

    // sotsad emoticon :P
    EMOTE_SOTSAD = `<img alt=":sotsad:" src="${chrome.runtime.getURL('images/icon/sotsad.png')}">`,

    // No faceit profile
    ELEMENT_FACEIT_NOT_FOUND =
    $('<div>', {
        class: "showcase_content_bg showcase_stats_row not_found",
        text: "Faceit account wasn`t found"
    }).append(EMOTE_SOTSAD),

    // No available matches
    ELEMENT_MATCHES_NOT_FOUND =
    $('<div>', {
        class: "showcase_content_bg showcase_stats_row not_found",
        text: "No matches found"
    }).append(EMOTE_SOTSAD),

    // Preloader bar
    ELEMENT_LOADING =
    $('<div>', {
        class: "LoadingWrapper wrapper-orange"
    }).append($('<div>', { class: "LoadingThrobber" })
        .append($('<div>', { class: "Bar Bar1" }))
        .append($('<div>', { class: "Bar Bar2" }))
        .append($('<div>', { class: "Bar Bar3" }))),

    // No profile on faceit
    ELEMENT_NO_CS =
    $('<div>', {
        class: "showcase_content_bg showcase_stats_row not_found",
        text: "No cs stats on Faceit"
    }).append(EMOTE_SOTSAD),

    ELEMENT_STATS_HEADER = `<th colspan=8>PLAYER</th>
                            <th>MVPs</th>
                            <th>TRIPLE</th>
                            <th>QUADRO</th>
                            <th>PENTA</th>`,

    ELEMENT_VERIFIED = `<svg height="16" width="16" viewBox="0 0 24 24" data-tooltip-html="FACEIT confirmed this is the authentic profile for this player">
                            <path fill-rule="evenodd" clip-rule="evenodd" fill="#ff5500" d="M12.531 2.034a.667.667 0 0 0-1.062 0L9.379 4.79a.667.667 0 0
                            1-.623.258L5.33 4.577a.667.667 0 0 0-.752.752l.472 3.427a.667.667 0 0 1-.258.622l-2.757 2.09a.667.667 0 0 0 0 1.063l2.757
                            2.09a.67.67 0 0 1 .258.623l-.472 3.427a.667.667 0 0 0 .752.752l3.427-.472a.667.667 0 0 1 .622.258l2.09 2.757a.667.667 0 0 0 1.063
                            0l2.09-2.757a.667.667 0 0 1 .623-.258l3.427.472a.667.667 0 0 0 .752-.752l-.472-3.427a.667.667 0 0 1 .258-.622l2.757-2.09a.667.667 0 0 0
                            0-1.063l-2.757-2.09a.667.667 0 0 1-.258-.623l.472-3.427a.667.667 0 0 0-.752-.752l-3.427.472a.667.667 0 0 1-.622-.258l-2.09-2.757zM6.667
                            11.2l4.571 4.8 6.095-8-6.095 4.8-4.571-1.6z"></path>
                        </svg>`,

    // All maps
    ALL_MAPS = [
        'Ancient',
        'Anubis',
        'Cache',
        'Cbble',
        'Dust2',
        'Inferno',
        'Mirage',
        'Nuke',
        'Overpass',
        'Train',
        'Vertigo'
    ],

    // Default active map pool
    MAPS_VETO_DEFAULT = [
        'Ancient',
        'Anubis',
        'Dust2',
        'Inferno',
        'Mirage',
        'Nuke',
        'Overpass'
    ],

    MAPS_VETO = [...MAPS_VETO_DEFAULT],

    BAN_STATUSES = [
        undefined,
        '',
        'AVAILABLE',
        'active',
        'BUSY'
    ],

    SPONSOR_LINK = "https://skin.club/en?utm_source=sfsc&utm_medium=cpm&utm_content=sfsc_banner";

let matchesLimit = 31,
    matchesList,
    faceitPlayerID,
    matchList = [],
    lastHS = lastKD = '?',
    viewedPlayerStore = null,
    comparedSteamID = null,
    myCompareCache = null;

// Ajax setup headers
$.ajaxSetup({
    headers: {
        'Authorization': BEARER,
    }
});
// Sorting players by kills
const sortByKills = (a, b) => {
    return parseInt(a['player_stats'].Kills) >= parseInt(b['player_stats'].Kills) ? 1 : -1;
};
// Add team
const addTeam = (team, matchID, side) => {
    team.players.sort(sortByKills).forEach(player => playersLayout(matchID, side, player));
};
// Filter maps
const filterMaps = (map) => map.mode === '5v5' && MAPS_VETO.includes(map.label);
// Get maps detailed stats
const getMapsStats = (segments) => {
    const filteredSegments = segments.filter(filterMaps);
    filteredSegments.forEach(map => $('.faceit_maps').append(mapsLayout(map)));
};
// Calculate average
const calcAvg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
// Showcase layout
// Get glow color based on FACEIT level
const getLevelColor = (level) => {
    if (level <= 1) return '#CDCDCD';
    if (level <= 3) return '#1CE400';
    if (level <= 7) return '#FFC800';
    if (level <= 9) return '#FF6309';
    return '#FE1F00';
};
const showcaseLayout = (lifetime, profile, elo, level, win, lose, lastHS, lastKD, verified, currentStreak, isWinStreak, registeredDate) => {
    const glowColor = getLevelColor(level);
    return `
        <div class="showcase_faceit_content">
            <div class="showcase_stats">
                <div class="faceit_level_banner" style="background-image: url(${profile.cover_image});">
                    <div class="faceit_level_banner_content">
                        <a class="faceit_level_icon" target="_blank" href="https://faceit.com/en/players/${profile.nickname}" style="filter: drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 0 16px ${glowColor});">
                            <img src="${chrome.runtime.getURL(`images/lvl_${level}.svg`)}" class="faceit_level_img">
                        </a>
                        <div class="faceit_level_info">
                            <div class="faceit_level_name">
                                <img class="faceit_level_flag" src="https://community.fastly.steamstatic.com/public/images/countryflags/${profile.country}.gif">
                                <a class="text-white" target="_blank" href="https://faceit.com/en/players/${profile.nickname}">${profile.nickname}</a>
                                ${verified ? ELEMENT_VERIFIED : ''}
                            </div>
                            <div class="faceit_level_sub"><span class="faceit_level_elo">${elo} ELO</span> · <span class="faceit_level_membership" data-tooltip-html="FACEIT membership">${profile.memberships[0]}</span>${registeredDate ? ` · <span class="faceit_level_registered" data-tooltip-html="Registered on FACEIT">since ${registeredDate}</span>` : ''}</div>
                        </div>
                    </div>
                </div>
                <div class="showcase_faceit">
                    <div class="showcase_faceit_header">
                        <span class="text-white">LAST 30</span> <span>/ OVERALL</span>
                    </div>
                    <div class="showcase_faceit_boxes">
                        <a class="showcase_stat showcase_stat_bordered" data-tooltip-html="Matches played w/o leaves">
                            <div class="value">${lifetime['Matches']}</div>
                            <div class="label">Matches</div>
                        </a>
                        <a class="showcase_stat showcase_stat_bordered">
                            <div class="value"><span class="text-white">${Math.round((win / ((lifetime['Matches'] > 30) ? 30 : lifetime['Matches'])) * 100)}%</span> / ${lifetime['Win Rate %']}%</div>
                            <div class="label">Winrate</div>
                        </a>
                        <a class="showcase_stat showcase_stat_bordered">
                            <div class="value"><span class="text-white lastKD">${lastKD}</span> / ${lifetime['Average K/D Ratio']}</div>
                            <div class="label">K/D</div>
                        </a>
                        <a class="showcase_stat showcase_stat_bordered">
                            <div class="value"><span class="text-white lastHS">${lastHS}</span> / ${lifetime['Average Headshots %']}%</div>
                            <div class="label">HS %</div>
                        </a>
                        <a class="showcase_stat showcase_stat_bordered">
                            <div class="value"><span>${lifetime['ADR']}</div>
                            <div class="label">ADR</div>
                        </a>
                        <a class="showcase_stat showcase_stat_bordered" data-tooltip-html="Last 30 avg. kills">
                            <div class="value"><span class="text-white lastKills">?</span></div>
                            <div class="label">Avg Kills</div>
                        </a>
                        <a class="showcase_stat showcase_stat_bordered" data-tooltip-html="Current streak / Max. win streak">
                            <div class="value"><span class="${isWinStreak ? 'win' : 'lose'}">${isWinStreak ? '▲' : '▼'} ${currentStreak}</span> / ${lifetime['Longest Win Streak']}</div>
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
                <span class="faceit_maps_cog" title="Filter maps">⚙</span>
                <div class="faceit_maps_dropdown" style="display:none;">
                    ${ALL_MAPS.map(m => `<label class="faceit_maps_option"><input type="checkbox" value="${m}" ${MAPS_VETO.includes(m) ? 'checked' : ''}> ${m}</label>`).join('')}
                </div>
            </div>
            <div class="faceit_maps"></div>
            <div class="game_info_faceit_header faceit_stats_load">CLICK TO LOAD LAST 30 GAMES STATS</div>
        </div>
        `;
}
// Stats layout
const statsLayout = () => {
    return `
    <div class="faceit_stats_content">
        <div class="faceit_matches_list"></div>
    </div>`;
}
// Players layout
const playersLayout = (matchID, team, player) => {
    return $(`.${matchID}_team_${team}`).prepend(`
        <div class="faceit_player_row${player.player_id === faceitPlayerID ? ' faceit_player_self' : ''}">
            <span class="faceit_player_name">
                <a class="text-primary" data-player_id="${player.player_id}">[Steam]</a>
                <a href="https://www.faceit.com/en/players/${player.nickname}" target="_blank" class="text-faceit">${player.nickname}</a>
            </span>
            <span class="faceit_player_stat">${player.player_stats['Kills']}-${player.player_stats['Assists']}-${player.player_stats['Deaths']}</span>
            <span class="faceit_player_stat"><span class="stat_${(player.player_stats['K/D Ratio'] < 1) ? 'decrease' : 'increase'}">${player.player_stats['K/D Ratio']}</span></span>
            <span class="faceit_player_stat"><span class="stat_${(player.player_stats['K/R Ratio'] < 1) ? 'decrease' : 'increase'}">${player.player_stats['K/R Ratio']}</span></span>
            <span class="faceit_player_stat">${player.player_stats['Headshots %']}% (${player.player_stats['Headshots']})</span>
            <span class="faceit_player_stat">${player.player_stats['ADR']}</span>
            <span class="faceit_player_stat"><span class="${(player.player_stats['MVPs'] > 0) ? 'text-white' : ''}">${player.player_stats['MVPs']}</span></span>
            <span class="faceit_player_stat"><span class="${(player.player_stats['Triple Kills'] > 0) ? 'text-white' : ''}">${player.player_stats['Triple Kills']}</span></span>
            <span class="faceit_player_stat"><span class="${(player.player_stats['Quadro Kills'] > 0) ? 'text-white' : ''}">${player.player_stats['Quadro Kills']}</span></span>
            <span class="faceit_player_stat"><span class="${(player.player_stats['Penta Kills'] > 0) ? 'text-white' : ''}">${player.player_stats['Penta Kills']}</span></span>
        </div>`);
}
// Maps layout
const mapsLayout = (map) => {
    const losses = parseInt(map.stats['Matches']) - parseInt(map.stats['Wins']);
    return $('<div>', { class: "faceit_map_box", style: `background-image: url(${map.img_small})` })
        .append($('<div>', { class: "faceit_map_name", text: map.label }))
        .append($('<div>', { class: "faceit_map_stats_row" })
            .append($('<span>', { class: "faceit_map_stat" }).append($('<span>', { class: "win", text: map.stats['Wins'] })).append(':').append($('<span>', { class: "lose", text: losses })))
            .append($('<span>', { class: "faceit_map_stat" }).append($('<span>', { class: "faceit_map_stat_label", text: "WR " })).append($('<span>', { class: (parseInt(map.stats['Win Rate %']) >= 50) ? 'win' : 'lose', text: `${map.stats['Win Rate %']}%` })))
            .append($('<span>', { class: "faceit_map_stat" }).append($('<span>', { class: "faceit_map_stat_label", text: "K/D " })).append($('<span>', { class: (map.stats['Average K/D Ratio'] >= 1) ? 'win' : 'lose', text: map.stats['Average K/D Ratio'] })))
            .append($('<span>', { class: "faceit_map_stat" }).append($('<span>', { class: "faceit_map_stat_label", text: "ADR " })).append($('<span>', { class: "text-white", text: (map.stats['ADR'] ?? 0) })))
        );
}
// Compare modal layout
const compareModalLayout = (profData, profElo, profLevel, profLifetime, myData, myElo, myLevel, myLifetime, profSegments, mySegments) => {
    const cmpRow = (label, aVal, bVal, higherIsBetter = true) => {
        const a = parseFloat(aVal), b = parseFloat(bVal);
        const aBetter = !isNaN(a) && !isNaN(b) && (higherIsBetter ? a > b : a < b);
        const bBetter = !isNaN(a) && !isNaN(b) && (higherIsBetter ? b > a : b < a);
        return `<div class="faceit_cmp_row">
            <span class="faceit_cmp_val ${aBetter ? 'faceit_cmp_win' : bBetter ? 'faceit_cmp_lose' : ''}">${aVal}</span>
            <span class="faceit_cmp_label">${label}</span>
            <span class="faceit_cmp_val faceit_cmp_val_r ${bBetter ? 'faceit_cmp_win' : aBetter ? 'faceit_cmp_lose' : ''}">${bVal}</span>
        </div>`;
    };
    const playerHdr = (d, elo, level, side) => {
        const gc = getLevelColor(level);
        return `<div class="faceit_cmp_player faceit_cmp_${side}">
            <a href="https://faceit.com/en/players/${d.nickname}" target="_blank" class="faceit_cmp_level_icon" style="filter:drop-shadow(0 0 6px ${gc})">
                <img src="${chrome.runtime.getURL(`images/lvl_${level}.svg`)}" class="faceit_cmp_level_img">
            </a>
            <div class="faceit_cmp_player_info">
                <div class="faceit_cmp_name"><a href="https://faceit.com/en/players/${d.nickname}" target="_blank">${d.nickname}</a></div>
            </div>
        </div>`;
    };
    const pEloNum = parseInt(profElo) || 0;
    const mEloNum = parseInt(myElo) || 0;
    const eloDiff = pEloNum - mEloNum;
    const eloDiffAbs = Math.abs(eloDiff);
    const eloDiffClass = eloDiff > 0 ? 'faceit_cmp_lose' : eloDiff < 0 ? 'faceit_cmp_win' : '';
    const eloDiffStr = eloDiffAbs > 0
        ? (eloDiff > 0 ? `◄ ${eloDiffAbs} ELO ahead` : `${eloDiffAbs} ELO ahead ►`)
        : 'Equal ELO';

    const pWR = (profLifetime['Win Rate %'] ?? '—') + '%';
    const mWR = (myLifetime['Win Rate %'] ?? '—') + '%';
    const pKD = profLifetime['Average K/D Ratio'] ?? '—';
    const mKD = myLifetime['Average K/D Ratio'] ?? '—';
    const pHS = (profLifetime['Average Headshots %'] ?? '—') + '%';
    const mHS = (myLifetime['Average Headshots %'] ?? '—') + '%';
    const pADR = profLifetime['ADR'] ?? '—';
    const mADR = myLifetime['ADR'] ?? '—';
    const pM = profLifetime['Matches'] ?? '—';
    const mM = myLifetime['Matches'] ?? '—';
    const pWS = profLifetime['Longest Win Streak'] ?? '—';
    const mWS = myLifetime['Longest Win Streak'] ?? '—';

    // Build map index keyed by label for each player
    const profMapIdx = {};
    (profSegments || []).filter(filterMaps).forEach(s => { profMapIdx[s.label] = s; });
    const myMapIdx = {};
    (mySegments || []).filter(filterMaps).forEach(s => { myMapIdx[s.label] = s; });
    const commonMaps = ALL_MAPS.filter(m => profMapIdx[m] && myMapIdx[m]);

    const mapSection = commonMaps.length ? `
        <div class="faceit_cmp_maps_section">
            <div class="faceit_cmp_section_hdr">MAP STATS</div>
            ${commonMaps.map(mapName => {
                const pS = profMapIdx[mapName].stats;
                const mS = myMapIdx[mapName].stats;
                const pwr = parseFloat(pS['Win Rate %']), mwr = parseFloat(mS['Win Rate %']);
                const pkd = parseFloat(pS['Average K/D Ratio']), mkd = parseFloat(mS['Average K/D Ratio']);
                const padr = parseFloat(pS['ADR'] ?? 0), madr = parseFloat(mS['ADR'] ?? 0);
                const pWRBetter = pwr > mwr, mWRBetter = mwr > pwr;
                return `<div class="faceit_cmp_map_row" style="background-image:url(${profMapIdx[mapName].img_small})">
                    <div class="faceit_cmp_map_row_bg"></div>
                    <div class="faceit_cmp_map_side faceit_cmp_map_side_a">
                        <span class="faceit_cmp_map_matches">${pS['Matches']}</span>
                        <span class="faceit_cmp_map_wr ${pWRBetter ? 'faceit_cmp_win' : mWRBetter ? 'faceit_cmp_lose' : ''}">${pS['Win Rate %']}%</span>
                        <span class="faceit_cmp_map_kd ${pkd >= 1 ? 'stat_increase' : 'stat_decrease'}">${pS['Average K/D Ratio']}</span>
                        <span class="faceit_cmp_map_adr">${pS['ADR'] ?? '—'}</span>
                    </div>
                    <div class="faceit_cmp_map_name">${mapName}</div>
                    <div class="faceit_cmp_map_side faceit_cmp_map_side_b">
                        <span class="faceit_cmp_map_adr">${mS['ADR'] ?? '—'}</span>
                        <span class="faceit_cmp_map_kd ${mkd >= 1 ? 'stat_increase' : 'stat_decrease'}">${mS['Average K/D Ratio']}</span>
                        <span class="faceit_cmp_map_wr ${mWRBetter ? 'faceit_cmp_win' : pWRBetter ? 'faceit_cmp_lose' : ''}">${mS['Win Rate %']}%</span>
                        <span class="faceit_cmp_map_matches">${mS['Matches']}</span>
                    </div>
                </div>`;
            }).join('')}
        </div>` : '';

    return `<div class="faceit_compare_overlay">
        <div class="faceit_compare_modal">
            <div class="faceit_cmp_header">
                <span>COMPARE STATS</span>
                <span class="faceit_cmp_close">✕</span>
            </div>
            <div class="faceit_cmp_players">
                ${playerHdr(profData, profElo, profLevel, 'a')}
                <div class="faceit_cmp_vs">VS</div>
                ${playerHdr(myData, myElo, myLevel, 'b')}
            </div>
            <div class="faceit_cmp_elo_diff">
                <span class="faceit_cmp_elo_diff_val">${profElo} ELO</span>
                <span class="faceit_cmp_elo_diff_main ${eloDiffClass}">${eloDiffStr}</span>
                <span class="faceit_cmp_elo_diff_val faceit_cmp_elo_diff_val_r">${myElo} ELO</span>
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
// Safe wrapper — silently ignores "Extension context invalidated" after reloads
const sendMessage = (msg, cb) => { try { chrome.runtime.sendMessage(msg, cb); } catch (e) {} };

// Promise wrapper for sendMessage — resolves null on error/context invalidated
const fetchUrl = (url) => new Promise(resolve => {
    try {
        chrome.runtime.sendMessage({ type: 'fetchUrl', url }, response =>
            resolve(chrome.runtime.lastError ? null : (response ?? null))
        );
    } catch (e) { resolve(null); }
});

// Get the logged-in Steam user's SteamID64 by parsing existing script tags (no injection needed)
const getLoggedInSteamID = () => {
    for (const script of document.querySelectorAll('script:not([src])')) {
        const m = script.textContent.match(/g_steamID\s*=\s*"(\d+)"/);
        if (m && m[1] !== '0') return m[1];
    }
    return null;
};

// Aggregate party mate stats across all 30 matches and render squad summary
const loadPartyStats = async () => {
    const limit = matchesList.length === 31 ? 30 : matchesList.length;

    // Build nickname map from already-loaded team data
    const nicknameMap = {};
    for (let i = 0; i < limit; i++) {
        const teams = matchList[i]?.match?.teams?.[0];
        if (!teams) continue;
        [0, 1].forEach(t => teams[t]?.players?.forEach(p => { nicknameMap[p.player_id] = p.nickname; }));
    }

    // Fetch party data for all matches in parallel
    const responses = await Promise.all(
        Array.from({ length: limit }, (_, i) => {
            const id = matchList[i]?.match?.id;
            return id ? fetchUrl(`https://api.faceit.com/match/v2/match/${id}`) : Promise.resolve(null);
        })
    );

    // Accumulate per-player stats
    const squadStats = {};
    responses.forEach((response, i) => {
        if (!response?.success) return;
        const parties = response.data?.payload?.parties;
        if (!parties?.length) return;
        const myParty = parties.find(p => p.users.includes(faceitPlayerID) && p.users.length > 1);
        if (!myParty) return;
        const isWin = matchList[i]?.match?.winner === 1;
        myParty.users.forEach(playerId => {
            if (playerId === faceitPlayerID) return;
            if (!squadStats[playerId]) squadStats[playerId] = { nickname: nicknameMap[playerId] || '?', games: 0, wins: 0 };
            squadStats[playerId].games++;
            if (isWin) squadStats[playerId].wins++;
        });
    });

    const sorted = Object.entries(squadStats).sort((a, b) => b[1].games - a[1].games).slice(0, 5);
    if (!sorted.length) return;

    // Fetch ELO + level for each squad member via Open API (Bearer already set in $.ajaxSetup)
    const playerData = await Promise.all(sorted.map(([id]) => new Promise(resolve => {
        $.getJSON({
            url: `${API_URL}/players/${id}`,
            success: data => resolve({
                elo: data?.games?.cs2?.faceit_elo ?? null,
                level: data?.games?.cs2?.skill_level ?? null
            }),
            error: () => resolve({ elo: null, level: null })
        });
    })));

    const items = sorted.map(([, s], idx) => {
        const wr = Math.round((s.wins / s.games) * 100);
        const cls = wr >= 50 ? 'stat_increase' : 'stat_decrease';
        const { elo, level } = playerData[idx];
        const levelHtml = level
            ? `<span class="faceit_squad_level" style="color:${getLevelColor(level)}">${level}</span>`
            : '';
        const eloHtml = elo ? `<span class="faceit_squad_elo">${elo}</span>` : '';
        return `<a href="https://www.faceit.com/en/players/${s.nickname}" target="_blank" class="faceit_squad_player">
            ${levelHtml}
            <span class="faceit_squad_name">${s.nickname}</span>
            ${eloHtml}
            <span class="faceit_squad_stat">${s.games}G <span class="${cls}">${wr}%</span></span>
        </a>`;
    }).join('');

    $('.faceit_stats_content').prepend(
        `<div class="faceit_squad_section"><span class="faceit_squad_label">SQUAD</span>${items}</div>`
    );
};

// Load ELO change per match from FACEIT stats API (via background worker to bypass CORS)
const loadEloHistory = () => {
    sendMessage({
        type: 'fetchUrl',
        url: `https://api.faceit.com/stats/v1/stats/time/users/${faceitPlayerID}/games/cs2?page=0&size=31`
    }, response => {
        if (chrome.runtime.lastError || !response?.success) return;
        // API returns the array directly (no payload wrapper)
        const history = Array.isArray(response.data) ? response.data : response.data?.payload;
        if (!history?.length) return;

        // Per-match ELO change using elo_delta field, matched by index
        history.forEach((item, i) => {
            const delta = parseInt(item.elo_delta);
            if (isNaN(delta)) return;
            const sign = delta > 0 ? '+' : '';
            const cls = delta >= 0 ? 'stat_increase' : 'stat_decrease';
            $('.faceit_match_card').eq(i).find('.faceit_match_elo')
                .html(`<span class="faceit_elo_val">${item.elo}</span><span class="${cls}">${sign}${delta}</span>`);
        });

        // Total ELO change over rendered matches only (not the sentinel 31st)
        const total = history.slice(0, $('.faceit_match_card').length).reduce((sum, item) => sum + (parseInt(item.elo_delta) || 0), 0);
        const sign = total > 0 ? '+' : '';
        const cls = total >= 0 ? 'stat_increase' : 'stat_decrease';
        $('.faceit_stats_load').append(` <span class="faceit_elo_total ${cls}">(${sign}${total} ELO)</span>`);
    });
};

// Get 30 last games
const getLastGames = () => {

    let loadingCounter = 1;

    $.each(matchesList, game => {

        if (game === 31) return;

        var matchesCounter = game,
            game = matchesList[game];

        // Get match detailed data to create a table
        $.getJSON({
            url: `${API_URL}/matches/${game.match_id}/stats`,
            success: data => {
                $.each(data.rounds, stats => {
                    let match = data.rounds[stats],
                        roundStats = match.round_stats,
                        { Map: map, Score: score } = roundStats;

                    let playersList = [];

                    // List of teams in match
                    $.each(match.teams, teams => {

                        let team = match.teams[teams],
                            { team_id, team_stats: { Team: team_name } } = team;

                        matchList[matchesCounter].match.teams = [match.teams];

                        $.each(team.players, players => {
                            // List of players in match
                            const {
                                player_id,
                                player_stats,
                            } = team.players[players];

                            playersList.push(player_id);

                            if (player_id === faceitPlayerID && matchList[matchesCounter].match.id === game.match_id) {
                                // Player stats in game
                                matchList[matchesCounter].team_name = team_name;
                                matchList[matchesCounter].team_id = team_id;
                                matchList[matchesCounter].score = score;
                                matchList[matchesCounter].map = map;
                                matchList[matchesCounter].faceit_url = `https://www.faceit.com/en/cs2/room/${game.match_id}`;
                                matchList[matchesCounter].assists = player_stats['Assists'];
                                matchList[matchesCounter].deaths = player_stats['Deaths'];
                                matchList[matchesCounter].kills = player_stats['Kills'];
                                matchList[matchesCounter].kda = player_stats['K/D Ratio'];
                                matchList[matchesCounter].kr = player_stats['K/R Ratio'];
                                matchList[matchesCounter].hs = player_stats['Headshots'];
                                matchList[matchesCounter].adr = player_stats['ADR'];
                                matchList[matchesCounter].hs_percent = player_stats['Headshots %'];
                                matchList[matchesCounter].mvps = player_stats['MVPs'];
                                matchList[matchesCounter].tripple = player_stats['Triple Kills'];
                                matchList[matchesCounter].quadro = player_stats['Quadro Kills'];
                                matchList[matchesCounter].penta = player_stats['Penta Kills'];
                            }
                        });
                    });
                    if ($.inArray(faceitPlayerID, playersList) <= -1) matchList[matchesCounter].leaver = 1;
                });
            },
            complete: () => {
                $('.faceit_stats_content').attr('style', 'margin-top: 8px !important');
                $('.faceit_stats_load').text(`LOADING... [${loadingCounter - 1}]`);

                if (loadingCounter === matchesList.length) {
                    $('.faceit_stats_load').text(`LAST ${(matchesList.length === 31) ? 30 : matchesList.length} GAMES`);

                    let [HS, KD, Kills] = [
                        [],
                        [],
                        []
                    ];

                    $.each(matchList, matchID => {
                        let match = matchList[matchID];

                        if (matchID === 30 || matchList[matchID].match.teams[0] === undefined) return;

                        let team_A = match.match.teams[0][0],
                            team_B = match.match.teams[0][1],
                            is_winner = match.match.winner,
                            winner_id = match.match.winner_id;

                        if (!match.leaver) {
                            KD.push(parseFloat(match.kda));
                            HS.push(parseFloat(match.hs_percent));
                            Kills.push(parseFloat(match.kills));
                        }

                        $('.lastHS').text(calcAvg(HS).toFixed(0));
                        $('.lastKD').text(calcAvg(KD).toFixed(2));
                        $('.lastKills').text(Math.round(calcAvg(Kills)));

                        if (match.leaver) {
                            $('.faceit_matches_list').append(
                                `<div class="faceit_match_card faceit_stats_leaver" data-match-id="${matchID}">
                                    <span class="faceit_match_result">A</span>
                                    <span class="faceit_match_abandoned">ABANDONED</span>
                                    <a href="https://faceit.com/en/cs2/room/${match.match.id}" target="_blank" class="faceit_match_link" data-tooltip-html="Check match on faceit">🔗</a>
                                </div>`);
                        } else {
                            $('.faceit_matches_list').append(`
                            <div class="faceit_match_card faceit_stats_${(is_winner) ? 'win' : 'lose'}" data-match-id="${matchID}">
                                <span class="faceit_match_result">${(is_winner) ? '<span class="stat_increase">W</span>' : '<span class="stat_decrease">L</span>'}</span>
                                <span class="faceit_match_elo" data-match-faceit-id="${match.match.id}"></span>
                                <span class="faceit_match_map">${match.map}</span>
                                <span class="faceit_match_score">${match.score}</span>
                                <span class="faceit_match_stat">${match.kills}-${match.assists}-${match.deaths}</span>
                                <span class="faceit_match_stat"><span class="faceit_match_stat_label">K/D </span><span class="stat_${(match.kda < 1) ? 'decrease' : 'increase'}">${match.kda}</span></span>
                                <span class="faceit_match_stat"><span class="faceit_match_stat_label">K/R </span><span class="stat_${(match.kr < 1) ? 'decrease' : 'increase'}">${match.kr}</span></span>
                                <span class="faceit_match_stat"><span class="faceit_match_stat_label">HS </span>${match.hs_percent}%</span>
                                <span class="faceit_match_stat"><span class="faceit_match_stat_label">ADR </span>${match.adr}</span>
                                <span class="faceit_match_date">${match.finished_at}</span>
                                <a href="${match.faceit_url}" target="_blank" class="faceit_match_link" data-tooltip-html="View on FACEIT">🔗</a>
                                <span class="faceit_match_expand" data-tooltip-html="Match details">▾</span>
                            </div>
                            <div class="faceit_match_details" data-id="${matchID}" style="display:none">
                                <div class="faceit_team_section">
                                    <div class="faceit_team_header">
                                        <span class="stat_${(winner_id === 'faction1') ? 'increase' : 'decrease'}">${team_A.team_stats['Team'].toUpperCase()} SCOREBOARD</span>
                                        <span>FINAL SCORE: <span class="text-white">${team_A.team_stats['Final Score']} <span data-tooltip-html="FIRST HALF">(${team_A.team_stats['First Half Score']}</span>:<span data-tooltip-html="SECOND HALF">${team_A.team_stats['Second Half Score']}</span> | <span data-tooltip-html="OVERTIME">${team_A.team_stats['Overtime score']}</span>)</span></span>
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
                                    <div class="${matchID}_team_A faceit_team_players"></div>
                                </div>
                                <div class="faceit_team_section">
                                    <div class="faceit_team_header">
                                        <span class="stat_${(winner_id === 'faction2') ? 'increase' : 'decrease'}">${team_B.team_stats['Team'].toUpperCase()} SCOREBOARD</span>
                                        <span>FINAL SCORE: <span class="text-white">${team_B.team_stats['Final Score']} <span data-tooltip-html="FIRST HALF">(${team_B.team_stats['First Half Score']}</span>:<span data-tooltip-html="SECOND HALF">${team_B.team_stats['Second Half Score']}</span> | <span data-tooltip-html="OVERTIME">${team_B.team_stats['Overtime score']}</span>)</span></span>
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
                                    <div class="${matchID}_team_B faceit_team_players"></div>
                                </div>
                            </div>`);

                            addTeam(team_A, matchID, 'A');
                            addTeam(team_B, matchID, 'B');
                        }
                    });
                    loadEloHistory();
                    loadPartyStats();
                } else {
                    loadingCounter++;
                }
            }
        });
        // Get match finish time and demo link
        $.getJSON({
            url: `${API_URL}/matches/${game.match_id}`,
            success: data => {
                matchList[matchesCounter].finished_at = new Date(data.finished_at * 1000).toLocaleString('en-GB');
            },
            error: () => {
                matchList[matchesCounter].finished_at = '---';
            },
            complete: data => {
                try { matchList[matchesCounter].demo_url = data.responseJSON.demo_url[0]; } catch (e) { matchList[matchesCounter].demo_url = 'empty'; }
            }
        });
    });
}
// Get player steam_id_64
const getSteamId64 = (player) => {
    $.getJSON({
        url: `${API_URL}/players/${player.data('player_id')}`,
        success: data => {
            $(player).css('cursor', 'pointer');
            window.open(`https://steamcommunity.com/profiles/${data.steam_id_64}`, "_blank", "noopener, noreferrer");
        },
        beforeSend: () => {
            $(player).css('cursor', 'wait');
        }
    });
}
// parse steamid
const parseSteamID = () => {
    return document.querySelector('.responsive_page_template_content').innerHTML.split('script')[2].split('"')[8];
}
// show sponsors
const showSponsor = () => {
    if (localStorage.getItem('steamify_sponsor_hidden') === '1') return;

    faceitContentSponsorLayout();

    // Popup Logic
    const sponsorBtn = document.querySelector('.why-sponsor-button');
    const popup = document.getElementById('sponsorExplainerPopup');
    const closeBtn = document.querySelector('.popup-close');
    const hideBtn = document.querySelector('.sponsor-hide-button');
    const popupHideBtn = document.querySelector('.popup-hide-button');

    const hideSponsor = () => {
        localStorage.setItem('steamify_sponsor_hidden', '1');
        document.querySelector('.sponsor-container-faceit')?.remove();
        popup && (popup.style.display = 'none');
    };

    sponsorBtn?.addEventListener('click', () => {
        popup && (popup.style.display = 'flex');
    });

    closeBtn?.addEventListener('click', () => {
        popup && (popup.style.display = 'none');
    });

    popup?.addEventListener('click', (e) => {
        if (e.target === popup) popup.style.display = 'none';
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && popup?.style.display === 'flex') popup.style.display = 'none';
    });

    hideBtn?.addEventListener('click', hideSponsor);
    popupHideBtn?.addEventListener('click', hideSponsor);
};

const faceitContentSponsorLayout = () => {
    const adHTML = `
        <div class="sponsor-container sponsor-container-faceit">
            <a href="${SPONSOR_LINK}" target="_blank" class="sponsor-link-faceit">
                <img src="${chrome.runtime.getURL('images/sponsor_932x140.png')}" width="932" height="140" alt="Sponsor">
            </a>
            <div class="sponsor-bar">
                <div class="why-sponsor-button">Why do I see this ad?</div>
                <div class="sponsor-hide-button">✕ Hide</div>
            </div>
        </div>`;

    $('.not_found, .faceit_content').prepend(adHTML);
}


// Load saved map filter
chrome.storage.local.get('steamify_maps_veto', (result) => {
    if (result.steamify_maps_veto) {
        MAPS_VETO.length = 0;
        result.steamify_maps_veto.forEach(m => MAPS_VETO.push(m));
    }
});

if (!$(".faceit_maps")[0]) {
    // Get steamid
    let steamID = parseSteamID();

    $.getJSON({
        url: `${API_URL}/players?game=cs2&game_player_id=${steamID}`,
        statusCode: {
            // If faceit profile not found return error
            404: function() {
                $('.LoadingWrapper').hide();
                $('.profile_content').prepend(ELEMENT_FACEIT_NOT_FOUND);
                $('.showcase_stats_row').css('display', 'flex').css('justify-content', 'center');
                showSponsor();
                return;
            }
        },
        success: data => {
            faceitPlayerID = data.player_id;

            let win = lose = 0;

            let banned = '';

            $.getJSON({
                url: `${API_URL}/players/${faceitPlayerID}/bans`,
                success: data => {
                    banned = data.items[0]?.reason;
                }
            });

            const verified = data.verified;
            const registeredDate = (() => {
                const d = data.activated_at ? new Date(data.activated_at) : null;
                if (!d || isNaN(d)) return null;
                return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
            })();

            // Get last 30 games
            $.getJSON({
                url: `${API_URL}/players/${faceitPlayerID}/history?from=0&game=cs2&limit=${matchesLimit}`,
                success: data => {

                    matchesList = data.items;

                    if (matchesList.length > 0) {
                        $('.private_profile').addClass('DefaultTheme');
                        $('.private_profile .profile_content').css('padding-bottom', 8);
                        $('.profile_content').css('min-height', '434px').prepend('<div class="showcase_content_bg showcase_stats_row faceit_content" style="display:none"></div>');
                        $('.faceit_content').append(statsLayout());

                        $.each(matchesList, matchID => {
                            var match = matchesList[matchID];

                            matchList.push({
                                "match": {
                                    "id": match.match_id,
                                    "teams": {}
                                }
                            });

                            if (matchID === 30) return;

                            $.each(match.teams, faction => {
                                $.each(match.teams[faction].players, player => {
                                    const playerID = match.teams[faction].players[player].player_id;
                                    const { winner: matchWinner } = match.results;
                                    const matchDetails = matchList[matchID].match;

                                    if (playerID === faceitPlayerID) {
                                        if (matchWinner === faction) {
                                            win++;
                                            matchDetails.winner = 1;
                                        } else {
                                            lose++;
                                            matchDetails.winner = 0;
                                        }
                                        matchDetails.winner_id = matchWinner;
                                        return false;
                                    }
                                });
                            });
                        });

                        // Calculate current streak (wins or losses)
                        let currentStreak = 0;
                        let isWinStreak = true;
                        if (matchList.length > 0 && matchList[0].match.winner !== undefined) {
                            isWinStreak = matchList[0].match.winner === 1;
                            for (let i = 0; i < matchList.length; i++) {
                                if (matchList[i].match.winner === undefined) break;
                                if ((matchList[i].match.winner === 1) === isWinStreak) {
                                    currentStreak++;
                                } else {
                                    break;
                                }
                            }
                        }

                        if (matchesList.length < matchesLimit) matchesLimit = matchesList.length;

                        // Get lifetime stats
                        $.getJSON({
                            url: `${API_URL}/players/${faceitPlayerID}`,
                            success: data => {
                                // If cs2 profile exists
                                if (data.games['cs2']) {
                                    const profileData = data;

                                    const {
                                        games: {
                                            cs2: {
                                                faceit_elo: profileElo,
                                                skill_level: profileLevel
                                            }
                                        }
                                    } = profileData;

                                    // Get cs2 stats
                                    $.getJSON({
                                        url: `${API_URL}/players/${faceitPlayerID}/stats/cs2`,
                                        success: data => {
                                            let { lifetime, segments } = data;

                                            segments.sort((a, b) => parseInt(b.stats.Matches) - parseInt(a.stats.Matches));

                                            $('.LoadingWrapper').hide();
                                            $('.faceit_content').prepend(
                                                showcaseLayout(
                                                    lifetime,
                                                    profileData,
                                                    profileElo,
                                                    profileLevel,
                                                    win,
                                                    lose,
                                                    lastHS,
                                                    lastKD,
                                                    verified,
                                                    currentStreak,
                                                    isWinStreak,
                                                    registeredDate
                                                )
                                            );

                                            window._faceit_segments = segments;
                                            getMapsStats(segments);

                                            // Check if maps played length equals to MapsVeto length to center them
                                            if ($('.faceit_maps > *').length < MAPS_VETO.length) {
                                                $('.faceit_maps').css('justify-content', 'center');
                                            }
                                            // Ban bar
                                            if (!BAN_STATUSES.includes(banned)) {
                                                $('.faceit_content').css('padding-top', '28px').prepend(`<div class="faceit_banned" data-tooltip-html="Ban reason">Banned for: ${banned}</div>`)
                                            }

                                            // Store data and show compare button if user is logged in and viewing someone else
                                            viewedPlayerStore = { data: profileData, lifetime, segments, elo: profileElo, level: profileLevel };
                                            const myID = getLoggedInSteamID();
                                            if (myID && myID !== steamID) {
                                                comparedSteamID = myID;
                                                $('.faceit_level_banner_content').append('<button class="faceit_compare_btn">⚖ Compare</button>');
                                            }
                                        },
                                        complete: () => {
                                            $('.faceit_content').css('display', 'flex');
                                            // Show sponsor block
                                            showSponsor();
                                        },
                                        error: data => {
                                            if (data.status === 404) {
                                                $('.LoadingWrapper').hide();
                                                $('.profile_content').prepend(ELEMENT_NO_CS);
                                                return;
                                            }
                                        }
                                    });
                                } else {
                                    $('.LoadingWrapper').hide();
                                    $('.profile_content').prepend(ELEMENT_NO_CS);
                                    return;
                                }
                            }
                        });
                    } else {
                        $('.LoadingWrapper').hide();
                        $('.profile_content').prepend(ELEMENT_MATCHES_NOT_FOUND);
                        $('.showcase_stats_row').css('display', 'flex').css('justify-content', 'center');
                    }
                }
            });
        },
        // Show preloader on request
        beforeSend: () => {
            $('.profile_content').prepend(ELEMENT_LOADING);
        }
    });
}
// Sponsor popup
$('body')
    .append(`
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
                <p class="popup-intro popup-intro-note">If you'd rather not see it, no hard feelings — you can hide it forever below. But if you do keep it, thank you. It genuinely makes a difference. 🙏</p>
                <div class="popup-hide-button">✕ Hide this ad forever</div>
            </div>
            </div>
        </div>`
    );
// Get last 30 games when click on button
$(document).on('click', '.faceit_stats_load', () => {
    if (!$(".faceit_match_card")[0]) {
        getLastGames();
    } else {
        $('.faceit_matches_list').toggle();
        $('.faceit_stats_content').attr('style', `margin-top: ${$('.faceit_matches_list').is(':visible') ? '8px' : '0'} !important`);
    }
});
// Open match details
$(document).on('click', '.faceit_match_card:not(.faceit_stats_leaver)', (e) => {
    if ($(e.target).closest('a').length) return;
    const card = $(e.currentTarget);
    const matchID = card.data('match-id');
    const arrow = card.find('.faceit_match_expand');
    const details = $(`.faceit_match_details[data-id="${matchID}"]`);

    arrow.text(arrow.text().trim() === '▾' ? '▴' : '▾');
    details.toggle();

    // Load party data once on first expand
    if (details.is(':visible') && !details.data('parties-loaded')) {
        details.data('parties-loaded', true);
        const faceitMatchId = matchList[matchID]?.match?.id;
        if (!faceitMatchId) return;
        sendMessage({
            type: 'fetchUrl',
            url: `https://api.faceit.com/match/v2/match/${faceitMatchId}`
        }, response => {
            if (!response?.success) return;
            // parties = [{ partyId, users: [playerId, ...] }, ...]
            const parties = response.data?.payload?.parties;
            if (!parties?.length) return;
            const OTHER_COLORS = ['80,140,255', '180,80,255', '255,200,50', '50,200,220'];
            // Ally party (contains current player) gets green, enemy parties cycle through other colors
            const myPartyId = parties.find(p => p.users.includes(faceitPlayerID))?.partyId;
            let otherIdx = 0;
            parties.forEach(party => {
                if (party.users.length < 2) return;
                const color = party.partyId === myPartyId
                    ? '80,200,120'
                    : OTHER_COLORS[otherIdx++ % OTHER_COLORS.length];
                party.users.forEach(playerId => {
                    const $row = details.find(`a[data-player_id="${playerId}"]`).closest('.faceit_player_row');
                    if (!$row.length) return;
                    $row.addClass('faceit_player_party').css('--pcolor', color).attr('data-party-color', color);
                });
            });
        });
    }
});
// Party hover — shift all members of the same party together
$(document).on('mouseenter', '.faceit_player_party', function () {
    const color = $(this).attr('data-party-color');
    $(this).closest('.faceit_match_details')
        .find(`.faceit_player_party[data-party-color="${color}"]`)
        .addClass('faceit_party_hover');
}).on('mouseleave', '.faceit_player_party', function () {
    const color = $(this).attr('data-party-color');
    $(this).closest('.faceit_match_details')
        .find(`.faceit_player_party[data-party-color="${color}"]`)
        .removeClass('faceit_party_hover');
});
// Open player steam profile
$(document).on('click', '.text-primary', (e) => {
    getSteamId64($(e.currentTarget));
});
// Toggle maps dropdown
$(document).on('click', '.faceit_maps_cog', function (e) {
    e.stopPropagation();
    const dropdown = $('.faceit_maps_dropdown');
    if (dropdown.is(':visible')) {
        dropdown.hide();
    } else {
        const rect = this.getBoundingClientRect();
        dropdown.css({ top: rect.bottom + 4, left: rect.left }).show();
    }
});
// Close dropdown when clicking outside or scrolling
$(document).on('click', (e) => {
    if (!$(e.target).closest('.faceit_maps_header').length && !$(e.target).closest('.faceit_maps_dropdown').length) {
        $('.faceit_maps_dropdown').hide();
    }
});
// Map filter toggle
$(document).on('change', '.faceit_maps_option input', function () {
    const map = $(this).val();
    if ($(this).is(':checked')) {
        if (!MAPS_VETO.includes(map)) MAPS_VETO.push(map);
    } else {
        MAPS_VETO.splice(MAPS_VETO.indexOf(map), 1);
    }
    chrome.storage.local.set({ steamify_maps_veto: MAPS_VETO });
    // Re-render maps
    $('.faceit_maps').empty();
    if (window._faceit_segments) getMapsStats(window._faceit_segments);
});
// Compare button — fetch logged-in user's stats and show comparison modal
$(document).on('click', '.faceit_compare_btn', async function () {
    if ($('.faceit_compare_overlay').length) return;
    const $btn = $(this);
    const showModal = (myProfile, myElo, myLevel, myStats) => {
        $('body').append(compareModalLayout(
            viewedPlayerStore.data, viewedPlayerStore.elo, viewedPlayerStore.level, viewedPlayerStore.lifetime,
            myProfile, myElo, myLevel, myStats.lifetime,
            viewedPlayerStore.segments, myStats.segments
        ));
    };
    if (myCompareCache) {
        const { myProfile, myElo, myLevel, myStats } = myCompareCache;
        showModal(myProfile, myElo, myLevel, myStats);
        return;
    }
    $btn.text('Loading...');
    try {
        const myProfile = await new Promise((res, rej) => $.getJSON({
            url: `${API_URL}/players?game=cs2&game_player_id=${comparedSteamID}`,
            success: res, error: rej
        }));
        const [myStats, myPlayer] = await Promise.all([
            new Promise((res, rej) => $.getJSON({ url: `${API_URL}/players/${myProfile.player_id}/stats/cs2`, success: res, error: rej })),
            new Promise((res, rej) => $.getJSON({ url: `${API_URL}/players/${myProfile.player_id}`, success: res, error: rej }))
        ]);
        const myElo = myPlayer.games?.cs2?.faceit_elo ?? '?';
        const myLevel = myPlayer.games?.cs2?.skill_level ?? 1;
        myCompareCache = { myProfile, myElo, myLevel, myStats };
        showModal(myProfile, myElo, myLevel, myStats);
    } catch (e) {
        $btn.text('No Faceit account');
        setTimeout(() => $btn.text('⚖ Compare'), 2000);
        return;
    }
    $btn.text('⚖ Compare');
});
// Close compare modal on overlay click or close button
$(document).on('click', '.faceit_compare_overlay', e => {
    if ($(e.target).hasClass('faceit_compare_overlay') || $(e.target).hasClass('faceit_cmp_close')) {
        $('.faceit_compare_overlay').remove();
    }
});
// Close compare modal on ESC key
$(document).on('keydown', e => {
    if (e.key === 'Escape') $('.faceit_compare_overlay').remove();
});