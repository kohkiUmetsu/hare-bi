'use client';

import { useServerActionState } from '@/components/use-server-action-state';
import type { ReportUpdateSetting } from '@/lib/report-settings/types';
import {
  deleteReportUpdate,
  upsertReportUpdate,
  type SettingsActionState,
} from '../../settings/actions';
import { SettingsDeleteButton } from '../../settings/_components/delete-button';
import { FormStateMessage } from '../../settings/_components/form-state-message';

interface DataUpdatesSectionProps {
  request: ReportUpdateSetting | null;
  projectNames: string[];
}

export function DataUpdatesSection({ request, projectNames }: DataUpdatesSectionProps) {
  const [state, formAction] = useServerActionState<SettingsActionState>(
    upsertReportUpdate,
    { status: null }
  );
  const handleAction = async (formData: FormData) => {
    await formAction(formData);
  };

  return (
    <section className="border border-neutral-200 bg-white p-6 shadow-sm">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold">データ更新リクエスト</h2>
        <p className="text-sm text-neutral-500">
          現在のリクエストを編集し、保存すると1件だけ反映されます。
        </p>
        {request ? (
          <p className="text-sm text-neutral-600">
            {request.project_name} ({request.start_date} ~ {request.end_date}) を更新対象として設定中です。
          </p>
        ) : (
          <p className="text-sm text-neutral-600">まだ更新リクエストは作成されていません。</p>
        )}
      </header>

      <form action={handleAction} className="mt-6 flex flex-col gap-4 border border-neutral-200 p-4">
        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="report_project_name">
            プロジェクト名
          </label>
          <select
            id="report_project_name"
            name="project_name"
            required
            defaultValue={request?.project_name ?? ''}
            className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>
              プロジェクトを選択してください
            </option>
            {projectNames.map((name) => (
              <option value={name} key={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-700" htmlFor="start_date">
              開始日
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              required
              defaultValue={request?.start_date ?? ''}
              className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700" htmlFor="end_date">
              終了日
            </label>
            <input
              id="end_date"
              name="end_date"
              type="date"
              required
              defaultValue={request?.end_date ?? ''}
              className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <FormStateMessage state={state} />

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
          >
            保存
          </button>

          {request ? (
            <SettingsDeleteButton
              confirmMessage={`${request.project_name} (${request.start_date} ~ ${request.end_date}) のリクエストを削除しますか？`}
              onDelete={() => deleteReportUpdate(request.project_name, request.start_date, request.end_date)}
              label="削除"
            />
          ) : null}
        </div>
      </form>
    </section>
  );
}
