import { NextResponse } from 'next/server';
import { getReportSettings } from '@/lib/settings';
import type { ReportSettings } from '@/lib/report-settings/types';

type NumericLike = string | number;

type ApiMspAdvertiser = {
  id: NumericLike;
  name: string;
};

type ApiMetaAccount = {
  id: NumericLike;
  name: string;
};

type ApiTikTokAccount = {
  id: NumericLike;
  name: string;
};

type ApiGoogleAdsAccount = {
  id: string;
  name: string;
};

type ApiLineAccount = {
  id: string;
  name: string;
};

type ApiProject = {
  name: string;
  msp_buyer_name: string;
  meta_account_names: string[];
  tiktok_advertiser_names: string[];
  google_customer_names: string[];
  line_account_names: string[];
  total_report_type: 'budget' | 'performance';
  total_performance_agency_unit_price: number | null;
  total_performance_internal_unit_price: number | null;
  project_color: string | null;
  project_icon_path: string | null;
};

type ApiSection = {
  project_name: string;
  label: string;
  msp_prefixes: string[];
  campaign_prefixes: string[];
  campaign_keywords: string[];
  catch_all_msp: boolean;
  catch_all_campaign: boolean;
  in_house_operation: boolean;
};

type ApiFee = {
  label: string;
  value: number;
};

type ApiPlatformSetting = {
  project_name: string;
  section_label: string;
  platform: string;
  report_type: 'budget' | 'performance';
  fees: ApiFee[];
  agency_unit_price: number | null;
  internal_unit_price: number | null;
  gross_profit_fee: number | null;
  msp_link_keywords: string[];
  msp_link_prefix_map: Record<string, string>;
};

type ApiReportUpdateRequest = {
  project_name: string;
  start_date: string;
  end_date: string;
  status: string;
  error_reason: string;
};

type ApiReportSettings = {
  msp_advertisers: ApiMspAdvertiser[];
  meta_accounts: ApiMetaAccount[];
  tiktok_accounts: ApiTikTokAccount[];
  google_ads_accounts: ApiGoogleAdsAccount[];
  line_accounts: ApiLineAccount[];
  projects: ApiProject[];
  sections: ApiSection[];
  platform_settings: ApiPlatformSetting[];
  report_update_requests: ApiReportUpdateRequest[];
};

function toNumericLike(raw: string): NumericLike | null {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }

  if (/^-?\d+$/.test(trimmed)) {
    const parsed = Number(trimmed);
    if (Number.isSafeInteger(parsed)) {
      return parsed;
    }
  }

  return trimmed;
}

function buildApiResponse(settings: ReportSettings): ApiReportSettings {
  // MSP広告主
  const mspAdvertisers: ApiMspAdvertiser[] = settings.msp_advertisers.map((adv) => ({
    id: toNumericLike(adv.id) ?? adv.id,
    name: adv.name,
  }));

  // Metaアカウント
  const metaAccounts: ApiMetaAccount[] = settings.meta_accounts.map((acc) => ({
    id: toNumericLike(acc.account_id) ?? acc.account_id,
    name: acc.account_name,
  }));

  // TikTokアカウント
  const tiktokAccounts: ApiTikTokAccount[] = settings.tiktok_accounts.map((acc) => ({
    id: toNumericLike(acc.advertiser_id) ?? acc.advertiser_id,
    name: acc.advertiser_name,
  }));

  // Google Adsアカウント
  const googleAdsAccounts: ApiGoogleAdsAccount[] = settings.google_ads_accounts.map((acc) => ({
    id: acc.customer_id,
    name: acc.display_name,
  }));

  // LINEアカウント
  const lineAccounts: ApiLineAccount[] = settings.line_accounts.map((acc) => ({
    id: acc.account_id,
    name: acc.display_name,
  }));

  // プロジェクト
  const projects: ApiProject[] = settings.projects.map((project) => {
    // MSP広告主名を取得（最初の1つ）
    const mspBuyerName = project.msp_advertiser_ids.length > 0
      ? settings.msp_advertisers.find((adv) => adv.id === project.msp_advertiser_ids[0])?.name ?? ''
      : '';

    // 各媒体のアカウント名を取得
    const metaAccountNames = project.meta_account_ids
      .map((id) => settings.meta_accounts.find((acc) => acc.account_id === id)?.account_name)
      .filter((name): name is string => !!name);

    const tiktokAdvertiserNames = project.tiktok_advertiser_ids
      .map((id) => settings.tiktok_accounts.find((acc) => acc.advertiser_id === id)?.advertiser_name)
      .filter((name): name is string => !!name);

    const googleCustomerNames = project.google_ads_customer_ids
      .map((id) => settings.google_ads_accounts.find((acc) => acc.customer_id === id)?.display_name)
      .filter((name): name is string => !!name);

    const lineAccountNames = project.line_account_ids
      .map((id) => settings.line_accounts.find((acc) => acc.account_id === id)?.display_name)
      .filter((name): name is string => !!name);

    return {
      name: project.project_name,
      msp_buyer_name: mspBuyerName,
      meta_account_names: metaAccountNames,
      tiktok_advertiser_names: tiktokAdvertiserNames,
      google_customer_names: googleCustomerNames,
      line_account_names: lineAccountNames,
      total_report_type: project.total_report_type,
      total_performance_agency_unit_price: project.performance_unit_price,
      total_performance_internal_unit_price: project.performance_unit_price, // 同じ値を使用
      project_color: project.project_color ?? null,
      project_icon_path: project.project_icon_path ?? null,
    };
  });

  // セクション
  const sections: ApiSection[] = settings.sections.map((section) => ({
    project_name: section.project_name,
    label: section.section_name,
    msp_prefixes: section.msp_ad_prefixes,
    campaign_prefixes: section.campaign_prefixes,
    campaign_keywords: section.campaign_keywords,
    catch_all_msp: section.catch_all_msp,
    catch_all_campaign: section.catch_all_campaign,
    in_house_operation: section.in_house_operation,
  }));

  // プラットフォーム設定
  const platformSettings: ApiPlatformSetting[] = settings.platform_settings.map((ps) => {
    // fee_settingsをApiFee[]に変換
    const fees: ApiFee[] = Object.entries(ps.fee_settings).map(([label, value]) => ({
      label,
      value,
    }));

    // msp_link_prefixesからmsp_link_prefix_mapを生成
    // プラットフォーム名を小文字に変換
    const platformLower = ps.platform.toLowerCase();
    const mspLinkPrefixMap: Record<string, string> = {};
    ps.msp_link_prefixes.forEach((prefix) => {
      mspLinkPrefixMap[prefix] = platformLower;
    });

    return {
      project_name: ps.project_name,
      section_label: ps.section_name,
      platform: platformLower,
      report_type: ps.report_type,
      fees,
      agency_unit_price: ps.agency_unit_price,
      internal_unit_price: ps.internal_unit_price,
      gross_profit_fee: ps.report_type === 'budget' ? ps.gross_profit_fee : null,
      msp_link_keywords: ps.msp_link_prefixes,
      msp_link_prefix_map: mspLinkPrefixMap,
    };
  });

  const reportUpdateRequests: ApiReportUpdateRequest[] = settings.report_update_requests.map((request) => ({
    project_name: request.project_name,
    start_date: request.start_date,
    end_date: request.end_date,
    status: request.status,
    error_reason: request.error_reason,
  }));

  return {
    msp_advertisers: mspAdvertisers,
    meta_accounts: metaAccounts,
    tiktok_accounts: tiktokAccounts,
    google_ads_accounts: googleAdsAccounts,
    line_accounts: lineAccounts,
    projects,
    sections,
    platform_settings: platformSettings,
    report_update_requests: reportUpdateRequests,
  };
}

export async function GET() {
  try {
    const settings = await getReportSettings();
    const response = buildApiResponse(settings);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to load report settings', error);
    return NextResponse.json({ error: '設定の取得に失敗しました。' }, { status: 500 });
  }
}
