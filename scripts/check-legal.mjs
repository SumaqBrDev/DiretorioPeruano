#!/usr/bin/env node
// scripts/check-legal.mjs
// LGPD release gate (design D10, WU5 task 5.3).
//
//   npm run check:legal [path-to-legal.ts]
//
// Exits NONZERO (release blocked) when:
//   1. any ACTIVE document (max version with effectiveDate <= today, per the
//      registry's own resolution) has legalApproved:false — the honest
//      release blocker while the PT-BR legal texts are placeholders pending
//      responsible/DPO approval; or
//   2. any stored document hash drifts from the recomputed sha256 of its
//      sections (registry integrity).
//
// Exits ZERO only when every active document is approved AND all hashes are
// intact, reporting that state explicitly.
//
// The gate is deliberately NOT part of `npm test` (D10): dev iteration must
// not be blocked by legal drafting. Release = `npm run check:legal` PASS +
// DPO sign-off on texts/processing matrix + D1 capture-point confirmation.
//
// The registry is TypeScript; this script loads it WITHOUT adding a runtime
// dependency by transpiling the single self-contained module (typescript is
// already a devDependency) and evaluating it in a fresh VM context that
// injects only webcrypto/TextEncoder (Node's vm contexts do not inherit
// Node globals). Optional argv[1] overrides the registry path (test fixtures).

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createContext, runInContext } from 'node:vm';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ts = require('typescript');

const DEFAULT_REGISTRY = resolve(__dirname, '../src/config/legal.ts');
const registryPath = resolve(process.argv[2] ?? DEFAULT_REGISTRY);

const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
  console.error(`✖ ${message}`);
}

function loadRegistry(path) {
  let source;
  try {
    source = readFileSync(path, 'utf8');
  } catch (err) {
    fail(`cannot read registry at ${path}: ${err.message}`);
    return null;
  }

  let js;
  try {
    js = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
  } catch (err) {
    fail(`cannot transpile registry (${path}): ${err.message}`);
    return null;
  }

  const sandbox = {
    module: { exports: {} },
    exports: {},
    crypto: globalThis.crypto,
    TextEncoder: globalThis.TextEncoder,
    console,
  };
  sandbox.exports = sandbox.module.exports;

  try {
    runInContext(js, createContext(sandbox));
  } catch (err) {
    fail(`cannot evaluate registry (${path}): ${err.message}`);
    return null;
  }

  const api = sandbox.module.exports;
  if (!Array.isArray(api.LEGAL_DOCS) || typeof api.activeLegalDocs !== 'function' || typeof api.verifyLegalDocHashes !== 'function') {
    fail(`registry (${path}) does not export the expected API (LEGAL_DOCS, activeLegalDocs, verifyLegalDocHashes)`);
    return null;
  }
  return api;
}

async function main() {
  const api = loadRegistry(registryPath);
  if (!api) {
    console.error('\ncheck:legal FAIL — registry could not be loaded. Release blocked.');
    process.exit(1);
  }

  const { LEGAL_DOCS, activeLegalDocs, verifyLegalDocHashes } = api;
  const now = new Date();
  const active = activeLegalDocs(now);

  // 1. Hash integrity — every registry entry, active or not (drift anywhere
  //    breaks the audit contract).
  const mismatches = await verifyLegalDocHashes();
  for (const m of mismatches) {
    fail(`Hash mismatch: ${m.id} v${m.version} — expected ${m.expected}, got ${m.actual}`);
  }

  // 2. Release gate — every ACTIVE document must be legally approved.
  const unapproved = active.filter((d) => d.legalApproved !== true);
  for (const d of unapproved) {
    fail(`Release blocker: ACTIVE document "${d.id}" v${d.version} (effective ${d.effectiveDate}) has legalApproved:false`);
  }

  // 3. Honest report.
  console.log(`check:legal — registry: ${registryPath}`);
  console.log(`as of ${now.toISOString().slice(0, 10)} — ${LEGAL_DOCS.length} registered doc(s), ${active.length} active`);
  for (const d of LEGAL_DOCS) {
    const isActive = active.some((a) => a.id === d.id && a.version === d.version);
    console.log(
      `  ${isActive ? 'ACTIVE ' : 'inactive'} ${d.id} v${d.version} (effective ${d.effectiveDate}) ` +
        `legalApproved:${d.legalApproved === true} hash:${mismatches.some((m) => m.id === d.id && m.version === d.version) ? 'MISMATCH' : 'ok'}`
    );
  }

  if (failures.length > 0) {
    console.error(`\ncheck:legal FAIL — ${failures.length} release blocker(s) found. Release is BLOCKED until the responsible/DPO approves the PT-BR legal texts and the registry hashes are intact.`);
    process.exit(1);
  }

  console.log(`\n✔ check:legal PASS — ${active.length} active document(s) approved, all hashes intact.`);
  console.log('Release prerequisites still required: DPO sign-off on texts/processing matrix + D1 capture-point confirmation.');
  process.exit(0);
}

main().catch((err) => {
  console.error('check:legal FAIL — unexpected error:', err);
  process.exit(1);
});
