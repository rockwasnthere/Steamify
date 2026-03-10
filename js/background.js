chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'fetchUrl') {
        fetch(request.url)
            .then(r => r.json())
            .then(data => sendResponse({ success: true, data }))
            .catch(() => sendResponse({ success: false }));
        return true; // Keep channel open for async response
    }
});
