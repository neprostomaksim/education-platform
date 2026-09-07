// Read-only verification against the owner's administrator list, 2026-09-07.
import { createClient } from '@supabase/supabase-js';

process.loadEnvFile('.env.local');
const ownerEmail = 'leonovmax126@gmail.com';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
function checked(result, operation) {
  if (result.error) throw new Error(`${operation} failed (${result.error.code || result.error.status || result.error.name || 'unknown'})`);
  return result.data;
}
try {
  const matches = [];
  for (let page = 1; page <= 100; page++) {
    const data = checked(await db.auth.admin.listUsers({ page, perPage: 100 }), 'Auth lookup');
    matches.push(...data.users.filter(user => user.email?.toLowerCase() === ownerEmail));
    if (data.users.length < 100) break;
    if (page === 100) throw new Error('Auth pagination limit exceeded');
  }
  if (matches.length !== 1) throw new Error(`Expected one owner Auth account; found ${matches.length}`);
  const owner = matches[0];
  const profile = checked(await db.from('profiles').select('id,role,is_approved').eq('id', owner.id).single(), 'Owner profile');
  const admins = checked(await db.from('profiles').select('id').eq('role', 'admin'), 'Admin inventory');
  checked(await db.from('purchases').select('provider_transaction_id,amount_minor,delivery_sent_at,claim_expires_at').limit(0), 'Migration 030 columns');
  const bucket = checked(await db.storage.getBucket('lesson-images'), 'Image bucket');
  console.log(JSON.stringify({ mode: 'read-only', ownerEmail,
    emailConfirmed: !!owner.email_confirmed_at, ownerRole: profile.role,
    adminCount: admins.length, otherAdminCount: admins.filter(row => row.id !== owner.id).length,
    securityColumnsPresent: true, lessonImagesPrivate: bucket.public === false }));

  if (!owner.email_confirmed_at || admins.length !== 1 || admins[0].id !== owner.id) {
    throw new Error('Administrator list does not match the confirmed owner; no roles changed');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Administrator reconciliation failed');
  process.exitCode = 1;
}
