// inject.js — runs in the page main world (not the extension sandbox).
// Core trick: monkey-patch JSON.stringify so that when TikTok's frontend
// builds the upload request body, we strip flags that would otherwise
// trigger TikTok's server-side re-encoding pipeline (which downgrades
// bitrate / caps FPS to 30-60). The video bytes themselves are never
// touched — only the metadata flags are sanitized.

(function () {

    function isUploadPage() {
        const url = window.location.href;
        return url.includes('/upload') || url.includes('/creator-center');
    }

    if (typeof window._hq_isModeActive === 'undefined') {
        window._hq_isModeActive = false;
    }
    window._hq_currentLang = 'en';

    const badgeTranslations = {
        en: { ready: "System Ready", active: "System Active" }
    };

    window.setBadgeLanguage = function (lang) {
        if (!badgeTranslations[lang]) return;
        window._hq_currentLang = lang;
        const currentStatus = window._hq_isModeActive ? 'active' : 'ready';
        updateBadge(currentStatus);
    };

    function updateBadge(status) {
        const badge = document.getElementById('hq-badge');
        const statusText = document.getElementById('hq-status-text');
        if (!badge || !statusText) return;

        const lang = window._hq_currentLang || 'en';
        const texts = badgeTranslations[lang];
        badge.classList.remove('ready', 'active');

        if (status === 'active') {
            badge.classList.add('active');
            statusText.innerText = texts.active;
            statusText.style.color = "#25F4EE";
        } else {
            badge.classList.add('ready');
            statusText.innerText = texts.ready;
            statusText.style.color = "#2ecc71";
        }
    }

    // Activation: turn on the cleaning hook.
    window.activateHQ = function () {
        window._hq_isModeActive = true;
        updateBadge('active');
        return { status: "HQ_MODE_ACTIVE" };
    };

    // Reset: pass-through mode (no tampering).
    window.resetHQ = function () {
        window._hq_isModeActive = false;
        updateBadge('ready');
        return { status: "HQ_MODE_OFF" };
    };

    // ---------- JSON Stringify Hook (the actual magic) ----------
    const originalJSONStringify = JSON.stringify;

    JSON.stringify = function (value, replacer, space) {
        if (!isUploadPage()) {
            return originalJSONStringify.apply(this, arguments);
        }

        if (window._hq_isModeActive && value && typeof value === 'object') {
            try {
                const deepClean = (obj) => {
                    if (!obj || typeof obj !== 'object') return;

                    // Strip metadata that signals "this came from the editor"
                    // and would route the upload through TikTok's transcoding pipeline.
                    const forbiddenKeys = ['draft', 'canvas_config', 'vedit_segment_info'];
                    forbiddenKeys.forEach(key => {
                        if (obj.hasOwnProperty(key)) delete obj[key];
                    });

                    // Disable cloud-side video canvas (would re-encode).
                    if (obj.cloud_edit_is_use_video_canvas !== undefined) {
                        obj.cloud_edit_is_use_video_canvas = false;
                    }

                    // Normalize post type: 2 (editor pipeline) -> 3 (direct post).
                    if (obj.post_type === 2) obj.post_type = 3;

                    // Pretend the user entered via the main upload button.
                    if (obj.enter_post_page_from !== undefined) {
                        obj.enter_post_page_from = 1;
                    }

                    for (let k in obj) {
                        if (obj[k] && typeof obj[k] === 'object') deepClean(obj[k]);
                    }
                };

                // Only touch known TikTok upload payloads — anything else
                // passes through untouched so we don't break the rest of the site.
                if (value.single_post_req_list || value.vedit_common_info || value.post_common_info) {
                    deepClean(value);
                }
            } catch (e) {
                console.error("[HQ] Clean error:", e);
            }
        }

        return originalJSONStringify.apply(this, arguments);
    };

    if (isUploadPage()) {
        window._hq_isModeActive = false;
        updateBadge('ready');
    }

})();
