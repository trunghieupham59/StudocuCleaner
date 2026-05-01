/**
 * i18n.js — popup language dictionary + render helpers.
 */

'use strict';

const LANGUAGE_KEY = 'studocuCleanerLanguage';
const DEFAULT_LANGUAGE = 'vi';

export const TRANSLATIONS = {
  vi: {
    appTitle: 'Studocu Cleaner',
    versionLabel: 'Phiên bản',
    brandMeta: 'PDF & dọn dẹp',
    actionsTitle: 'Thao tác',
    actionsCount: '2 công cụ',
    pdfTitle: 'Xuất PDF',
    pdfDesc: 'Tạo bản in sạch từ trang đã tải',
    bypassTitle: 'Bypass mờ',
    bypassDesc: 'Xoá cookie, storage và reload tab',
    languageLabel: 'Ngôn ngữ',
    tabStatusOn: 'Studocu sẵn sàng',
    tabStatusOff: 'Mở một trang Studocu',
    tabStatusChecking: 'Đang kiểm tra tab...',
    statusReady: 'Sẵn sàng',
    statusClearing: 'Đang xoá cookie và storage...',
    statusReloading: 'Đang tải lại tab...',
    statusBypassDone: 'Đã xoá {cookies} cookie, {keys} storage key',
    statusPdfOpening: 'Đang mở trình xuất PDF...',
    statusPdfOpened: 'Đã mở trình xuất PDF trên trang',
    statusError: 'Lỗi: {message}',
    errorUnknown: 'Không rõ lỗi',
    errorNoActiveTab: 'Không tìm thấy tab hiện tại',
    errorOpenStudocu: 'Hãy mở một trang Studocu rồi thử lại',
  },
  en: {
    appTitle: 'Studocu Cleaner',
    versionLabel: 'Version',
    brandMeta: 'PDF & cleanup',
    actionsTitle: 'Actions',
    actionsCount: '2 tools',
    pdfTitle: 'Export PDF',
    pdfDesc: 'Create a clean print from the loaded page',
    bypassTitle: 'Bypass blur',
    bypassDesc: 'Clear cookies, storage and reload tab',
    languageLabel: 'Language',
    tabStatusOn: 'Studocu ready',
    tabStatusOff: 'Open a Studocu page',
    tabStatusChecking: 'Checking tab...',
    statusReady: 'Ready',
    statusClearing: 'Clearing cookies and storage...',
    statusReloading: 'Reloading tab...',
    statusBypassDone: 'Cleared {cookies} cookies, {keys} storage keys',
    statusPdfOpening: 'Opening PDF exporter...',
    statusPdfOpened: 'PDF exporter opened on the page',
    statusError: 'Error: {message}',
    errorUnknown: 'Unknown error',
    errorNoActiveTab: 'Could not find the active tab',
    errorOpenStudocu: 'Open a Studocu page and try again',
  },
};

let currentLanguage = readStoredLanguage();
const subscribers = new Set();

export function getLanguage() {
  return currentLanguage;
}

export function onLanguageChange(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

export function setLanguage(language) {
  const next = normalizeLanguage(language);
  if (next === currentLanguage) return;
  currentLanguage = next;
  try { localStorage.setItem(LANGUAGE_KEY, next); } catch (_) {}
  subscribers.forEach(fn => fn(next));
}

export function t(key, values = {}) {
  const dict = TRANSLATIONS[currentLanguage] || TRANSLATIONS[DEFAULT_LANGUAGE];
  const fallback = TRANSLATIONS[DEFAULT_LANGUAGE][key] ?? key;
  const template = dict[key] ?? fallback;

  return template.replace(/\{(\w+)\}/g, (_, name) => {
    return values[name] == null ? '' : String(values[name]);
  });
}

function readStoredLanguage() {
  try {
    return normalizeLanguage(localStorage.getItem(LANGUAGE_KEY));
  } catch (_) {
    return DEFAULT_LANGUAGE;
  }
}

function normalizeLanguage(language) {
  return language === 'en' || language === 'vi' ? language : DEFAULT_LANGUAGE;
}
