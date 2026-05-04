/**
 * popup.js — Extension popup entry point.
 * Wires DOM to the modules in ./modules/.
 */

'use strict';

import {
  t,
  getLanguage,
  setLanguage,
  onLanguageChange,
} from './modules/i18n.js';
import { createStatusController } from './modules/status.js';
import { runBypass, runPdf } from './modules/actions.js';
import { getActiveTab, isStudocuTab } from './modules/chrome-api.js';

const els = {
  app:              document.querySelector('.app'),
  status:           document.getElementById('status'),
  statusText:       document.getElementById('status-text'),
  btnPdf:           document.getElementById('btn-pdf'),
  btnBypass:        document.getElementById('btn-bypass'),
  versionBadge:     document.getElementById('version-badge'),
  languageOptions:  document.querySelectorAll('[data-lang-option]'),
  languageSlider:   document.querySelector('.language-toggle'),
  tabIndicator:     document.getElementById('tab-indicator'),
  tabIndicatorText: document.getElementById('tab-indicator-text'),
};

const status = createStatusController(els.status, els.statusText);

init();

function init() {
  hydrateVersion();
  renderLanguage();
  bindActions();
  onLanguageChange(() => {
    renderLanguage();
    status.reset(t('statusReady'));
    refreshTabIndicator();
  });
  refreshTabIndicator();
  status.reset(t('statusReady'));
}

function hydrateVersion() {
  if (!els.versionBadge) return;
  const manifest = chrome.runtime.getManifest();
  els.versionBadge.textContent = `v${manifest.version}`;
  els.versionBadge.setAttribute('aria-label', t('versionLabel'));
}

function bindActions() {
  els.btnPdf?.addEventListener('click', () => runPdf({ status, setBusy }));
  els.btnBypass?.addEventListener('click', () => runBypass({ status, setBusy }));

  els.languageOptions.forEach(button => {
    button.addEventListener('click', () => setLanguage(button.dataset.langOption));
  });
}

function setBusy(busy) {
  els.app?.classList.toggle('is-busy', busy);

  document.querySelectorAll('.action').forEach(button => {
    button.disabled = busy;
  });
  els.languageOptions.forEach(button => {
    button.disabled = busy;
  });
}

function renderLanguage() {
  const lang = getLanguage();
  document.documentElement.lang = lang;
  document.title = t('appTitle');

  document.querySelectorAll('[data-i18n]').forEach(node => {
    node.textContent = t(node.dataset.i18n);
  });

  els.versionBadge?.setAttribute('aria-label', t('versionLabel'));

  els.languageOptions.forEach(button => {
    const isActive = button.dataset.langOption === lang;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  if (els.languageSlider) {
    els.languageSlider.dataset.active = lang;
  }
}

async function refreshTabIndicator() {
  if (!els.tabIndicator || !els.tabIndicatorText) return;

  els.tabIndicator.classList.remove('is-on', 'is-off');
  els.tabIndicator.classList.add('is-checking');
  els.tabIndicatorText.textContent = t('tabStatusChecking');

  try {
    const tab = await getActiveTab();
    const onStudocu = isStudocuTab(tab);
    els.tabIndicator.classList.remove('is-checking');
    els.tabIndicator.classList.toggle('is-on', onStudocu);
    els.tabIndicator.classList.toggle('is-off', !onStudocu);
    els.tabIndicatorText.textContent = t(onStudocu ? 'tabStatusOn' : 'tabStatusOff');
  } catch (_) {
    els.tabIndicator.classList.remove('is-checking', 'is-on');
    els.tabIndicator.classList.add('is-off');
    els.tabIndicatorText.textContent = t('tabStatusOff');
  }
}
