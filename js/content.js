const
    // Bearer faceit client side key
    BEARER = 'Bearer 2ca58611-1bf4-4b37-b0a9-042631fd9f80',
    // Steam base id64
    IDENT = '76561197960265728',
    // Faceit API v4 url
    API_URL = 'https://open.faceit.com/data/v4',

    // sotsad emoticon :P
    E_SOTSAD = '<img alt=":sotsad:" src="'+ chrome.extension.getURL('images/icon/sotsad.png') + '">',

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

    // Current maps pool
    MAPS_VETO = [
        'de_nuke',
        'de_train',
        'de_dust2',
        'de_mirage',
        'de_inferno',
        'de_vertigo',
        'de_overpass'
    ],

    additional_th = '<th colspan=7>PLAYER</th><th>MVPs</th><th>TRIPLE</th><th>QUADRO</th><th>PENTA</th>';

let avgHS = 0,
    avgKD = 0,
    size = 20,
    average = '',
    demo_url,
    faceit_url,
    finished_at,
    games_list,
    faceit_playerID,
    match_list = [],
    list_of_players = [];

// Ajax setup headers
$.ajaxSetup({
    headers: {
        'Authorization': BEARER,
    }
});

// Showcase layout
function showcaseLayout(lifetime, profile, elo, skill_level, win, lose, last20HS, last20KD) {
    return `
        <div class="showcase_faceit_content">
            <div class="showcase_stats">
                <div class="showcase_faceit">
                    <a class="showcase_stat showcase_stat_faceit">
                        <div class="value"><span class="text-white">LAST 20</span> / OVERALL</div>
                    </a>
                    <a class="showcase_stat" data-tooltip-html="Matches played w/o leaves">
                        <div class="value">` + lifetime['Matches'] + `</div>
                        <div class="label">MATCHES</div>
                    </a>
                    <a class="showcase_stat">
                        <div class="value"><span class="text-white">` + Math.round((win / 20) * 100) + `</span> / ` + lifetime['Win Rate %'] + `%</div>
                        <div class="label">WINRATE</div>
                    </a>
                    <a class="showcase_stat">
                        <div class="value"><span class="text-white">` + last20HS + `</span> / ` + lifetime['Average Headshots %'] + `%</div>
                        <div class="label">AVG HS%</div>
                    </a>
                    <a class="showcase_stat">
                        <div class="value"><span class="text-white">` + last20KD + `</span> / ` + lifetime['Average K/D Ratio'] + `</div>
                        <div class="label">AVG K/D</div>
                    </a>
                    <a class="showcase_stat" data-tooltip-html="Current streak / Max. streak">
                        <div class="value">` + `<span class="` + ((lifetime['Current Win Streak'] === 0) ? 'lose' : 'win') + `">` + lifetime['Current Win Streak'] + `</span>` + ` / ` + lifetime['Longest Win Streak'] + `</div>
                        <div class="label">STREAK</div>
                    </a>
                </div>
            </div>
            <div class="faceit_badge">
                <div class="profile_header_badge" style="background-image: url(` + profile.cover_image + `);">
                    <div class="favorite_badge">
                        <style>
                        .faceit_badge .favorite_badge_icon::after {
                            content: "` + elo + `"
                        }
                        </style>
                        <div class="favorite_badge_icon" data-tooltip-html="Level and ELO on Faceit">
                            <a class="text-white" target="_blank" href="https://faceit.com/en/players/` + profile.nickname + `">
                                <img src="` + chrome.extension.getURL('images/lvl_' + skill_level + '.svg') + `" class="badge_icon small"> </a> </div>
                                <div class="favorite_badge_description">
                                    <div class="name ellipsis">
                                        <a class="text-white" target="_blank" href="https://faceit.com/en/players/` + profile.nickname + `">` + profile.nickname + `</a>
                                    </div>
                                    Membership: ` + profile.membership_type + `<br>Last 20 games:
                                <div class="favorite_bi_win">` + win + `</div>:<div class="favorite_bi_lose">` + lose + `</div>
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
function statsLayout() {
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
                    <th class="faceit_col col_header">ELO</th>
                    <th class="faceit_col col_header"></th>
                </tr>
            </thead>
            <tbody class="faceit_stats_tbody">
            </tbody>
        </table>
    </div>`;
}
// Players layout
function playersLayout(match_id, team, player) {
    return $('.' + match_id + '_team_' + team).after(`
        <tr data-id="` + match_id + `" class="nonresponsive_hidden faceit_row faceit_stats_details">
            <td colspan=3 class="links">
                <a class="text-primary" data-player_id="` + player.player_id + `"><span>[Steam]</span></a>
                <a href="https://www.faceit.com/en/players/` + player.nickname + `" target="_blank" class="text-faceit"><span>` + player.nickname + `</span></a>
            </td>
            <td>
                <span>` + player.player_stats['Kills'] + `-` + player.player_stats['Assists'] + `-` + player.player_stats['Deaths'] + `</span>
            </td>
            <td>
                <span class="stat_` + ((player.player_stats['K/D Ratio'] < 1) ? 'decrease' : 'increase') + `">` + player.player_stats['K/D Ratio'] + `</span>
            </td>
            <td>
                <span class="stat_` + ((player.player_stats['K/R Ratio'] < 1) ? 'decrease' : 'increase') + `">` + player.player_stats['K/R Ratio'] + `</span>
            </td>
            <td>
                <span>` + player.player_stats['Headshots %'] + `% (` + player.player_stats['Headshot'] + `)</span>
            </td>
            <td>
                <span class="` + ((player.player_stats['MVPs'] > 0) ? 'text-white' : '') + `">` + player.player_stats['MVPs'] + `</span>
            </td>
            <td>
                <span class="` + ((player.player_stats['Triple Kills'] > 0) ? 'text-white' : '') + `">` + player.player_stats['Triple Kills'] + `</span>
            </td>
            <td>
                <span class="` + ((player.player_stats['Quadro Kills'] > 0) ? 'text-white' : '') + `">` + player.player_stats['Quadro Kills'] + `</span>
            </td>
            <td>
                <span class="` + ((player.player_stats['Penta Kills'] > 0) ? 'text-white' : '') + `">` + player.player_stats['Penta Kills'] + `</span>
            </td>
        </tr>`);
}
// Maps layout
function mapsLayout(map) {
    return $('<div>', {
            class: "game_info_achievement plus_more",
            'data-tooltip-html': map.label,
            style: "background-image: url(" + map.img_small + ");"
        })
        .append($('<span>', {
                class: "kd",
                text: "K/D:"
            })
            .append($('<span>', {
                class: ((map.stats['Average K/D Ratio'] >= 1) ? 'win' : 'lose'),
                text: map.stats['Average K/D Ratio']
            })))
        .append($('<span>', {
            class: "winrate",
            text: map.stats['Win Rate %'] + "%"
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
function getLastGames() {

    var cnt = 0;

    $.each(games_list, game => {

        var counter = game,
            game = games_list[game];

        // Get match detailed data to create a table
        $.getJSON({
            url: API_URL + '/matches/' + game.match_id + '/stats',
            success: data => {
                $.each(data.rounds, stats => {

                    let match = data.rounds[stats],
                        round_stats = match.round_stats,
                        winner = round_stats.Winner,
                        map = round_stats.Map,
                        region = round_stats.Region,
                        score = round_stats.Score,
                        players_list = [];

                    // List of teams in match
                    $.each(match.teams, teams => {
                        let team = match.teams[teams],
                            team_name = team.team_stats.Team;

                        match_list[counter].match.teams = [match.teams];
                        match_list[counter].leaver = 0;

                        $.each(team.players, players => {
                            // List of players in match
                            let player = team.players[players],
                                player_stats = player.player_stats;

                            players_list.push(player.player_id);

                            if (player.player_id === faceit_playerID) {
                                // Player stats in game
                                if (match_list[counter].match.id === game.match_id) {
                                    match_list[counter].team_name = team_name;
                                    match_list[counter].team_id = team.team_id;
                                    match_list[counter].score = score;
                                    match_list[counter].map = map;
                                    match_list[counter].faceit_url = 'https://www.faceit.com/en/csgo/room/' + game.match_id;
                                    match_list[counter].assists = player_stats['Assists'];
                                    match_list[counter].deaths = player_stats['Deaths'];
                                    match_list[counter].kills = player_stats['Kills'];
                                    match_list[counter].kda = player_stats['K/D Ratio'];
                                    match_list[counter].kr = player_stats['K/R Ratio'];
                                    match_list[counter].hs = player_stats['Headshot'];
                                    match_list[counter].hs_percent = player_stats['Headshots %'];
                                    match_list[counter].mvps = player_stats['MVPs'];
                                    match_list[counter].tripple = player_stats['Triple Kills'];
                                    match_list[counter].quadro = player_stats['Quadro Kills'];
                                    match_list[counter].penta = player_stats['Penta Kills'];
                                }
                            }
                        });

                    });
                    if ($.inArray(faceit_playerID, players_list) <= -1) { match_list[counter].leaver = 1 }
                });
            },
            complete: () => {
                $('.faceit_stats_content').attr('style', 'margin-top: 32px !important');
                $('.faceit_stats').show();
                $('.faceit_stats_load').text('LOADING... [' + cnt + ']');

                if (cnt === (games_list.length - 1)) {

                    $('.faceit_stats_load').text('LAST ' + (games_list.length) + ' GAMES');

                    $.each(match_list, match_id => {

                        let team_A = match_list[match_id].match.teams[0][0],
                            team_B = match_list[match_id].match.teams[0][1],
                            is_winner = match_list[match_id].match.winner,
                            winner_id = match_list[match_id].match.winner_id;

                        if (match_list[match_id].leaver) {
                            $('.faceit_stats_tbody').append(
                                `<tr data-match-id="` + match_id + `" class="faceit_row faceit_stats_leaver">
                                    <td style="text-align:center;font-weight:bold;padding-left:0;">
                                        A
                                    </td>
                                    <td colspan="9" style="text-align:center;font-weight:bold;padding-left:0;">
                                        ABANDONED
                                    </td>
                                    <td>
                                        <a href="https://faceit.com/en/csgo/room/` + match_list[match_id].match.id + `" target="_blank" class="filter_tag_button_ctn" data-tooltip-html="Check match on faceit">
                                            <div class="btn_black btn_details btn_small">
                                                <span>🔗</span>
                                            </div>
                                        </a>
                                    </td>
                                </tr>`);
                        } else {
                            $('.faceit_stats_tbody').append(`
                                <tr data-match-id="` + match_id + `" class="faceit_row faceit_stats_` + ((is_winner === 1) ? `win` : `lose`) + `">
                                    <td style="text-align:center;font-weight:bold;padding-left:0;">
                                        ` + ((is_winner === 1) ? `<span class="stat_increase">W</span>` : `<span class="stat_decrease">L</span>`) + `
                                    </td>
                                    <td>
                                        <span>` + match_list[match_id].team_name + `</span>
                                    </td>
                                    <td>
                                        <span>` + match_list[match_id].score + `</span>
                                    </td>
                                    <td>
                                        <span>` + match_list[match_id].kills + `-` + match_list[match_id].assists + `-` + match_list[match_id].deaths + `</span>
                                    </td>

                                    <td>
                                        <span class="stat_` + ((match_list[match_id].kda < 1) ? 'decrease' : 'increase') + `">` + match_list[match_id].kda + `</span>
                                    </td>
                                    <td>
                                        <span class="stat_` + ((match_list[match_id].kr < 1) ? 'decrease' : 'increase') + `">` + match_list[match_id].kr + `</span>
                                    </td>

                                    <td>
                                        <span>` + match_list[match_id].hs_percent + `% (` + match_list[match_id].hs + `)</span>
                                    </td>


                                    <td>
                                        <span>` + match_list[match_id].map + `</span>
                                    </td>
                                    <td>
                                        <span>` + match_list[match_id].finished_at + `</span>
                                    </td>
                                    <td>
                                        <span>` +
                                ((match_list[match_id].elo === undefined) ?
                                    `---` :
                                    match_list[match_id].elo + ` <span class="stat_` +
                                    (
                                        (is_winner === 1) ?
                                        `increase">` :
                                        `decrease">`
                                    ) +
                                    (((match_id === (games_list.length - 1)) ? `` : (match_list[match_id + 1].elo === undefined) ?
                                        `` : `(` +
                                        (((match_list[match_id].elo - match_list[match_id + 1].elo) < 0) ?
                                            match_list[match_id].elo - match_list[match_id + 1].elo :
                                            `+` + (match_list[match_id].elo - match_list[match_id + 1].elo)) + `)</span>`))) +
                                `</span>
                                    </td>
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
                                <tr data-id="` + match_id + `" class="nonresponsive_hidden faceit_stats_details_header">
                                    <th colspan=7>
                                        <span class="stat_` + ((winner_id === 'faction1') ? `increase` : `decrease`) + `">` + team_A.team_stats['Team'].toUpperCase() + ` SCOREBOARD</span>
                                    </th>
                                    <th colspan=3>
                                        <span>
                                            FINAL SCORE: <span class="text-white">` + team_A.team_stats['Final Score'] + ` <span data-tooltip-html="FIRST HALF">(` + team_A.team_stats['First Half Score'] + `</span>:<span data-tooltip-html="SECOND HALF">` + team_A.team_stats['Second Half Score'] + `</span> | <span data-tooltip-html="OVERTIME">` + team_A.team_stats['Overtime score'] + `</span>)
                                        </span>
                                    </th>
                                    <th>` +
                                ((match_list[match_id].demo_url === 'empty') ?
                                    `` :
                                    `<a href="` + match_list[match_id].demo_url + `" target="_blank" class="filter_tag_button_ctn" data-tooltip-html="Download demo (directly from faceit)">
                                            <div class="btn_black btn_details btn_small">
                                                <span>
                                                    <span class="ico16 btn_active bluearrow_down"></span>
                                                </span>
                                            </div>
                                        </a>`) + `
                                    </th>
                                </tr>
                                <tr data-id="` + match_id + `" class="nonresponsive_hidden faceit_stats_details_header ` + match_id + `_team_A">` + additional_th + `</tr>
                                <tr data-id="` + match_id + `" class="nonresponsive_hidden faceit_stats_details_header">
                                    <th colspan=7>
                                        <span class="stat_` + ((winner_id === 'faction2') ? `increase` : `decrease`) + `">` + team_B.team_stats['Team'].toUpperCase() + ` SCOREBOARD</span>
                                    </th>
                                    <th colspan=3>
                                        <span>
                                            FINAL SCORE: <span class="text-white">` + team_B.team_stats['Final Score'] + ` <span data-tooltip-html="FIRST HALF">(` + team_B.team_stats['First Half Score'] + `</span>:<span data-tooltip-html="SECOND HALF">` + team_B.team_stats['Second Half Score'] + `</span> | <span data-tooltip-html="OVERTIME">` + team_B.team_stats['Overtime score'] + `</span>)
                                        </span>
                                    </th>
                                    <th>
                                    </th>
                                </tr>
                                <tr data-id="` + match_id + `" class="nonresponsive_hidden faceit_stats_details_header ` + match_id + `_team_B">` + additional_th + `</tr>`
                            );
                            $.each(team_A.players.sort((a, b) => (parseInt(a['player_stats'].Kills) >= parseInt(b['player_stats'].Kills)) ? 1 : -1), players => {
                                playersLayout(match_id, 'A', team_A.players[players]);
                            });
                            $.each(team_B.players.sort((a, b) => (parseInt(a['player_stats'].Kills) >= parseInt(b['player_stats'].Kills)) ? 1 : -1), players => {
                                playersLayout(match_id, 'B', team_B.players[players]);
                            });
                        }
                    });
                } else {
                    cnt++;
                }
            }
        });
        // Get match finish time and demo link
        $.getJSON({
            url: API_URL + '/matches/' + game.match_id,
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
function getSteamId64(player) {
    $.getJSON({
        url: API_URL + '/players/' + player.data('player_id'),
        success: data => {
            $(player).css('cursor','pointer');
            window.open('https://steamcommunity.com/profiles/' + data.steam_id_64, "_blank", "noopener,noreferrer");
        },
        beforeSend: () => {
            $(player).css('cursor','wait');
        }
    });
}

if (!$(".faceit_maps")[0]) {

    // Get steamid
    let steam_id = $.parseJSON('{"' + $('.responsive_page_template_content script').html().split('{"').pop().split('"}')[0] + '"}').steamid;

    $.getJSON({
        url: API_URL + '/search/players?nickname=' + steam_id + '&offset=0&limit=1',
        success: data => {

            // If faceit profile not found return error
            if (data.items.length === 0) {
                $('.LoadingWrapper').hide();
                $('.profile_content').prepend(L_NOT_FOUND);
                return;
            }

            faceit_playerID = data.items[0].player_id;

            let lose = 0,
                win = 0,
                banned = data.items[0].status;

            // Check profile bans
            if (banned === 'banned') {
                $.getJSON({
                    url: "https://api.faceit.com/sheriff/v1/bans/" + faceit_playerID,
                    headers: {
                        'Authorization': null
                    },
                    success: data => {
                        banned = data.payload[0].reason;
                    }
                });
            }

            // Get last 20 games
            $.getJSON({
                url: API_URL + '/players/' + faceit_playerID + '/history?from=0&game=csgo&limit=20',
                success: data => {

                    games_list = data.items;

                    if (games_list.length > 0) {
                        $('.private_profile').addClass('DefaultTheme');
                        $('.private_profile .profile_content').css('padding-bottom', 8);
                        $('.profile_content').css('min-height', 'auto').prepend('<div class="showcase_content_bg showcase_stats_row faceit_content"></div>');
                        $('.faceit_content').append(statsLayout());

                        $.each(games_list, game => {

                            var counter = game,
                                game = games_list[game];

                            match_list.push({
                                "match": {
                                    "id": game.match_id,
                                    "teams": {}
                                }
                            });

                            $.each(game.teams, players => {
                                $.each(game.teams[players].players, player => {
                                    if (game.teams[players].players[player].player_id === faceit_playerID) {
                                        if (game.results.winner === players) {
                                            win++;
                                            match_list[counter].match.winner = 1;
                                        } else {
                                            lose++;
                                            match_list[counter].match.winner = 0;
                                        }
                                        match_list[counter].match.winner_id = game.results.winner;
                                    }
                                });
                            });
                        });
                        if (games_list.length < size) {
                            size = games_list.length;
                        }
                        // Get and calculate last 20 games stats
                        $.getJSON({
                            url: 'https://api.faceit.com/stats/v1/stats/time/users/' + faceit_playerID + '/games/csgo?size=' + size,
                            headers: {
                                'Authorization': null
                            },
                            success: data => {

                                let K = 0,
                                    HS = 0,
                                    KD = 0,
                                    WR = 0,
                                    elo = 0,
                                    count = 0;

                                $.each(data, match => {
                                    var index = 0;
                                    while (index != data.length - 1) {
                                        ((match_list[match + index].match.id === data[match].matchId) ? (match_list[match + index].elo = data[match].elo, index = data.length - 1) : index++);
                                    }
                                });

                                for (i = 0; i < data.length; i++) {
                                    if (data[i].gameMode === '5v5') {
                                        count++;
                                        HS = parseInt(data[i].c4 * 100) + HS;
                                        KD = parseInt(data[i].c2 * 100) + KD;
                                    }
                                }
                                avgHS = Math.round(HS / count / 100);
                                avgKD = (KD / count / 100).toFixed(2);
                            }
                        });

                        // Get lifetime stats
                        $.getJSON({
                            url: API_URL + '/players/' + faceit_playerID,
                            success: data => {
                                // If csgo profile exists
                                if (data.games['csgo']) {
                                    let profile_data = data,
                                        faceit_elo = profile_data.games['csgo'].faceit_elo,
                                        skill_level = profile_data.games['csgo'].skill_level;
                                    // Get csgo stats
                                    $.getJSON({
                                        url: API_URL + '/players/' + faceit_playerID + '/stats/csgo',
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
                                                    avgHS,
                                                    avgKD
                                                )
                                            );
                                            // Get maps detailed stats
                                            $.each(segments, map => {
                                                var map = segments[map];
                                                if (map.mode === '5v5') {
                                                    if (MAPS_VETO.includes(map.label)) {
                                                        $('.faceit_maps').append(
                                                            mapsLayout(map)
                                                        );
                                                    }
                                                }
                                            });
                                            // Check if maps played length equals to MapsVeto length to center them
                                            if ($('.faceit_maps > *').length < MAPS_VETO.length) {
                                                $('.faceit_maps').css('justify-content', 'center');
                                            }
                                            // Ban bar
                                            if (banned != '' && banned != 'AVAILABLE' && banned != 'active' && banned != 'BUSY') {
                                                $('.faceit_content').css('padding-top', '28px').prepend('<div class="banned" data-tooltip-html="Ban reason">' + banned + '</div>')
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
$(document).on('click', '.filter_tag_button_ctn', function() {
    $(this).find('.btn_details_arrow').toggleClass('down').toggleClass('up');
    $('tr[data-id=' + $(this).parents('.faceit_row').data('match-id') + ']').toggle();
});
// Open player steam profile
$(document).on('click', '.text-primary', function() {
    getSteamId64($(this));
});