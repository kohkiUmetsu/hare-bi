'use client';

import { useState } from 'react';
import type { ReportSettings } from '@/lib/report-settings/types';
import { MspAdvertisersSection } from '../../_components/msp-advertisers-section';
import { MetaAccountsSection } from '../../_components/meta-accounts-section';
import { TiktokAccountsSection } from '../../_components/tiktok-accounts-section';
import { GoogleAdsAccountsSection } from '../../_components/google-ads-accounts-section';
import { LineAccountsSection } from '../../_components/line-accounts-section';

interface AccountsTabsProps {
  settings: ReportSettings;
}

type TabId = 'msp' | 'meta' | 'tiktok' | 'google' | 'line';

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'msp', label: 'MSP' },
  { id: 'meta', label: 'Meta' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'google', label: 'Google広告' },
  { id: 'line', label: 'LINE' },
];

export function AccountsTabs({ settings }: AccountsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('msp');

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Navigation */}
      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'msp' && (
          <MspAdvertisersSection advertisers={settings.msp_advertisers} />
        )}
        {activeTab === 'meta' && (
          <MetaAccountsSection accounts={settings.meta_accounts} />
        )}
        {activeTab === 'tiktok' && (
          <TiktokAccountsSection accounts={settings.tiktok_accounts} />
        )}
        {activeTab === 'google' && (
          <GoogleAdsAccountsSection accounts={settings.google_ads_accounts} />
        )}
        {activeTab === 'line' && (
          <LineAccountsSection accounts={settings.line_accounts} />
        )}
      </div>
    </div>
  );
}
