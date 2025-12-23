'use client';

import { useServerActionState } from '@/components/use-server-action-state';
import type { LineAccountSetting } from '@/lib/report-settings/types';
import {
  deleteLineAccount,
  
  upsertLineAccount,
  type SettingsActionState,
} from '../actions';
import { SettingsDeleteButton } from './delete-button';
import { FormStateMessage } from './form-state-message';

interface LineAccountsSectionProps {
  accounts: LineAccountSetting[];
}

export function LineAccountsSection({ accounts }: LineAccountsSectionProps) {
  const [state, formAction] = useServerActionState<SettingsActionState>(
    upsertLineAccount,
    { status: null }
  );
  const handleAction = async (formData: FormData) => {
    await formAction(formData);
  };

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <header>
        <h2 className="text-2xl font-semibold">LINEアカウント</h2>
        <p className="text-sm text-neutral-500">LINEアカウントを登録します。プロジェクトとの紐付けはプロジェクト作成時に設定します。</p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="overflow-auto rounded-md border border-neutral-200">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2 text-left">アカウントID</th>
                <th className="px-3 py-2 text-left">表示名</th>
                <th className="px-3 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-center text-sm text-neutral-500">
                    データがありません。
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.account_id}>
                    <td className="px-3 py-2 font-mono text-xs">{account.account_id}</td>
                    <td className="px-3 py-2">{account.display_name}</td>
                    <td className="px-3 py-2 text-right">
                      <SettingsDeleteButton
                        confirmMessage={`${account.display_name} を削除しますか？`}
                        onDelete={() => deleteLineAccount(account.account_id)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <form action={handleAction} className="flex flex-col gap-4 rounded-md border border-neutral-200 p-4">
          <div>
            <label className="text-sm font-medium text-neutral-700" htmlFor="line_account_id">
              アカウントID
            </label>
            <input
              id="line_account_id"
              name="account_id"
              required
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-700" htmlFor="line_display_name">
              表示名
            </label>
            <input
              id="line_display_name"
              name="display_name"
              required
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>

          <FormStateMessage state={state} />

          <button
            type="submit"
            className="mt-2 inline-flex items-center justify-center rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            保存
          </button>
        </form>
      </div>
    </section>
  );
}
