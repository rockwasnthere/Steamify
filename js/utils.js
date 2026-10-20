// Steamify Utilities
window.Steamify = window.Steamify || {};

window.Steamify.utils = (() => {
    const escapeHtml = (str) => {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    const calcAvg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

    const getLevelColor = (level) => {
        if (level <= 1) return '#CDCDCD';
        if (level <= 3) return '#1CE400';
        if (level <= 7) return '#FFC800';
        if (level <= 9) return '#FF6309';
        return '#FE1F00';
    };

    const sortByKills = (a, b) => {
        return parseInt(a['player_stats'].Kills) >= parseInt(b['player_stats'].Kills) ? 1 : -1;
    };

    const filterMaps = (map, mapsVeto) => {
        return map.mode === '5v5' && mapsVeto.includes(map.label);
    };

    const formatRegisteredDate = (activated_at) => {
        const d = activated_at ? new Date(activated_at) : null;
        if (!d || isNaN(d)) return null;
        return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    };

    const formatMatchDate = (epochSeconds) => {
        return new Date(epochSeconds * 1000).toLocaleString('en-GB');
    };

    // Parse the viewed profile's SteamID64 from page scripts
    const parseSteamID = () => {
        for (const script of document.querySelectorAll('script:not([src])')) {
            const m = script.textContent.match(/g_rgProfileData\s*=\s*\{[\s\S]*?"steamid"\s*:\s*"(\d+)"/);
            if (m) return m[1];
        }
        return null;
    };

    // Read a local image File, downscale it, and return a compact JPEG data URL.
    // Caps the LONGER side so tall images shrink too (width-only caps left tall
    // images full-size, blowing past the chrome.storage.local quota).
    const downscaleImage = (file, maxDim = 1280, quality = 0.85) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('Could not load image'));
            img.onload = () => {
                const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
                const w = Math.max(1, Math.round(img.width * scale));
                const h = Math.max(1, Math.round(img.height * scale));
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });

    // Get the logged-in Steam user's SteamID64
    const getLoggedInSteamID = () => {
        for (const script of document.querySelectorAll('script:not([src])')) {
            const m = script.textContent.match(/g_steamID\s*=\s*"(\d+)"/);
            if (m && m[1] !== '0') return m[1];
        }
        return null;
    };

    return {
        escapeHtml, calcAvg, getLevelColor, sortByKills, filterMaps,
        formatRegisteredDate, formatMatchDate, parseSteamID, getLoggedInSteamID,
        downscaleImage
    };
})();
