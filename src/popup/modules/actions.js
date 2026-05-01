/**
 * actions.js — High-level popup actions (PDF + Bypass).
 */

'use strict';

import { t, getLanguage } from './i18n.js';
import {
  getActiveTab,
  clearStudocuCookies,
  reloadTab,
  requireStudocuTab,
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
    const tab = await getActiveTab();
    const cookiesRemoved = await clearStudocuCookies();

    ctx.status.set(t('statusBypassDone', { cookies: cookiesRemoved }), 'done');

    setTimeout(() => {
      reloadTab(tab.id);
    }, 1000);
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
