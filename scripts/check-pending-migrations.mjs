// Prebuild guard: fails the Vercel build if any local migration in
// supabase/migrations/ has not been applied to the linked production Supabase
// project. Prevents the "code shipped, migration didn't" deploy gap.
//
// Required env (set in Vercel project settings, NOT in code):
//   SUPABASE_ACCESS_TOKEN     — personal access token from
//                               https://supabase.com/dashboard/account/tokens
//   NEXT_PUBLIC_SUPABASE_URL  — already set for the app; project ref is parsed
//                               from this (no separate ref var needed).
//
// Runs only in Vercel CI by default. To dry-run locally:
//   CHECK_PENDING_MIGRATIONS=1 \
//   SUPABASE_ACCESS_TOKEN=... NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
//   node scripts/check-pending-migrations.mjs

import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const inVercel = process.env.VERCEL === '1';
const forceLocal = process.env.CHECK_PENDING_MIGRATIONS === '1';

if (!inVercel && !forceLocal) {
  console.log('[migrations] Skipped (not in Vercel; set CHECK_PENDING_MIGRATIONS=1 to force).');
  process.exit(0);
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!token) {
  console.error('[migrations] BUILD BLOCKED — missing SUPABASE_ACCESS_TOKEN.');
  console.error('  Generate one at https://supabase.com/dashboard/account/tokens');
  console.error('  Add it in Vercel project settings → Environment Variables.');
  process.exit(1);
}

if (!supabaseUrl) {
  console.error('[migrations] BUILD BLOCKED — missing NEXT_PUBLIC_SUPABASE_URL.');
  console.error('  This should already be set for the app to run. Check Vercel env.');
  process.exit(1);
}

// Parse project ref from URL: https://<ref>.supabase.co
const refMatch = supabaseUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.(co|in|net)$/i);
if (!refMatch) {
  console.error(`[migrations] BUILD BLOCKED — could not parse project ref from NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`);
  console.error('  Expected format: https://<ref>.supabase.co');
  process.exit(1);
}
const projectRef = refMatch[1];

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
if (!existsSync(migrationsDir)) {
  console.log('[migrations] No supabase/migrations directory. Nothing to check.');
  process.exit(0);
}

const localFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (localFiles.length === 0) {
  console.log('[migrations] No local migration files. Nothing to check.');
  process.exit(0);
}

const localVersions = localFiles.map((f) => ({
  version: f.split('_')[0],
  file: f,
}));

let remote;
try {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/migrations`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    const body = await res.text();
    console.error(`[migrations] BUILD BLOCKED — Supabase API ${res.status}: ${body.slice(0, 300)}`);
    console.error('  Verify SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.');
    process.exit(1);
  }
  remote = await res.json();
} catch (err) {
  console.error('[migrations] BUILD BLOCKED — network error contacting Supabase API:');
  console.error(`  ${err.message}`);
  process.exit(1);
}

const remoteVersions = new Set(
  (Array.isArray(remote) ? remote : []).map((m) => String(m.version ?? '')),
);

const pending = localVersions.filter((m) => !remoteVersions.has(m.version));

if (pending.length > 0) {
  console.error(`[migrations] BUILD BLOCKED — ${pending.length} pending migration(s) not applied to prod:`);
  for (const m of pending) console.error(`  - ${m.file}`);
  console.error('');
  console.error('  Fix locally:');
  console.error('    npx supabase db push');
  console.error('  Then redeploy.');
  process.exit(1);
}

console.log(`[migrations] OK — all ${localFiles.length} migration(s) applied to prod.`);
