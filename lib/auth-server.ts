import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export type AppRole = 'admin' | 'agent';

export type SessionUser = {
  id: string;
  email: string | null;
  role: AppRole;
  sectionId: string | null;
};

const fetchCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, section_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    role: profile.role as AppRole,
    sectionId: profile.section_id ?? null,
  };
});

export async function getCurrentUser() {
  return fetchCurrentUser();
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();

  if (user.role !== 'admin') {
    redirect('/sections');
  }

  return user;
}
