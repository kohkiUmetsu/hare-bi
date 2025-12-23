'use client';

import { useState, useRef } from 'react';
import { useServerActionState } from '@/components/use-server-action-state';
import type { PlatformSetting, SectionSetting } from '@/lib/report-settings/types';
import {
  deletePlatform,
  upsertPlatform,
  type SettingsActionState,
} from '../actions';
import { SettingsDeleteButton } from './delete-button';
import { FormStateMessage } from './form-state-message';

interface PlatformSettingsSectionProps {
  platformSettings: PlatformSetting[];
  sections: SectionSetting[];
  fixedProjectName: string;
}

type ReportType = 'budget' | 'performance';

const PLATFORM_OPTIONS = ['Meta', 'TikTok', 'Google', 'LINE'] as const;

function formatList(values: string[]): string {
  return values.length ? values.join(', ') : '未設定';
}

function formatFeeSettings(values: Record<string, number>): string {
  const entries = Object.entries(values);
  if (!entries.length) return '未設定';
  return entries.map(([name, value]) => `${name}: ${value}`).join(', ');
}

export function PlatformSettingsSection({
  platformSettings,
  sections,
  fixedProjectName,
}: PlatformSettingsSectionProps) {
  const [state, formAction] = useServerActionState<SettingsActionState>(
    upsertPlatform,
    { status: null }
  );

  // Editing state
  const [editingPlatform, setEditingPlatform] = useState<PlatformSetting | null>(null);

  // Platform form state
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [reportType, setReportType] = useState<ReportType>('budget');
  const [feeSettings, setFeeSettings] = useState<Record<string, number>>({});
  const [mspLinkPrefixes, setMspLinkPrefixes] = useState<string[]>([]);
  const [agencyUnitPrice, setAgencyUnitPrice] = useState<string>('');
  const [internalUnitPrice, setInternalUnitPrice] = useState<string>('');
  const [grossProfitFee, setGrossProfitFee] = useState<string>('');

  // Input refs for add buttons
  const feeNameInputRef = useRef<HTMLInputElement>(null);
  const feeValueInputRef = useRef<HTMLInputElement>(null);
  const mspLinkPrefixInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleAddFee = () => {
    const name = feeNameInputRef.current?.value.trim();
    const valueStr = feeValueInputRef.current?.value.trim();
    if (name && valueStr) {
      const value = Number(valueStr);
      if (Number.isFinite(value)) {
        setFeeSettings({ ...feeSettings, [name]: value });
        if (feeNameInputRef.current) feeNameInputRef.current.value = '';
        if (feeValueInputRef.current) feeValueInputRef.current.value = '';
      }
    }
  };

  const handleAddMspLinkPrefix = () => {
    const value = mspLinkPrefixInputRef.current?.value.trim();
    if (value && !mspLinkPrefixes.includes(value)) {
      setMspLinkPrefixes([...mspLinkPrefixes, value]);
      if (mspLinkPrefixInputRef.current) mspLinkPrefixInputRef.current.value = '';
    }
  };

  const handleEditPlatform = (platform: PlatformSetting) => {
    setEditingPlatform(platform);
    setSelectedSection(platform.section_name);
    setSelectedPlatform(platform.platform);
    setReportType(platform.report_type);
    setFeeSettings(platform.fee_settings);
    setMspLinkPrefixes(platform.msp_link_prefixes);
    setAgencyUnitPrice(platform.agency_unit_price?.toString() ?? '');
    setInternalUnitPrice(platform.internal_unit_price?.toString() ?? '');
    setGrossProfitFee(platform.gross_profit_fee?.toString() ?? '');
  };

  const handleCancelEdit = () => {
    setEditingPlatform(null);
    formRef.current?.reset();
    setSelectedSection('');
    setSelectedPlatform('');
    setReportType('budget');
    setFeeSettings({});
    setMspLinkPrefixes([]);
    setAgencyUnitPrice('');
    setInternalUnitPrice('');
    setGrossProfitFee('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // 編集時は選択されているセクションとプラットフォームを明示的に設定
    if (editingPlatform) {
      formData.set('section_name', selectedSection);
      formData.set('platform', selectedPlatform);
    }

    // Add state values to formData
    formData.set('project_name', fixedProjectName);
    formData.set('fee_settings', JSON.stringify(feeSettings));
    formData.set('msp_link_prefixes', mspLinkPrefixes.join(','));

    const result = await formAction(formData);
    if (result.status === 'success') {
      // Reset form and state
      setEditingPlatform(null);
      formRef.current?.reset();
      setSelectedSection('');
      setSelectedPlatform('');
      setReportType('budget');
      setFeeSettings({});
      setMspLinkPrefixes([]);
      setAgencyUnitPrice('');
      setInternalUnitPrice('');
      setGrossProfitFee('');
    }
  };

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <header>
        <h2 className="text-2xl font-semibold">媒体設定</h2>
        <p className="text-sm text-neutral-500">
          セクションごとにプラットフォームの設定を登録します。
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">
              登録済み媒体設定: {platformSettings.length}件
            </span>
          </div>
          {platformSettings.length === 0 ? (
            <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-500">
              まだ登録された媒体設定はありません。右のフォームから媒体設定を追加してください。
            </p>
          ) : (
            platformSettings.map((ps) => (
              <div
                key={`${ps.section_name}-${ps.platform}`}
                className={`rounded-md border px-4 py-3 text-sm transition ${
                  editingPlatform?.section_name === ps.section_name &&
                  editingPlatform?.platform === ps.platform
                    ? 'border-neutral-900 bg-neutral-50'
                    : 'border-neutral-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-neutral-500">
                      {ps.section_name} / {ps.platform}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditPlatform(ps)}
                      className="rounded-md bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200"
                    >
                      編集
                    </button>
                    <SettingsDeleteButton
                      confirmMessage={`${ps.section_name} の ${ps.platform} 設定を削除しますか？`}
                      onDelete={() =>
                        deletePlatform({
                          sectionName: ps.section_name,
                          projectName: ps.project_name,
                          platform: ps.platform,
                        })
                      }
                    />
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-[150px,1fr] gap-x-3 gap-y-1 text-xs text-neutral-600">
                  <dt className="font-semibold text-neutral-700">運用形態</dt>
                  <dd>{ps.report_type === 'performance' ? '成果報酬' : '予算運用'}</dd>
                  <dt className="font-semibold text-neutral-700">手数料設定</dt>
                  <dd>{formatFeeSettings(ps.fee_settings)}</dd>
                  {ps.report_type === 'performance' && (
                    <>
                      <dt className="font-semibold text-neutral-700">HARE単価</dt>
                      <dd>{ps.agency_unit_price ?? '未設定'}</dd>
                      <dt className="font-semibold text-neutral-700">代理店単価</dt>
                      <dd>{ps.internal_unit_price ?? '未設定'}</dd>
                    </>
                  )}
                  {ps.report_type === 'budget' && (
                    <>
                      <dt className="font-semibold text-neutral-700">粗利fee</dt>
                      <dd>{ps.gross_profit_fee}</dd>
                    </>
                  )}
                  <dt className="font-semibold text-neutral-700">MSPリンクID接頭辞</dt>
                  <dd>{formatList(ps.msp_link_prefixes)}</dd>
                </dl>
              </div>
            ))
          )}
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">
            {editingPlatform ? '媒体設定を編集' : '新しい媒体設定を追加'}
          </h3>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">セクション *</span>
            <select
              name="section_name"
              required={!editingPlatform}
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={!!editingPlatform}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-500"
            >
              <option value="">選択してください</option>
              {sections.map((section) => (
                <option key={section.section_name} value={section.section_name}>
                  {section.section_name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">プラットフォーム *</span>
            <select
              name="platform"
              required={!editingPlatform}
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              disabled={!!editingPlatform}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-500"
            >
              <option value="">選択してください</option>
              {PLATFORM_OPTIONS.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-neutral-700">運用形態 *</legend>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="report_type"
                value="budget"
                checked={reportType === 'budget'}
                onChange={() => setReportType('budget')}
                className="h-4 w-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span className="text-sm text-neutral-700">予算運用</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="report_type"
                value="performance"
                checked={reportType === 'performance'}
                onChange={() => setReportType('performance')}
                className="h-4 w-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span className="text-sm text-neutral-700">成果報酬</span>
            </label>
          </fieldset>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">手数料設定</span>
            <div className="flex gap-2">
              <input
                type="text"
                ref={feeNameInputRef}
                placeholder="手数料名"
                className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
              <input
                type="number"
                step="0.01"
                ref={feeValueInputRef}
                placeholder="倍率 (例: 1.1)"
                className="w-32 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
              <button
                type="button"
                onClick={handleAddFee}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
              >
                追加
              </button>
            </div>
            {Object.keys(feeSettings).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(feeSettings).map(([name, value]) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs"
                  >
                    {name}: {value}
                    <button
                      type="button"
                      onClick={() => {
                        const newSettings = { ...feeSettings };
                        delete newSettings[name];
                        setFeeSettings(newSettings);
                      }}
                      className="text-neutral-500 hover:text-neutral-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {reportType === 'performance' && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-neutral-700">HARE単価</span>
                <input
                  type="number"
                  step="0.01"
                  name="agency_unit_price"
                  value={agencyUnitPrice}
                  onChange={(e) => setAgencyUnitPrice(e.target.value)}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-neutral-700">代理店単価</span>
                <input
                  type="number"
                  step="0.01"
                  name="internal_unit_price"
                  value={internalUnitPrice}
                  onChange={(e) => setInternalUnitPrice(e.target.value)}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </label>
            </>
          )}

          {reportType === 'budget' && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">粗利fee *</span>
              <input
                type="number"
                step="any"
                name="gross_profit_fee"
                required={reportType === 'budget'}
                value={grossProfitFee}
                onChange={(e) => setGrossProfitFee(e.target.value)}
                placeholder="例: 1.225"
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </label>
          )}

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">MSPリンクID接頭辞</span>
            <div className="flex gap-2">
              <input
                type="text"
                ref={mspLinkPrefixInputRef}
                placeholder="接頭辞を入力"
                className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
              <button
                type="button"
                onClick={handleAddMspLinkPrefix}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
              >
                追加
              </button>
            </div>
            {mspLinkPrefixes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {mspLinkPrefixes.map((prefix) => (
                  <span
                    key={prefix}
                    className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs"
                  >
                    {prefix}
                    <button
                      type="button"
                      onClick={() => setMspLinkPrefixes(mspLinkPrefixes.filter((p) => p !== prefix))}
                      className="text-neutral-500 hover:text-neutral-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <FormStateMessage state={state} />

          <div className="flex gap-2">
            {editingPlatform && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                キャンセル
              </button>
            )}
            <button
              type="submit"
              className="flex-1 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
            >
              {editingPlatform ? '媒体設定を更新' : '媒体設定を追加'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

