const LOG_API_URL = "https://kuronailog.hrmsalih.workers.dev";
const REMOTE_CONFIG_URL = "https://raw.githubusercontent.com/Kuronai46/kuronai-extension-updates/refs/heads/main/version.json";


function _securityCheck() {
    try {
        if (typeof LOG_API_URL === 'undefined') {
            throw new Error("MISSING_CONFIG: URL Variable Deleted");
        }
        if (!LOG_API_URL.includes("hrmsalih") || !LOG_API_URL.includes("workers.dev")) {
            throw new Error("INVALID_CONFIG: URL Tampered");
        }
        return true;
    } catch (e) {
        console.error("🚨 SECURITY ALERT: System halted due to unauthorized modification. " + e.message);
        return false; 
    }
}

async function getSystemID() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['kuronai_device_id'], function(result) {
            if (result.kuronai_device_id) {

                chrome.storage.sync.set({ 'kuronai_device_id': result.kuronai_device_id });
                resolve(result.kuronai_device_id);
            } else {

                chrome.storage.sync.get(['kuronai_device_id'], function(syncResult) {
                    if (syncResult.kuronai_device_id) {
                        console.log("♻️ Eski kullanıcı tespit edildi (Sync):", syncResult.kuronai_device_id);

                        chrome.storage.local.set({ 'kuronai_device_id': syncResult.kuronai_device_id });
                        resolve(syncResult.kuronai_device_id);
                    } else {

                        const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
                        const newID = `K-${randomPart}`;
                        
                        console.log("✨ Yeni ID oluşturuldu:", newID);
                        

                        chrome.storage.local.set({ 'kuronai_device_id': newID });
                        chrome.storage.sync.set({ 'kuronai_device_id': newID });
                        
                        resolve(newID);
                    }
                });
            }
        });
    });
}


async function performBanCheck() {
    if(!_securityCheck()) return;

    const deviceId = await getSystemID();
    
    try {

        const response = await fetch(REMOTE_CONFIG_URL + "?nocache=" + Date.now());
        const config = await response.json();

        if (config.banned_ids && config.banned_ids.includes(deviceId)) {
            console.log("🚫 BAN TESPİT EDİLDİ: " + deviceId);
            

            const reason = config.ban_reason || "Access Denied";
            chrome.storage.local.set({ 'is_device_banned': true, 'ban_reason': reason });
        } else {

            chrome.storage.local.set({ 'is_device_banned': false });
        }
    } catch (e) {
        console.log("Ban kontrol hatası (Ağ sorunu olabilir):", e);

    }
}

async function sendLogToTelegram(action, details, username = "Anonim", forcedID = null) {

    if(!_securityCheck()) return; 

    const version = chrome.runtime.getManifest().version;
    const deviceId = forcedID || await getSystemID();
    
    fetch(LOG_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: username,
            userId: deviceId,
            action: action,
            details: details,
            version: version
        })
    }).catch(err => console.log("Log hatası:", err));
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // içindeki mesaj dinleyicisine ekle
if (request.action === "GET_ACTIVE_TIKTOK_USER") {
    fetch("https://www.tiktok.com/passport/web/account/info/")
        .then(r => r.json())
        .then(json => {
            // json.data içinde hem username hem avatar_url mevcuttur!
            if (json.data && json.data.username) {
                sendResponse({ 
                    success: true, 
                    username: "@" + json.data.username,
                    avatar: json.data.avatar_url // TikTok'un direkt verdiği link!
                });
            } else {
                sendResponse({ success: false });
            }
        })
        .catch(() => sendResponse({ success: false }));
    return true; 
}
    
    if(!_securityCheck()) {
        sendResponse({ success: false, error: "integrity_violation" });
        return true;
    }

    if (request.action === "SEND_LOG") {
        const userToSend = request.username || request.user || "Anonim";
        sendLogToTelegram(request.type, request.msg, userToSend);
        return true;
    }

    if (request.action === "FETCH_AVATAR") {
    // Kullanıcı adının başındaki @ işaretini kaldırıyoruz[cite: 10]
    const username = request.username.replace('@', '');
    const tikWmUrl = `https://www.tikwm.com/api/user/info?unique_id=${username}`;

    fetch(tikWmUrl)
        .then(r => r.json())
        .then(json => {
            // TikWM JSON yapısına göre avatarLarger'ı alıyoruz
            if (json.code === 0 && json.data && json.data.user) {
                sendResponse({ 
                    success: true, 
                    avatar: json.data.user.avatarLarger 
                });
            } else {
                sendResponse({ success: false });
            }
        })
        .catch(() => sendResponse({ success: false }));
    return true; 
}


if (request.action === "FETCH_TIKTOK_DATA") {
        let username = request.username.trim();
        const baseUrl = "https://tiktok-api-8czj.onrender.com"; 
        const myApiUrl = `${baseUrl}/api/analyze?username=${encodeURIComponent(username)}`;

        console.log(`🚀 Bulut API İsteği: ${myApiUrl}`);

        fetch(myApiUrl)
            .then(r => r.json())
            .then(json => {
                if (json.success) {
                    console.log(`✅ ${json.video_count} video buluttan çekildi.`);
                    sendResponse({ success: true, data: json.data });
                } else {
                    console.error("❌ API Hatası:", json.error);
                    sendResponse({ success: false, error: "USER_NOT_FOUND" });
                }
            })
            .catch(err => {
                console.error("Sunucu Hatası:", err);
                sendResponse({ success: false, error: "SERVER_OFFLINE" });
            });

        return true; 
    }if (request.action === "FETCH_TIKTOK_DATA") {
        let username = request.username.trim();
        const baseUrl = "https://tiktok-api-8czj.onrender.com"; 
        const myApiUrl = `${baseUrl}/api/analyze?username=${encodeURIComponent(username)}`;

        console.log(`🚀 Bulut API İsteği: ${myApiUrl}`);

        fetch(myApiUrl)
            .then(r => r.json())
            .then(json => {
                if (json.success) {
                    console.log(`✅ ${json.video_count} video buluttan çekildi.`);
                    sendResponse({ success: true, data: json.data });
                } else {
                    console.error("❌ API Hatası:", json.error);
                    sendResponse({ success: false, error: "USER_NOT_FOUND" });
                }
            })
            .catch(err => {
                console.error("Sunucu Hatası:", err);
                sendResponse({ success: false, error: "SERVER_OFFLINE" });
            });

        return true; 
    }


    async function scrapeFromDOM() {
        
        const parseSmartNumber = (str) => {
            if (!str) return 0;
            str = str.trim();
            let multiplier = 1;
            if (str.toUpperCase().includes('K')) multiplier = 1000;
            else if (str.toUpperCase().includes('M')) multiplier = 1000000;
            else if (str.toUpperCase().includes('B')) multiplier = 1000000000;

            if (multiplier > 1) {
                let cleanStr = str.toUpperCase().replace(/[KMB]/g, '').replace(',', '.');
                return parseFloat(cleanStr) * multiplier;
            } else {
                let cleanStr = str.replace(/[.,]/g, ''); 
                return parseInt(cleanStr, 10) || 0;
            }
        };


        const waitForElm = (selector) => {
            return new Promise(resolve => {
                if (document.querySelector(selector)) return resolve(document.querySelector(selector));
                const observer = new MutationObserver(() => {
                    if (document.querySelector(selector)) {
                        resolve(document.querySelector(selector));
                        observer.disconnect();
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
                setTimeout(() => { observer.disconnect(); resolve(null); }, 10000); 
            });
        };

        try {
            console.log("⏳ Liste bekleniyor...");
            await waitForElm('.recent-posts > .item');

            window.scrollBy(0, 500);
            await new Promise(r => setTimeout(r, 1500));
            
            const items = document.querySelectorAll('.recent-posts > .item');
            const videos = [];


            const dateRegex = /(\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}\s[AP]M)/i;

            items.forEach((div, index) => {
                const imgEl = div.querySelector('.post-img img');
                if (!imgEl) return; 

                const cover = imgEl.src || "";
                const title = imgEl.alt || `Video ${index + 1}`;

                let createTimeInSeconds = 0;
                

                const boxText = div.innerText; 
                const dateMatch = boxText.match(dateRegex);

                if (dateMatch && dateMatch[0]) {
                    const realDate = new Date(dateMatch[0]);
                    createTimeInSeconds = Math.floor(realDate.getTime() / 1000);
                } else {
                    createTimeInSeconds = Math.floor((Date.now() / 1000) - (index * 3600));
                }

                let views = 0;
                let likes = 0;
                let comments = 0;
                let shares = 0;
                let engagement = "0%";

                const dataRows = div.querySelectorAll('.post-data .data');
                
                dataRows.forEach(row => {
                    const labelEl = row.querySelector('.title');
                    const valueEl = row.querySelector('.value');

                    if (labelEl && valueEl) {
                        const label = labelEl.textContent.toLowerCase().trim();
                        const valText = valueEl.textContent.trim();

                        if (label.includes('görüntüleme') || label.includes('views')) views = parseSmartNumber(valText);
                        else if (label.includes('beğeni') || label.includes('likes')) likes = parseSmartNumber(valText);
                        else if (label.includes('yorum') || label.includes('comments')) comments = parseSmartNumber(valText);
                        else if (label.includes('paylaşım') || label.includes('shares')) shares = parseSmartNumber(valText);
                        else if (label.includes('etkileşim') || label.includes('engagement')) engagement = valText;
                    }
                });

                let uniqueId = `vid_${index}_${Date.now()}`;
                
                videos.push({
                    id: uniqueId,
                    views: views,
                    title: title,
                    cover: cover,
                    likes: likes,
                    comments: comments,
                    shares: shares,
                    engagement: engagement,
                    playUrl: `https://www.tiktok.com/@user/video/${uniqueId}`,
                    create_time: createTimeInSeconds 
                });
            });
            

            return videos;
            

        } catch (e) {
            return [];
        }
    }


    if (request.action === "DOWNLOAD_MEDIA") {
        chrome.downloads.download({
            url: request.url,
            filename: `kuronai_downloads/${request.filename}`,
            saveAs: false
        });
    }

    if (request.action === "ANALYZE_SINGLE_VIDEO") {
    const encodedUrl = encodeURIComponent(request.url);
    const url = `https://www.tikwm.com/api/?url=${encodedUrl}`;
    
    fetch(url)
        .then(r => r.json())
        .then(json => {
            if (json.code === 0 && json.data) {
                const d = json.data;
                sendResponse({ 
                    success: true, 
                    data: {
                        cover: d.cover,
                        title: d.title,
                        playUrl: d.play || d.hdplay, 
                        musicUrl: d.music, 
                        author: d.author.nickname,
                        views: d.play_count,
                        likes: d.digg_count
                    } 
                });
            } else {
                sendResponse({ success: false });
            }
        })
        .catch(() => sendResponse({ success: false }));
    return true; 
} 
});


chrome.runtime.onStartup.addListener(() => {
    performBanCheck();
});


chrome.runtime.onInstalled.addListener(async (details) => {

    if(!_securityCheck()) return; 


    await performBanCheck();
    const myID = await getSystemID();

    if (details.reason === "install") {
        sendLogToTelegram("YENİ KURULUM", "Yeni bir kullanıcı eklentiyi yükledi!", "Anonim", myID);
    } else if (details.reason === "update") {
        sendLogToTelegram("GÜNCELLEME", `Kullanıcı sürüme güncelledi: ${chrome.runtime.getManifest().version}`, "Anonim", myID);
    }
});


try {
    if (chrome.alarms) {
        chrome.alarms.create("banCheckLoop", { periodInMinutes: 30 });
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === "banCheckLoop") {
                performBanCheck();
            }
        });
    } else {
        console.log("⚠️ UYARI: Alarm izni henüz aktif değil, otomatik kontrol atlandı.");
    }
} catch (e) {
    console.log("⚠️ HATA: Alarm sistemi başlatılamadı, ama eklenti çalışmaya devam ediyor.");
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    if (request.action === "FETCH_HD_VIDEO") {

        handleHDProcess(request.url)
            .then(finalLink => {
                if (finalLink) {
                    sendResponse({ success: true, data: { playUrl: finalLink } });
                } else {
                    sendResponse({ success: false, error: "Link yok" });
                }
            })
            .catch(err => {
                sendResponse({ success: false, error: err.toString() });
            });

        return true; 
    }
});

async function handleHDProcess(tiktokUrl) {
    try {
        const submitResponse = await fetch("https://www.tikwm.com/api/video/task/submit", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "X-Requested-With": "XMLHttpRequest",
                "Referer": "https://www.tikwm.com/originalDownloader.html",
                "Origin": "https://www.tikwm.com"
            },
            body: `url=${encodeURIComponent(tiktokUrl)}&web=1`
        });

        const submitData = await submitResponse.json();

        if (submitData.code === 0 && submitData.data && submitData.data.task_id) {
            
            const taskID = submitData.data.task_id;
            console.log("⏳ [HD] Görev ID alındı:", taskID);
            
            await new Promise(r => setTimeout(r, 2000));

            return await checkTaskResult(taskID);
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

async function checkTaskResult(taskId) {
    try {
        const resultUrl = `https://www.tikwm.com/api/video/task/result?task_id=${taskId}`;
        const resultResponse = await fetch(resultUrl);
        const json = await resultResponse.json();

        console.log("📦 [HD] Result Cevabı:", json);

        if (json.code === 0 && json.data) {
            const detaylar = json.data.detail || json.data;
            
            const hdLink = detaylar.play_url || detaylar.download_url || detaylar.play;

            if (hdLink) return hdLink;
        }
        
        return null;
    } catch (e) {
        console.error("Result Hatası:", e);
        return null;
    }
}