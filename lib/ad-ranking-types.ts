export type AdPlatform = 'meta' | 'tiktok' | 'google' | 'line';

export type AdRankingRow = {
  platform: AdPlatform;
  adId: string;
  adName: string;
  spend: number;
  mediaCv: number | null;
  cpa: number | null;
};
