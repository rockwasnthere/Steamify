// Bearer faceit client side key
const
    BEARER = 'Bearer 2ca58611-1bf4-4b37-b0a9-042631fd9f80',
    IDENT = '76561197960265728',

    // Faceit API v4 url
    API_URL = 'https://open.faceit.com/data/v4',

    // No faceit profile
    L_NOT_FOUND =
        $('<div>', {
            class: "showcase_content_bg showcase_stats_row not_found",
            text: "Faceit account wasn`t found"
        }).append($('<img>', {
            alt: ":sotsad:",
            class: "emoticon",
            src: "https://steamcommunity-a.akamaihd.net/economy/emoticon/sotsad"
        })),

    // No available matches
    L_MATCHES_NOT_FOUND =
        $('<div>', {
            class: "showcase_content_bg showcase_stats_row not_found",
            text: "No matches found"
        }).append($('<img>', {
            alt: ":sotsad:",
            class: "emoticon",
            src: "https://steamcommunity-a.akamaihd.net/economy/emoticon/sotsad"
        })),

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
        })
        .append($('<img>', {
            alt: ":sotsad:",
            class: "emoticon",
            src: "https://steamcommunity-a.akamaihd.net/economy/emoticon/sotsad"
        })),

    // No csgo profile on faceit
    L_NO_CSGO =
        $('<div>', {
            class: "showcase_content_bg showcase_stats_row not_found",
            text: "No CSGO stats on Faceit"
        })
        .append($('<img>', {
            alt: ":sotsad:",
            class: "emoticon",
            src: "https://steamcommunity-a.akamaihd.net/economy/emoticon/sotsad"
        })),

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
    global_data,
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
function showcaseLayout(matches, winrate, average_hs, average_kd, longest_streak, current_streak, nickname, cover_image, membership_type, elo, skill_level, win, lose, last20HS, last20KD) {
    return `
        <div class="showcase_faceit_content">
            <div class="showcase_stats">
                <div class="showcase_faceit">
                    <a class="showcase_stat showcase_stat_faceit">
                        <div class="value"><span class="white">LAST 20</span> / OVERALL</div>
                    </a>
                    <a class="showcase_stat" data-tooltip-html="Matches played w/o leaves">
                        <div class="value">` + matches + `</div>
                        <div class="label">MATCHES</div>
                    </a>
                    <a class="showcase_stat">
                        <div class="value"><span class="white">` + Math.round((win / 20) * 100) + `</span> / ` + winrate + `%</div>
                        <div class="label">WINRATE</div>
                    </a>
                    <a class="showcase_stat">
                        <div class="value"><span class="white">` + last20HS + `</span> / ` + average_hs + `%</div>
                        <div class="label">AVG HS%</div>
                    </a>
                    <a class="showcase_stat">
                        <div class="value"><span class="white">` + last20KD + `</span> / ` + average_kd + `</div>
                        <div class="label">AVG K/D</div>
                    </a>
                    <a class="showcase_stat" data-tooltip-html="Current streak / Max. streak">
                        <div class="value">` + `<span class="` + ((current_streak == 0) ? 'lose' : 'win') + `">` + current_streak + `</span>` + ` / ` + longest_streak + `</div>
                        <div class="label">STREAK</div>
                    </a>
                </div>
            </div>
            <div class="faceit_badge">
                <div class="profile_header_badge" style="background-image: url(` + cover_image + `);">
                    <div class="favorite_badge">
                        <style>
                        .faceit_badge .favorite_badge_icon::after {
                            content: "` + elo + `"
                        }
                        </style>
                        <div class="favorite_badge_icon" data-tooltip-html="Level and ELO on Faceit">
                            <a class="whiteLink" target="_blank" href="https://faceit.com/en/players/` + nickname + `">
                                <img src="` + chrome.extension.getURL('images/lvl_' + skill_level + '.svg') + `" class="badge_icon small"> </a> </div>
                                <div class="favorite_badge_description">
                                    <div class="name ellipsis">
                                        <a class="whiteLink" target="_blank" href="https://faceit.com/en/players/` + nickname + `">` + nickname + `</a>
                                    </div>
                                    Membership: ` + membership_type + `<br>Last 20 games:
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
                <!-- <a name="osversion"></a> -->
            </tbody>
        </table>
    </div>`;
}
// Players layout
function playersLayout(match_id,team,player) {
    return $('.' + match_id + '_team_' + team).after(`
    	<tr data-id="` + match_id + `" class="nonresponsive_hidden faceit_row faceit_stats_details">
	        <td colspan=3>
	            <span><a href="https://www.faceit.com/en/players/` + player.nickname + `" target="_blank"></span>` + player.nickname + `</span></a>
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
	    </tr>`
    );
}

// Maps layout
function mapsLayout(label, image, average_kd, winrate, wins, matches) {
    return $('<div>', {
            class: "game_info_achievement plus_more",
            'data-tooltip-html': label,
            style: "background-image: url(" + image + ");"
        })
        .append($('<span>', {
                class: "kd",
                text: "K/D:"
            })
            .append($('<span>', {
                class: ((average_kd >= 1) ? 'win' : 'lose'),
                text: average_kd
            })))
        .append($('<span>', {
            class: "winrate",
            text: winrate + "%"
        }))
        .append($('<span>', {
                class: "wr",
            })
            .append($('<span>', {
                class: "win",
                text: wins
            }))
            .append(':')
            .append($('<span>', {
                class: "lose",
                text: (parseInt(matches) - parseInt(wins))
            })));
}

// Get 20 last games
function getLastGames() {

    var cnt = 0;

    $.each(global_data, function(game) {

        var counter = game;
        var game = global_data[game];

        // Get match detailed data to create a table
        $.getJSON({
            url: API_URL + '/matches/' + game.match_id + '/stats',
            success: function(data) {
                $.each(data.rounds, function(stats) {

                    let match = data.rounds[stats],
                        round_stats = match.round_stats,
                        winner = round_stats.Winner,
                        map = round_stats.Map,
                        region = round_stats.Region,
                        score = round_stats.Score,
                        players_list = [];

                    // List of teams in match
                    $.each(match.teams, function(teams) {
                        let team = match.teams[teams],
                            team_name = team.team_stats.Team;

                        match_list[counter].match.teams = [match.teams];
                        match_list[counter].leaver = 0;

                        $.each(team.players, function(players) {
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
            complete: function() {
                $('.faceit_stats_content').attr('style', 'margin-top: 32px !important');
                $('.faceit_stats').show();
                $('.faceit_stats_load').text('LOADING... [' + cnt + ']');

                if (cnt === (global_data.length - 1)) {

                    $('.faceit_stats_load').text('LAST ' + (global_data.length) + ' GAMES');

                    $.each(match_list, function(m) {

                        let team_A = match_list[m].match.teams[0][0],
                            team_B = match_list[m].match.teams[0][1],
                            is_winner = match_list[m].match.winner,
                            winner_id = match_list[m].match.winner_id;

                        if (match_list[m].leaver) {
                            $('.faceit_stats_tbody').append(
                                `<tr data-match-id="` + m + `" class="faceit_row faceit_stats_leaver">
                                        <td style="text-align:center;font-weight:bold;padding-left:0;">
                                            A
                                        </td>
                                        <td colspan="9" style="text-align:center;font-weight:bold;padding-left:0;">
                                            ABANDONED
                                        </td>
                                        <td>
                                            <a href="https://faceit.com/en/csgo/room/` + match_list[m].match.id + `" target="_blank" class="filter_tag_button_ctn" data-tooltip-html="Check match on faceit">
                                                <div class="btn_black btn_details btn_small">
                                                    <span>🔗</span>
                                                </div>
                                            </a>
                                        </td>
                                    </tr>`);
                        } else {
                            $('.faceit_stats_tbody').append(`
                                            <tr data-match-id="` + m + `" class="faceit_row faceit_stats_` + ((is_winner === 1) ? `win` : `lose`) + `">
                                                <td style="text-align:center;font-weight:bold;padding-left:0;">
                                                    ` + ((is_winner === 1) ? `<span class="stat_increase">W</span>` : `<span class="stat_decrease">L</span>`) + `
                                                </td>
                                                <td>
                                                    <span>` + match_list[m].team_name + `</span>
                                                </td>
                                                <td>
                                                    <span>` + match_list[m].score + `</span>
                                                </td>
                                                <td>
                                                    <span>` + match_list[m].kills + `-` + match_list[m].assists + `-` + match_list[m].deaths + `</span>
                                                </td>

                                                <td>
                                                    <span class="stat_` + ((match_list[m].kda < 1) ? 'decrease' : 'increase') + `">` + match_list[m].kda + `</span>
                                                </td>
                                                <td>
                                                    <span class="stat_` + ((match_list[m].kr < 1) ? 'decrease' : 'increase') + `">` + match_list[m].kr + `</span>
                                                </td>

                                                <td>
                                                    <span>` + match_list[m].hs_percent + `% (` + match_list[m].hs + `)</span>
                                                </td>


                                                <td>
                                                    <span>` + match_list[m].map + `</span>
                                                </td>
                                                <td>
                                                    <span>` + match_list[m].finished_at + `</span>
                                                </td>
                                                <td>
                                                    <span>` +
                                                    ((match_list[m].elo === undefined) ?
                                                        `---` :
                                                        match_list[m].elo + ` <span class="stat_` +
                                                        (
                                                            (is_winner === 1) ?
                                                            `increase">` :
                                                            `decrease">`
                                                        ) +
                                                        (((m === (global_data.length - 1)) ? `` : (match_list[m + 1].elo === undefined) ?
                                                            `` : `(` +
                                                            (((match_list[m].elo - match_list[m + 1].elo) < 0) ?
                                                                match_list[m].elo - match_list[m + 1].elo :
                                                                `+` + (match_list[m].elo - match_list[m + 1].elo)) + `)</span>`))) +
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
                                            <tr data-id="` + m + `" class="nonresponsive_hidden faceit_stats_details_header">
                                                <th colspan=7>
                                                    <span class="stat_` + ((winner_id === 'faction1') ? `increase` : `decrease`) + `">` + team_A.team_stats['Team'].toUpperCase() + ` SCOREBOARD</span>
                                                </th>
                                                <th colspan=3>
                                                    <span>
                                                        FINAL SCORE: <span class="text-white">` + team_A.team_stats['Final Score'] + ` <span data-tooltip-html="FIRST HALF">(` + team_A.team_stats['First Half Score'] + `</span>:<span data-tooltip-html="SECOND HALF">` + team_A.team_stats['Second Half Score'] + `</span> | <span data-tooltip-html="OVERTIME">` + team_A.team_stats['Overtime score'] + `</span>)
                                                    </span>
                                                </th>
                                                <th>` +
                                ((match_list[m].demo_url === 'empty') ?
                                    `` :
                                    `<a href="` + match_list[m].demo_url + `" target="_blank" class="filter_tag_button_ctn" data-tooltip-html="Download demo (directly from faceit)">
                                                        <div class="btn_black btn_details btn_small">
                                                            <span>
                                                                <span class="ico16 btn_active bluearrow_down"></span>
                                                            </span>
                                                        </div>
                                                    </a>`) + `
                                                </th>
                                            </tr>
                                            <tr data-id="` + m + `" class="nonresponsive_hidden faceit_stats_details_header ` + m + `_team_A">` + additional_th + `</tr>
                                            <tr data-id="` + m + `" class="nonresponsive_hidden faceit_stats_details_header">
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
                                            <tr data-id="` + m + `" class="nonresponsive_hidden faceit_stats_details_header ` + m + `_team_B">` + additional_th + `</tr>`
                            );
                            $.each(team_A.players, function(players) {
                            	let player = team_A.players[players];
                            	playersLayout(m,'A',player);
                            });
                            $.each(team_B.players, function(players) {
                            	let player = team_B.players[players];
                                playersLayout(m,'B',player);
                            });
                        }
                    });
                } else {
                    cnt++;
                }
            }
        });

        $.getJSON({
            url: API_URL + '/matches/' + game.match_id,
            success: function(data) {
                try { match_list[counter].demo_url = data.demo_url[0]; } catch (e) { match_list[counter].demo_url = 'empty'; }
                match_list[counter].finished_at = new Date(data.finished_at * 1000).toLocaleString('en-GB');
            },
            error: function(data) {
                try { match_list[counter].demo_url = data.demo_url[0]; } catch (e) { match_list[counter].demo_url = 'empty'; }
                match_list[counter].finished_at = '---';
            }
        });
    });
}

if (!$(".faceit_maps")[0]) {

    // Add table css from steam store
    $('head').append('<link href="https://steamstore-a.akamaihd.net/public/css/styles_hwsurvey.css?v=duJJnJSUh9Ly&amp;l=english" rel="stylesheet" type="text/css">');

    // Get steamid
    let steam_id = $.parseJSON('{"' + $('.responsive_page_template_content script').html().split('{"').pop().split('"}')[0] + '"}').steamid;

    $.getJSON({
        url: API_URL + '/search/players?nickname=' + steam_id + '&offset=0&limit=1',
        success: function(data) {

            // If faceit profile not found return error
            if (Object.keys(data.items).length == 0) {
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
                    success: function(data) {
                        banned = data.payload[0].reason;
                    }
                });
            }

            // Get last 20 games
            $.getJSON({
                url: API_URL + '/players/' + faceit_playerID + '/history?from=0&game=csgo&limit=20',
                success: function(data) {

                    global_data = data.items;

                    if (global_data.length > 0) {
                        $('.private_profile').addClass('DefaultTheme');
                        $('.private_profile .profile_content').css('padding-bottom', 8);
                        $('.profile_content').css('min-height', 'auto').prepend('<div class="showcase_content_bg showcase_stats_row faceit_content"></div>');
                        $('.faceit_content').append(statsLayout());

                        $.each(global_data, function(game) {

                            var counter = game;
                            var game = global_data[game];

                            match_list.push({
                                "match": {
                                    "id": game.match_id,
                                    "teams": {}
                                }
                            });

                            $.each(game.teams, function(players) {
                                $.each(game.teams[players].players, function(player) {
                                    if (game.teams[players].players[player].player_id == faceit_playerID) {
                                        if (game.results.winner === players) {
                                            win++;
                                            match_list[counter].match.winner_id = game.results.winner;
                                            match_list[counter].match.winner = 1;
                                        } else {
                                            lose++;
                                            match_list[counter].match.winner_id = game.results.winner;
                                            match_list[counter].match.winner = 0;
                                        }
                                    }
                                });
                            });
                        });
                        if (global_data.length < size) {
                            size = global_data.length;
                        }
                        // Get and calculate last 20 games stats
                        $.getJSON({
                            url: 'https://api.faceit.com/stats/v1/stats/time/users/' + faceit_playerID + '/games/csgo?size=' + size,
                            headers: {
                                'Authorization': null
                            },
                            success: function(data) {

                                let K = 0,
                                    HS = 0,
                                    KD = 0,
                                    WR = 0,
                                    count = 0,
                                    elo = 0;

                                $.each(data, function(match) {
                                    var s = 0;
                                    while (s != data.length - 1) {((match_list[match + s].match.id === data[match].matchId) ? (match_list[match + s].elo = data[match].elo, s = data.length - 1) : s++);}
                                });

                                for (i = 0; i < data.length; i++) {
                                    if (data[i].gameMode == '5v5') {
                                        count = count + 1;
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
                            success: function(data) {
                                if (data.games['csgo']) {

                                    let profile_data = data,
                                        faceit_elo = profile_data.games['csgo'].faceit_elo,
                                        skill_level = profile_data.games['csgo'].skill_level;

                                    $.getJSON({
                                        url: API_URL + '/players/' + faceit_playerID + '/stats/csgo',
                                        success: function(data) {

                                            let lifetime = data.lifetime,
                                                segments = data.segments;

                                            $('.LoadingWrapper').hide();
                                            $('.faceit_content').prepend(
                                                showcaseLayout(
                                                    lifetime['Matches'],
                                                    lifetime['Win Rate %'],
                                                    lifetime['Average Headshots %'],
                                                    lifetime['Average K/D Ratio'],
                                                    lifetime['Longest Win Streak'],
                                                    lifetime['Current Win Streak'],
                                                    profile_data.nickname,
                                                    profile_data.cover_image,
                                                    profile_data.membership_type,
                                                    faceit_elo,
                                                    skill_level,
                                                    win,
                                                    lose,
                                                    avgHS,
                                                    avgKD
                                                )
                                            );
                                            // Get maps detailed stats
                                            $.each(segments, function(map) {
                                                var map = segments[map];
                                                if (map.mode == '5v5') {
                                                    if (MAPS_VETO.includes(map.label)) {
                                                        $('.faceit_maps').append(
                                                            mapsLayout(
                                                                map.label,
                                                                map.img_small,
                                                                map.stats['Average K/D Ratio'],
                                                                map.stats['Win Rate %'],
                                                                map.stats['Wins'],
                                                                map.stats['Matches']
                                                            )
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
                                        error: function(data) {
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
        complete: function() {
            $('.faceit_content').show();
        },
        // Show preloader on request
        beforeSend: function(data) {
            $('.profile_content').prepend(L_LOADING);
        }
    });
}
// Get last 20 games when click on button
$(document).on('click', '.faceit_stats_load', function() {
    if (!$(".faceit_row")[0]) {
        getLastGames();
    }
});
// Open match details
$(document).on('click', '.filter_tag_button_ctn', function() {
    $(this).children().children().children().toggleClass('down').toggleClass('up');
    $('tr[data-id=' + $(this).parents('.faceit_row').data('match-id') + ']').toggle();
});