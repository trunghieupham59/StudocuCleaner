#!/usr/bin/env node
/**
 * validate-i18n.mjs
 * Ensures vi/en TRANSLATIONS dictionaries have identical key sets in both:
 *   - src/popup/modules/i18n.js
 *   - src/viewer/viewer.js
 * Also checks that placeholders {name} are consistent across the two languages.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const POPUP_I18N = resolve(ROOT, 'src/popup/modules/i18n.js');
const VIEWER_JS  = resolve(ROOT, 'src/viewer/viewer.js');

let failed = false;

/**
 * Naively extract the {key: 'value'} pairs from a section of source code that
 * starts at the named identifier and is a flat object literal.
 * Does NOT handle nested objects — sufficient for our flat dictionaries.
 */
function extractDict(source, langKey) {
  // Find e.g. `vi: {`  or  `en: {`
  const re = new RegExp(`\\b${langKey}\\s*:\\s*\\{`, 'g');
  const m = re.exec(source);
  if (!m) return null;

  let depth = 0;
  const start = m.index + m[0].length - 1; // position of '{'
  let end = -1;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end < 0) return null;

  const body = source.slice(start + 1, end);
  // Match key: 'value' or "value" or `value` (no nesting; values may contain escaped quotes)
  const keys = [];
  const keyRe = /\b([a-zA-Z_][\w]*)\s*:\s*(['"`])((?:\\.|(?!\2)[\s\S])*?)\2\s*,?/g;
  let km = keyRe.exec(body);
  while (km !== null) {
    keys.push({ key: km[1], value: km[3] });
    km = keyRe.exec(body);
  }
  return keys;
}

function placeholders(value) {
  const set = new Set();
  const re = /\{(\w+)\}/g;
  let m = re.exec(value);
  while (m !== null) {
    set.add(m[1]);
    m = re.exec(value);
  }
  return set;
}

function compare(label, viList, enList) {
  if (!viList || !enList) {
    console.error(`❌ ${label}: could not parse vi/en dictionaries`);
    failed = true;
    return;
  }
  const viKeys = new Set(viList.map(x => x.key));
  const enKeys = new Set(enList.map(x => x.key));

  const missingInEn = [...viKeys].filter(k => !enKeys.has(k));
  const missingInVi = [...enKeys].filter(k => !viKeys.has(k));

  if (missingInEn.length || missingInVi.length) {
    failed = true;
    console.error(`❌ ${label}: i18n key mismatch`);
    if (missingInEn.length) console.error(`   missing in en: ${missingInEn.join(', ')}`);
    if (missingInVi.length) console.error(`   missing in vi: ${missingInVi.join(', ')}`);
    return;
  }

  // Placeholder parity
  const viMap = new Map(viList.map(x => [x.key, x.value]));
  const enMap = new Map(enList.map(x => [x.key, x.value]));
  for (const key of viKeys) {
    const viPh = placeholders(viMap.get(key));
    const enPh = placeholders(enMap.get(key));
    const diff = [...viPh].filter(p => !enPh.has(p)).concat([...enPh].filter(p => !viPh.has(p)));
    if (diff.length) {
      failed = true;
      console.error(`❌ ${label}: placeholder mismatch on key "${key}" → vi:{${[...viPh].join(',')}} en:{${[...enPh].join(',')}}`);
    }
  }

  console.log(`✅ ${label}: ${viKeys.size} keys aligned`);
}

const popupSrc  = readFileSync(POPUP_I18N, 'utf8');
const viewerSrc = readFileSync(VIEWER_JS,  'utf8');

compare('popup/modules/i18n.js', extractDict(popupSrc, 'vi'),  extractDict(popupSrc, 'en'));
compare('viewer/viewer.js',      extractDict(viewerSrc, 'vi'), extractDict(viewerSrc, 'en'));

if (failed) process.exit(1);
