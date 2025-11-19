#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const [, , email, password] = process.argv;

  if (!email || !password) {
    console.error('Usage: npm run create-admin -- <email> <password>');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !serviceRoleKey) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE(_KEY) environment variables.'
    );
    process.exit(1);
  }

  const adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  console.log(`Creating admin account for ${email}...`);

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    console.error('Failed to create auth user:', error?.message ?? 'unknown error');
    process.exit(1);
  }

  const userId = data.user.id;

  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert({
      id: userId,
      email,
      role: 'admin',
    });

  if (profileError) {
    console.error('Auth user was created, but inserting into profiles failed:', profileError.message);
    console.error('You may need to delete the auth user manually before retrying.');
    process.exit(1);
  }

  console.log('Admin account has been created successfully.');
  console.log(`User ID: ${userId}`);
}

main().catch((err) => {
  console.error('Unexpected error while creating admin:', err);
  process.exit(1);
});
