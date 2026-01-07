'use client';

import { useRouter } from 'next/navigation';
import { deleteProject } from '../actions';
import { SettingsDeleteButton } from './delete-button';

export type ProjectTableRow = {
  project_name: string;
  sections: number;
  msp_advertiser_ids: string[];
  meta_account_ids: string[];
  tiktok_advertiser_ids: string[];
  google_ads_customer_ids: string[];
  line_account_ids: string[];
};

function formatList(values: string[]): string {
  if (!values.length) {
    return '未設定';
  }
  if (values.length <= 3) {
    return values.join(', ');
  }
  const [first, second] = values;
  return `${first}, ${second} 他${values.length - 2}件`;
}

interface ProjectTableProps {
  rows: ProjectTableRow[];
}

export function ProjectTable({ rows }: ProjectTableProps) {
  const router = useRouter();

  const hasRows = rows.length > 0;

  return (
    <div className="overflow-hidden border border-neutral-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-neutral-200 text-sm">
        <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          <tr>
            <th className="px-4 py-3 text-left">プロジェクト名</th>
            <th className="px-4 py-3 text-left">セクション</th>
            <th className="px-4 py-3 text-left">MSP広告主ID</th>
            <th className="px-4 py-3 text-left">Metaアカウント</th>
            <th className="px-4 py-3 text-left">TikTok広告主</th>
            <th className="px-4 py-3 text-left">Google Ads</th>
            <th className="px-4 py-3 text-left">LINEアカウント</th>
            <th className="px-4 py-3 text-left">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {!hasRows && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-sm text-neutral-500">
                まだ登録されたプロジェクトはありません。
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={row.project_name}
              className="cursor-pointer bg-white transition hover:bg-neutral-50"
              onClick={() => router.push(`/settings/projects/${encodeURIComponent(row.project_name)}`)}
            >
              <td className="px-4 py-3 text-base font-medium text-neutral-900">{row.project_name}</td>
              <td className="px-4 py-3 text-neutral-700">{row.sections}件</td>
              <td className="px-4 py-3 text-neutral-700">{formatList(row.msp_advertiser_ids)}</td>
              <td className="px-4 py-3 text-neutral-700">{formatList(row.meta_account_ids)}</td>
              <td className="px-4 py-3 text-neutral-700">{formatList(row.tiktok_advertiser_ids)}</td>
              <td className="px-4 py-3 text-neutral-700">{formatList(row.google_ads_customer_ids)}</td>
              <td className="px-4 py-3 text-neutral-700">{formatList(row.line_account_ids)}</td>
              <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                <SettingsDeleteButton
                  confirmMessage={`「${row.project_name}」を削除しますか？紐づくセクション設定・媒体設定も削除されます。`}
                  onDelete={() => deleteProject(row.project_name)}
                  label="削除"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
