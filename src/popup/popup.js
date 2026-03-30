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
  setStatus('Scanning and clearing cookies…', 'processing');
  setButtonsDisabled(true);

  try {
    const count = await clearStudocuCookies();

    if (count === 0) {
      // Nothing was removed — do not reload; inform the user
      setStatus('No Studocu cookies found — already cleared or not logged in.');
      setButtonsDisabled(false);
      return;
    }

    setStatus(`Removed ${count} cookie(s) — reloading…`, 'processing');

    // Reload and listen for completion to reset the status bar
    const tabId = await reloadActiveTab();

    if (tabId !== null) {
      onTabLoaded(tabId, () => {
        setStatus(`Done — removed ${count} cookie(s) and reloaded.`);
        setButtonsDisabled(false);
      });
    } else {
      setStatus(`Removed ${count} cookie(s).`);
      setButtonsDisabled(false);
    }
  } catch (err) {
    setStatus(`Error: ${err.message}`, 'error');
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
