// scripts/test-ssl-connection.mjs
// Connectivity probe for a candidate DATABASE_URL.
//
// Reads the URL from DATABASE_URL, opens a real connection and reports ONLY
// booleans and non-sensitive metadata. The connection string, its password
// and the host are never printed.
//
// Also reports whether the pg deprecation warning for legacy sslmode aliases
// is still emitted, which is the whole point of moving to verify-full.
//
// Usage: DATABASE_URL="..." node scripts/test-ssl-connection.mjs

import pg from 'pg';

let sawSslWarning = false;
process.on('warning', (w) => {
  if (/SSL modes|libpq/i.test(w.message)) sawSslWarning = true;
});

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const parsed = new URL(url);
console.log('sslmode:', parsed.searchParams.get('sslmode') ?? '(none)');
console.log('channel_binding:', parsed.searchParams.get('channel_binding') ?? '(none)');
console.log('uselibpqcompat:', parsed.searchParams.get('uselibpqcompat') ?? '(none)');
console.log('host_is_pooler:', parsed.hostname.includes('-pooler'));
console.log('database:', parsed.pathname.replace(/^\//, ''));

const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
  const info = await client.query(
    `SELECT current_database() AS db,
            (SELECT COUNT(*)::int FROM information_schema.tables
              WHERE table_schema='public') AS public_tables,
            (SELECT COUNT(*)::int FROM "ConsentRecord") AS consent_rows`
  );
  const ssl = await client.query(
    `SELECT ssl, version AS tls FROM pg_stat_ssl WHERE pid = pg_backend_pid()`
  );

  console.log('\n--- CONNECTION ---');
  console.log('connected: true');
  console.log('database:', info.rows[0].db);
  console.log('public_tables:', info.rows[0].public_tables);
  console.log('ConsentRecord readable:', info.rows[0].consent_rows, 'rows');
  console.log('ssl_active:', ssl.rows[0]?.ssl ?? '(unknown)');
  console.log('tls_version:', ssl.rows[0]?.tls ?? '(unknown)');

  await client.end();

  // Give the warning listener a tick to fire.
  await new Promise((r) => setTimeout(r, 100));
  console.log('legacy_sslmode_warning_emitted:', sawSslWarning);

  if (sawSslWarning) {
    console.log('\n[warn] Deprecation warning still present.');
    process.exit(2);
  }
  console.log('\n[ok] Connection succeeded with no legacy sslmode warning.');
  process.exit(0);
} catch (err) {
  // Print the message but never the connection string.
  console.error('\n[FAIL] connected: false');
  console.error('error:', err.message.replace(/postgres(ql)?:\/\/\S+/gi, '<REDACTED>'));
  console.error('code:', err.code ?? '(none)');
  process.exit(1);
}
