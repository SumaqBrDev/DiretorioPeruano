import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { getListenHost, resolveUploadPath } from '../scripts/uploader.js';

describe('dev uploader path safety', () => {
  const publicDir = path.resolve('public');

  it('resolves simple basenames inside the public directory', () => {
    expect(resolveUploadPath(publicDir, 'logo.png')).toBe(path.join(publicDir, 'logo.png'));
  });

  it('rejects absolute paths, traversal, and path separators from client filenames', () => {
    for (const filename of ['/tmp/pwn.png', 'C:\\tmp\\pwn.png', '../pwn.png', 'nested/pwn.png', 'nested\\pwn.png', '..']) {
      expect(() => resolveUploadPath(publicDir, filename)).toThrow(/Invalid filename/);
    }
  });
});

describe('dev uploader bind address', () => {
  it('defaults to loopback and allows an explicit override', () => {
    expect(getListenHost({})).toBe('127.0.0.1');
    expect(getListenHost({ UPLOADER_HOST: '0.0.0.0' })).toBe('0.0.0.0');
  });
});
