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
 * @param {string} msg
 * @param {'idle'|'processing'|'done'|'error'} [state='idle']
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

/**
 * Remove all cookies belonging to Studocu domains.
 * Returns the number of cookies successfully removed.
 */
async function clearStudocuCookies() {
  const all     = await chrome.cookies.getAll({});
  const targets = all.filter(c => c.domain.includes('studocu'));

  let removed = 0;

  await Promise.all(targets.map(async cookie => {
    const domain   = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
    const protocol = cookie.secure ? 'https' : 'http';
    const url      = `${protocol}://${domain}${cookie.path}`;

    // Build removal details — omit storeId if undefined to avoid silent failure
    const details = { url, name: cookie.name };
    if (cookie.storeId != null) details.storeId = cookie.storeId;

    const result = await chrome.cookies.remove(details);
    if (result !== null) removed++;
  }));

  return removed;
}

/**
 * Inject a script into the active tab that clears Studocu-related
 * localStorage and sessionStorage keys (view counters, paywall flags, etc.)
 * @param {number} tabId
 * @returns {Promise<number>} number of storage keys cleared
 */
async function clearStudocuStorage(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const STUDOCU_KEYS = [
        // Common view-limit / paywall keys used by Studocu
        'documentsViewed', 'documentViewCount', 'viewCount',
        'freeViewsUsed', 'freeViews', 'pageViewCount',
        'previewCount', 'previewsUsed', 'trialViews',
        'sdcViewCount', 'sdc_view_count',
        'userDocumentViewCount', 'guestViewCount',
        'limit', 'viewLimit', 'docLimit',
      ];

      let cleared = 0;

      // Remove exact key matches and any key that contains 'studocu', 'view', 'paywall', 'preview', 'limit'
      const checkKey = k =>
        STUDOCU_KEYS.includes(k) ||
        /studocu|viewcount|paywall|preview|guestview|doclimit|freelimit/i.test(k);

      for (const storage of [localStorage, sessionStorage]) {
        const toDelete = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && checkKey(key)) toDelete.push(key);
        }
        for (const key of toDelete) {
          storage.removeItem(key);
          cleared++;
        }
      }

      return cleared;
    },
  });
  return result ?? 0;
}

/**
 * Reload the active tab and return its tabId.
 * @returns {Promise<number|null>}
 */
async function reloadActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return null;
  chrome.tabs.reload(tab.id);
  return tab.id;
}

/**
 * Wait for a tab to finish loading, then run a callback.
 * Auto-cleans up the listener after first completion or timeout.
 * @param {number} tabId
 * @param {() => void} onComplete
 */
function onTabLoaded(tabId, onComplete) {
  const TIMEOUT_MS = 15_000;

  let timer = null;

  function cleanup() {
    clearTimeout(timer);
    chrome.tabs.onUpdated.removeListener(listener);
  }

  function listener(id, info) {
    if (id !== tabId || info.status !== 'complete') return;
    cleanup();
    onComplete();
  }

  chrome.tabs.onUpdated.addListener(listener);

  // Safety timeout — if tab never fires 'complete', reset UI anyway
  timer = setTimeout(() => {
    cleanup();
    onComplete();
  }, TIMEOUT_MS);
}

// ─── Bypass button ────────────────────────────────────────────────────────────

btnBypass?.addEventListener('click', async () => {
  setStatus('Đang xóa cookies và storage…', 'processing');
  setButtonsDisabled(true);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      setStatus('Không tìm thấy tab hiện tại.', 'error');
      setButtonsDisabled(false);
      return;
    }

    // Clear cookies and localStorage/sessionStorage in parallel
    const [cookieCount, storageCount] = await Promise.all([
      clearStudocuCookies(),
      clearStudocuStorage(tab.id),
    ]);

    const total = cookieCount + storageCount;
    setStatus(`Đã xóa ${cookieCount} cookie(s) và ${storageCount} storage key(s) — đang reload…`, 'processing');

    // Always reload regardless of whether anything was found —
    // the page state may still be stale even if storage was already empty
    chrome.tabs.reload(tab.id);

    onTabLoaded(tab.id, () => {
      if (total === 0) {
        setStatus('Đã reload — không tìm thấy cookie/storage để xóa.');
      } else {
        setStatus(`Hoàn tất — đã xóa ${cookieCount} cookie(s) và ${storageCount} storage key(s).`);
      }
      setButtonsDisabled(false);
    });

  } catch (err) {
    setStatus(`Lỗi: ${err.message}`, 'error');
    setButtonsDisabled(false);
  }
});

// ─── PDF viewer ───────────────────────────────────────────────────────────────

btnPdf?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  setStatus('Preparing PDF print mode…', 'processing');
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

    setStatus('Ready — press Ctrl+P to print.');
  } catch (err) {
    setStatus(`Error: ${err.message}`, 'error');
  } finally {
    setButtonsDisabled(false);
  }
});
