'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useServerActionState } from '@/components/use-server-action-state';
import type { ReportSettings } from '@/lib/report-settings/types';
import { upsertProject, upsertSection, upsertPlatform, type SettingsActionState } from '../../../actions';
import { FormStateMessage } from '../../../_components/form-state-message';

interface ProjectWizardProps {
  settings: ReportSettings;
}

type Step = 'project' | 'sections' | 'platforms' | 'complete';
type ReportType = 'performance' | 'budget';

const PLATFORM_OPTIONS = ['Meta', 'TikTok', 'Google', 'LINE'] as const;

export function ProjectWizard({ settings }: ProjectWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('project');
  const [projectName, setProjectName] = useState('');
  const [addedSections, setAddedSections] = useState<string[]>([]);
  const [addedPlatforms, setAddedPlatforms] = useState<Array<{ section: string; platform: string }>>([]);

  // Project form state
  const [projectReportType, setProjectReportType] = useState<ReportType>('budget');

  // Section form state
  const [mspPrefixes, setMspPrefixes] = useState<string[]>([]);
  const [campaignPrefixes, setCampaignPrefixes] = useState<string[]>([]);
  const [campaignKeywords, setCampaignKeywords] = useState<string[]>([]);
  const [catchAllMsp, setCatchAllMsp] = useState(false);
  const [catchAllCampaign, setCatchAllCampaign] = useState(false);
  const [inHouseOperation, setInHouseOperation] = useState(false);

  // Platform form state
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [platformReportType, setPlatformReportType] = useState<ReportType>('budget');
  const [feeSettings, setFeeSettings] = useState<Record<string, number>>({});
  const [mspLinkPrefixes, setMspLinkPrefixes] = useState<string[]>([]);

  // Input refs for add buttons
  const mspPrefixInputRef = useRef<HTMLInputElement>(null);
  const campaignPrefixInputRef = useRef<HTMLInputElement>(null);
  const campaignKeywordInputRef = useRef<HTMLInputElement>(null);
  const sectionFormRef = useRef<HTMLFormElement>(null);
  const feeNameInputRef = useRef<HTMLInputElement>(null);
  const feeValueInputRef = useRef<HTMLInputElement>(null);
  const mspLinkPrefixInputRef = useRef<HTMLInputElement>(null);
  const platformFormRef = useRef<HTMLFormElement>(null);

  const [projectState, projectFormAction] = useServerActionState<SettingsActionState>(
    upsertProject,
    { status: null }
  );

  const [sectionState, sectionFormAction] = useServerActionState<SettingsActionState>(
    upsertSection,
    { status: null }
  );

  const [platformState, platformFormAction] = useServerActionState<SettingsActionState>(
    upsertPlatform,
    { status: null }
  );

  const handleProjectSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('project_name') as string;
    setProjectName(name);

    const result = await projectFormAction(formData);
    if (result.status === 'success') {
      setStep('sections');
    }
  };

  const handleSectionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const sectionName = formData.get('section_name') as string;

    // Add list and state values to formData
    formData.set('msp_ad_prefixes', mspPrefixes.join(','));
    formData.set('campaign_prefixes', campaignPrefixes.join(','));
    formData.set('campaign_keywords', campaignKeywords.join(','));
    formData.set('catch_all_msp', catchAllMsp ? 'true' : 'false');
    formData.set('catch_all_campaign', catchAllCampaign ? 'true' : 'false');
    formData.set('in_house_operation', inHouseOperation ? 'true' : 'false');

    const result = await sectionFormAction(formData);
    if (result.status === 'success') {
      setAddedSections([...addedSections, sectionName]);
      // Reset form and state
      sectionFormRef.current?.reset();
      setMspPrefixes([]);
      setCampaignPrefixes([]);
      setCampaignKeywords([]);
      setCatchAllMsp(false);
      setCatchAllCampaign(false);
      setInHouseOperation(false);
    }
  };

  const handleAddMspPrefix = () => {
    const value = mspPrefixInputRef.current?.value.trim();
    if (value && !mspPrefixes.includes(value)) {
      setMspPrefixes([...mspPrefixes, value]);
      if (mspPrefixInputRef.current) mspPrefixInputRef.current.value = '';
    }
  };

  const handleAddCampaignPrefix = () => {
    const value = campaignPrefixInputRef.current?.value.trim();
    if (value && !campaignPrefixes.includes(value)) {
      setCampaignPrefixes([...campaignPrefixes, value]);
      if (campaignPrefixInputRef.current) campaignPrefixInputRef.current.value = '';
    }
  };

  const handleAddCampaignKeyword = () => {
    const value = campaignKeywordInputRef.current?.value.trim();
    if (value && !campaignKeywords.includes(value)) {
      setCampaignKeywords([...campaignKeywords, value]);
      if (campaignKeywordInputRef.current) campaignKeywordInputRef.current.value = '';
    }
  };

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

  const handlePlatformSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Add state values to formData
    formData.set('project_name', projectName);
    formData.set('fee_settings', JSON.stringify(feeSettings));
    formData.set('msp_link_prefixes', mspLinkPrefixes.join(','));

    const result = await platformFormAction(formData);
    if (result.status === 'success') {
      setAddedPlatforms([...addedPlatforms, { section: selectedSection, platform: selectedPlatform }]);
      // Reset form and state
      platformFormRef.current?.reset();
      setSelectedSection('');
      setSelectedPlatform('');
      setPlatformReportType('budget');
      setFeeSettings({});
      setMspLinkPrefixes([]);
    }
  };

  const handleFinish = () => {
    router.push('/settings');
  };

  const handleSkipSections = () => {
    setStep('platforms');
  };

  const handleSkipPlatforms = () => {
    setStep('complete');
  };

  const handleGoToPlatforms = () => {
    if (addedSections.length === 0) {
      alert('セクションを少なくとも1つ追加してください。');
      return;
    }
    setStep('platforms');
  };

  if (step === 'project') {
    return (
      <div className="border border-neutral-200 bg-white p-6 shadow-sm">
        <header className="mb-6">
          <h2 className="text-2xl font-semibold">ステップ 1: プロジェクト情報</h2>
          <p className="text-sm text-neutral-500">プロジェクト情報と紐づける媒体アカウントを選択してください。</p>
        </header>

        <form
          onSubmit={handleProjectSubmit}
          className="flex flex-col gap-6"
          encType="multipart/form-data"
        >
          {/* 基本情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-neutral-900">基本情報</h3>

            <div>
              <label className="text-sm font-medium text-neutral-700" htmlFor="project_name">
                プロジェクト名 <span className="text-red-500">*</span>
              </label>
              <input
                id="project_name"
                name="project_name"
                required
                className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
                placeholder="例: プロジェクトA"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700" htmlFor="project_color">
                プロジェクトカラー
              </label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  id="project_color"
                  name="project_color"
                  type="color"
                  defaultValue="#2A9CFF"
                  className="h-11 w-14 border border-neutral-300 bg-white"
                />
                <span className="text-xs text-neutral-500">
                  検索ボックスとパネル枠の色に使用します。
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700" htmlFor="project_icon">
                アイコン画像 (1MB以内)
              </label>
              <input
                id="project_icon"
                name="project_icon"
                type="file"
                accept="image/*"
                className="mt-1 w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200"
              />
              <input type="hidden" name="existing_project_icon_path" value="" />
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
                    checked={projectReportType === 'budget'}
                    onChange={(e) => setProjectReportType(e.target.value as ReportType)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">予算運用</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="total_report_type"
                    value="performance"
                    checked={projectReportType === 'performance'}
                    onChange={(e) => setProjectReportType(e.target.value as ReportType)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">成果報酬</span>
                </label>
              </div>
            </div>

            {/* 成果報酬単価（成果報酬の場合のみ） */}
            {projectReportType === 'performance' && (
              <div>
                <label className="text-sm font-medium text-neutral-700" htmlFor="performance_unit_price">
                  成果報酬単価 <span className="text-red-500">*</span>
                </label>
                <input
                  id="performance_unit_price"
                  name="performance_unit_price"
                  type="number"
                  step="1"
                  required
                  className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
                  placeholder="例: 10000"
                />
              </div>
            )}
          </div>

          {/* 媒体アカウント選択 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-neutral-900">媒体アカウント選択</h3>

            {/* MSP広告主 */}
            {settings.msp_advertisers.length > 0 && (
              <div>
                <label className="text-sm font-medium text-neutral-700">MSP広告主</label>
                <div className="mt-2 max-h-40 space-y-2 overflow-y-auto border border-neutral-200 p-3">
                  {settings.msp_advertisers.map((advertiser) => (
                    <label key={advertiser.id} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        name="msp_advertiser_ids"
                        value={advertiser.id}
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
                <div className="mt-2 max-h-40 space-y-2 overflow-y-auto border border-neutral-200 p-3">
                  {settings.meta_accounts.map((account) => (
                    <label key={account.account_id} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        name="meta_account_ids"
                        value={account.account_id}
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
                <div className="mt-2 max-h-40 space-y-2 overflow-y-auto border border-neutral-200 p-3">
                  {settings.tiktok_accounts.map((account) => (
                    <label key={account.advertiser_id} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        name="tiktok_advertiser_ids"
                        value={account.advertiser_id}
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
                <div className="mt-2 max-h-40 space-y-2 overflow-y-auto border border-neutral-200 p-3">
                  {settings.google_ads_accounts.map((account) => (
                    <label key={account.customer_id} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        name="google_ads_customer_ids"
                        value={account.customer_id}
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
                <div className="mt-2 max-h-40 space-y-2 overflow-y-auto border border-neutral-200 p-3">
                  {settings.line_accounts.map((account) => (
                    <label key={account.account_id} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        name="line_account_ids"
                        value={account.account_id}
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
                <p className="border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
                  まだ媒体アカウントが登録されていません。
                  <br />
                  先に媒体アカウントを登録してください。
                </p>
              )}
          </div>

          <FormStateMessage state={projectState} />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/settings')}
              className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center rounded-md bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
            >
              次へ：セクション設定
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (step === 'sections') {
    return (
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex h-6 w-6 items-center justify-center bg-green-500 text-xs font-semibold text-white">
              ✓
            </div>
            <span className="font-medium text-neutral-900">プロジェクト作成完了</span>
            <span className="text-neutral-500">→</span>
            <div className="flex h-6 w-6 items-center justify-center bg-neutral-900 text-xs font-semibold text-white">
              2
            </div>
            <span className="font-medium text-neutral-900">セクション設定</span>
          </div>
        </div>

        {/* Section list */}
        {addedSections.length > 0 && (
          <div className="border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold">追加済みセクション</h3>
            <ul className="space-y-2">
              {addedSections.map((section, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <div className="flex h-5 w-5 items-center justify-center bg-green-100 text-xs text-green-700">
                    ✓
                  </div>
                  <span>{section}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Section form */}
        <div className="border border-neutral-200 bg-white p-6 shadow-sm">
          <header className="mb-6">
            <h2 className="text-2xl font-semibold">ステップ 2: セクション設定</h2>
            <p className="text-sm text-neutral-500">
              プロジェクト「<strong>{projectName}</strong>」のセクションを追加します。
              <br />
              <span className="text-neutral-600">1つのプロジェクトに複数のセクションを登録できます。セクション名を変えて追加してください。</span>
              <br />
              <span className="text-neutral-600">媒体ごとの詳細設定は、プロジェクト詳細ページの「媒体設定」で行います。</span>
            </p>
          </header>

          <form ref={sectionFormRef} onSubmit={handleSectionSubmit} className="flex flex-col gap-5">
            <input type="hidden" name="project_name" value={projectName} />

            {/* セクション名 */}
            <div>
              <label className="text-sm font-medium text-neutral-700" htmlFor="section_name">
                セクション名 <span className="text-red-500">*</span>
              </label>
              <input
                id="section_name"
                name="section_name"
                required
                className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
                placeholder="例: セクションA"
              />
            </div>

            {/* MSP広告名接頭辞 */}
            <div>
              <label className="text-sm font-medium text-neutral-700">MSP広告名接頭辞</label>
              <div className="mt-2 flex gap-2">
                <input
                  ref={mspPrefixInputRef}
                  type="text"
                  className="flex-1 border border-neutral-300 px-3 py-2 text-sm"
                  placeholder="接頭辞を入力"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMspPrefix(); } }}
                />
                <button
                  type="button"
                  onClick={handleAddMspPrefix}
                  className="rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
                >
                  追加
                </button>
              </div>
              {mspPrefixes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {mspPrefixes.map((prefix, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700"
                    >
                      {prefix}
                      <button
                        type="button"
                        onClick={() => setMspPrefixes(mspPrefixes.filter((_, i) => i !== index))}
                        className="text-neutral-500 hover:text-neutral-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* キャンペーン接頭辞 */}
            <div>
              <label className="text-sm font-medium text-neutral-700">キャンペーン接頭辞</label>
              <div className="mt-2 flex gap-2">
                <input
                  ref={campaignPrefixInputRef}
                  type="text"
                  className="flex-1 border border-neutral-300 px-3 py-2 text-sm"
                  placeholder="接頭辞を入力"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCampaignPrefix(); } }}
                />
                <button
                  type="button"
                  onClick={handleAddCampaignPrefix}
                  className="rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
                >
                  追加
                </button>
              </div>
              {campaignPrefixes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {campaignPrefixes.map((prefix, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
                    >
                      {prefix}
                      <button
                        type="button"
                        onClick={() => setCampaignPrefixes(campaignPrefixes.filter((_, i) => i !== index))}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* キャンペーンキーワード */}
            <div>
              <label className="text-sm font-medium text-neutral-700">キャンペーンキーワード</label>
              <div className="mt-2 flex gap-2">
                <input
                  ref={campaignKeywordInputRef}
                  type="text"
                  className="flex-1 border border-neutral-300 px-3 py-2 text-sm"
                  placeholder="キーワードを入力"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCampaignKeyword(); } }}
                />
                <button
                  type="button"
                  onClick={handleAddCampaignKeyword}
                  className="rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
                >
                  追加
                </button>
              </div>
              {campaignKeywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {campaignKeywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => setCampaignKeywords(campaignKeywords.filter((_, i) => i !== index))}
                        className="text-green-500 hover:text-green-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* キャッチオール・自社運用 */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={catchAllMsp}
                  onChange={(e) => setCatchAllMsp(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-neutral-700">MSPキャッチオール</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={catchAllCampaign}
                  onChange={(e) => setCatchAllCampaign(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-neutral-700">キャンペーンキャッチオール</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inHouseOperation}
                  onChange={(e) => setInHouseOperation(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-neutral-700">自社運用</span>
              </label>
            </div>

            <FormStateMessage state={sectionState} />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSkipSections}
                className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                セクション設定をスキップ
              </button>
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center rounded-md bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
              >
                セクションを追加
              </button>
            </div>
          </form>
        </div>

        {/* Next button */}
        {addedSections.length > 0 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleGoToPlatforms}
              className="inline-flex items-center justify-center rounded-md bg-green-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
            >
              次へ：媒体設定
            </button>
          </div>
        )}
      </div>
    );
  }

  if (step === 'platforms') {
    return (
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex h-6 w-6 items-center justify-center bg-green-500 text-xs font-semibold text-white">
              ✓
            </div>
            <span className="font-medium text-neutral-900">プロジェクト作成完了</span>
            <span className="text-neutral-500">→</span>
            <div className="flex h-6 w-6 items-center justify-center bg-green-500 text-xs font-semibold text-white">
              ✓
            </div>
            <span className="font-medium text-neutral-900">セクション設定完了</span>
            <span className="text-neutral-500">→</span>
            <div className="flex h-6 w-6 items-center justify-center bg-neutral-900 text-xs font-semibold text-white">
              3
            </div>
            <span className="font-medium text-neutral-900">媒体設定</span>
          </div>
        </div>

        {/* Platform list */}
        {addedPlatforms.length > 0 && (
          <div className="border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold">追加済み媒体設定</h3>
            <ul className="space-y-2">
              {addedPlatforms.map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <div className="flex h-5 w-5 items-center justify-center bg-green-100 text-xs text-green-700">
                    ✓
                  </div>
                  <span>{item.section} / {item.platform}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Platform form */}
        <div className="border border-neutral-200 bg-white p-6 shadow-sm">
          <header className="mb-6">
            <h2 className="text-2xl font-semibold">ステップ 3: 媒体設定</h2>
            <p className="text-sm text-neutral-500">
              プロジェクト「<strong>{projectName}</strong>」の媒体設定を追加します。
              <br />
              <span className="text-neutral-600">セクションごとにプラットフォームの設定を登録してください。</span>
            </p>
          </header>

          <form ref={platformFormRef} onSubmit={handlePlatformSubmit} className="flex flex-col gap-5">
            {/* セクション選択 */}
            <div>
              <label className="text-sm font-medium text-neutral-700" htmlFor="section_name">
                セクション <span className="text-red-500">*</span>
              </label>
              <select
                id="section_name"
                name="section_name"
                required
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">選択してください</option>
                {addedSections.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </div>

            {/* プラットフォーム選択 */}
            <div>
              <label className="text-sm font-medium text-neutral-700" htmlFor="platform">
                プラットフォーム <span className="text-red-500">*</span>
              </label>
              <select
                id="platform"
                name="platform"
                required
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">選択してください</option>
                {PLATFORM_OPTIONS.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
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
                    name="report_type"
                    value="budget"
                    checked={platformReportType === 'budget'}
                    onChange={(e) => setPlatformReportType(e.target.value as ReportType)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">予算運用</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="report_type"
                    value="performance"
                    checked={platformReportType === 'performance'}
                    onChange={(e) => setPlatformReportType(e.target.value as ReportType)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">成果報酬</span>
                </label>
              </div>
            </div>

            {/* 手数料設定 */}
            <div>
              <label className="text-sm font-medium text-neutral-700">手数料設定</label>
              <div className="mt-2 flex gap-2">
                <input
                  ref={feeNameInputRef}
                  type="text"
                  className="flex-1 border border-neutral-300 px-3 py-2 text-sm"
                  placeholder="手数料名"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFee(); } }}
                />
                <input
                  ref={feeValueInputRef}
                  type="number"
                  step="0.01"
                  className="w-32 border border-neutral-300 px-3 py-2 text-sm"
                  placeholder="倍率 (例: 1.1)"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFee(); } }}
                />
                <button
                  type="button"
                  onClick={handleAddFee}
                  className="rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
                >
                  追加
                </button>
              </div>
              {Object.keys(feeSettings).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(feeSettings).map(([name, value]) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700"
                    >
                      {name}: {value}
                      <button
                        type="button"
                        onClick={() => {
                          const next = { ...feeSettings };
                          delete next[name];
                          setFeeSettings(next);
                        }}
                        className="text-purple-500 hover:text-purple-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 成果報酬単価（成果報酬の場合のみ） */}
            {platformReportType === 'performance' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-neutral-700" htmlFor="agency_unit_price">
                    HARE単価
                  </label>
                  <input
                    id="agency_unit_price"
                    name="agency_unit_price"
                    type="number"
                    step="0.01"
                    className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
                    placeholder="例: 10000"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700" htmlFor="internal_unit_price">
                    代理店単価
                  </label>
                  <input
                    id="internal_unit_price"
                    name="internal_unit_price"
                    type="number"
                    step="0.01"
                    className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
                    placeholder="例: 8000"
                  />
                </div>
              </div>
            )}

            {/* 粗利fee（予算運用の場合のみ） */}
            {platformReportType === 'budget' && (
              <div>
                <label className="text-sm font-medium text-neutral-700" htmlFor="gross_profit_fee">
                  粗利fee <span className="text-red-500">*</span>
                </label>
                <input
                  id="gross_profit_fee"
                  name="gross_profit_fee"
                  type="number"
                  step="any"
                  required={platformReportType === 'budget'}
                  className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
                  placeholder="例: 0.05"
                />
              </div>
            )}

            {/* MSPリンクID接頭辞 */}
            <div>
              <label className="text-sm font-medium text-neutral-700">MSPリンクID接頭辞</label>
              <div className="mt-2 flex gap-2">
                <input
                  ref={mspLinkPrefixInputRef}
                  type="text"
                  className="flex-1 border border-neutral-300 px-3 py-2 text-sm"
                  placeholder="接頭辞を入力"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMspLinkPrefix(); } }}
                />
                <button
                  type="button"
                  onClick={handleAddMspLinkPrefix}
                  className="rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
                >
                  追加
                </button>
              </div>
              {mspLinkPrefixes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {mspLinkPrefixes.map((prefix, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700"
                    >
                      {prefix}
                      <button
                        type="button"
                        onClick={() => setMspLinkPrefixes(mspLinkPrefixes.filter((_, i) => i !== index))}
                        className="text-neutral-500 hover:text-neutral-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <FormStateMessage state={platformState} />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSkipPlatforms}
                className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                媒体設定をスキップ
              </button>
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center rounded-md bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
              >
                媒体設定を追加
              </button>
            </div>
          </form>
        </div>

        {/* Finish button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleFinish}
            className="inline-flex items-center justify-center rounded-md bg-green-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
          >
            設定完了
          </button>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="border border-neutral-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-2xl font-semibold">プロジェクト作成完了</h2>
        <p className="mb-6 text-neutral-600">
          プロジェクト「{projectName}」の設定が完了しました。
        </p>
        <button
          type="button"
          onClick={handleFinish}
          className="inline-flex items-center justify-center rounded-md bg-[var(--accent-color)] px-6 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
        >
          設定一覧に戻る
        </button>
      </div>
    );
  }

  return null;
}
