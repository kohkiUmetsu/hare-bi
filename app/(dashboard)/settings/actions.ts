'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth-server';
import {
  deleteGoogleAdsAccountSetting,
  deleteLineAccountSetting,
  deleteMetaAccountSetting,
  deleteMspAdvertiserSetting,
  deleteProjectSetting,
  deleteReportUpdateSetting,
  deleteSectionSetting,
  deleteTiktokAccountSetting,
  deletePlatformSetting,
  upsertGoogleAdsAccountSetting,
  upsertLineAccountSetting,
  upsertMetaAccountSetting,
  upsertMspAdvertiserSetting,
  upsertProjectSetting,
  upsertReportUpdateSetting,
  upsertSectionSetting,
  upsertTiktokAccountSetting,
  upsertPlatformSetting,
} from '@/lib/settings';
import { buildProjectIconPath, PROJECT_ICON_BUCKET } from '@/lib/project-assets';
import { getAdminSupabase } from '@/utils/supabase/admin';
import type {
  GoogleAdsAccountSetting,
  LineAccountSetting,
  MetaAccountSetting,
  MspAdvertiserSetting,
  ProjectSetting,
  ReportUpdateSetting,
  SectionSetting,
  PlatformSetting,
  TikTokAccountSetting,
} from '@/lib/report-settings/types';

export type SettingsActionState = {
  status: 'success' | 'error' | null;
  message?: string;
};

// Cannot export const in 'use server' files, so define inline in components
// export const initialSettingsState: SettingsActionState = { status: null };

function success(message: string): SettingsActionState {
  return { status: 'success', message };
}

function failure(message: string): SettingsActionState {
  return { status: 'error', message };
}

function splitListInput(value: FormDataEntryValue | null): string[] {
  if (!value) {
    return [];
  }

  return String(value)
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const MAX_ICON_SIZE_BYTES = 1024 * 1024;
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6})$/;

function readRequiredString(formData: FormData, key: string, label: string): string {
  const value = String(formData.get(key) ?? '').trim();

  if (!value) {
    throw new Error(`${label}を入力してください。`);
  }

  return value;
}

function readOptionalString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

function readOptionalHexColor(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? '').trim();
  if (!value) {
    return null;
  }
  if (!HEX_COLOR_PATTERN.test(value)) {
    throw new Error('カラーは #RRGGBB 形式で入力してください。');
  }
  return value;
}

function readNumber(formData: FormData, key: string, label: string): number {
  const raw = readRequiredString(formData, key, label);
  const value = Number(raw);

  if (!Number.isFinite(value)) {
    throw new Error(`${label}は数値で入力してください。`);
  }

  return value;
}

async function revalidateSettings() {
  revalidatePath('/settings', 'page');
  revalidatePath('/settings/projects', 'page');
  revalidatePath('/settings/accounts', 'page');
  revalidatePath('/', 'layout');
}

export async function upsertProject(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  await requireAdmin();

  try {
    const projectName = readRequiredString(formData, 'project_name', 'プロジェクト名');
    const totalReportType = readRequiredString(formData, 'total_report_type', '運用形態') as 'budget' | 'performance';
    
    if (totalReportType !== 'budget' && totalReportType !== 'performance') {
      throw new Error('運用形態は「budget」または「performance」を選択してください。');
    }

    // 成果報酬の場合のみ成果報酬単価を必須にする
    const performanceUnitPrice = totalReportType === 'performance'
      ? readNumber(formData, 'performance_unit_price', '成果報酬単価')
      : readOptionalNumber(formData, 'performance_unit_price');

    const projectColor = readOptionalHexColor(formData, 'project_color');
    const existingIconPath = readOptionalString(formData, 'existing_project_icon_path') || null;
    const iconFile = formData.get('project_icon');
    let projectIconPath = existingIconPath;

    if (iconFile instanceof File && iconFile.size > 0) {
      if (!iconFile.type.startsWith('image/')) {
        throw new Error('アイコン画像は画像ファイルのみアップロードできます。');
      }
      if (iconFile.size > MAX_ICON_SIZE_BYTES) {
        throw new Error('アイコン画像は1MB以内にしてください。');
      }

      const storagePath = buildProjectIconPath(projectName, iconFile.name || 'icon');
      const adminClient = getAdminSupabase();
      const { error } = await adminClient.storage
        .from(PROJECT_ICON_BUCKET)
        .upload(storagePath, iconFile, {
          contentType: iconFile.type,
          upsert: true,
        });

      if (error) {
        throw new Error('アイコン画像のアップロードに失敗しました。');
      }

      projectIconPath = storagePath;
    }

    // 複数選択された媒体アカウントIDを取得
    const mspAdvertiserIds = formData.getAll('msp_advertiser_ids').map(String);
    const metaAccountIds = formData.getAll('meta_account_ids').map(String);
    const tiktokAdvertiserIds = formData.getAll('tiktok_advertiser_ids').map(String);
    const googleAdsCustomerIds = formData.getAll('google_ads_customer_ids').map(String);
    const lineAccountIds = formData.getAll('line_account_ids').map(String);

    const project: ProjectSetting = {
      project_name: projectName,
      display_name: projectName,
      total_report_type: totalReportType,
      performance_unit_price: performanceUnitPrice,
      project_color: projectColor,
      project_icon_path: projectIconPath,
      msp_advertiser_ids: mspAdvertiserIds,
      meta_account_ids: metaAccountIds,
      tiktok_advertiser_ids: tiktokAdvertiserIds,
      google_ads_customer_ids: googleAdsCustomerIds,
      line_account_ids: lineAccountIds,
    };

    await upsertProjectSetting(project);
    await revalidateSettings();
    return success('プロジェクトを保存しました。');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'プロジェクトの保存に失敗しました。';
    return failure(message);
  }
}

export async function deleteProject(projectName: string) {
  await requireAdmin();
  if (!projectName) {
    throw new Error('削除対象のプロジェクト名が不正です。');
  }

  await deleteProjectSetting(projectName);
  await revalidateSettings();
}

function parseFeeSettingsInput(value: FormDataEntryValue | null): Record<string, number> {
  const raw = String(value ?? '').trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function readOptionalNumber(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? '').trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export async function upsertSection(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  await requireAdmin();

  try {
    const section: SectionSetting = {
      section_name: readRequiredString(formData, 'section_name', 'セクション名'),
      project_name: readRequiredString(formData, 'project_name', 'プロジェクト名'),
      msp_ad_prefixes: splitListInput(formData.get('msp_ad_prefixes')),
      campaign_prefixes: splitListInput(formData.get('campaign_prefixes')),
      campaign_keywords: splitListInput(formData.get('campaign_keywords')),
      catch_all_msp: formData.get('catch_all_msp') === 'true',
      catch_all_campaign: formData.get('catch_all_campaign') === 'true',
      in_house_operation: formData.get('in_house_operation') === 'true',
    };

    await upsertSectionSetting(section);
    await revalidateSettings();
    return success('セクションを保存しました。');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'セクションの保存に失敗しました。';
    return failure(message);
  }
}

export async function deleteSection(sectionId: {
  sectionName: string;
  projectName: string;
}) {
  await requireAdmin();
  const { sectionName, projectName } = sectionId;

  if (!sectionName || !projectName) {
    throw new Error('削除対象のセクション情報が不足しています。');
  }

  await deleteSectionSetting(sectionName, projectName);
  await revalidateSettings();
}

export async function upsertPlatform(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  await requireAdmin();

  try {
    const reportType = readRequiredString(formData, 'report_type', '運用形態') as 'budget' | 'performance';
    if (reportType !== 'budget' && reportType !== 'performance') {
      throw new Error('運用形態は「budget」または「performance」を選択してください。');
    }

    // 予算運用の場合のみ粗利feeを必須にする
    const grossProfitFeeValue = readOptionalNumber(formData, 'gross_profit_fee');
    if (reportType === 'budget' && grossProfitFeeValue === null) {
      throw new Error('予算運用の場合、粗利feeを入力してください。');
    }
    const grossProfitFee = grossProfitFeeValue ?? 0;

    const platformSetting: PlatformSetting = {
      section_name: readRequiredString(formData, 'section_name', 'セクション名'),
      project_name: readRequiredString(formData, 'project_name', 'プロジェクト名'),
      platform: readRequiredString(formData, 'platform', 'プラットフォーム'),
      report_type: reportType,
      fee_settings: parseFeeSettingsInput(formData.get('fee_settings')),
      agency_unit_price: readOptionalNumber(formData, 'agency_unit_price'),
      internal_unit_price: readOptionalNumber(formData, 'internal_unit_price'),
      gross_profit_fee: grossProfitFee,
      msp_link_prefixes: splitListInput(formData.get('msp_link_prefixes')),
    };

    await upsertPlatformSetting(platformSetting);
    await revalidateSettings();
    return success('媒体設定を保存しました。');
  } catch (error) {
    const message = error instanceof Error ? error.message : '媒体設定の保存に失敗しました。';
    return failure(message);
  }
}

export async function deletePlatform(platformId: {
  sectionName: string;
  projectName: string;
  platform: string;
}) {
  await requireAdmin();
  const { sectionName, projectName, platform } = platformId;

  if (!sectionName || !projectName || !platform) {
    throw new Error('削除対象の媒体設定情報が不足しています。');
  }

  await deletePlatformSetting(sectionName, projectName, platform);
  await revalidateSettings();
}

export async function upsertMspAdvertiser(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  await requireAdmin();

  try {
    const id = readRequiredString(formData, 'id', 'MSP広告主ID');
    const advertiser: MspAdvertiserSetting = {
      id,
      name: readRequiredString(formData, 'name', '広告主名'),
      buyer_id: id, // MSP広告主IDとバイヤーIDは同じ
      project_name: '', // プロジェクトとの紐付けはプロジェクト側で管理
    };

    await upsertMspAdvertiserSetting(advertiser);
    await revalidateSettings();
    return success('MSP広告主を保存しました。');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MSP広告主の保存に失敗しました。';
    return failure(message);
  }
}

export async function deleteMspAdvertiser(advertiserId: string) {
  await requireAdmin();
  if (!advertiserId) {
    throw new Error('削除対象のMSP広告主IDが不正です。');
  }

  await deleteMspAdvertiserSetting(advertiserId);
  await revalidateSettings();
}

export async function upsertMetaAccount(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  await requireAdmin();

  try {
    const account: MetaAccountSetting = {
      account_id: readRequiredString(formData, 'account_id', 'MetaアカウントID'),
      account_name: readRequiredString(formData, 'account_name', 'Metaアカウント名'),
      project_name: readOptionalString(formData, 'project_name'),
    };

    await upsertMetaAccountSetting(account);
    await revalidateSettings();
    return success('Metaアカウントを保存しました。');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Metaアカウントの保存に失敗しました。';
    return failure(message);
  }
}

export async function deleteMetaAccount(accountId: string) {
  await requireAdmin();
  if (!accountId) {
    throw new Error('削除対象のMetaアカウントIDが不正です。');
  }

  await deleteMetaAccountSetting(accountId);
  await revalidateSettings();
}

export async function upsertTiktokAccount(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  await requireAdmin();

  try {
    const account: TikTokAccountSetting = {
      advertiser_id: readRequiredString(formData, 'advertiser_id', 'TikTok広告主ID'),
      advertiser_name: readRequiredString(formData, 'advertiser_name', 'TikTok広告主名'),
      project_name: readOptionalString(formData, 'project_name'),
    };

    await upsertTiktokAccountSetting(account);
    await revalidateSettings();
    return success('TikTokアカウントを保存しました。');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TikTokアカウントの保存に失敗しました。';
    return failure(message);
  }
}

export async function deleteTiktokAccount(advertiserId: string) {
  await requireAdmin();
  if (!advertiserId) {
    throw new Error('削除対象のTikTok広告主IDが不正です。');
  }

  await deleteTiktokAccountSetting(advertiserId);
  await revalidateSettings();
}

export async function upsertGoogleAdsAccount(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  await requireAdmin();

  try {
    const account: GoogleAdsAccountSetting = {
      customer_id: readRequiredString(formData, 'customer_id', 'Google AdsカスタマーID'),
      display_name: readRequiredString(formData, 'display_name', '表示名'),
      project_name: readOptionalString(formData, 'project_name'),
    };

    await upsertGoogleAdsAccountSetting(account);
    await revalidateSettings();
    return success('Google Adsアカウントを保存しました。');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google Adsアカウントの保存に失敗しました。';
    return failure(message);
  }
}

export async function deleteGoogleAdsAccount(customerId: string) {
  await requireAdmin();
  if (!customerId) {
    throw new Error('削除対象のGoogle AdsカスタマーIDが不正です。');
  }

  await deleteGoogleAdsAccountSetting(customerId);
  await revalidateSettings();
}

export async function upsertLineAccount(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  await requireAdmin();

  try {
    const account: LineAccountSetting = {
      account_id: readRequiredString(formData, 'account_id', 'LINEアカウントID'),
      display_name: readRequiredString(formData, 'display_name', '表示名'),
      project_name: readOptionalString(formData, 'project_name'),
    };

    await upsertLineAccountSetting(account);
    await revalidateSettings();
    return success('LINEアカウントを保存しました。');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'LINEアカウントの保存に失敗しました。';
    return failure(message);
  }
}

export async function deleteLineAccount(accountId: string) {
  await requireAdmin();
  if (!accountId) {
    throw new Error('削除対象のLINEアカウントIDが不正です。');
  }

  await deleteLineAccountSetting(accountId);
  await revalidateSettings();
}

export async function upsertReportUpdate(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  await requireAdmin();

  try {
    const update: ReportUpdateSetting = {
      project_name: readRequiredString(formData, 'project_name', 'プロジェクト名'),
      start_date: readRequiredString(formData, 'start_date', '開始日'),
      end_date: readRequiredString(formData, 'end_date', '終了日'),
      status: '未実行',
      error_reason: '',
    };

    await upsertReportUpdateSetting(update);
    await revalidateSettings();
    return success('更新状況を保存しました。');
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新状況の保存に失敗しました。';
    return failure(message);
  }
}

export async function deleteReportUpdate(projectName: string, startDate: string, endDate: string) {
  await requireAdmin();
  if (!projectName || !startDate || !endDate) {
    throw new Error('削除対象の更新情報が不十分です。');
  }

  await deleteReportUpdateSetting(projectName, startDate, endDate);
  await revalidateSettings();
}
