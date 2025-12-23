'use client';

import { useState, useRef } from 'react';
import { useServerActionState } from '@/components/use-server-action-state';
import type { SectionSetting } from '@/lib/report-settings/types';
import {
  deleteSection,
  upsertSection,
  type SettingsActionState,
} from '../actions';
import { SettingsDeleteButton } from './delete-button';
import { FormStateMessage } from './form-state-message';

interface SectionSettingsSectionProps {
  sections: SectionSetting[];
  projectNames: string[];
  fixedProjectName?: string;
}

function formatList(values: string[]): string {
  return values.length ? values.join(', ') : '未設定';
}

export function SectionSettingsSection({
  sections,
  projectNames,
  fixedProjectName,
}: SectionSettingsSectionProps) {
  const [state, formAction] = useServerActionState<SettingsActionState>(
    upsertSection,
    { status: null }
  );
  const datalistId = 'section-project-options';

  // Editing state
  const [editingSection, setEditingSection] = useState<SectionSetting | null>(null);

  // Section form state
  const [mspPrefixes, setMspPrefixes] = useState<string[]>([]);
  const [campaignPrefixes, setCampaignPrefixes] = useState<string[]>([]);
  const [campaignKeywords, setCampaignKeywords] = useState<string[]>([]);
  const [catchAllMsp, setCatchAllMsp] = useState(false);
  const [catchAllCampaign, setCatchAllCampaign] = useState(false);
  const [inHouseOperation, setInHouseOperation] = useState(false);

  // Input refs for add buttons
  const mspPrefixInputRef = useRef<HTMLInputElement>(null);
  const campaignPrefixInputRef = useRef<HTMLInputElement>(null);
  const campaignKeywordInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

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

  const handleEditSection = (section: SectionSetting) => {
    setEditingSection(section);
    setMspPrefixes(section.msp_ad_prefixes);
    setCampaignPrefixes(section.campaign_prefixes);
    setCampaignKeywords(section.campaign_keywords);
    setCatchAllMsp(section.catch_all_msp);
    setCatchAllCampaign(section.catch_all_campaign);
    setInHouseOperation(section.in_house_operation);
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    formRef.current?.reset();
    setMspPrefixes([]);
    setCampaignPrefixes([]);
    setCampaignKeywords([]);
    setCatchAllMsp(false);
    setCatchAllCampaign(false);
    setInHouseOperation(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Add list and state values to formData
    formData.set('msp_ad_prefixes', mspPrefixes.join(','));
    formData.set('campaign_prefixes', campaignPrefixes.join(','));
    formData.set('campaign_keywords', campaignKeywords.join(','));
    formData.set('catch_all_msp', catchAllMsp ? 'true' : 'false');
    formData.set('catch_all_campaign', catchAllCampaign ? 'true' : 'false');
    formData.set('in_house_operation', inHouseOperation ? 'true' : 'false');

    const result = await formAction(formData);
    if (result.status === 'success') {
      // Reset form and state
      setEditingSection(null);
      formRef.current?.reset();
      setMspPrefixes([]);
      setCampaignPrefixes([]);
      setCampaignKeywords([]);
      setCatchAllMsp(false);
      setCatchAllCampaign(false);
      setInHouseOperation(false);
    }
  };

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <header>
        <h2 className="text-2xl font-semibold">セクション設定</h2>
        <p className="text-sm text-neutral-500">
          1つのプロジェクトに複数のセクションを登録できます。セクション名を変えて追加してください。
          <br />
          同じセクション名で保存すると既存のセクションが更新されます。
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">
              登録済みセクション: {sections.length}件
            </span>
          </div>
          {sections.length === 0 ? (
            <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-500">
              まだ登録されたセクションはありません。右のフォームからセクションを追加してください。
            </p>
          ) : (
            sections.map((section) => (
              <div
                key={`${section.section_name}-${section.project_name}`}
                className={`rounded-md border px-4 py-3 text-sm transition ${
                  editingSection?.section_name === section.section_name &&
                  editingSection?.project_name === section.project_name
                    ? 'border-neutral-900 bg-neutral-50'
                    : 'border-neutral-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-neutral-500">
                      {section.section_name} / {section.project_name}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditSection(section)}
                      className="rounded-md bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200"
                    >
                      編集
                    </button>
                    <SettingsDeleteButton
                      confirmMessage={`${section.section_name} を削除しますか？`}
                      onDelete={() =>
                        deleteSection({
                          sectionName: section.section_name,
                          projectName: section.project_name,
                        })
                      }
                    />
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-[150px,1fr] gap-x-3 gap-y-1 text-xs text-neutral-600">
                  <dt className="font-semibold text-neutral-700">MSP広告名接頭辞</dt>
                  <dd>{formatList(section.msp_ad_prefixes)}</dd>
                  <dt className="font-semibold text-neutral-700">キャンペーン接頭辞</dt>
                  <dd>{formatList(section.campaign_prefixes)}</dd>
                  <dt className="font-semibold text-neutral-700">キャンペーンキーワード</dt>
                  <dd>{formatList(section.campaign_keywords)}</dd>
                  <dt className="font-semibold text-neutral-700">MSPキャッチオール</dt>
                  <dd>{section.catch_all_msp ? 'ON' : 'OFF'}</dd>
                  <dt className="font-semibold text-neutral-700">キャンペーンキャッチオール</dt>
                  <dd>{section.catch_all_campaign ? 'ON' : 'OFF'}</dd>
                  <dt className="font-semibold text-neutral-700">自社運用</dt>
                  <dd>{section.in_house_operation ? 'ON' : 'OFF'}</dd>
                </dl>
              </div>
            ))
          )}
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">
            {editingSection ? 'セクションを編集' : '新しいセクションを追加'}
          </h3>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">セクション名 *</span>
            <input
              type="text"
              name="section_name"
              required
              defaultValue={editingSection?.section_name}
              readOnly={!!editingSection}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">プロジェクト名 *</span>
            {fixedProjectName ? (
              <input
                type="text"
                name="project_name"
                value={fixedProjectName}
                readOnly
                className="rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-500"
              />
            ) : (
              <>
                <input
                  type="text"
                  name="project_name"
                  list={datalistId}
                  required
                  defaultValue={editingSection?.project_name}
                  readOnly={!!editingSection}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-500"
                />
                <datalist id={datalistId}>
                  {projectNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </>
            )}
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">MSP広告名接頭辞</span>
            <div className="flex gap-2">
              <input
                type="text"
                ref={mspPrefixInputRef}
                placeholder="接頭辞を入力"
                className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
              <button
                type="button"
                onClick={handleAddMspPrefix}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
              >
                追加
              </button>
            </div>
            {mspPrefixes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {mspPrefixes.map((prefix) => (
                  <span
                    key={prefix}
                    className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs"
                  >
                    {prefix}
                    <button
                      type="button"
                      onClick={() => setMspPrefixes(mspPrefixes.filter((p) => p !== prefix))}
                      className="text-neutral-500 hover:text-neutral-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">キャンペーン接頭辞</span>
            <div className="flex gap-2">
              <input
                type="text"
                ref={campaignPrefixInputRef}
                placeholder="接頭辞を入力"
                className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
              <button
                type="button"
                onClick={handleAddCampaignPrefix}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
              >
                追加
              </button>
            </div>
            {campaignPrefixes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {campaignPrefixes.map((prefix) => (
                  <span
                    key={prefix}
                    className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs"
                  >
                    {prefix}
                    <button
                      type="button"
                      onClick={() => setCampaignPrefixes(campaignPrefixes.filter((p) => p !== prefix))}
                      className="text-neutral-500 hover:text-neutral-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">キャンペーンキーワード</span>
            <div className="flex gap-2">
              <input
                type="text"
                ref={campaignKeywordInputRef}
                placeholder="キーワードを入力"
                className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
              <button
                type="button"
                onClick={handleAddCampaignKeyword}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
              >
                追加
              </button>
            </div>
            {campaignKeywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {campaignKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => setCampaignKeywords(campaignKeywords.filter((k) => k !== keyword))}
                      className="text-neutral-500 hover:text-neutral-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={catchAllMsp}
              onChange={(e) => setCatchAllMsp(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <span className="text-sm font-medium text-neutral-700">MSPキャッチオール</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={catchAllCampaign}
              onChange={(e) => setCatchAllCampaign(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <span className="text-sm font-medium text-neutral-700">キャンペーンキャッチオール</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={inHouseOperation}
              onChange={(e) => setInHouseOperation(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <span className="text-sm font-medium text-neutral-700">自社運用</span>
          </label>

          <FormStateMessage state={state} />

          <div className="flex gap-2">
            {editingSection && (
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
              {editingSection ? 'セクションを更新' : 'セクションを追加'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
