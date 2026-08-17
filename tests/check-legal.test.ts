// tests/check-legal.test.ts
// Strict TDD (WU5 task 5.3): RED-first integration tests for the release-gate
// script `npm run check:legal` (scripts/check-legal.mjs, design D10).
//
// Gate contract (D10 — deliberately NOT part of `npm test`):
//   - exits NONZERO while any ACTIVE document has legalApproved:false
//     (the honest release blocker while legal texts are placeholders)
//   - exits NONZERO on any hash drift (registry integrity)
//   - exits ZERO only when every active document is approved AND hashes are
//     intact — and reports that state honestly.
//
// The script accepts an optional registry path argument so the tests can run
// it against derived fixtures (real legal.ts with hashes/approvals mutated) —
// no mocks, no new dependencies (node env).

import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(REPO_ROOT, 'scripts', 'check-legal.mjs');
const REGISTRY = join(REPO_ROOT, 'src', 'config', 'legal.ts');
const NODE = process.execPath;

async function runCheck(registryPath: string | undefined) {
  const args = [SCRIPT];
  if (registryPath) args.push(registryPath);
  try {
    const { stdout } = await execFileAsync(NODE, args, { cwd: REPO_ROOT });
    return { code: 0, output: stdout };
  } catch (err: any) {
    return { code: typeof err.code === 'number' ? err.code : 1, output: `${err.stdout ?? ''}\n${err.stderr ?? ''}` };
  }
}

async function withFixture(mutate: (source: string) => string, fn: (path: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), 'check-legal-'));
  const fixturePath = join(dir, 'legal.ts');
  try {
    const source = await readFile(REGISTRY, 'utf8');
    await writeFile(fixturePath, mutate(source), 'utf8');
    await fn(fixturePath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('npm run check:legal — release gate (D10)', () => {
  it('fails on the CURRENT registry: every active doc is an unapproved placeholder', async () => {
    const { code, output } = await runCheck(undefined);

    expect(code).not.toBe(0);
    // Honest report: names the release blocker and the flag, never claims approval.
    expect(output).toMatch(/release blocker/i);
    expect(output).toMatch(/legalApproved:false/i);
    expect(output).not.toMatch(/pass/i);
  }, 30000);

  it('fails with a hash-mismatch report when a stored hash drifts from its sections', async () => {
    await withFixture(
      (source) => source.replace('d94cb64ac17f18f3e64f03526c7efd32244848dc16b7386d2769152945ef2f6b', 'a'.repeat(64)),
      async (fixturePath) => {
        const { code, output } = await runCheck(fixturePath);

        expect(code).not.toBe(0);
        expect(output).toMatch(/hash mismatch/i);
      }
    );
  }, 30000);

  it('passes only when every ACTIVE document is approved and hashes are intact', async () => {
    await withFixture(
      (source) => source.replaceAll('legalApproved: false', 'legalApproved: true'),
      async (fixturePath) => {
        const { code, output } = await runCheck(fixturePath);

        expect(code).toBe(0);
        expect(output).toMatch(/PASS/i);
        expect(output).toMatch(/approved/i);
      }
    );
  }, 30000);
});
