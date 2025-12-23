'use client';

import { useServerActionState } from '@/components/use-server-action-state';
import type { TikTokAccountSetting } from '@/lib/report-settings/types';
import {
  deleteTiktokAccount,
  
  upsertTiktokAccount,
  type SettingsActionState,
} from '../actions';
import { SettingsDeleteButton } from './delete-button';
import { FormStateMessage } from './form-state-message';

interface TiktokAccountsSectionProps {
  accounts: TikTokAccountSetting[];
}

export function TiktokAccountsSection({ accounts }: TiktokAccountsSectionProps) {
  const [state, formAction] = useServerActionState<SettingsActionState>(
    upsertTiktokAccount,
    { status: null }
  );
  const handleAction = async (formData: FormData) => {
    await formAction(formData);
  };

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <header>
        <h2 className="text-2xl font-semibold">TikTok広告主</h2>
        <p className="text-sm text-neutral-500">TikTok広告主を登録します。プロジェクトとの紐付けはプロジェクト作成時に設定します。</p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="overflow-auto rounded-md border border-neutral-200">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2 text-left">広告主ID</th>
                <th className="px-3 py-2 text-left">広告主名</th>
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
                  <tr key={account.advertiser_id}>
                    <td className="px-3 py-2 font-mono text-xs">{account.advertiser_id}</td>
                    <td className="px-3 py-2">{account.advertiser_name}</td>
                    <td className="px-3 py-2 text-right">
                      <SettingsDeleteButton
                        confirmMessage={`${account.advertiser_name} を削除しますか？`}
                        onDelete={() => deleteTiktokAccount(account.advertiser_id)}
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
            <label className="text-sm font-medium text-neutral-700" htmlFor="tiktok_advertiser_id">
              広告主ID
            </label>
            <input
              id="tiktok_advertiser_id"
              name="advertiser_id"
              required
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-700" htmlFor="tiktok_advertiser_name">
              広告主名
            </label>
            <input
              id="tiktok_advertiser_name"
              name="advertiser_name"
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
