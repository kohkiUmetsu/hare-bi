export type AdPlatform = 'meta' | 'tiktok' | 'google' | 'line';

export type AdRankingRow = {
  platform: AdPlatform;
  accountId: string;
  accountName: string;
  adId: string;
  adName: string;
  videoUrl?: string | null;
  videoThumbnailUrl?: string | null;
  spend: number;
  mediaCv: number | null;
  cpa: number | null;
};
