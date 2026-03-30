/**
 * popup.js — Extension popup entry point.
 * Runs in the extension popup context (MV3).
 */

'use strict';

// ─── Selectors ────────────────────────────────────────────────────────────────

const statusBar  = document.getElementById('status');
const statusText = document.getElementById('status-text');
const btnPdf     = document.getElementById('btn-pdf');
const btnBypass  = document.getElementById('btn-bypass');

// ─── UI helpers ───────────────────────────────────────────────────────────────

/**
 * Update the status bar message and visual state.
 * @param {string}  msg
 * @param {'idle'|'processing'|'error'} [state='idle']
 */
function setStatus(msg, state = 'idle') {
  if (!statusText || !statusBar) return;
  statusText.textContent = msg;
  statusBar.classList.toggle('is-processing', state === 'processing');
  statusBar.classList.toggle('is-error',      state === 'error');
}

/** Enable or disable all action buttons. */
function setButtonsDisabled(disabled) {
  document.querySelectorAll('.action-item').forEach(btn => {
    btn.disabled = disabled;
  });
}

// ─── Cookie cleaner ───────────────────────────────────────────────────────────

/** Remove all cookies belonging to Studocu domains. */
async function clearStudocuCookies() {
  const all     = await chrome.cookies.getAll({});
  const targets = all.filter(c => c.domain.includes('studocu'));

  await Promise.all(targets.map(cookie => {
    const domain   = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
    const protocol = cookie.secure ? 'https:' : 'http:';
    const url      = `${protocol}//${domain}${cookie.path}`;
    return chrome.cookies.remove({ url, name: cookie.name, storeId: cookie.storeId });
  }));

  return targets.length;
}

/** Reload the currently active tab. */
async function reloadActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) chrome.tabs.reload(tab.id);
}

btnBypass?.addEventListener('click', async () => {
  setStatus('Đang quét và xóa cookie…', 'processing');
  setButtonsDisabled(true);

  try {
    const count = await clearStudocuCookies();
    setStatus(`Đã xóa ${count} cookie — đang tải lại…`);
    setTimeout(reloadActiveTab, 1000);
  } catch (err) {
    setStatus(`Lỗi: ${err.message}`, 'error');
  } finally {
    setButtonsDisabled(false);
  }
});

// ─── PDF viewer ───────────────────────────────────────────────────────────────

btnPdf?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  setStatus('Đang chuẩn bị chế độ in PDF…', 'processing');
  setButtonsDisabled(true);

  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files:  ['src/viewer/viewer.css'],
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files:  ['src/viewer/viewer.js'],
    });

    setStatus('Đã kích hoạt — nhấn Ctrl+P để in');
  } catch (err) {
    setStatus(`Lỗi: ${err.message}`, 'error');
  } finally {
    setButtonsDisabled(false);
  }
});
