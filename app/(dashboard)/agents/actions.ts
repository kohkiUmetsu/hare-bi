'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth-server';
import { upsertProfile } from '@/lib/agents';
import { getAdminSupabase } from '@/utils/supabase/admin';

type UpdateUserParams = Parameters<
  ReturnType<typeof getAdminSupabase>['auth']['admin']['updateUserById']
>[1];

export type CreateAgentState = {
  error?: string;
  success?: string;
};

export async function createAgent(
  _: CreateAgentState | undefined,
  formData: FormData
): Promise<CreateAgentState> {
  await requireAdmin();

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const sectionId = String(formData.get('sectionId') ?? '').trim();

  if (!email || !password || !sectionId) {
    return { error: 'メール、パスワード、セクションをすべて入力してください。' };
  }

  const adminClient = getAdminSupabase();

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    return { error: error?.message ?? 'ユーザー作成に失敗しました。' };
  }

  await upsertProfile({
    id: data.user.id,
    email,
    role: 'agent',
    sectionId,
  });

  const payload: UpdateUserParams = {
    app_metadata: { role: 'agent', sectionId },
  };
  await adminClient.auth.admin.updateUserById(data.user.id, payload);

  revalidatePath('/agents');

  return { success: '代理店アカウントを作成しました。' };
}
