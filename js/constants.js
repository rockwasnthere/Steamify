// Steamify Constants
// Shared namespace
window.Steamify = window.Steamify || {};

window.Steamify.constants = (() => {
    // Public client-side FACEIT API key (rate-limited, read-only — safe to include in extension source)
    const BEARER = 'Bearer 2ca58611-1bf4-4b37-b0a9-042631fd9f80';

    const API_URL = 'https://open.faceit.com/data/v4';

    const EMOTE_SOTSAD = `<img alt=":sotsad:" src="${chrome.runtime.getURL('images/icon/sotsad.png')}">`;

    const ELEMENT_VERIFIED = `<svg height="16" width="16" viewBox="0 0 24 24" data-tooltip-html="FACEIT confirmed this is the authentic profile for this player">
        <path fill-rule="evenodd" clip-rule="evenodd" fill="#ff5500" d="M12.531 2.034a.667.667 0 0 0-1.062 0L9.379 4.79a.667.667 0 0
        1-.623.258L5.33 4.577a.667.667 0 0 0-.752.752l.472 3.427a.667.667 0 0 1-.258.622l-2.757 2.09a.667.667 0 0 0 0 1.063l2.757
        2.09a.67.67 0 0 1 .258.623l-.472 3.427a.667.667 0 0 0 .752.752l3.427-.472a.667.667 0 0 1 .622.258l2.09 2.757a.667.667 0 0 0 1.063
        0l2.09-2.757a.667.667 0 0 1 .623-.258l3.427.472a.667.667 0 0 0 .752-.752l-.472-3.427a.667.667 0 0 1 .258-.622l2.757-2.09a.667.667 0 0 0
        0-1.063l-2.757-2.09a.667.667 0 0 1-.258-.623l.472-3.427a.667.667 0 0 0-.752-.752l-3.427.472a.667.667 0 0 1-.622-.258l-2.09-2.757zM6.667
        11.2l4.571 4.8 6.095-8-6.095 4.8-4.571-1.6z"></path>
    </svg>`;

    const ELEMENT_STATS_HEADER = `<th colspan=8>PLAYER</th>
        <th>MVPs</th>
        <th>TRIPLE</th>
        <th>QUADRO</th>
        <th>PENTA</th>`;

    const ALL_MAPS = [
        'Ancient', 'Anubis', 'Cache', 'Cbble', 'Dust2',
        'Inferno', 'Mirage', 'Nuke', 'Overpass', 'Train', 'Vertigo'
    ];

    const MAPS_VETO_DEFAULT = [
        'Ancient', 'Anubis', 'Dust2', 'Inferno', 'Mirage', 'Nuke', 'Overpass'
    ];

    const BAN_STATUSES = [undefined, '', 'AVAILABLE', 'active', 'BUSY'];

    const SPONSOR_LINK = 'https://trk.clash.gg/click?o=2&a=760&c=210';

    const MATCH_DISPLAY_LIMIT = 30;
    const MATCH_FETCH_LIMIT = 31;

    const PARTY_COLORS = ['80,140,255', '180,80,255', '255,200,50', '50,200,220'];
    const MY_PARTY_COLOR = '80,200,120';

    return {
        BEARER, API_URL, EMOTE_SOTSAD, ELEMENT_VERIFIED, ELEMENT_STATS_HEADER,
        ALL_MAPS, MAPS_VETO_DEFAULT, BAN_STATUSES, SPONSOR_LINK,
        MATCH_DISPLAY_LIMIT, MATCH_FETCH_LIMIT, PARTY_COLORS, MY_PARTY_COLOR
    };
})();
