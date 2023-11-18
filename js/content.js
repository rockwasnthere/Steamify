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

    ELEMENT_STATS_HEADER = `<th colspan=7>PLAYER</th>
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

    // Current map pool
    MAPS_VETO = [
        // 'de_dust2',
        // 'de_cache',
        // 'de_train',
        // 'de_cbble',
        'de_nuke',
        'de_mirage',
        'de_inferno',
        'de_vertigo',
        'de_overpass',
        'de_ancient',
        'de_anubis'
    ],

    BAN_STATUSES = [
        '',
        'AVAILABLE',
        'active',
        'BUSY'
    ];

let matchesLimit = 21,
    matchesList,
    faceitPlayerID,
    matchList = [],
    lastHS = lastKD = '?';

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
const showcaseLayout = (lifetime, profile, elo, level, win, lose, lastHS, lastKD, verified) => {
    return `
        <div class="showcase_faceit_content">
            <div class="showcase_stats">
                <div class="showcase_faceit">
                    <a class="showcase_stat showcase_stat_faceit">
                        <div class="value"><span class="text-white">LAST 20</span> / OVERALL</div>
                    </a>
                    <a class="showcase_stat" data-tooltip-html="Matches played w/o leaves">
                        <div class="value">${lifetime['Matches']}</div>
                        <div class="label">MATCHES</div>
                    </a>
                    <a class="showcase_stat">
                        <div class="value"><span class="text-white">${Math.round((win / ((lifetime['Matches'] > 20) ? 20 : lifetime['Matches'])) * 100)}</span> / ${lifetime['Win Rate %']}%</div>
                        <div class="label">WINRATE</div>
                    </a>
                    <a class="showcase_stat">
                        <div class="value"><span class="text-white lastHS">${lastHS}</span> / ${lifetime['Average Headshots %']}%</div>
                        <div class="label">AVG HS%</div>
                    </a>
                    <a class="showcase_stat">
                        <div class="value"><span class="text-white lastKD">${lastKD}</span> / ${lifetime['Average K/D Ratio']}</div>
                        <div class="label">AVG K/D</div>
                    </a>
                    <a class="showcase_stat" data-tooltip-html="Current streak / Max. streak">
                        <div class="value"><span class="${(lifetime['Current Win Streak'] === '0') ? 'lose' : 'win'}">${lifetime['Current Win Streak']}</span> / ${lifetime['Longest Win Streak']}</div>
                        <div class="label">STREAK</div>
                    </a>
                </div>
            </div>
            <div class="faceit_badge">
                <div class="profile_header_badge" style="background-image: url(${profile.cover_image});">
                    <div class="favorite_badge">
                        <style>
                            .faceit_badge .favorite_badge_icon::after {content: "${elo}"}
                        </style>
                        <div class="favorite_badge_icon" data-tooltip-html="Level and ELO on Faceit">
                            <a class="text-white" target="_blank" href="https://faceit.com/en/players/${profile.nickname}">
                                <img src="${chrome.runtime.getURL(`images/lvl_${level}.svg`)}" class="badge_icon small">
                            </a>
                        </div>
                        <div class="favorite_badge_description">
                            <div class="name ellipsis">
                                <a class="text-white" target="_blank" href="https://faceit.com/en/players/${profile.nickname}">${profile.nickname}</a>
                                ${verified ? ELEMENT_VERIFIED : ''}
                            </div>
                            <div>
                                Membership: ${profile.memberships[0]}
                            </div>
                            <div>
                                Last 20 games: <div class="favorite_bi_win">${win}</div>:<div class="favorite_bi_lose">${lose}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div style="clear: left;"></div>
        <div class="game_info_stats">
            <div class="game_info_faceit_header">Maps played</div>
            <div class="game_info_achievements_only_ctn">
                <div class="game_info_achievements">
                    <div class="achievement_icons faceit_maps"></div>
                </div>
            </div>
            <div class="game_info_faceit_header faceit_stats_load">CLICK TO LOAD LAST 20 GAMES STATS</div>
        </div>`;
}
// Stats layout
const statsLayout = () => {
    return `
    <div class="page_content faceit_stats_content under_popup">
        <table class="faceit_stats nonresponsive_hidden">
            <thead>
                <tr>
                    <th class="faceit_col col_header">RESULT</th>
                    <th class="faceit_col col_header">TEAM</th>
                    <th class="faceit_col col_header">SCORE</th>
                    <th class="faceit_col col_header">K-A-D</th>
                    <th class="faceit_col col_header">K/D</th>
                    <th class="faceit_col col_header">K/R</th>
                    <th class="faceit_col col_header">HS</th>
                    <th class="faceit_col col_header">MAP</th>
                    <th class="faceit_col col_header">DATE</th>
                    <!--<th class="faceit_col col_header">ELO</th>-->
                    <th class="faceit_col col_header"></th>
                </tr>
            </thead>
            <tbody class="faceit_stats_tbody">
            </tbody>
        </table>
    </div>`;
}
// Players layout
const playersLayout = (matchID, team, player) => {
    return $(`.${matchID}_team_${team}`).after(`
        <tr data-id="${matchID}" class="nonresponsive_hidden faceit_row faceit_stats_details">
            <td colspan=3 class="links">
                <a class="text-primary" data-player_id="${player.player_id}"><span>[Steam]</span></a>
                <a href="https://www.faceit.com/en/players/${player.nickname}" target="_blank" class="text-faceit"><span>${player.nickname}</span></a>
            </td>
            <td>
                <span>${player.player_stats['Kills']}-${player.player_stats['Assists']}-${player.player_stats['Deaths']}</span>
            </td>
            <td>
                <span class="stat_${(player.player_stats['K/D Ratio'] < 1) ? 'decrease' : 'increase'}">${player.player_stats['K/D Ratio']}</span>
            </td>
            <td>
                <span class="stat_${(player.player_stats['K/R Ratio'] < 1) ? 'decrease' : 'increase'}">${player.player_stats['K/R Ratio']}</span>
            </td>
            <td>
                <span>${player.player_stats['Headshots %']}% (${player.player_stats['Headshots']})</span>
            </td>
            <td>
                <span class="${(player.player_stats['MVPs'] > 0) ? 'text-white' : ''}">${player.player_stats['MVPs']}</span>
            </td>
            <td>
                <span class="${(player.player_stats['Triple Kills'] > 0) ? 'text-white' : ''}">${player.player_stats['Triple Kills']}</span>
            </td>
            <td>
                <span class="${(player.player_stats['Quadro Kills'] > 0) ? 'text-white' : ''}">${player.player_stats['Quadro Kills']}</span>
            </td>
            <td>
                <span class="${(player.player_stats['Penta Kills'] > 0) ? 'text-white' : ''}">${player.player_stats['Penta Kills']}</span>
            </td>
        </tr>`);
}
// Maps layout
const mapsLayout = (map) => {
    return $('<div>', {
            class: "game_info_achievement plus_more",
            'data-tooltip-html': map.label,
            style: `background-image: url(${map.img_small})`
        })
        .append($('<span>', {
                class: "kd",
                text: "K/D:"
            })
            .append($('<span>', {
                class: (map.stats['Average K/D Ratio'] >= 1) ? 'win' : 'lose',
                text: map.stats['Average K/D Ratio']
            })))
        .append($('<span>', {
            class: "winrate",
            text: `${map.stats['Win Rate %']}%`
        }))
        .append($('<span>', {
                class: "wr",
            })
            .append($('<span>', {
                class: "win",
                text: map.stats['Wins']
            }))
            .append(':')
            .append($('<span>', {
                class: "lose",
                text: (parseInt(map.stats['Matches']) - parseInt(map.stats['Wins']))
            })));
}
// Get 20 last games
const getLastGames = () => {

    let loadingCounter = 1;

    $.each(matchesList, game => {

        if (game === 21) return;

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
                $('.faceit_stats_content').attr('style', 'margin-top: 32px !important');
                $('.faceit_stats').show();
                $('.faceit_stats_load').text(`LOADING... [${loadingCounter - 1}]`);

                if (loadingCounter === matchesList.length) {
                    $('.faceit_stats_load').text(`LAST ${(matchesList.length === 21) ? 20 : matchesList.length} GAMES`);

                    let [HS, KD] = [
                        [],
                        []
                    ];

                    $.each(matchList, matchID => {
                        let match = matchList[matchID];

                        if (matchID === 20 || matchList[matchID].match.teams[0] === undefined) return;

                        let team_A = match.match.teams[0][0],
                            team_B = match.match.teams[0][1],
                            is_winner = match.match.winner,
                            winner_id = match.match.winner_id;

                        if (!match.leaver) {
                            KD.push(parseFloat(match.kda));
                            HS.push(parseFloat(match.hs_percent));
                        }

                        $('.lastHS').text(calcAvg(HS).toFixed(0));
                        $('.lastKD').text(calcAvg(KD).toFixed(2));

                        if (match.leaver) {
                            $('.faceit_stats_tbody').append(
                                `<tr data-match-id="${matchID}" class="faceit_row faceit_stats_leaver">
                                <td style="text-align:center;font-weight:bold;padding-left:0;">
                                    A
                                </td>
                                <td colspan=9 style="text-align:center;font-weight:bold;padding-left:0;">
                                    ABANDONED
                                </td>
                                <td>
                                    <a href="https://faceit.com/en/cs2/room/${match.match.id}" target="_blank" class="filter_tag_button_ctn" data-tooltip-html="Check match on faceit">
                                        <div class="btn_black btn_details btn_small">
                                            <span>🔗</span>
                                        </div>
                                    </a>
                                </td>
                            </tr>`);
                        } else {
                            $('.faceit_stats_tbody').append(`
                            <tr data-match-id="${matchID}" class="faceit_row faceit_stats_${(is_winner) ? `win` : `lose`}">
                                <td style="text-align:center;font-weight:bold;padding-left:0;">
                                    ${(is_winner) ? `<span class="stat_increase">W</span>` : `<span class="stat_decrease">L</span>`}
                                </td>
                                <td>
                                    <span><a href="${match.faceit_url}" target="_blank" class="text-underline">${match.team_name}</a></span>
                                </td>
                                <td>
                                    <span>${match.score}</span>
                                </td>
                                <td>
                                    <span>${match.kills}-${match.assists}-${match.deaths}</span>
                                </td>

                                <td>
                                    <span class="stat_${(match.kda < 1) ? 'decrease' : 'increase'}">${match.kda}</span>
                                </td>
                                <td>
                                    <span class="stat_${(match.kr < 1) ? 'decrease' : 'increase'}">${match.kr}</span>
                                </td>

                                <td>
                                    <span>${match.hs_percent}% (${match.hs})</span>
                                </td>


                                <td>
                                    <span>${match.map}</span>
                                </td>
                                <td colspan=2>
                                    <span>${match.finished_at}</span>
                                </td>
                                <!--
                                <td>
                                    <span>
                                        ${(match.elo === undefined) ?
                                    `---` :
                                    match.elo + ` <span class="stat_` +
                                    (
                                        (is_winner) ?
                                            `increase">` :
                                            `decrease">`
                                    ) +
                                    ((matchID === (matchesList.length - 1)) ? `` : (matchList[matchID + 1].elo === undefined) ?
                                        `` : `(` +
                                        (((match.elo - matchList[matchID + 1].elo) < 0) ?
                                            match.elo - matchList[matchID + 1].elo :
                                            `+` + (match.elo - matchList[matchID + 1].elo)) + `)</span>`)}
                                    </span>
                                </td>
                                -->
                                <td class="faceit_arrow">
                                    <div class="filter_tag_button_ctn" data-tooltip-html="Check match details">
                                        <div class="btn_black btn_details btn_small">
                                            <span>
                                                <span class="btn_details_arrow down"></span>
                                            </span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <tr data-id="${matchID}" class="nonresponsive_hidden faceit_stats_details_header">
                                <th colspan=7>
                                    <span class="stat_${(winner_id === 'faction1') ? `increase` : `decrease`}">${team_A.team_stats['Team'].toUpperCase()} SCOREBOARD</span>
                                </th>
                                <th colspan=3>
                                    <span>
                                        FINAL SCORE: <span class="text-white">${team_A.team_stats['Final Score']} <span data-tooltip-html="FIRST HALF">(${team_A.team_stats['First Half Score']}</span>:<span data-tooltip-html="SECOND HALF">${team_A.team_stats['Second Half Score']}</span> | <span data-tooltip-html="OVERTIME">${team_A.team_stats['Overtime score']}</span>)
                                    </span>
                                </th>
                                <th class="faceit_arrow">
                                ${(match.demo_url === 'empty') ?
                                    `` :
                                    `<a href="${match.demo_url}" target="_blank" class="filter_tag_button_ctn" data-tooltip-html="Download demo (directly from faceit)">
                                    <div class="btn_black btn_details btn_small">
                                        <span>
                                            <span class="ico16 btn_active bluearrow_down"></span>
                                        </span>
                                    </div>
                                </a>`}
                                </th>
                            </tr>
                            <tr data-id="${matchID}" class="nonresponsive_hidden faceit_stats_details_header ${matchID}_team_A">${ELEMENT_STATS_HEADER}</tr>
                            <tr data-id="${matchID}" class="nonresponsive_hidden faceit_stats_details_header">
                                <th colspan=7>
                                    <span class="stat_${(winner_id === 'faction2') ? `increase` : `decrease`}">${team_B.team_stats['Team'].toUpperCase()} SCOREBOARD</span>
                                </th>
                                <th colspan=3>
                                    <span>
                                        FINAL SCORE: <span class="text-white">${team_B.team_stats['Final Score']} <span data-tooltip-html="FIRST HALF">(${team_B.team_stats['First Half Score']}</span>:<span data-tooltip-html="SECOND HALF">${team_B.team_stats['Second Half Score']}</span> | <span data-tooltip-html="OVERTIME">${team_B.team_stats['Overtime score']}</span>)
                                    </span>
                                </th>
                                <th>
                                </th>
                            </tr>
                            <tr data-id="${matchID}" class="nonresponsive_hidden faceit_stats_details_header ${matchID}_team_B">${ELEMENT_STATS_HEADER}</tr>`);

                            addTeam(team_A, matchID, 'A');
                            addTeam(team_B, matchID, 'B');
                        }
                    });
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

if (!$(".faceit_maps")[0]) {

    // Get steamid
    let steamID = parseSteamID();

    $.getJSON({
        url: `${API_URL}/search/players?nickname=${steamID}&offset=0&limit=1`,
        success: data => {
            // If faceit profile not found return error
            if (data.items.length === 0) {
                $('.LoadingWrapper').hide();
                $('.profile_content').prepend(ELEMENT_FACEIT_NOT_FOUND);
                $('.showcase_stats_row').css('display', 'flex').css('justify-content', 'center');
                return;
            }

            faceitPlayerID = data.items[0].player_id;

            let win = lose = 0;

            const { status: banned, verified } = data.items[0];

            // Get last 20 games
            $.getJSON({
                url: `${API_URL}/players/${faceitPlayerID}/history?from=0&game=cs2&limit=${matchesLimit}`,
                success: data => {

                    matchesList = data.items;

                    if (matchesList.length > 0) {
                        $('.private_profile').addClass('DefaultTheme');
                        $('.private_profile .profile_content').css('padding-bottom', 8);
                        $('.profile_content').css('min-height', 'auto').prepend('<div class="showcase_content_bg showcase_stats_row faceit_content" style="display:none"></div>');
                        $('.faceit_content').append(statsLayout());

                        $.each(matchesList, matchID => {
                            var match = matchesList[matchID];

                            matchList.push({
                                "match": {
                                    "id": match.match_id,
                                    "teams": {}
                                }
                            });

                            if (matchID === 20) return;

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
                                                    verified
                                                )
                                            );

                                            getMapsStats(segments);

                                            // Check if maps played length equals to MapsVeto length to center them
                                            if ($('.faceit_maps > *').length < MAPS_VETO.length) {
                                                $('.faceit_maps').css('justify-content', 'center');
                                            }
                                            // Ban bar
                                            if (!BAN_STATUSES.includes(banned)) {
                                                $('.faceit_content').css('padding-top', '28px').prepend(`<div class="banned" data-tooltip-html="Ban reason">${banned}</div>`)
                                            }
                                        },
                                        complete: () => {
                                            $('.faceit_content').css('display', 'flex');
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
// Get last 20 games when click on button
$(document).on('click', '.faceit_stats_load', () => {
    if (!$(".faceit_row")[0]) {
        getLastGames();
    }
});
// Open match details
$(document).on('click', '.filter_tag_button_ctn', (e) => {
    $(e.currentTarget).find('.btn_details_arrow').toggleClass('down up');
    $(`tr[data-id=${$(e.currentTarget).parents('.faceit_row').data('match-id')}]`).toggle();
});
// Open player steam profile
$(document).on('click', '.text-primary', (e) => {
    getSteamId64($(e.currentTarget));
});