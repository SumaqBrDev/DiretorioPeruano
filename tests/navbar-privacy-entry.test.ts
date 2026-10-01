// tests/navbar-privacy-entry.test.ts
//
// The LGPD rights hub (/preferencias) was reachable only from the footer of a
// 4400px page, so authenticated users could not find it: the data subject had
// no practical way to exercise access, portability, or revocation rights.
//
// These tests assert the authenticated user menu exposes the entry, for every
// role, without disturbing the existing items.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const navbarSource = readFileSync(
  resolve(__dirname, '../src/components/Navbar.tsx'),
  'utf-8'
);

const esLocale = JSON.parse(
  readFileSync(resolve(__dirname, '../src/i18n/locales/es-PE.json'), 'utf-8')
);
const ptLocale = JSON.parse(
  readFileSync(resolve(__dirname, '../src/i18n/locales/pt-BR.json'), 'utf-8')
);

describe('Navbar — privacy preferences entry for authenticated users', () => {
  it('links to /preferencias from the authenticated user menu', () => {
    expect(navbarSource).toContain('to="/preferencias"');
  });

  it('labels the entry through i18n instead of a hardcoded string', () => {
    expect(navbarSource).toMatch(/t\(['"]nav\.privacy_preferences['"]\)/);
  });

  // The entry must not be gated behind a role or an owned business: every data
  // subject exercises the same LGPD rights.
  it('renders the entry outside the admin and business conditionals', () => {
    const menuStart = navbarSource.indexOf('to="/inbox"');
    const menuEnd = navbarSource.indexOf('signOut()');
    expect(menuStart).toBeGreaterThan(-1);
    expect(menuEnd).toBeGreaterThan(menuStart);

    const menuBlock = navbarSource.slice(menuStart, menuEnd);
    const entryIndex = menuBlock.indexOf('to="/preferencias"');
    expect(entryIndex).toBeGreaterThan(-1);

    // Walk back from the entry to the nearest conditional opener; it must not
    // be one of the role/business guards.
    const before = menuBlock.slice(0, entryIndex);
    expect(before).not.toMatch(/\{isAdmin && \([^)]*$/);
    expect(before).not.toMatch(/\{isSuperAdmin && \([^)]*$/);
    expect(before).not.toMatch(/\{businessEntry && businessLoaded && \([^)]*$/);
  });

  it('closes the dropdown when the entry is clicked, like its siblings', () => {
    const entryIndex = navbarSource.indexOf('to="/preferencias"');
    const block = navbarSource.slice(entryIndex, entryIndex + 400);
    expect(block).toContain('setUserMenuOpen(false)');
  });

  it('provides the label in both locales', () => {
    expect(typeof esLocale.nav.privacy_preferences).toBe('string');
    expect(esLocale.nav.privacy_preferences.length).toBeGreaterThan(0);
    expect(typeof ptLocale.nav.privacy_preferences).toBe('string');
    expect(ptLocale.nav.privacy_preferences.length).toBeGreaterThan(0);
  });

  it('keeps the existing menu entries intact', () => {
    expect(navbarSource).toContain('to="/inbox"');
    expect(navbarSource).toContain('to="/admin"');
    expect(navbarSource).toContain('to="/admin/super"');
    expect(navbarSource).toContain('to="/admin/comunidade"');
  });
});
