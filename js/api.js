// Steamify API Layer
window.Steamify = window.Steamify || {};

window.Steamify.api = (() => {
    const { BEARER, API_URL } = window.Steamify.constants;

    // ── Cache ────────────────────────────────────────────────────────────
    // Stores compact match data (stats + meta + party) in chrome.storage.local.
    // ~2.2 KB per match → 1000 matches ≈ 2.2 MB (well within the 10 MB quota).
    const CACHE_PREFIX = 'mc_';
    const MAX_CACHED = 1000;

    // Short keys used in storage (mapped back to full API names on read)
    const STAT_TO_SHORT = {
        'Kills': 'k', 'Deaths': 'd', 'Assists': 'a', 'K/D Ratio': 'kd', 'K/R Ratio': 'kr',
        'Headshots': 'hs', 'Headshots %': 'hp', 'ADR': 'adr', 'MVPs': 'mvp',
        'Triple Kills': 't3', 'Quadro Kills': 'q4', 'Penta Kills': 'p5'
    };
    const SHORT_TO_STAT = Object.fromEntries(Object.entries(STAT_TO_SHORT).map(([k, v]) => [v, k]));

    const TEAM_STAT_TO_SHORT = {
        'Team': 'n', 'Final Score': 'fs', 'First Half Score': 'fh',
        'Second Half Score': 'sh', 'Overtime score': 'ot'
    };
    const SHORT_TO_TEAM_STAT = Object.fromEntries(Object.entries(TEAM_STAT_TO_SHORT).map(([k, v]) => [v, k]));

    // Compress raw API responses into a compact cache entry
    const compress = (statsRaw, metaRaw, partyRaw) => {
        const c = { _ts: Date.now() };

        if (statsRaw?.rounds?.[0]) {
            const r = statsRaw.rounds[0];
            c.m = r.round_stats.Map;
            c.sc = r.round_stats.Score;
            c.t = r.teams.map(team => {
                const ts = {};
                for (const [full, short] of Object.entries(TEAM_STAT_TO_SHORT)) ts[short] = team.team_stats[full];
                return {
                    i: team.team_id,
                    ts,
                    p: team.players.map(p => {
                        const s = {};
                        for (const [full, short] of Object.entries(STAT_TO_SHORT)) s[short] = p.player_stats[full];
                        return { i: p.player_id, n: p.nickname, s };
                    })
                };
            });
        }

        if (metaRaw) {
            c.fa = metaRaw.finished_at;
            c.du = metaRaw.demo_url?.[0] || null;
        }

        if (partyRaw?.payload?.parties) {
            c.pa = partyRaw.payload.parties.map(p => ({ i: p.partyId, u: p.users }));
        }

        // AFK/leaver/kicked data from summaryResults
        const sr = partyRaw?.payload?.summaryResults;
        if (sr) {
            if (sr.afk?.length) c.afk = sr.afk;
            if (sr.leavers?.length) c.lv = sr.leavers;
            if (sr.voteKicked?.length) c.vk = sr.voteKicked;
        }

        return c;
    };

    // Expand a compact cache entry back into the same shape as raw API responses
    const expand = (c) => {
        const result = { stats: null, meta: null, parties: null };

        if (c.t) {
            result.stats = {
                rounds: [{
                    round_stats: { Map: c.m, Score: c.sc },
                    teams: c.t.map(team => ({
                        team_id: team.i,
                        team_stats: Object.fromEntries(Object.entries(team.ts).map(([k, v]) => [SHORT_TO_TEAM_STAT[k], v])),
                        players: team.p.map(p => ({
                            player_id: p.i,
                            nickname: p.n,
                            player_stats: Object.fromEntries(Object.entries(p.s).map(([k, v]) => [SHORT_TO_STAT[k], v]))
                        }))
                    }))
                }]
            };
        }

        if (c.fa != null) {
            result.meta = { finished_at: c.fa, demo_url: [c.du] };
        }

        if (c.pa) {
            result.parties = { payload: { parties: c.pa.map(p => ({ partyId: p.i, users: p.u })) } };
        }

        // AFK/leaver/kicked arrays
        result.afk = c.afk || [];
        result.leavers = c.lv || [];
        result.voteKicked = c.vk || [];

        return result;
    };

    // Prune old cache entries if over limit (runs once on init, non-blocking)
    chrome.storage.local.get(null, (all) => {
        const cacheKeys = Object.keys(all).filter(k => k.startsWith(CACHE_PREFIX));
        if (cacheKeys.length <= MAX_CACHED) return;
        const sorted = cacheKeys
            .map(k => ({ key: k, ts: all[k]?._ts || 0 }))
            .sort((a, b) => a.ts - b.ts);
        const toRemove = sorted.slice(0, cacheKeys.length - MAX_CACHED).map(e => e.key);
        chrome.storage.local.remove(toRemove);
    });

    // ── API ──────────────────────────────────────────────────────────────

    // Fetch from FACEIT Open API v4 (direct fetch, allowed by host_permissions).
    // Retries rate-limits (429), server errors (5xx) and network blips with jittered
    // backoff — loading ~30 matches fires a burst of requests that otherwise gets
    // throttled, leaving some matches stuck on "NO STATS" until a refresh. 404 and
    // other 4xx are surfaced immediately so not-found handling still works.
    const faceitApi = async (path, retries = 3) => {
        const backoff = (n) => new Promise(r => setTimeout(r, 250 * (n + 1) + Math.random() * 250));
        for (let attempt = 0; ; attempt++) {
            let response;
            try {
                response = await fetch(`${API_URL}${path}`, { headers: { 'Authorization': BEARER } });
            } catch (e) {
                if (attempt < retries) { await backoff(attempt); continue; }
                throw e;
            }
            if (response.ok) return response.json();
            if (attempt < retries && (response.status === 429 || response.status >= 500)) {
                await backoff(attempt);
                continue;
            }
            const err = new Error(`API ${response.status}`);
            err.status = response.status;
            throw err;
        }
    };

    // Fetch from FACEIT internal APIs (no CORS — proxy through background service worker).
    // Retries transient failures: in MV3 the service worker sleeps when idle, so the first
    // call after a fast (cached) page load can hit a cold worker or a Cloudflare blip and
    // fail. A couple of quick retries makes it reliable without a page refresh.
    const faceitInternalApi = (url, retries = 2) => new Promise((resolve, reject) => {
        const attempt = (left) => {
            const retryOrFail = (err) => {
                if (left > 0) setTimeout(() => attempt(left - 1), 350);
                else reject(err);
            };
            try {
                chrome.runtime.sendMessage({ type: 'fetchUrl', url }, response => {
                    if (chrome.runtime.lastError || !response?.success) {
                        retryOrFail(new Error(chrome.runtime.lastError?.message || 'Background fetch failed'));
                    } else {
                        resolve(response.data);
                    }
                });
            } catch (e) { retryOrFail(e); }
        };
        attempt(retries);
    });

    // ── Cached fetchers ─────────────────────────────────────────────────

    // Fetch all match data (stats + meta + party) — returns full API shapes
    const fetchMatchData = async (matchId) => {
        const key = CACHE_PREFIX + matchId;
        const stored = await chrome.storage.local.get(key);
        if (stored[key]) return expand(stored[key]);

        const [statsRaw, metaRaw, partyRaw] = await Promise.all([
            faceitApi(`/matches/${matchId}/stats`).catch(() => null),
            faceitApi(`/matches/${matchId}`).catch(() => null),
            faceitInternalApi(`https://api.faceit.com/match/v2/match/${matchId}`).catch(() => null)
        ]);

        // Cache compact version (only if we got stats — match is complete)
        if (statsRaw) {
            chrome.storage.local.set({ [key]: compress(statsRaw, metaRaw, partyRaw) });
        }

        const sr = partyRaw?.payload?.summaryResults;
        return {
            stats: statsRaw,
            meta: metaRaw,
            parties: partyRaw,
            afk: sr?.afk || [],
            leavers: sr?.leavers || [],
            voteKicked: sr?.voteKicked || []
        };
    };

    // Get party data from cache or fetch (used by match-expand handler)
    const fetchPartyData = async (matchId) => {
        const key = CACHE_PREFIX + matchId;
        const stored = await chrome.storage.local.get(key);
        if (stored[key]?.pa) {
            return { payload: { parties: stored[key].pa.map(p => ({ partyId: p.i, users: p.u })) } };
        }
        return faceitInternalApi(`https://api.faceit.com/match/v2/match/${matchId}`);
    };

    // Check cache for multiple matches at once (single storage read).
    // Returns an array of expanded results (or null for misses), in the same order as matchIds.
    const bulkGetCached = async (matchIds) => {
        const keys = matchIds.map(id => CACHE_PREFIX + id);
        const stored = await chrome.storage.local.get(keys);
        return matchIds.map(id => {
            const entry = stored[CACHE_PREFIX + id];
            return entry ? expand(entry) : null;
        });
    };

    return { faceitApi, faceitInternalApi, fetchMatchData, fetchPartyData, bulkGetCached };
})();
