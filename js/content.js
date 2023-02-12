const
    // Bearer faceit client side key
    BEARER = 'Bearer 2ca58611-1bf4-4b37-b0a9-042631fd9f80',
    // Steam base id64
    IDENT = '76561197960265728',
    // Faceit API v4 url
    API_URL = 'https://open.faceit.com/data/v4',

    // sotsad emoticon :P
    E_SOTSAD = `<img alt=":sotsad:" src="${chrome.runtime.getURL('images/icon/sotsad.png')}">`,

    // No faceit profile
    L_NOT_FOUND =
    $('<div>', {
        class: "showcase_content_bg showcase_stats_row not_found",
        text: "Faceit account wasn`t found"
    }).append(E_SOTSAD),

    // No available matches
    L_MATCHES_NOT_FOUND =
    $('<div>', {
        class: "showcase_content_bg showcase_stats_row not_found",
        text: "No matches found"
    }).append(E_SOTSAD),

    // Preloader bar
    L_LOADING =
    $('<div>', {
        class: "LoadingWrapper wrapper-orange"
    }).append($('<div>', { class: "LoadingThrobber" })
        .append($('<div>', { class: "Bar Bar1" }))
        .append($('<div>', { class: "Bar Bar2" }))
        .append($('<div>', { class: "Bar Bar3" }))),

    // An error happend
    L_ERROR =
    $('<div>', {
        class: "showcase_content_bg showcase_stats_row not_found",
        text: "An error"
    }).append(E_SOTSAD),

    // No csgo profile on faceit
    L_NO_CSGO =
    $('<div>', {
        class: "showcase_content_bg showcase_stats_row not_found",
        text: "No CSGO stats on Faceit"
    }).append(E_SOTSAD),

    // Current map pool
    MAPS_VETO = [
        // 'de_train',
        // 'de_dust2',
        'de_nuke',
        'de_mirage',
        'de_inferno',
        'de_vertigo',
        'de_overpass',
        'de_ancient',
        'de_anubis'
    ],

    additional_th = '<th colspan=7>PLAYER</th><th>MVPs</th><th>TRIPLE</th><th>QUADRO</th><th>PENTA</th>',

    verified_svg = `<svg height="16" width="16" viewBox="0 0 24 24" data-tooltip-html="FACEIT confirmed this is the authentic profile for this player">
                        <path fill-rule="evenodd" clip-rule="evenodd" fill="#ff5500" d="M12.531 2.034a.667.667 0 0 0-1.062 0L9.379 4.79a.667.667 0 0 1-.623.258L5.33 4.577a.667.667 0 0 0-.752.752l.472 3.427a.667.667 0 0 1-.258.622l-2.757 2.09a.667.667 0 0 0 0 1.063l2.757 2.09a.67.67 0 0 1 .258.623l-.472 3.427a.667.667 0 0 0 .752.752l3.427-.472a.667.667 0 0 1 .622.258l2.09 2.757a.667.667 0 0 0 1.063 0l2.09-2.757a.667.667 0 0 1 .623-.258l3.427.472a.667.667 0 0 0 .752-.752l-.472-3.427a.667.667 0 0 1 .258-.622l2.757-2.09a.667.667 0 0 0 0-1.063l-2.757-2.09a.667.667 0 0 1-.258-.623l.472-3.427a.667.667 0 0 0-.752-.752l-3.427.472a.667.667 0 0 1-.622-.258l-2.09-2.757zM6.667 11.2l4.571 4.8 6.095-8-6.095 4.8-4.571-1.6z"></path>
                    </svg>`;

let size = 21,
    matches_list,
    faceit_playerID,
    match_list = list_of_players = [],
    last_hs = last_kd = '?';

// Ajax setup headers
$.ajaxSetup({
    headers: {
        'Authorization': BEARER,
    }
});
// Add team
const addTeam = (array, match_id, side) => {
    $.each(array.players.sort((a, b) => (parseInt(a['player_stats'].Kills) >= parseInt(b['player_stats'].Kills)) ? 1 : -1), players => {
        playersLayout(match_id, side, array.players[players]);
    });
}
// Get maps detailed stats
const getMapsStats = (segments) => {
    $.each(segments, map => {
        if (segments[map].mode === '5v5' && MAPS_VETO.includes(segments[map].label)) {
            $('.faceit_maps').append(
                mapsLayout(segments[map])
            );
        }
    });
}
// Calculate average
const calcAvg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
// Showcase layout
const showcaseLayout = (lifetime, profile, elo, skill_level, win, lose, last_hs, last_kd, verified) => {
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
                        <div class="value"><span class="text-white">${Math.round((win / 20) * 100)}</span> / ${lifetime['Win Rate %']}%</div>
                        <div class="label">WINRATE</div>
                    </a>
                    <a class="showcase_stat">
                        <div class="value"><span class="text-white last_hs">${last_hs}</span> / ${lifetime['Average Headshots %']}%</div>
                        <div class="label">AVG HS%</div>
                    </a>
                    <a class="showcase_stat">
                        <div class="value"><span class="text-white last_kd">${last_kd}</span> / ${lifetime['Average K/D Ratio']}</div>
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
                        .faceit_badge .favorite_badge_icon::after {
                            content: "${elo}"
                        }
                        </style>
                        <div class="favorite_badge_icon" data-tooltip-html="Level and ELO on Faceit">
                            <a class="text-white" target="_blank" href="https://faceit.com/en/players/${profile.nickname}">
                                <img src="${chrome.runtime.getURL(`images/lvl_${skill_level}.svg`)}" class="badge_icon small"> </a> </div>
                                <div class="favorite_badge_description">
                                    <div class="name ellipsis">
                                        <a class="text-white" target="_blank" href="https://faceit.com/en/players/${profile.nickname}">${profile.nickname}</a>
                                        ${verified ? verified_svg : ''}
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
const playersLayout = (match_id, team, player) => {
    return $(`.${match_id}_team_${team}`).after(`
        <tr data-id="${match_id}" class="nonresponsive_hidden faceit_row faceit_stats_details">
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

    let count = 0;

    $.each(matches_list, game => {

        if (game === 20) return;

        var counter = game,
            game = matches_list[game];

        // Get match detailed data to create a table
        $.getJSON({
            url: `${API_URL}/matches/${game.match_id}/stats`,
            success: data => {
                $.each(data.rounds, stats => {
                    let match = data.rounds[stats],
                        round_stats = match.round_stats,
                        map = round_stats.Map,
                        score = round_stats.Score,
                        winner = round_stats.Winner,
                        region = round_stats.Region,
                        players_list = [];

                    // List of teams in match
                    $.each(match.teams, teams => {
                        let team = match.teams[teams],
                            team_id = team.team_id,
                            team_name = team.team_stats.Team;

                        match_list[counter].match.teams = [match.teams];

                        $.each(team.players, players => {
                            // List of players in match
                            let player = team.players[players],
                                player_stats = player.player_stats;

                            players_list.push(player.player_id);

                            if (player.player_id === faceit_playerID && match_list[counter].match.id === game.match_id) {
                                // Player stats in game
                                match_list[counter].team_name = team_name;
                                match_list[counter].team_id = team_id;
                                match_list[counter].score = score;
                                match_list[counter].map = map;
                                match_list[counter].faceit_url = `https://www.faceit.com/en/csgo/room/${game.match_id}`;
                                match_list[counter].assists = player_stats['Assists'];
                                match_list[counter].deaths = player_stats['Deaths'];
                                match_list[counter].kills = player_stats['Kills'];
                                match_list[counter].kda = player_stats['K/D Ratio'];
                                match_list[counter].kr = player_stats['K/R Ratio'];
                                match_list[counter].hs = player_stats['Headshots'];
                                match_list[counter].hs_percent = player_stats['Headshots %'];
                                match_list[counter].mvps = player_stats['MVPs'];
                                match_list[counter].tripple = player_stats['Triple Kills'];
                                match_list[counter].quadro = player_stats['Quadro Kills'];
                                match_list[counter].penta = player_stats['Penta Kills'];
                            }
                        });
                    });
                    if ($.inArray(faceit_playerID, players_list) <= -1) match_list[counter].leaver = 1;
                });
            },
            complete: () => {
                $('.faceit_stats_content').attr('style', 'margin-top: 32px !important');
                $('.faceit_stats').show();
                $('.faceit_stats_load').text(`LOADING... [${count - 1}]`);

                if (count === (matches_list.length - 2)) {

                    $('.faceit_stats_load').text(`LAST ${matches_list.length - 1} GAMES`);

                    let [HS, KD] = [
                        [],
                        []
                    ];

                    $.each(match_list, match_id => {

                        if (match_id === 20) return;

                        let match = match_list[match_id],
                            team_A = match.match.teams[0][0],
                            team_B = match.match.teams[0][1],
                            is_winner = match.match.winner,
                            winner_id = match.match.winner_id;

                        if (!match.leaver) {
                            KD.push(parseFloat(match.kda));
                            HS.push(parseFloat(match.hs_percent));
                        }

                        $('.last_hs').text(calcAvg(HS).toFixed(0));
                        $('.last_kd').text(calcAvg(KD).toFixed(2));

                        if (match.leaver) {
                            $('.faceit_stats_tbody').append(
                                `<tr data-match-id="${match_id}" class="faceit_row faceit_stats_leaver">
                                    <td style="text-align:center;font-weight:bold;padding-left:0;">
                                        A
                                    </td>
                                    <td colspan=9 style="text-align:center;font-weight:bold;padding-left:0;">
                                        ABANDONED
                                    </td>
                                    <td>
                                        <a href="https://faceit.com/en/csgo/room/${match.match.id}" target="_blank" class="filter_tag_button_ctn" data-tooltip-html="Check match on faceit">
                                            <div class="btn_black btn_details btn_small">
                                                <span>🔗</span>
                                            </div>
                                        </a>
                                    </td>
                                </tr>`);
                        } else {
                            $('.faceit_stats_tbody').append(`
                                <tr data-match-id="${match_id}" class="faceit_row faceit_stats_${(is_winner) ? `win` : `lose`}">
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
                                                ((match_id === (matches_list.length - 1)) ? `` : (match_list[match_id + 1].elo === undefined) ?
                                                    `` : `(` +
                                                    (((match.elo - match_list[match_id + 1].elo) < 0) ?
                                                        match.elo - match_list[match_id + 1].elo :
                                                        `+` + (match.elo - match_list[match_id + 1].elo)) + `)</span>`)}
                                        </span>
                                    </td>
                                    -->
                                    <td>
                                        <div class="filter_tag_button_ctn" data-tooltip-html="Check match details">
                                            <div class="btn_black btn_details btn_small">
                                                <span>
                                                    <span class="btn_details_arrow down"></span>
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                <tr data-id="${match_id}" class="nonresponsive_hidden faceit_stats_details_header">
                                    <th colspan=7>
                                        <span class="stat_${(winner_id === 'faction1') ? `increase` : `decrease`}">${team_A.team_stats['Team'].toUpperCase()} SCOREBOARD</span>
                                    </th>
                                    <th colspan=3>
                                        <span>
                                            FINAL SCORE: <span class="text-white">${team_A.team_stats['Final Score']} <span data-tooltip-html="FIRST HALF">(${team_A.team_stats['First Half Score']}</span>:<span data-tooltip-html="SECOND HALF">${team_A.team_stats['Second Half Score']}</span> | <span data-tooltip-html="OVERTIME">${team_A.team_stats['Overtime score']}</span>)
                                        </span>
                                    </th>
                                    <th>
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
                                <tr data-id="${match_id}" class="nonresponsive_hidden faceit_stats_details_header ${match_id}_team_A">${additional_th}</tr>
                                <tr data-id="${match_id}" class="nonresponsive_hidden faceit_stats_details_header">
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
                                <tr data-id="${match_id}" class="nonresponsive_hidden faceit_stats_details_header ${match_id}_team_B">${additional_th}</tr>`);

                            addTeam(team_A, match_id, 'A');
                            addTeam(team_B, match_id, 'B');
                        }
                    });
                } else {
                    count++;
                }
            }
        });
        // Get match finish time and demo link
        $.getJSON({
            url: `${API_URL}/matches/${game.match_id}`,
            success: data => {
                match_list[counter].finished_at = new Date(data.finished_at * 1000).toLocaleString('en-GB');
            },
            error: data => {
                match_list[counter].finished_at = '---';
            },
            complete: data => {
                try { match_list[counter].demo_url = data.responseJSON.demo_url[0]; } catch (e) { match_list[counter].demo_url = 'empty'; }
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
            window.open(`https://steamcommunity.com/profiles/${data.steam_id_64}`, "_blank", "noopener,noreferrer");
        },
        beforeSend: () => {
            $(player).css('cursor', 'wait');
        }
    });
}
// parse steamid
const parseSteamId = () => {
    return $.parseJSON(`{"${$('.responsive_page_template_content script').html().split('{"').pop().split('"}')[0]}"}`).steamid;
}

if (!$(".faceit_maps")[0]) {

    // Get steamid
    let steam_id = parseSteamId();

    $.getJSON({
        url: `${API_URL}/search/players?nickname=${steam_id}&offset=0&limit=1`,
        success: data => {
            let verified = data.items[0].verified;

            // If faceit profile not found return error
            if (data.items.length === 0) {
                $('.LoadingWrapper').hide();
                $('.profile_content').prepend(L_NOT_FOUND);
                return;
            }

            faceit_playerID = data.items[0].player_id;

            let win = lose = 0,
                banned = data.items[0].status;

            // Get last 20 games
            $.getJSON({
                url: `${API_URL}/players/${faceit_playerID}/history?from=0&game=csgo&limit=${size}`,
                success: data => {

                    matches_list = data.items;

                    if (matches_list.length > 0) {
                        $('.private_profile').addClass('DefaultTheme');
                        $('.private_profile .profile_content').css('padding-bottom', 8);
                        $('.profile_content').css('min-height', 'auto').prepend('<div class="showcase_content_bg showcase_stats_row faceit_content"></div>');
                        $('.faceit_content').append(statsLayout());

                        $.each(matches_list, match_id => {

                            var match = matches_list[match_id];

                            match_list.push({
                                "match": {
                                    "id": match.match_id,
                                    "teams": {}
                                }
                            });

                            if (match_id === 20) return;
                            $.each(match.teams, faction => {
                                $.each(match.teams[faction].players, player => {
                                    if (match.teams[faction].players[player].player_id === faceit_playerID) {
                                        if (match.results.winner === faction) {
                                            win++;
                                            match_list[match_id].match.winner = 1;
                                        } else {
                                            lose++;
                                            match_list[match_id].match.winner = 0;
                                        }
                                        match_list[match_id].match.winner_id = match.results.winner;
                                    }
                                });
                            });
                        });

                        if (matches_list.length < size) size = matches_list.length;

                        // Get lifetime stats
                        $.getJSON({
                            url: `${API_URL}/players/${faceit_playerID}`,
                            success: data => {
                                // If csgo profile exists
                                if (data.games['csgo']) {
                                    let profile_data = data,
                                        faceit_elo = profile_data.games['csgo'].faceit_elo,
                                        skill_level = profile_data.games['csgo'].skill_level;
                                    // Get csgo stats
                                    $.getJSON({
                                        url: `${API_URL}/players/${faceit_playerID}/stats/csgo`,
                                        success: data => {

                                            let lifetime = data.lifetime,
                                                segments = data.segments.sort((a, b) => (parseInt(a['stats'].Matches) <= parseInt(b['stats'].Matches)) ? 1 : -1);

                                            $('.LoadingWrapper').hide();
                                            $('.faceit_content').prepend(
                                                showcaseLayout(
                                                    lifetime,
                                                    profile_data,
                                                    faceit_elo,
                                                    skill_level,
                                                    win,
                                                    lose,
                                                    last_hs,
                                                    last_kd,
                                                    verified
                                                )
                                            );
                                            
                                            getMapsStats(segments);

                                            // Check if maps played length equals to MapsVeto length to center them
                                            if ($('.faceit_maps > *').length < MAPS_VETO.length) {
                                                $('.faceit_maps').css('justify-content', 'center');
                                            }
                                            // Ban bar
                                            if (banned != '' && banned != 'AVAILABLE' && banned != 'active' && banned != 'BUSY') {
                                                $('.faceit_content').css('padding-top', '28px').prepend(`<div class="banned" data-tooltip-html="Ban reason">${banned}</div>`)
                                            }
                                        },
                                        error: data => {
                                            if (data.status === 404) {
                                                $('.LoadingWrapper').hide();
                                                $('.profile_content').prepend(L_NO_CSGO);
                                                return;
                                            }
                                        }
                                    });
                                } else {
                                    $('.LoadingWrapper').hide();
                                    $('.profile_content').prepend(L_NO_CSGO);
                                    return;
                                }
                            }
                        });
                    } else {
                        $('.LoadingWrapper').hide();
                        $('.profile_content').prepend(L_MATCHES_NOT_FOUND);
                    }
                }
            });
        },
        complete: () => {
            $('.faceit_content').show();
        },
        // Show preloader on request
        beforeSend: data => {
            $('.profile_content').prepend(L_LOADING);
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
    $(e.currentTarget).find('.btn_details_arrow').toggleClass('down').toggleClass('up');
    $(`tr[data-id=${$(e.currentTarget).parents('.faceit_row').data('match-id')}]`).toggle();
});
// Open player steam profile
$(document).on('click', '.text-primary', (e) => {
    getSteamId64($(e.currentTarget));
});