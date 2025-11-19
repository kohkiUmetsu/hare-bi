'use client';

import { useFormState, useFormStatus } from 'react-dom';
import type { SectionOption } from '@/lib/metrics';
import { createAgent, type CreateAgentState } from './actions';

const initialState: CreateAgentState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
    >
      {pending ? '作成中...' : '代理店アカウントを作成'}
    </button>
  );
}

interface CreateAgentFormProps {
  sections: SectionOption[];
}

export function CreateAgentForm({ sections }: CreateAgentFormProps) {
  const [state, formAction] = useFormState(createAgent, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-neutral-700">
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-neutral-700">
          初期パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={6}
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="sectionId" className="text-sm font-medium text-neutral-700">
          担当セクション
        </label>
        <select
          id="sectionId"
          name="sectionId"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
          defaultValue=""
          disabled={sections.length === 0}
        >
          <option value="" disabled>
            セクションを選択
          </option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.label}
              {section.projectName ? `（${section.projectName}）` : ''}
            </option>
          ))}
        </select>
        {sections.length === 0 ? (
          <p className="text-xs text-red-600">
            セクションがBigQueryに存在しないため、代理店を作成できません。
          </p>
        ) : null}
      </div>

      {state?.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {state?.success ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
