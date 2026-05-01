/**
 * actions.js — High-level popup actions (PDF + Bypass).
 */

'use strict';

import { t, getLanguage } from './i18n.js';
import {
  requireStudocuTab,
  clearStudocuCookies,
  clearStudocuStorageSafely,
  reloadTab,
  waitForTabLoaded,
  injectViewer,
  getErrorMessage,
} from './chrome-api.js';

/**
 * @param {{ status, setBusy }} ctx
 */
export async function runBypass(ctx) {
  ctx.setBusy(true);
  ctx.status.set(t('statusClearing'), 'processing');

  try {
    const tab = await requireStudocuTab();
    const [cookiesRemoved, storageCleared] = await Promise.all([
      clearStudocuCookies(),
      clearStudocuStorageSafely(tab.id),
    ]);

    ctx.status.set(t('statusReloading'), 'processing');
    // fix: arm the load listener BEFORE triggering reload to avoid missing
    // the 'complete' event on fast reloads (race condition observed on cached pages).
    const loaded = waitForTabLoaded(tab.id);
    await reloadTab(tab.id);
    await loaded;

    ctx.status.set(
      t('statusBypassDone', { cookies: cookiesRemoved, keys: storageCleared }),
      'done'
    );
  } catch (error) {
    ctx.status.set(t('statusError', { message: getErrorMessage(error) }), 'error');
  } finally {
    ctx.setBusy(false);
  }
}

/**
 * @param {{ status, setBusy }} ctx
 */
export async function runPdf(ctx) {
  ctx.setBusy(true);
  ctx.status.set(t('statusPdfOpening'), 'processing');

  try {
    const tab = await requireStudocuTab();
    await injectViewer(tab.id, getLanguage());
    ctx.status.set(t('statusPdfOpened'), 'done');
  } catch (error) {
    ctx.status.set(t('statusError', { message: getErrorMessage(error) }), 'error');
  } finally {
    ctx.setBusy(false);
  }
}
