'use client';

import { useServerActionState } from '@/components/use-server-action-state';
import type { MspAdvertiserSetting } from '@/lib/report-settings/types';
import {
  deleteMspAdvertiser,
  
  upsertMspAdvertiser,
  type SettingsActionState,
} from '../actions';
import { SettingsDeleteButton } from './delete-button';
import { FormStateMessage } from './form-state-message';

interface MspAdvertisersSectionProps {
  advertisers: MspAdvertiserSetting[];
}

export function MspAdvertisersSection({ advertisers }: MspAdvertisersSectionProps) {
  const [state, formAction] = useServerActionState<SettingsActionState>(
    upsertMspAdvertiser,
    { status: null }
  );
  const handleAction = async (formData: FormData) => {
    await formAction(formData);
  };

  return (
    <section className="border border-neutral-200 bg-white p-6 shadow-sm">
      <header>
        <h2 className="text-2xl font-semibold">MSP広告主</h2>
        <p className="text-sm text-neutral-500">MSP広告主IDと広告主名を管理します。</p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="overflow-auto border border-neutral-200">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-[#3F3F3F] text-xs font-semibold uppercase tracking-wide text-white">
              <tr>
                <th className="px-3 py-2 text-left">MSP広告主ID</th>
                <th className="px-3 py-2 text-left">広告主名</th>
                <th className="px-3 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {advertisers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-center text-sm text-neutral-500">
                    データがありません。
                  </td>
                </tr>
              ) : (
                advertisers.map((advertiser) => (
                  <tr key={advertiser.id} className="odd:bg-white even:bg-[#F5F7FA]">
                    <td className="px-3 py-2 font-mono text-xs">{advertiser.id}</td>
                    <td className="px-3 py-2">{advertiser.name}</td>
                    <td className="px-3 py-2 text-right">
                      <SettingsDeleteButton
                        confirmMessage={`${advertiser.name} を削除しますか？`}
                        onDelete={() => deleteMspAdvertiser(advertiser.id)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <form action={handleAction} className="flex flex-col gap-4 border border-neutral-200 p-4">
          <div>
            <label className="text-sm font-medium text-neutral-700" htmlFor="msp_id">
              MSP広告主ID
            </label>
            <input
              id="msp_id"
              name="id"
              required
              placeholder="123"
              className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-700" htmlFor="msp_name">
              広告主名
            </label>
            <input
              id="msp_name"
              name="name"
              required
              className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>

          <FormStateMessage state={state} />

          <button
            type="submit"
            className="mt-2 inline-flex items-center justify-center rounded-md bg-[var(--accent-color)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            保存
          </button>
        </form>
      </div>
    </section>
  );
}
