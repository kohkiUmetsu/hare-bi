'use client';

import { useState } from 'react';
import { useServerActionState } from '@/components/use-server-action-state';
import type { ProjectSetting, ReportSettings } from '@/lib/report-settings/types';
import { upsertProject, type SettingsActionState } from '../actions';
import { FormStateMessage } from './form-state-message';

interface ProjectEditSectionProps {
  project: ProjectSetting;
  settings: ReportSettings;
}

type ReportType = 'budget' | 'performance';

export function ProjectEditSection({ project, settings }: ProjectEditSectionProps) {
  const [state, formAction] = useServerActionState<SettingsActionState>(
    upsertProject,
    { status: null }
  );
  const [reportType, setReportType] = useState<ReportType>(project.total_report_type);
  const handleAction = async (formData: FormData) => {
    await formAction(formData);
  };

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <header>
        <h2 className="text-2xl font-semibold">プロジェクト設定</h2>
        <p className="text-sm text-neutral-500">
          プロジェクトに紐づける媒体アカウントを編集できます。
        </p>
      </header>

      <form action={handleAction} className="mt-6 flex flex-col gap-6">
        {/* プロジェクト名 (読み取り専用) */}
        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="project_name">
            プロジェクト名
          </label>
          <input
            id="project_name"
            name="project_name"
            value={project.project_name}
            readOnly
            className="mt-1 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600"
          />
        </div>

        {/* 運用形態 */}
        <div>
          <label className="text-sm font-medium text-neutral-700">
            運用形態 <span className="text-red-500">*</span>
          </label>
          <div className="mt-2 flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="total_report_type"
                value="budget"
                checked={reportType === 'budget'}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="h-4 w-4"
              />
              <span className="text-sm">予算運用</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="total_report_type"
                value="performance"
                checked={reportType === 'performance'}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="h-4 w-4"
              />
              <span className="text-sm">成果報酬</span>
            </label>
          </div>
        </div>

        {/* 成果報酬単価（成果報酬の場合のみ） */}
        {reportType === 'performance' && (
          <div>
            <label className="text-sm font-medium text-neutral-700" htmlFor="performance_unit_price">
              成果報酬単価 <span className="text-red-500">*</span>
            </label>
            <input
              id="performance_unit_price"
              name="performance_unit_price"
              type="number"
              step="1"
              defaultValue={project.performance_unit_price ?? undefined}
              required
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="例: 10000"
            />
          </div>
        )}

        {/* 媒体アカウント選択 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-neutral-900">媒体アカウント</h3>

          {/* MSP広告主 */}
          {settings.msp_advertisers.length > 0 && (
            <div>
              <label className="text-sm font-medium text-neutral-700">MSP広告主</label>
              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-md border border-neutral-200 p-3">
                {settings.msp_advertisers.map((advertiser) => (
                  <label key={advertiser.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      name="msp_advertiser_ids"
                      value={advertiser.id}
                      defaultChecked={project.msp_advertiser_ids.includes(advertiser.id)}
                      className="mt-0.5 h-4 w-4"
                    />
                    <div className="flex-1 text-sm">
                      <div className="font-medium">{advertiser.name}</div>
                      <div className="text-xs text-neutral-500">{advertiser.id}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Metaアカウント */}
          {settings.meta_accounts.length > 0 && (
            <div>
              <label className="text-sm font-medium text-neutral-700">Metaアカウント</label>
              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-md border border-neutral-200 p-3">
                {settings.meta_accounts.map((account) => (
                  <label key={account.account_id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      name="meta_account_ids"
                      value={account.account_id}
                      defaultChecked={project.meta_account_ids.includes(account.account_id)}
                      className="mt-0.5 h-4 w-4"
                    />
                    <div className="flex-1 text-sm">
                      <div className="font-medium">{account.account_name}</div>
                      <div className="text-xs text-neutral-500">{account.account_id}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* TikTokアカウント */}
          {settings.tiktok_accounts.length > 0 && (
            <div>
              <label className="text-sm font-medium text-neutral-700">TikTokアカウント</label>
              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-md border border-neutral-200 p-3">
                {settings.tiktok_accounts.map((account) => (
                  <label key={account.advertiser_id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      name="tiktok_advertiser_ids"
                      value={account.advertiser_id}
                      defaultChecked={project.tiktok_advertiser_ids.includes(account.advertiser_id)}
                      className="mt-0.5 h-4 w-4"
                    />
                    <div className="flex-1 text-sm">
                      <div className="font-medium">{account.advertiser_name}</div>
                      <div className="text-xs text-neutral-500">{account.advertiser_id}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Google広告アカウント */}
          {settings.google_ads_accounts.length > 0 && (
            <div>
              <label className="text-sm font-medium text-neutral-700">Google広告アカウント</label>
              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-md border border-neutral-200 p-3">
                {settings.google_ads_accounts.map((account) => (
                  <label key={account.customer_id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      name="google_ads_customer_ids"
                      value={account.customer_id}
                      defaultChecked={project.google_ads_customer_ids.includes(account.customer_id)}
                      className="mt-0.5 h-4 w-4"
                    />
                    <div className="flex-1 text-sm">
                      <div className="font-medium">{account.display_name}</div>
                      <div className="text-xs text-neutral-500">{account.customer_id}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* LINEアカウント */}
          {settings.line_accounts.length > 0 && (
            <div>
              <label className="text-sm font-medium text-neutral-700">LINEアカウント</label>
              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-md border border-neutral-200 p-3">
                {settings.line_accounts.map((account) => (
                  <label key={account.account_id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      name="line_account_ids"
                      value={account.account_id}
                      defaultChecked={project.line_account_ids.includes(account.account_id)}
                      className="mt-0.5 h-4 w-4"
                    />
                    <div className="flex-1 text-sm">
                      <div className="font-medium">{account.display_name}</div>
                      <div className="text-xs text-neutral-500">{account.account_id}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {settings.msp_advertisers.length === 0 &&
            settings.meta_accounts.length === 0 &&
            settings.tiktok_accounts.length === 0 &&
            settings.google_ads_accounts.length === 0 &&
            settings.line_accounts.length === 0 && (
              <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
                まだ媒体アカウントが登録されていません。
              </p>
            )}
        </div>

        <FormStateMessage state={state} />

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
        >
          保存
        </button>
      </form>
    </section>
  );
}
