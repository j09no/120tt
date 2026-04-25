// popup.js — minimal personal build.
// Talks ONLY to the active TikTok tab via chrome.scripting. No network calls.

const STATE_KEY = 'hq_mode_active';

const $ = (id) => document.getElementById(id);
const dot = $('dot');
const statusText = $('statusText');
const hintText = $('hintText');
const toggleBtn = $('toggleBtn');
const warnBox = $('warnBox');

// ---- Helpers ----------------------------------------------------------

function isTikTokUploadUrl(url) {
    if (!url) return false;
    try {
        const u = new URL(url);
        if (!u.hostname.endsWith('tiktok.com')) return false;
        return u.pathname.includes('/upload') || u.pathname.includes('/creator-center');
    } catch (_) { return false; }
}

async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

// Run a function in the page MAIN world (where inject.js exposed activateHQ/resetHQ).
async function runInPage(tabId, fn) {
    const results = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: fn,
    });
    return results && results[0] ? results[0].result : null;
}

// ---- UI state ---------------------------------------------------------

function paint(active, { onUploadPage = true } = {}) {
    if (active) {
        dot.classList.remove('off'); dot.classList.add('on');
        statusText.textContent = 'Active';
        hintText.textContent = 'Now upload your video — quality will be preserved.';
        toggleBtn.textContent = 'DEACTIVATE HQ MODE';
        toggleBtn.classList.add('on');
    } else {
        dot.classList.remove('on'); dot.classList.add('off');
        statusText.textContent = 'Ready';
        hintText.textContent = 'Click below to activate before uploading';
        toggleBtn.textContent = 'ACTIVATE HQ MODE';
        toggleBtn.classList.remove('on');
    }
    warnBox.classList.toggle('show', !onUploadPage);
    toggleBtn.disabled = !onUploadPage;
    toggleBtn.style.opacity = onUploadPage ? '1' : '0.5';
    toggleBtn.style.cursor = onUploadPage ? 'pointer' : 'not-allowed';
}

// ---- Init -------------------------------------------------------------

(async function init() {
    const stored = await chrome.storage.local.get([STATE_KEY]);
    const tab = await getActiveTab();
    const onUploadPage = isTikTokUploadUrl(tab && tab.url);

    paint(!!stored[STATE_KEY], { onUploadPage });
})();

// ---- Toggle ----------------------------------------------------------

toggleBtn.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!isTikTokUploadUrl(tab && tab.url)) {
        paint(false, { onUploadPage: false });
        return;
    }

    const stored = await chrome.storage.local.get([STATE_KEY]);
    const willActivate = !stored[STATE_KEY];

    try {
        if (willActivate) {
            await runInPage(tab.id, () => {
                if (typeof window.activateHQ === 'function') return window.activateHQ();
                return { error: 'inject_not_loaded' };
            });
        } else {
            await runInPage(tab.id, () => {
                if (typeof window.resetHQ === 'function') return window.resetHQ();
                return { error: 'inject_not_loaded' };
            });
        }
        await chrome.storage.local.set({ [STATE_KEY]: willActivate });
        paint(willActivate, { onUploadPage: true });
    } catch (e) {
        console.error('[HQ popup] toggle failed:', e);
        hintText.textContent = 'Could not reach the page. Reload TikTok and try again.';
    }
});
