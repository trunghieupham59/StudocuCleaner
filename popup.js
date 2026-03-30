/**
 * popup.js
 * Runs in the extension popup context.
 * Handles UI events and Chrome API calls.
 */

// ============================================================
// UI helpers
// ============================================================

function updateStatus(msg, isProcessing = false) {
    const statusText = document.getElementById('status-text');
    const statusBar  = document.getElementById('status');
    if (!statusText || !statusBar) return;

    statusText.textContent = msg;
    statusBar.classList.toggle('processing', isProcessing);
}

function setButtonsDisabled(disabled) {
    document.querySelectorAll('.action-item').forEach(btn => {
        btn.disabled = disabled;
    });
}

// ============================================================
// Cookie cleaner
// ============================================================

async function clearStudocuCookies() {
    const all     = await chrome.cookies.getAll({});
    const targets = all.filter(c => c.domain.includes('studocu'));

    for (const cookie of targets) {
        const domain   = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
        const protocol = cookie.secure ? 'https:' : 'http:';
        const url      = `${protocol}//${domain}${cookie.path}`;
        await chrome.cookies.remove({ url, name: cookie.name, storeId: cookie.storeId });
    }

    return targets.length;
}

async function reloadActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) chrome.tabs.reload(tab.id);
}

document.getElementById('clearBtn').addEventListener('click', async () => {
    updateStatus('Đang quét và xóa cookie...', true);
    setButtonsDisabled(true);

    try {
        const count = await clearStudocuCookies();
        updateStatus(`Đã xóa ${count} cookie! Đang tải lại...`);
        setTimeout(reloadActiveTab, 1000);
    } catch (err) {
        updateStatus(`Lỗi: ${err.message}`);
    } finally {
        setButtonsDisabled(false);
    }
});

// ============================================================
// PDF viewer
// ============================================================

document.getElementById('checkBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files:  ['viewer_styles.css'],
    });

    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files:  ['viewer.js'],
    });
});
