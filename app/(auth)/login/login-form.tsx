'use client';

import { useServerActionState } from '@/components/use-server-action-state';
import { useFormStatus } from 'react-dom';
import { login, type LoginResult } from './actions';

const initialState: LoginResult = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="w-full rounded-md bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
    >
      {pending ? '送信中...' : 'ログイン'}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useServerActionState(login, initialState);
  const handleAction = async (formData: FormData) => {
    await formAction(formData);
  };

  return (
    <form action={handleAction} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-neutral-700">
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-neutral-700">
          パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>

      {state?.error ? (
        <div className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
