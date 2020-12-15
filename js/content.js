chrome.runtime.onMessage.addListener(gotMessage);

function gotMessage(message, sender, sendResponse) {
    if (message === 'wip' && !$(".faceit_maps")[0]) {
        $('.private_profile').addClass('DefaultTheme');
        $('.private_profile .profile_content').css('padding-bottom', 8);
        $('.profile_content').css('min-height', 'auto');

        var steam_id = $.parseJSON('{"' + $('.responsive_page_template_content script').html().split('{"').pop().split('"}')[0] + '"}').steamid;

        var ident = "76561197960265728";

        var steam_id_3 = (steam_id.substr(2, 16) - ident.substr(2, 16)).toString();

        $.ajaxSetup({
            headers: {
                'Authorization': 'Bearer 2ca58611-1bf4-4b37-b0a9-042631fd9f80'
            }
        });

        $.getJSON({
            url: 'https://open.faceit.com/data/v4/search/players?nickname=' + steam_id + '&offset=0&limit=20',
            success: function(data) {
                if (Object.keys(data.items).length == 0) {
                    $('.profile_content').prepend('<div class="showcase_content_bg showcase_stats_row not_found">Faceit account wasn`t found <img src="https://steamcommunity-a.akamaihd.net/economy/emoticon/sotsad" alt=":sotsad:" class="emoticon"></div>');
                    return;
                }
                var data_playerID = data.items[0]['player_id'];
                var lose = 0;
                var win = 0;
                $.getJSON({
                    url: 'https://open.faceit.com/data/v4/players/' + data_playerID + '/history?game=csgo&limit=20',
                    success: function(data) {
                        $.each(data.items, function(game) {
                            $.each(data.items[game]['teams'], function(players) {
                                $.each(data.items[game]['teams'][players]['players'], function(player) {
                                    if (data.items[game]['teams'][players]['players'][player]['player_id'] == data_playerID) {
                                        (data.items[game]['results']['winner'] == players) ? win++ : lose++;
                                    }
                                });
                            });
                        });
                        $.getJSON({
                            url: 'https://open.faceit.com/data/v4/players/' + data_playerID,
                            success: function(data) {
                                var faceit_players = data;
                                $.getJSON({
                                    url: 'https://open.faceit.com/data/v4/players/' + data_playerID + '/stats/csgo',
                                    success: function(data) {
                                        $('.LoadingWrapper').remove();
                                        $('.profile_content').prepend('<div class="showcase_content_bg showcase_stats_row"> <div class="showcase_faceit_content"> <div class="showcase_faceit"> <a class="showcase_stat"> <div class="value">' + data['lifetime']['Matches'] + '</div> <div class="label">Matches</div> </a> <a class="showcase_stat"> <div class="value">' + data['lifetime']['Win Rate %'] + '</div> <div class="label">Winrate</div> </a> <a class="showcase_stat"> <div class="value">' + data['lifetime']['Average Headshots %'] + '%</div> <div class="label">HS avg</div> </a> <a class="showcase_stat"> <div class="value">' + data['lifetime']['Average K/D Ratio'] + '</div> <div class="label">K/D Ratio</div> </a> <a class="showcase_stat"> <div class="value">' + data['lifetime']['Longest Win Streak'] + '</div> <div class="label">Longest streak</div> </a><a class="showcase_stat"> <div class="value ' + ((data['lifetime']['Current Win Streak'] == 0) ? 'lose' : 'win') + '">' + data['lifetime']['Current Win Streak'] + '</div> <div class="label">Streak</div> </a></div> <div class="faceit_badge"> <div class="profile_header_badge" style="background-image: url(' + faceit_players['cover_image'] + ');"> <div class="favorite_badge"> <style>.faceit_badge .favorite_badge_icon::after{content: "' + faceit_players.games["csgo"]["faceit_elo"] + '"};</style>  <div class="favorite_badge_icon" data-tooltip-html="CS:GO level and ELO on Faceit"> <a class="whiteLink" target="_blank" href="https://faceit.com/ru/players/' + faceit_players["nickname"] + '"> <img src="' + chrome.extension.getURL('images/lvl_' + faceit_players.games['csgo']['skill_level'] + '.svg') + '" class="badge_icon small"> </a> </div> <div style="padding-top:4px;" class="favorite_badge_description"> <div class="name ellipsis"><a class="whiteLink" target="_blank" href="https://faceit.com/ru/players/' + faceit_players["nickname"] + '">' + faceit_players["nickname"] + '</a></div>Membership: ' + faceit_players['membership_type'] + '<br>Last 20 games/month: <div style="display:inline-block;color:#8bc34a;font-weight:bold;">' + win + '</div>:<div style="display:inline-block;color:tomato;font-weight:bold;">' + lose + '</div> </div> </div> </div> </div> </div> <div style="clear: left;"></div> <div class="game_info_stats" style=" margin-top: 12px; "> <div class="game_info_achievements_only_ctn"> <div class="game_info_achievements"> <div class="achievement_icons faceit_maps"> </div> </div> </div> </div> </div>');
                                        $.each(data['segments'], function(map) {
                                            if (data['segments'][map]['mode'] == '5v5') {
                                                if (data['segments'][map]['label'] == 'de_cbble' || data['segments'][map]['label'] == 'de_season' || data['segments'][map]['label'].includes('aim') || data['segments'][map]['label'] == 'de_cbble') { return; }
                                                $('.faceit_maps').append('<div data-tooltip-html="' + data['segments'][map]['label'] + '" class="game_info_achievement plus_more" style="background-image: url(' + data['segments'][map]['img_small'] + ');"><span class="kd">K/D: <span class="' + ((data['segments'][map]['stats']['Average K/D Ratio'] >= 1) ? 'win' : 'lose') + '">' + data['segments'][map]['stats']['Average K/D Ratio'] + '</span></span><span class="winrate">' + data['segments'][map]['stats']['Win Rate %'] + '%</span><span class="wr"><span class="win">' + data['segments'][map]['stats']['Wins'] + '</span>:<span class="lose">' + (parseInt(data['segments'][map]['stats']['Matches']) - parseInt(data['segments'][map]['stats']['Wins'])) + '</span></span></div>')
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            },
            beforeSend: function(data){
                $('.profile_content').prepend('<div class="LoadingWrapper"><div class="LoadingThrobber"><div class="Bar Bar1"></div><div class="Bar Bar2"></div><div class="Bar Bar3"></div></div></div>');
            }
        });
    }
}