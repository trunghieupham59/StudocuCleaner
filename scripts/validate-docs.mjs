#!/usr/bin/env node
/**
 * validate-docs.mjs
 * Ensures README.md and DESIGN.md only reference files that actually exist
 * under src/ or icons/ or root-level docs.
 *
 * Heuristic: extract any token that looks like  `path/to/file.ext`  (inside backticks)
 * with extension in EXT_WHITELIST, then check existence relative to repo root.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const DOCS = ['README.md', 'DESIGN.md'];
const EXT_WHITELIST = new Set(['js', 'css', 'html', 'json', 'png', 'svg', 'mjs', 'yml', 'yaml', 'md']);

// Common directories doc references may be relative to (besides repo root).
// e.g. when DESIGN.md mentions `modules/chrome-api.js`, it really means
// `src/popup/modules/chrome-api.js`.
const SEARCH_PREFIXES = [
  '',
  'src/',
  'src/popup/',
  'src/content/',
  'src/viewer/',
];

// Match any `path/to/file.ext` token inside backticks.
const FILE_RE = /`([a-zA-Z0-9_./-]+\.[a-zA-Z]{2,4})`/g;

let failed = false;

function collectRefs(src) {
  const refs = new Set();
  // Re-create the regex per call to keep the lastIndex state local.
  const re = new RegExp(FILE_RE.source, FILE_RE.flags);
  for (const match of src.matchAll(re)) {
    refs.add(match[1]);
  }
  return refs;
}

function shouldSkip(ref) {
  const ext = ref.split('.').pop().toLowerCase();
  if (!EXT_WHITELIST.has(ext)) return true;
  if (ref.startsWith('http') || ref.startsWith('/')) return true;
  if (/^(node_modules|tmp|build|dist)\//.test(ref)) return true;
  // Generated release artifacts not tracked in repo
  if (/^studocu-tools-v.*\.zip$/.test(ref)) return true;
  // Bare filenames (no slash) are usually decoration inside tree diagrams,
  // not concrete path claims — skip them. We only enforce path-qualified refs.
  if (!ref.includes('/')) return true;
  return false;
}

for (const docName of DOCS) {
  const docPath = resolve(ROOT, docName);
  if (!existsSync(docPath)) {
    console.error(`❌ ${docName} not found`);
    failed = true;
    continue;
  }

  const src = readFileSync(docPath, 'utf8');
  const refs = collectRefs(src);
  let checked = 0;

  for (const ref of refs) {
    if (shouldSkip(ref)) continue;
    checked++;

    const found = SEARCH_PREFIXES.some(prefix => existsSync(resolve(ROOT, prefix + ref)))
      || existsSync(resolve(dirname(docPath), ref));

    if (found) continue;

    failed = true;
    console.error(`❌ ${docName}: references missing file → ${ref}`);
  }

  console.log(`✅ ${docName}: scanned ${checked} file references`);
}

if (failed) process.exit(1);
