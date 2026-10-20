chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'fetchUrl') {
        fetch(request.url)
            .then(r => r.json())
            .then(data => sendResponse({ success: true, data }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
    if (request.type === 'cacheStats') {
        chrome.storage.local.get(null, (all) => {
            const entries = Object.entries(all);
            const cache = entries.filter(([k]) => k.startsWith('mc_'));
            const other = entries.filter(([k]) => !k.startsWith('mc_'));
            const size = (obj) => new Blob([JSON.stringify(obj)]).size;
            sendResponse({
                matches: cache.length,
                cacheSize: (cache.reduce((sum, [, v]) => sum + size(v), 0) / 1024).toFixed(1) + ' KB',
                otherKeys: other.length,
                otherSize: (other.reduce((sum, [, v]) => sum + size(v), 0) / 1024).toFixed(1) + ' KB',
                totalSize: (entries.reduce((sum, [, v]) => sum + size(v), 0) / 1024).toFixed(1) + ' KB'
            });
        });
        return true;
    }
});
