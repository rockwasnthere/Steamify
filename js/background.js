var min = 1;
var max = 24;
var current = min;
var keep_switching_icon = true;

chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
        var url = new URL(tabs[0].url)
        var domain = url.hostname;
        keep_switching_icon = true;
        if (domain != 'steamcommunity.com') {
            chrome.browserAction.setIcon({ path: "images/icon/disabled_128.png" });
        } else {
            chrome.browserAction.setIcon({ path: "images/icon/128.png" });
            let message = 'wip';
            chrome.tabs.sendMessage(tab.id, message);
            rotateIcon();
        }
    });
})

function rotateIcon() {
    if (keep_switching_icon) {
        chrome.browserAction.setIcon({ path: "/images/loading/loading (" + current + ").png" });
        if (current++ > max) {
            current = min;
            keep_switching_icon = false;
        }
        window.setTimeout(rotateIcon, 80);
    }
}