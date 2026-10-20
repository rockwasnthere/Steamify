// Steamify State Management
window.Steamify = window.Steamify || {};

window.Steamify.state = {
    matchesLimit: window.Steamify.constants.MATCH_FETCH_LIMIT,
    matchesList: null,
    faceitPlayerID: null,
    matchList: [],
    lastHS: '?',
    lastKD: '?',
    viewedPlayerStore: null,
    comparedSteamID: null,
    myCompareCache: null,
    mapsVeto: [...window.Steamify.constants.MAPS_VETO_DEFAULT],
    faceitSegments: null,
    // Banner background override: 'faceit' (default cover), 'none', or 'custom'
    bgMode: 'faceit',
    bgImage: null,      // data URL for the custom background
    faceitCover: null,  // original FACEIT cover_image, kept so we can restore it
};
