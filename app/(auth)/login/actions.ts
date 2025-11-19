'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export type LoginResult = {
  error?: string;
};

export async function login(_: LoginResult | undefined, formData: FormData): Promise<LoginResult> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'メールアドレスとパスワードを入力してください。' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message ?? 'ログインに失敗しました。' };
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[login] ${email} logged in (id=${data.user.id})`);
  }

  revalidatePath('/', 'layout');
  redirect('/');
}
