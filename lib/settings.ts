import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from './db';
import {
  reportGoogleAdsAccountsTable,
  type InsertReportGoogleAdsAccountRow,
  reportLineAccountsTable,
  type InsertReportLineAccountRow,
  reportMetaAccountsTable,
  type InsertReportMetaAccountRow,
  reportMspAdvertisersTable,
  type InsertReportMspAdvertiserRow,
  reportProjectsTable,
  type InsertReportProjectRow,
  reportSectionsTable,
  type InsertReportSectionRow,
  type ReportSectionRow,
  reportTiktokAccountsTable,
  type InsertReportTiktokAccountRow,
  reportUpdatesTable,
  type InsertReportUpdateRow,
  type ReportProjectRow,
  reportPlatformSettingsTable,
  type InsertReportPlatformSettingRow,
  projectMspAdvertisersTable,
  projectMetaAccountsTable,
  projectTiktokAccountsTable,
  projectGoogleAdsAccountsTable,
  projectLineAccountsTable,
} from '@/db/schema';
import type {
  GoogleAdsAccountSetting,
  LineAccountSetting,
  MetaAccountSetting,
  MspAdvertiserSetting,
  ProjectSetting,
  ReportSettings,
  ReportUpdateSetting,
  SectionSetting,
  PlatformSetting,
  TikTokAccountSetting,
} from '@/lib/report-settings/types';

async function ensureProjectByName(projectName: string): Promise<ReportProjectRow> {
  const [project] = await db
    .select()
    .from(reportProjectsTable)
    .where(eq(reportProjectsTable.project_name, projectName))
    .limit(1);

  if (!project) {
    throw new Error(`プロジェクト ${projectName} が見つかりません。`);
  }

  return project;
}

async function ensureSectionByName(sectionName: string, projectId: string): Promise<ReportSectionRow> {
  const [section] = await db
    .select()
    .from(reportSectionsTable)
    .where(
      and(
        eq(reportSectionsTable.section_name, sectionName),
        eq(reportSectionsTable.project_id, projectId)
      )
    )
    .limit(1);

  if (!section) {
    throw new Error(`セクション ${sectionName} が見つかりません。`);
  }

  return section;
}

function parseFeeSettings(payload: unknown): Record<string, number> {
  if (!payload || typeof payload !== 'object') return {};
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(payload)) {
    const num = Number(value);
    if (Number.isFinite(num)) {
      result[key] = num;
    }
  }
  return result;
}

export async function getReportSettings(): Promise<ReportSettings> {
  console.log('[getReportSettings] Starting...');
  const startTime = Date.now();

  try {
    console.log('[getReportSettings] Fetching data from database...');
    const [
      projects,
      advertisers,
      meta,
      tiktok,
      google,
      line,
    ] = await Promise.all([
      db.query.reportProjectsTable
        .findMany({
          orderBy: (projects, { asc }) => [asc(projects.project_name)],
          with: {
            sections: {
              orderBy: (sections, { asc }) => [asc(sections.section_name)],
              with: {
                platformSettings: {
                  orderBy: (settings, { asc }) => [asc(settings.created_at)],
                },
              },
            },
            reportUpdates: {
              orderBy: (updates, { asc }) => [asc(updates.start_date), asc(updates.end_date)],
            },
            mspAdvertisers: {
              with: { advertiser: true },
            },
            metaAccounts: {
              with: { account: true },
            },
            tiktokAccounts: {
              with: { account: true },
            },
            googleAdsAccounts: {
              with: { account: true },
            },
            lineAccounts: {
              with: { account: true },
            },
          },
        })
        .then((rows) => {
          console.log('[DB] ✓ projects with relations:', rows.length, 'rows');
          return rows;
        }),
      db
        .select()
        .from(reportMspAdvertisersTable)
        .orderBy(asc(reportMspAdvertisersTable.name))
        .then((rows) => {
          console.log('[DB] ✓ advertisers:', rows.length, 'rows');
          return rows;
        }),
      db
        .select()
        .from(reportMetaAccountsTable)
        .orderBy(asc(reportMetaAccountsTable.account_name))
        .then((rows) => {
          console.log('[DB] ✓ meta accounts:', rows.length, 'rows');
          return rows;
        }),
      db
        .select()
        .from(reportTiktokAccountsTable)
        .orderBy(asc(reportTiktokAccountsTable.advertiser_name))
        .then((rows) => {
          console.log('[DB] ✓ tiktok accounts:', rows.length, 'rows');
          return rows;
        }),
      db
        .select()
        .from(reportGoogleAdsAccountsTable)
        .orderBy(asc(reportGoogleAdsAccountsTable.display_name))
        .then((rows) => {
          console.log('[DB] ✓ google ads accounts:', rows.length, 'rows');
          return rows;
        }),
      db
        .select()
        .from(reportLineAccountsTable)
        .orderBy(asc(reportLineAccountsTable.display_name))
        .then((rows) => {
          console.log('[DB] ✓ line accounts:', rows.length, 'rows');
          return rows;
        }),
    ]);

    console.log(`[getReportSettings] All queries completed in ${Date.now() - startTime}ms`);

    const projectNameByMspBuyerId = new Map<string, string>();
    const projectNameByMetaAccountId = new Map<string, string>();
    const projectNameByTiktokAdvertiserId = new Map<string, string>();
    const projectNameByGoogleCustomerId = new Map<string, string>();
    const projectNameByLineAccountId = new Map<string, string>();

    const projectSettings: ProjectSetting[] = [];
    const sectionSettings: SectionSetting[] = [];
    const platformSettingsList: PlatformSetting[] = [];
    const reportUpdateRequests: ReportUpdateSetting[] = [];

    for (const project of projects) {
      const mspIds = (project.mspAdvertisers ?? [])
        .map((link) => {
          const buyerId = link.advertiser?.buyer_id ?? link.advertiser_id;
          if (buyerId) {
            projectNameByMspBuyerId.set(buyerId, project.project_name);
          }
          return link.advertiser?.id ?? link.advertiser_id;
        })
        .filter((id): id is string => Boolean(id));

      const metaIds = (project.metaAccounts ?? [])
        .map((link) => {
          const accountId = link.account?.account_id;
          if (accountId) {
            projectNameByMetaAccountId.set(accountId, project.project_name);
          }
          return accountId;
        })
        .filter((id): id is string => Boolean(id));

      const tiktokIds = (project.tiktokAccounts ?? [])
        .map((link) => {
          const advertiserId = link.account?.advertiser_id;
          if (advertiserId) {
            projectNameByTiktokAdvertiserId.set(advertiserId, project.project_name);
          }
          return advertiserId;
        })
        .filter((id): id is string => Boolean(id));

      const googleIds = (project.googleAdsAccounts ?? [])
        .map((link) => {
          const customerId = link.account?.customer_id;
          if (customerId) {
            projectNameByGoogleCustomerId.set(customerId, project.project_name);
          }
          return customerId;
        })
        .filter((id): id is string => Boolean(id));

      const lineIds = (project.lineAccounts ?? [])
        .map((link) => {
          const accountId = link.account?.account_id;
          if (accountId) {
            projectNameByLineAccountId.set(accountId, project.project_name);
          }
          return accountId;
        })
        .filter((id): id is string => Boolean(id));

      projectSettings.push({
        project_name: project.project_name,
        display_name: project.project_name,
        total_report_type: project.total_report_type ?? 'budget',
        performance_unit_price: project.performance_unit_price ?? null,
        project_color: project.project_color ?? null,
        project_icon_path: project.project_icon_path ?? null,
        msp_advertiser_ids: mspIds,
        meta_account_ids: metaIds,
        tiktok_advertiser_ids: tiktokIds,
        google_ads_customer_ids: googleIds,
        line_account_ids: lineIds,
      });

      (project.sections ?? []).forEach((section) => {
        sectionSettings.push({
          section_name: section.section_name,
          project_name: project.project_name,
          msp_ad_prefixes: section.msp_prefixes ?? [],
          campaign_prefixes: section.campaign_prefixes ?? [],
          campaign_keywords: section.campaign_keywords ?? [],
          catch_all_msp: section.catch_all_msp ?? false,
          catch_all_campaign: section.catch_all_campaign ?? false,
          in_house_operation: section.in_house_operation ?? false,
        });

        (section.platformSettings ?? []).forEach((platformSetting) => {
          platformSettingsList.push({
            section_name: section.section_name,
            project_name: project.project_name,
            platform: platformSetting.platform,
            report_type: platformSetting.report_type ?? 'budget',
            fee_settings: parseFeeSettings(platformSetting.fee_settings),
            agency_unit_price: platformSetting.agency_unit_price ?? null,
            internal_unit_price: platformSetting.internal_unit_price ?? null,
            gross_profit_fee: Number(platformSetting.gross_profit_fee ?? 0),
            msp_link_prefixes: platformSetting.msp_link_prefixes ?? [],
          });
        });
      });

      (project.reportUpdates ?? []).forEach((update) => {
        reportUpdateRequests.push({
          project_name: project.project_name,
          start_date: update.start_date,
          end_date: update.end_date,
          status: update.status,
          error_reason: update.error_reason,
        });
      });
    }

    const result: ReportSettings = {
      projects: projectSettings,
      sections: sectionSettings,
      platform_settings: platformSettingsList,
      msp_advertisers: advertisers.map(({ id, name, buyer_id }) => ({
        id,
        name,
        buyer_id,
        project_name: projectNameByMspBuyerId.get(buyer_id) ?? '未設定',
      })),
      meta_accounts: meta.map(({ account_id, account_name }) => ({
        account_id,
        account_name,
        project_name: projectNameByMetaAccountId.get(account_id) ?? '未設定',
      })),
      tiktok_accounts: tiktok.map(({ advertiser_id, advertiser_name }) => ({
        advertiser_id,
        advertiser_name,
        project_name: projectNameByTiktokAdvertiserId.get(advertiser_id) ?? '未設定',
      })),
      google_ads_accounts: google.map(({ customer_id, display_name }) => ({
        customer_id,
        display_name,
        project_name: projectNameByGoogleCustomerId.get(customer_id) ?? '未設定',
      })),
      line_accounts: line.map(({ account_id, display_name }) => ({
        account_id,
        display_name,
        project_name: projectNameByLineAccountId.get(account_id) ?? '未設定',
      })),
      report_update_requests: reportUpdateRequests,
    };

    console.log('[getReportSettings] Result summary:', {
      projects: result.projects.length,
      sections: result.sections.length,
      platform_settings: result.platform_settings.length,
      msp_advertisers: result.msp_advertisers.length,
      meta_accounts: result.meta_accounts.length,
      tiktok_accounts: result.tiktok_accounts.length,
      google_ads_accounts: result.google_ads_accounts.length,
      line_accounts: result.line_accounts.length,
      report_update_requests: result.report_update_requests.length,
    });
    console.log('[getReportSettings] Successfully completed in', Date.now() - startTime, 'ms');

    return result;
  } catch (error) {
    console.error('[getReportSettings] Failed:', error);
    return {
      projects: [],
      sections: [],
      platform_settings: [],
      msp_advertisers: [],
      meta_accounts: [],
      tiktok_accounts: [],
      google_ads_accounts: [],
      line_accounts: [],
      report_update_requests: [],
    } satisfies ReportSettings;
  }
}

export async function getProjectAppearanceByName(projectName: string): Promise<{
  project_color: string | null;
  project_icon_path: string | null;
}> {
  const [project] = await db
    .select({
      project_color: reportProjectsTable.project_color,
      project_icon_path: reportProjectsTable.project_icon_path,
    })
    .from(reportProjectsTable)
    .where(eq(reportProjectsTable.project_name, projectName))
    .limit(1);

  return {
    project_color: project?.project_color ?? null,
    project_icon_path: project?.project_icon_path ?? null,
  };
}

export async function upsertProjectSetting(project: ProjectSetting): Promise<void> {
  const payload: InsertReportProjectRow = {
    id: undefined,
    project_name: project.project_name,
    total_report_type: project.total_report_type,
    performance_unit_price: project.performance_unit_price,
    project_color: project.project_color ?? null,
    project_icon_path: project.project_icon_path ?? null,
  };
  const { project_name: _projectName, ...update } = payload;
  void _projectName;

  await db.transaction(async (tx) => {
    // プロジェクトを作成/更新
    await tx
      .insert(reportProjectsTable)
      .values(payload)
      .onConflictDoUpdate({
        target: reportProjectsTable.project_name,
        set: {
          ...update,
          updated_at: new Date(),
        },
      });

    // プロジェクトIDを取得
    const [projectRow] = await tx
      .select()
      .from(reportProjectsTable)
      .where(eq(reportProjectsTable.project_name, project.project_name))
      .limit(1);

    if (!projectRow) {
      throw new Error(`プロジェクト ${project.project_name} の作成に失敗しました。`);
    }

    // 既存の中間テーブルレコードを削除
    await tx.delete(projectMspAdvertisersTable).where(eq(projectMspAdvertisersTable.project_id, projectRow.id));
    await tx.delete(projectMetaAccountsTable).where(eq(projectMetaAccountsTable.project_id, projectRow.id));
    await tx.delete(projectTiktokAccountsTable).where(eq(projectTiktokAccountsTable.project_id, projectRow.id));
    await tx.delete(projectGoogleAdsAccountsTable).where(eq(projectGoogleAdsAccountsTable.project_id, projectRow.id));
    await tx.delete(projectLineAccountsTable).where(eq(projectLineAccountsTable.project_id, projectRow.id));

    // 新しい中間テーブルレコードを挿入
    // UIから文字列IDを受け取るので、PK IDに変換
    if (project.msp_advertiser_ids.length > 0) {
      // MSPの場合、buyer_idがそのままidとして使われているのでそのまま使用
      await tx.insert(projectMspAdvertisersTable).values(
        project.msp_advertiser_ids.map(buyerId => ({
          project_id: projectRow.id,
          advertiser_id: buyerId, // buyer_id = id
        }))
      );
    }

    if (project.meta_account_ids.length > 0) {
      // account_idからUUID idを取得
      const metaUuidIds: string[] = [];
      for (const accountStringId of project.meta_account_ids) {
        const [row] = await tx
          .select({ id: reportMetaAccountsTable.id })
          .from(reportMetaAccountsTable)
          .where(eq(reportMetaAccountsTable.account_id, accountStringId))
          .limit(1);
        if (row) metaUuidIds.push(row.id);
      }

      if (metaUuidIds.length > 0) {
        await tx.insert(projectMetaAccountsTable).values(
          metaUuidIds.map(uuidId => ({
            project_id: projectRow.id,
            account_id: uuidId,
          }))
        );
      }
    }

    if (project.tiktok_advertiser_ids.length > 0) {
      // advertiser_idからUUID idを取得
      const tiktokUuidIds: string[] = [];
      for (const advertiserStringId of project.tiktok_advertiser_ids) {
        const [row] = await tx
          .select({ id: reportTiktokAccountsTable.id })
          .from(reportTiktokAccountsTable)
          .where(eq(reportTiktokAccountsTable.advertiser_id, advertiserStringId))
          .limit(1);
        if (row) tiktokUuidIds.push(row.id);
      }

      if (tiktokUuidIds.length > 0) {
        await tx.insert(projectTiktokAccountsTable).values(
          tiktokUuidIds.map(uuidId => ({
            project_id: projectRow.id,
            account_id: uuidId,
          }))
        );
      }
    }

    if (project.google_ads_customer_ids.length > 0) {
      // customer_idからUUID idを取得
      const googleUuidIds: string[] = [];
      for (const customerStringId of project.google_ads_customer_ids) {
        const [row] = await tx
          .select({ id: reportGoogleAdsAccountsTable.id })
          .from(reportGoogleAdsAccountsTable)
          .where(eq(reportGoogleAdsAccountsTable.customer_id, customerStringId))
          .limit(1);
        if (row) googleUuidIds.push(row.id);
      }

      if (googleUuidIds.length > 0) {
        await tx.insert(projectGoogleAdsAccountsTable).values(
          googleUuidIds.map(uuidId => ({
            project_id: projectRow.id,
            account_id: uuidId,
          }))
        );
      }
    }

    if (project.line_account_ids.length > 0) {
      // account_idからUUID idを取得
      const lineUuidIds: string[] = [];
      for (const accountStringId of project.line_account_ids) {
        const [row] = await tx
          .select({ id: reportLineAccountsTable.id })
          .from(reportLineAccountsTable)
          .where(eq(reportLineAccountsTable.account_id, accountStringId))
          .limit(1);
        if (row) lineUuidIds.push(row.id);
      }

      if (lineUuidIds.length > 0) {
        await tx.insert(projectLineAccountsTable).values(
          lineUuidIds.map(uuidId => ({
            project_id: projectRow.id,
            account_id: uuidId,
          }))
        );
      }
    }
  });
}

export async function deleteProjectSetting(projectName: string): Promise<void> {
  const project = await ensureProjectByName(projectName);
  await db.transaction(async (tx) => {
    const sectionRows = await tx
      .select({ id: reportSectionsTable.id })
      .from(reportSectionsTable)
      .where(eq(reportSectionsTable.project_id, project.id));
    const sectionIds = sectionRows.map((row) => row.id);

    if (sectionIds.length > 0) {
      await tx
        .delete(reportPlatformSettingsTable)
        .where(inArray(reportPlatformSettingsTable.section_id, sectionIds));
    }

    await tx.delete(projectMspAdvertisersTable).where(eq(projectMspAdvertisersTable.project_id, project.id));
    await tx.delete(projectMetaAccountsTable).where(eq(projectMetaAccountsTable.project_id, project.id));
    await tx.delete(projectTiktokAccountsTable).where(eq(projectTiktokAccountsTable.project_id, project.id));
    await tx.delete(projectGoogleAdsAccountsTable).where(eq(projectGoogleAdsAccountsTable.project_id, project.id));
    await tx.delete(projectLineAccountsTable).where(eq(projectLineAccountsTable.project_id, project.id));
    await tx.delete(reportSectionsTable).where(eq(reportSectionsTable.project_id, project.id));
    await tx.delete(reportUpdatesTable).where(eq(reportUpdatesTable.project_id, project.id));
    await tx.delete(reportProjectsTable).where(eq(reportProjectsTable.id, project.id));
  });
}

export async function upsertSectionSetting(section: SectionSetting): Promise<void> {
  const project = await ensureProjectByName(section.project_name);
  const payload: InsertReportSectionRow = {
    section_name: section.section_name,
    project_id: project.id,
    msp_prefixes: section.msp_ad_prefixes,
    campaign_prefixes: section.campaign_prefixes,
    campaign_keywords: section.campaign_keywords,
    catch_all_msp: section.catch_all_msp,
    catch_all_campaign: section.catch_all_campaign,
    in_house_operation: section.in_house_operation,
  };
  const { section_name: _sectionName, ...update } = payload;
  void _sectionName;

  await db
    .insert(reportSectionsTable)
    .values(payload)
    .onConflictDoUpdate({
      target: [
        reportSectionsTable.section_name,
        reportSectionsTable.project_id,
      ],
      set: {
        ...update,
        updated_at: new Date(),
      },
    });
}

export async function deleteSectionSetting(sectionName: string, projectName: string): Promise<void> {
  const project = await ensureProjectByName(projectName);
  const section = await ensureSectionByName(sectionName, project.id);
  await db.transaction(async (tx) => {
    await tx
      .delete(reportPlatformSettingsTable)
      .where(eq(reportPlatformSettingsTable.section_id, section.id));
    await tx.delete(reportSectionsTable).where(eq(reportSectionsTable.id, section.id));
  });
}

export async function upsertPlatformSetting(platformSetting: PlatformSetting): Promise<void> {
  const project = await ensureProjectByName(platformSetting.project_name);
  const section = await ensureSectionByName(platformSetting.section_name, project.id);
  
  const payload: InsertReportPlatformSettingRow = {
    section_id: section.id,
    platform: platformSetting.platform,
    report_type: platformSetting.report_type,
    fee_settings: platformSetting.fee_settings,
    agency_unit_price: platformSetting.agency_unit_price,
    internal_unit_price: platformSetting.internal_unit_price,
    gross_profit_fee: platformSetting.gross_profit_fee,
    msp_link_prefixes: platformSetting.msp_link_prefixes,
  };
  
  const { section_id: _sectionId, platform: _platform, ...update } = payload;
  void _sectionId;
  void _platform;

  await db
    .insert(reportPlatformSettingsTable)
    .values(payload)
    .onConflictDoUpdate({
      target: [
        reportPlatformSettingsTable.section_id,
        reportPlatformSettingsTable.platform,
      ],
      set: {
        ...update,
        updated_at: new Date(),
      },
    });
}

export async function deletePlatformSetting(sectionName: string, projectName: string, platform: string): Promise<void> {
  const project = await ensureProjectByName(projectName);
  const section = await ensureSectionByName(sectionName, project.id);
  await db
    .delete(reportPlatformSettingsTable)
    .where(
      and(
        eq(reportPlatformSettingsTable.section_id, section.id),
        eq(reportPlatformSettingsTable.platform, platform)
      )
    );
}

export async function upsertMspAdvertiserSetting(advertiser: MspAdvertiserSetting): Promise<void> {
  const payload: InsertReportMspAdvertiserRow = {
    id: advertiser.buyer_id, // idとbuyer_idは同じ値を使用
    buyer_id: advertiser.buyer_id,
    name: advertiser.name,
  };
  const { buyer_id: _buyerId, ...update } = payload;
  void _buyerId;

  await db
    .insert(reportMspAdvertisersTable)
    .values(payload)
    .onConflictDoUpdate({
      target: reportMspAdvertisersTable.buyer_id,
      set: {
        ...update,
        updated_at: new Date(),
      },
    });
}

export async function deleteMspAdvertiserSetting(id: string): Promise<void> {
  await db.delete(reportMspAdvertisersTable).where(eq(reportMspAdvertisersTable.buyer_id, id));
}

export async function upsertMetaAccountSetting(account: MetaAccountSetting): Promise<void> {
  const payload: InsertReportMetaAccountRow = {
    account_id: account.account_id,
    account_name: account.account_name,
  };
  const { account_id: _metaAccountId, ...update } = payload;
  void _metaAccountId;

  await db
    .insert(reportMetaAccountsTable)
    .values(payload)
    .onConflictDoUpdate({
      target: reportMetaAccountsTable.account_id,
      set: {
        ...update,
        updated_at: new Date(),
      },
    });
}

export async function deleteMetaAccountSetting(accountId: string): Promise<void> {
  await db.delete(reportMetaAccountsTable).where(eq(reportMetaAccountsTable.account_id, accountId));
}

export async function upsertTiktokAccountSetting(account: TikTokAccountSetting): Promise<void> {
  const payload: InsertReportTiktokAccountRow = {
    advertiser_id: account.advertiser_id,
    advertiser_name: account.advertiser_name,
  };
  const { advertiser_id: _tiktokAdvertiserId, ...update } = payload;
  void _tiktokAdvertiserId;

  await db
    .insert(reportTiktokAccountsTable)
    .values(payload)
    .onConflictDoUpdate({
      target: reportTiktokAccountsTable.advertiser_id,
      set: {
        ...update,
        updated_at: new Date(),
      },
    });
}

export async function deleteTiktokAccountSetting(advertiserId: string): Promise<void> {
  await db
    .delete(reportTiktokAccountsTable)
    .where(eq(reportTiktokAccountsTable.advertiser_id, advertiserId));
}

export async function upsertGoogleAdsAccountSetting(account: GoogleAdsAccountSetting): Promise<void> {
  const payload: InsertReportGoogleAdsAccountRow = {
    customer_id: account.customer_id,
    display_name: account.display_name,
  };
  const { customer_id: _googleCustomerId, ...update } = payload;
  void _googleCustomerId;

  await db
    .insert(reportGoogleAdsAccountsTable)
    .values(payload)
    .onConflictDoUpdate({
      target: reportGoogleAdsAccountsTable.customer_id,
      set: {
        ...update,
        updated_at: new Date(),
      },
    });
}

export async function deleteGoogleAdsAccountSetting(customerId: string): Promise<void> {
  await db
    .delete(reportGoogleAdsAccountsTable)
    .where(eq(reportGoogleAdsAccountsTable.customer_id, customerId));
}

export async function upsertLineAccountSetting(account: LineAccountSetting): Promise<void> {
  const payload: InsertReportLineAccountRow = {
    account_id: account.account_id,
    display_name: account.display_name,
  };
  const { account_id: _lineAccountId, ...update } = payload;
  void _lineAccountId;

  await db
    .insert(reportLineAccountsTable)
    .values(payload)
    .onConflictDoUpdate({
      target: reportLineAccountsTable.account_id,
      set: {
        ...update,
        updated_at: new Date(),
      },
    });
}

export async function deleteLineAccountSetting(accountId: string): Promise<void> {
  await db.delete(reportLineAccountsTable).where(eq(reportLineAccountsTable.account_id, accountId));
}

export async function upsertReportUpdateSetting(update: ReportUpdateSetting): Promise<void> {
  const project = await ensureProjectByName(update.project_name);
  const payload: InsertReportUpdateRow = {
    project_id: project.id,
    start_date: update.start_date,
    end_date: update.end_date,
    status: update.status,
    error_reason: update.error_reason,
  };

  await db.transaction(async (tx) => {
    await tx.delete(reportUpdatesTable);
    await tx.insert(reportUpdatesTable).values(payload);
  });
}

export async function deleteReportUpdateSetting(projectName: string, startDate: string, endDate: string) {
  const project = await ensureProjectByName(projectName);
  await db
    .delete(reportUpdatesTable)
    .where(
      and(
        eq(reportUpdatesTable.project_id, project.id),
        eq(reportUpdatesTable.start_date, startDate),
        eq(reportUpdatesTable.end_date, endDate)
      )
    );
}
