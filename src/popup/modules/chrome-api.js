/**
 * chrome-api.js — Thin wrappers over chrome.* APIs for the popup.
 */

'use strict';

import { t } from './i18n.js';

const STUDOCU_HOST_RE = /(^|\.)studocu\.(com|vn)$/i;
const TAB_LOAD_TIMEOUT_MS = 15_000;

export async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error(t('errorNoActiveTab'));
  return tab;
}

export function isStudocuTab(tab) {
  try {
    const url = new URL(tab?.url || '');
    return STUDOCU_HOST_RE.test(url.hostname);
  } catch (_) {
    return false;
  }
}

export async function requireStudocuTab() {
  const tab = await getActiveTab();
  if (!isStudocuTab(tab)) {
    throw new Error(t('errorOpenStudocu'));
  }
  return tab;
}

/**
 * Remove all cookies belonging to Studocu domains.
 * @returns {Promise<number>} number of cookies successfully removed
 */
export async function clearStudocuCookies() {
  const cookies = await chrome.cookies.getAll({});
  const targets = cookies.filter(cookie => cookie.domain.includes('studocu'));

  let removed = 0;

  await Promise.all(targets.map(async cookie => {
    const domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
    const protocol = cookie.secure ? 'https' : 'http';
    const details = {
      url: `${protocol}://${domain}${cookie.path}`,
      name: cookie.name,
    };
    if (cookie.storeId != null) details.storeId = cookie.storeId;

    const result = await chrome.cookies.remove(details);
    if (result) removed++;
  }));

  return removed;
}

/**
 * Remove Studocu view-limit keys from local/session storage in the active page.
 * @param {number} tabId
 * @returns {Promise<number>}
 */
export async function clearStudocuStorage(tabId) {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const exactKeys = new Set([
        'documentsViewed', 'documentViewCount', 'viewCount',
        'freeViewsUsed', 'freeViews', 'pageViewCount',
        'previewCount', 'previewsUsed', 'trialViews',
        'sdcViewCount', 'sdc_view_count', 'userDocumentViewCount',
        'guestViewCount', 'limit', 'viewLimit', 'docLimit',
      ]);

      const keyPattern = /studocu|viewcount|paywall|preview|guestview|doclimit|freelimit/i;
      let cleared = 0;

      for (const storage of [localStorage, sessionStorage]) {
        const keysToDelete = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && (exactKeys.has(key) || keyPattern.test(key))) keysToDelete.push(key);
        }
        for (const key of keysToDelete) {
          storage.removeItem(key);
          cleared++;
        }
      }
      return cleared;
    },
  });

  return injection?.result ?? 0;
}

export async function clearStudocuStorageSafely(tabId) {
  try {
    return await clearStudocuStorage(tabId);
  } catch (_) {
    return 0;
  }
}

export function reloadTab(tabId) {
  return chrome.tabs.reload(tabId);
}

export function waitForTabLoaded(tabId) {
  return new Promise(resolve => {
    let timerId = null;

    const cleanup = () => {
      clearTimeout(timerId);
      chrome.tabs.onUpdated.removeListener(listener);
    };

    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId !== tabId || changeInfo.status !== 'complete') return;
      cleanup();
      resolve();
    };

    chrome.tabs.onUpdated.addListener(listener);
    timerId = setTimeout(() => {
      cleanup();
      resolve();
    }, TAB_LOAD_TIMEOUT_MS);
  });
}

export async function injectViewer(tabId, language) {
  await chrome.scripting.insertCSS({
    target: { tabId },
    files: ['src/viewer/viewer.css'],
  });

  await chrome.scripting.executeScript({
    target: { tabId },
    func: lang => {
      window.__SDC_LANGUAGE__ = lang;
      document.documentElement.setAttribute('data-sdc-language', lang);
    },
    args: [language],
  });

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['src/viewer/viewer.js'],
  });
}

export function getErrorMessage(error) {
  if (!error) return t('errorUnknown');
  return error.message || String(error);
}
