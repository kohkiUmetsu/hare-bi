export type ProjectSetting = {
  project_name: string;
  display_name: string;
  total_report_type: 'budget' | 'performance';
  performance_unit_price: number | null;
  project_color?: string | null;
  project_icon_path?: string | null;
  msp_advertiser_ids: string[];
  meta_account_ids: string[];
  tiktok_advertiser_ids: string[];
  google_ads_customer_ids: string[];
  line_account_ids: string[];
};

export type SectionSetting = {
  section_name: string;
  project_name: string;
  msp_ad_prefixes: string[];
  campaign_prefixes: string[];
  campaign_keywords: string[];
  catch_all_msp: boolean;
  catch_all_campaign: boolean;
  in_house_operation: boolean;
};

export type PlatformSetting = {
  section_name: string;
  project_name: string;
  platform: string;
  report_type: 'budget' | 'performance';
  fee_settings: Record<string, number>;
  agency_unit_price: number | null;
  internal_unit_price: number | null;
  gross_profit_fee: number;
  msp_link_prefixes: string[];
};

export type MspAdvertiserSetting = {
  id: string;
  name: string;
  buyer_id: string;
  project_name: string;
};

export type MetaAccountSetting = {
  account_id: string;
  account_name: string;
  project_name: string;
};

export type TikTokAccountSetting = {
  advertiser_id: string;
  advertiser_name: string;
  project_name: string;
};

export type GoogleAdsAccountSetting = {
  customer_id: string;
  display_name: string;
  project_name: string;
};

export type LineAccountSetting = {
  account_id: string;
  display_name: string;
  project_name: string;
};

export type ReportUpdateSetting = {
  project_name: string;
  start_date: string;
  end_date: string;
  status: string;
  error_reason: string;
};

export type ReportSettings = {
  projects: ProjectSetting[];
  sections: SectionSetting[];
  platform_settings: PlatformSetting[];
  msp_advertisers: MspAdvertiserSetting[];
  meta_accounts: MetaAccountSetting[];
  tiktok_accounts: TikTokAccountSetting[];
  google_ads_accounts: GoogleAdsAccountSetting[];
  line_accounts: LineAccountSetting[];
  report_update_requests: ReportUpdateSetting[];
};
