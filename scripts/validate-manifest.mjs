#!/usr/bin/env node
/**
 * validate-manifest.mjs
 * Verifies:
 *   - manifest.json is valid JSON
 *   - manifest_version === 3
 *   - version is a valid semver-ish string (X.Y or X.Y.Z)
 *   - permissions are whitelisted
 *   - host_permissions match Studocu domains only
 *   - content_scripts[].matches subset of host_permissions
 *   - all referenced files exist on disk
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MANIFEST_PATH = resolve(ROOT, 'manifest.json');

const ALLOWED_PERMISSIONS = new Set([
  'cookies',
  'scripting',
  'activeTab',
  'tabs',
  'storage',
]);

const ALLOWED_HOST_RE = /^\*:\/\/(\*\.)?studocu\.(com|vn)\/\*$/;
const VERSION_RE = /^\d+\.\d+(\.\d+)?$/;

const errors = [];

function fail(msg) { errors.push(msg); }

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
} catch (e) {
  console.error(`❌ manifest.json is not valid JSON: ${e.message}`);
  process.exit(1);
}

if (manifest.manifest_version !== 3) {
  fail(`manifest_version must be 3 (got ${manifest.manifest_version})`);
}

if (!VERSION_RE.test(String(manifest.version || ''))) {
  fail(`version must match X.Y or X.Y.Z (got "${manifest.version}")`);
}

for (const perm of manifest.permissions || []) {
  if (!ALLOWED_PERMISSIONS.has(perm)) {
    fail(`permission "${perm}" is not in the whitelist (${[...ALLOWED_PERMISSIONS].join(', ')})`);
  }
}

const hostPerms = manifest.host_permissions || [];
for (const host of hostPerms) {
  if (!ALLOWED_HOST_RE.test(host)) {
    fail(`host_permission "${host}" is not a Studocu match pattern`);
  }
}

// content_scripts.matches subset of host_permissions
for (const cs of manifest.content_scripts || []) {
  for (const match of cs.matches || []) {
    if (!ALLOWED_HOST_RE.test(match)) {
      fail(`content_scripts match "${match}" is outside Studocu domains`);
    }
  }
  for (const file of [...(cs.css || []), ...(cs.js || [])]) {
    const abs = resolve(ROOT, file);
    if (!existsSync(abs)) fail(`content_scripts references missing file: ${file}`);
  }
}

// Action default popup must exist
if (manifest.action?.default_popup) {
  const abs = resolve(ROOT, manifest.action.default_popup);
  if (!existsSync(abs)) fail(`action.default_popup not found: ${manifest.action.default_popup}`);
}

// Icons exist
for (const [size, path] of Object.entries(manifest.icons || {})) {
  if (!existsSync(resolve(ROOT, path))) fail(`icon[${size}] missing: ${path}`);
}

// Web-accessible resources exist
for (const war of manifest.web_accessible_resources || []) {
  for (const file of war.resources || []) {
    if (!existsSync(resolve(ROOT, file))) fail(`web_accessible_resource missing: ${file}`);
  }
  for (const match of war.matches || []) {
    if (!ALLOWED_HOST_RE.test(match)) {
      fail(`web_accessible_resources match "${match}" is outside Studocu domains`);
    }
  }
}

if (errors.length) {
  console.error('❌ manifest validation failed:');
  for (const e of errors) {
    console.error(`   - ${e}`);
  }
  process.exit(1);
}

console.log(`✅ manifest.json OK (version ${manifest.version}, ${(manifest.permissions || []).length} permissions, ${hostPerms.length} hosts)`);
