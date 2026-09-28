export const DEFAULT_PORT: number;
export const DEFAULT_HOST: string;
export const PUBLIC_DIR: string;

export function resolveUploadPath(publicDir: string, filename: string): string;
export function getListenHost(env?: Record<string, string | undefined>): string;
export function getListenPort(env?: Record<string, string | undefined>): number;
export function createUploaderServer(options?: { publicDir?: string }): import('node:http').Server;
export function startServer(env?: Record<string, string | undefined>): import('node:http').Server;
