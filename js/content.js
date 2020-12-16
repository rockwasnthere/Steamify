chrome.runtime.onMessage.addListener(gotMessage);

let BEARER = 'Bearer 2ca58611-1bf4-4b37-b0a9-042631fd9f80';
let IDENT = '76561197960265728';
let API_URL = 'https://open.faceit.com/data/v4';
let average = '';
let avgHS = 0, avgKD = 0;

let L_NOT_FOUND =
    $('<div>', {
        class: "showcase_content_bg showcase_stats_row not_found",
        text: "Faceit account wasn`t found"
    });

let L_LOADING =
    $('<div>', { class: "LoadingWrapper wrapper-orange" })
    .append($('<div>', { class: "LoadingThrobber" })
        .append($('<div>', { class: "Bar Bar1" }))
        .append($('<div>', { class: "Bar Bar2" }))
        .append($('<div>', { class: "Bar Bar3" })));

let L_ERROR =
    $('<div>', {
        class: "showcase_content_bg showcase_stats_row not_found",
        text: "An error"
    })
    .append($('<img>', {
        alt: ":sotsad:",
        class: "emoticon",
        src: "https://steamcommunity-a.akamaihd.net/economy/emoticon/sotsad"
    }));

let L_NO_CSGO =
    $('<div>', {
        class: "showcase_content_bg showcase_stats_row not_found",
        text: "No CSGO stats on Faceit"
    })
    .append($('<img>', {
        alt: ":sotsad:",
        class: "emoticon",
        src: "https://steamcommunity-a.akamaihd.net/economy/emoticon/sotsad"
    }));

let MAPS_VETO = [
    'de_nuke',
    'de_train',
    'de_dust2',
    'de_mirage',
    'de_inferno',
    'de_vertigo',
    'de_overpass'
];

$.ajaxSetup({
    headers: {
        'Authorization': BEARER,
    }
});

function steamID3(steamID64) {
    return (steamID64.substr(2, 16) - IDENT.substr(2, 16)).toString();
}

function showcaseLayout(matches, winrate, average_hs, average_kd, longest_streak, current_streak, nickname, cover_image, membership_type, elo, skill_level, win, lose, last20HS, last20KD) {
    return `
        <div class="showcase_content_bg showcase_stats_row faceit_content">
            <div class="showcase_faceit_content">
                <div class="showcase_stats">
                    <div class="showcase_faceit">
                        <a class="showcase_stat showcase_stat_faceit">
                            <div class="value"><span class="white">LAST 20</span> / OVERALL</div>
                        </a>
                        <a class="showcase_stat">
                            <div class="value">` + matches + `</div>
                            <div class="label">MATCHES</div>
                        </a>
                        <a class="showcase_stat">
                            <div class="value"><span class="white">` + (win/20)*100 + `</span> / ` + winrate + `%</div>
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
                        <a class="showcase_stat">
                            <div class="value">` + `<span class="` + ((current_streak == 0) ? 'lose' : 'win') + `">`+ current_streak +`</span>` + ` / ` + longest_streak + `</div>
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
                            <div class="favorite_badge_icon" data-tooltip-html="CS:GO level and ELO on Faceit">
                                <a class="whiteLink" target="_blank" href="https://faceit.com/ru/players/` + nickname + `">
                                    <img src="` + chrome.extension.getURL('images/lvl_' + skill_level + '.svg') + `" class="badge_icon small"> </a> </div>
                                    <div style="padding-top:4px;" class="favorite_badge_description">
                                        <div class="name ellipsis">
                                            <a class="whiteLink" target="_blank" href="https://faceit.com/ru/players/` + nickname + `">` + nickname + `</a>
                                        </div>
                                        Membership: ` + membership_type + `<br>Last 20 games:
                                    <div style="display:inline-block;color:#8bc34a;font-weight:bold;">` + win + `</div>:<div style="display:inline-block;color:tomato;font-weight:bold;">` + lose + `</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div style="clear: left;"></div>
            <div class="game_info_stats" style=" margin-top: 12px; ">
                <div class="game_info_achievements_only_ctn">
                    <div class="game_info_achievements">
                        <div class="achievement_icons faceit_maps"> </div>
                    </div>
                </div>
            </div>
        </div>`;
}

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

function gotMessage(message, sender, sendResponse) {
    if (message === 'wip' && !$(".faceit_maps")[0]) {
        $('.private_profile').addClass('DefaultTheme');
        $('.private_profile .profile_content').css('padding-bottom', 8);
        $('.profile_content').css('min-height', 'auto');

        let steam_id = $.parseJSON('{"' + $('.responsive_page_template_content script').html().split('{"').pop().split('"}')[0] + '"}').steamid;

        $.getJSON({
            url: API_URL + '/search/players?nickname=' + steam_id + '&offset=0&limit=1',
            success: function(data) {
                if (Object.keys(data.items).length == 0) {
                    $('.LoadingWrapper').hide();
                    $('.profile_content').prepend(L_NOT_FOUND);
                    return;
                }
                let faceit_playerID = data.items[0].player_id;
                let lose = 0,win = 0;
                let banned = data.items[0].status;

                if(banned === 'banned'){
                    $.getJSON({
                        url: "https://api.faceit.com/sheriff/v1/bans/"+faceit_playerID,
                        headers: {
                            'Authorization':null
                        },
                        success: function(data) {
                            banned = data.payload[0].reason;
                        }
                    });
                }
                $.getJSON({
                    url: API_URL + '/players/' + faceit_playerID + '/history?from=0&game=csgo&limit=20',
                    success: function(data) {
                        console.log(data);
                        $.each(data.items, function(game) {
                            var game = data.items[game];
                            $.each(game.teams, function(players) {
                                $.each(game.teams[players].players, function(player) {
                                    if (game.teams[players].players[player].player_id == faceit_playerID) {
                                        (game.results.winner == players) ? win++ : lose++;
                                    }
                                });
                            });
                        });
                        $.getJSON({
                            url: 'https://api.faceit.com/stats/v1/stats/time/users/'+ faceit_playerID +'/games/csgo?size=20',
                            success: function(data) {
                                let K = 0, HS = 0, KD = 0, WR = 0,count = 0;

                                for (i = 0; i < data.length; i++) {
                                    if(data[i].gameMode == '5v5'){
                                        count = count + 1;
                                        HS = parseInt(data[i].c4 * 100) + HS;
                                        KD = parseInt(data[i].c2 * 100) + KD;
                                    }
                                }

                                avgHS = Math.round(HS / count / 100);
                                avgKD = (KD / count / 100).toFixed(2);
                            }
                        });
                        $.getJSON({
                            url: API_URL + '/players/' + faceit_playerID,
                            success: function(data) {
                                if (data.games['csgo']) {
                                    let profile_data = data;
                                    let faceit_elo = profile_data.games['csgo'].faceit_elo;
                                    let skill_level = profile_data.games['csgo'].skill_level;
                                    $.getJSON({
                                        url: API_URL + '/players/' + faceit_playerID + '/stats/csgo',
                                        success: function(data) {
                                            let lifetime = data.lifetime;
                                            let segments = data.segments;
                                            $('.LoadingWrapper').hide();
                                            $('.profile_content').prepend(
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
                                                    } else {
                                                        return;
                                                    }
                                                }
                                            });
                                            if(banned != '' && banned != 'AVAILABLE'){
                                                $('.faceit_content').css('padding-top','28px').prepend('<div class="banned" data-tooltip-html="Ban reason">'+banned+'</div>')
                                            }
                                        },
                                        error: function(data) {
                                            if (data.status === 404) {
                                                $('.LoadingWrapper').hide();
                                                $('.profile_content').prepend(L_ERROR);
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
                    }
                });
            },
            beforeSend: function(data) {
                $('.profile_content').prepend(L_LOADING);
            }
        });
    }
}