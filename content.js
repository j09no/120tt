// content.js — minimal personal version
// Responsibilities:
//   1. Inject inject.js into the page main world (where TikTok's JS runs)
//      so we can monkey-patch JSON.stringify on upload pages.
//   2. Render a small floating status badge for visual feedback.
//
// NO network calls. NO analytics. NO ban/shield checks. NO username scraping.

let isInjected = false;

function checkAndInjectInfo() {
    if (isInjected) return;
    const url = window.location.href;
    if (url.includes('/upload') || url.includes('/creator-center')) {
        injectScript();
        isInjected = true;
    }
}

function injectScript() {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('inject.js');
    s.onload = function () { this.remove(); };
    (document.head || document.documentElement).appendChild(s);
}

// Watch SPA navigation so we still inject after client-side route changes.
const urlObserver = new MutationObserver(checkAndInjectInfo);
if (document.body) {
    urlObserver.observe(document.body, { childList: true, subtree: true });
} else {
    document.addEventListener('DOMContentLoaded', () => {
        urlObserver.observe(document.body, { childList: true, subtree: true });
    });
}

checkAndInjectInfo();

// ---------- Floating status badge ----------

function addBadgeToPage() {
    if (document.getElementById('hq-badge')) return;

    const overlayHTML = `
    <div id="hq-badge" class="hq-badge-container">
        <div class="hq-content">
            <div id="hq-indicator-dot" class="hq-dot"></div>
            <div class="hq-text-group">
                <div class="hq-header-row">
                    <svg class="hq-icon" viewBox="0 0 24 24">
                        <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/>
                    </svg>
                    <span class="hq-title">HQ Upload</span>
                </div>
                <span id="hq-status-text" class="hq-status">System Ready</span>
            </div>
            <div id="hq-minimize-btn" class="hq-action-btn" title="Hide / Show">
                <svg viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
            </div>
        </div>
    </div>`;

    const div = document.createElement('div');
    div.innerHTML = overlayHTML;
    document.body.appendChild(div);

    const badgeContainer = document.getElementById('hq-badge');
    const minBtn = document.getElementById('hq-minimize-btn');

    const isMinimized = localStorage.getItem('hq_badge_minimized') === 'true';
    if (isMinimized) badgeContainer.classList.add('minimized');

    minBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleBadge();
    });

    badgeContainer.addEventListener('click', () => {
        if (badgeContainer.classList.contains('minimized')) toggleBadge();
    });

    function toggleBadge() {
        badgeContainer.classList.toggle('minimized');
        localStorage.setItem('hq_badge_minimized', badgeContainer.classList.contains('minimized'));
    }

    // Tell the page-world script which language label set to use.
    // (English-only build — no remote config.)
    const script = document.createElement('script');
    script.textContent = `
        setTimeout(function() {
            if (window.setBadgeLanguage) window.setBadgeLanguage('en');
        }, 1000);
    `;
    (document.head || document.documentElement).appendChild(script);
    script.onload = function () { this.remove(); };
}

const style = document.createElement('style');
style.textContent = `
    .hq-header-row { display: flex; align-items: center; gap: 6px; }
    .hq-icon { width: 14px; height: 14px; fill: #888; transition: fill 0.3s; }
    .hq-title { font-size: 11px; color: #888; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; transition: color 0.3s; white-space: nowrap; }

    .hq-badge-container {
        position: fixed; bottom: 30px; right: 30px;
        z-index: 2147483647; font-family: 'Segoe UI', sans-serif;
        user-select: none; opacity: 0; transform: translateY(20px);
        transition: all 0.5s; cursor: default;
    }
    .hq-badge-container.visible { opacity: 1; transform: translateY(0); }

    .hq-content {
        background: rgba(15, 15, 15, 0.90);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        padding: 12px 20px; border-radius: 12px; display: flex; align-items: center; gap: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        max-width: 300px; overflow: hidden;
    }

    .hq-text-group { display: flex; flex-direction: column; transition: opacity 0.2s; opacity: 1; }
    .hq-status { font-size: 14px; color: #fff; font-weight: 700; transition: color 0.3s; white-space: nowrap; }

    .hq-dot {
        width: 10px; height: 10px; flex-shrink: 0;
        background-color: #444; border-radius: 50%;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.1);
        transition: all 0.3s ease;
    }

    .hq-action-btn {
        width: 20px; height: 20px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 50%; cursor: pointer;
        transition: all 0.2s; margin-left: 5px; opacity: 0.5;
    }
    .hq-action-btn:hover { background: rgba(255,255,255,0.1); opacity: 1; }
    .hq-action-btn svg {
        width: 16px; height: 16px; fill: #fff;
        transition: transform 0.3s; transform: rotate(90deg);
    }

    .hq-badge-container.minimized .hq-content {
        padding: 0; gap: 0; border-radius: 50%;
        width: 40px; height: 40px; justify-content: center;
    }
    .hq-badge-container.minimized .hq-text-group { display: none; opacity: 0; width: 0; }
    .hq-badge-container.minimized .hq-action-btn { display: none; }
    .hq-badge-container.minimized { cursor: pointer; }
    .hq-badge-container.minimized:hover .hq-content {
        transform: scale(1.1);
        box-shadow: 0 0 20px rgba(37, 244, 238, 0.4);
    }

    .hq-badge-container.ready .hq-dot { background-color: #2ecc71; box-shadow: 0 0 10px #2ecc71; }
    .hq-badge-container.ready .hq-status { color: #2ecc71; }

    .hq-badge-container.active .hq-dot { background-color: #25F4EE; box-shadow: 0 0 15px #25F4EE; animation: hqPulseDot 1.5s infinite; }
    .hq-badge-container.active .hq-status { color: #25F4EE; }
    .hq-badge-container.active .hq-content { border-color: rgba(37,244,238,0.4); }

    @keyframes hqPulseDot {
        0% { box-shadow: 0 0 0 0 rgba(37, 244, 238, 0.7); }
        70% { box-shadow: 0 0 0 8px rgba(37, 244, 238, 0); }
        100% { box-shadow: 0 0 0 0 rgba(37, 244, 238, 0); }
    }
`;
document.head.appendChild(style);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addBadgeToPage);
} else {
    addBadgeToPage();
}

setTimeout(() => {
    const badge = document.getElementById('hq-badge');
    if (badge) {
        badge.classList.add('visible');
        badge.classList.add('ready');
    }
}, 500);
