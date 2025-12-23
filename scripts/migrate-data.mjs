#!/usr/bin/env node
import 'dotenv/config';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateData() {
  console.log('🔄 データ移行を開始します...');

  // バックアップファイルを探す
  const backupDir = path.join(__dirname, 'backups');

  if (!fs.existsSync(backupDir)) {
    console.error('❌ バックアップディレクトリが見つかりません:', backupDir);
    process.exit(1);
  }

  const backupFiles = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (backupFiles.length === 0) {
    console.error('❌ バックアップファイルが見つかりません');
    process.exit(1);
  }

  const latestBackup = backupFiles[0];
  const backupFile = path.join(backupDir, latestBackup);

  console.log(`📂 バックアップファイルを読み込み: ${latestBackup}`);

  const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

  console.log(`   バックアップ日時: ${backupData.timestamp}`);
  console.log(`   プロジェクト: ${backupData.projects.length}件`);
  console.log(`   セクション: ${backupData.sections.length}件`);
  console.log(`   プラットフォーム設定: ${backupData.platformSettings.length}件`);
  console.log(`   MSP広告主: ${backupData.mspAdvertisers.length}件`);
  console.log(`   Metaアカウント: ${backupData.metaAccounts.length}件`);
  console.log(`   TikTokアカウント: ${backupData.tiktokAccounts.length}件`);
  console.log(`   Google Adsアカウント: ${backupData.googleAdsAccounts.length}件`);
  console.log(`   LINEアカウント: ${backupData.lineAccounts.length}件`);

  const connectionString = process.env.SUPABASE_DB_URI;
  if (!connectionString) {
    console.error('❌ SUPABASE_DB_URI environment variable is not set');
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    await sql.begin(async sql => {
      console.log('\n1️⃣ プロジェクトを復元中...');
      for (const project of backupData.projects) {
        await sql`
          INSERT INTO report_projects (id, project_name, total_report_type, performance_unit_price, created_at, updated_at)
          VALUES (${project.id}, ${project.project_name}, ${project.total_report_type}, ${project.performance_unit_price}, ${project.created_at}, ${project.updated_at})
        `;
      }
      console.log(`   ✓ ${backupData.projects.length}件のプロジェクトを復元`);

      console.log('\n2️⃣ セクションを復元中...');
      for (const section of backupData.sections) {
        await sql`
          INSERT INTO report_sections (id, section_name, project_id, msp_prefixes, campaign_prefixes, campaign_keywords, catch_all_msp, catch_all_campaign, in_house_operation, created_at, updated_at)
          VALUES (${section.id}, ${section.section_name}, ${section.project_id}, ${section.msp_prefixes}, ${section.campaign_prefixes}, ${section.campaign_keywords}, ${section.catch_all_msp}, ${section.catch_all_campaign}, ${section.in_house_operation}, ${section.created_at}, ${section.updated_at})
        `;
      }
      console.log(`   ✓ ${backupData.sections.length}件のセクションを復元`);

      console.log('\n3️⃣ プラットフォーム設定を復元中...');
      for (const ps of backupData.platformSettings) {
        await sql`
          INSERT INTO report_platform_settings (id, section_id, platform, report_type, fee_settings, agency_unit_price, internal_unit_price, gross_profit_fee, msp_link_prefixes, created_at, updated_at)
          VALUES (${ps.id}, ${ps.section_id}, ${ps.platform}, ${ps.report_type}, ${ps.fee_settings}, ${ps.agency_unit_price}, ${ps.internal_unit_price}, ${ps.gross_profit_fee}, ${ps.msp_link_prefixes}, ${ps.created_at}, ${ps.updated_at})
        `;
      }
      console.log(`   ✓ ${backupData.platformSettings.length}件のプラットフォーム設定を復元`);

      console.log('\n4️⃣ MSP広告主を復元中...');
      for (const advertiser of backupData.mspAdvertisers) {
        // アカウント情報を復元（project_id なし）
        await sql`
          INSERT INTO report_msp_advertisers (id, buyer_id, name, created_at, updated_at)
          VALUES (${advertiser.id}, ${advertiser.buyer_id}, ${advertiser.name}, ${advertiser.created_at}, ${advertiser.updated_at})
        `;

        // 中間テーブルにリンクを作成
        if (advertiser.project_id) {
          await sql`
            INSERT INTO project_msp_advertisers (project_id, advertiser_id)
            VALUES (${advertiser.project_id}, ${advertiser.id})
          `;
        }
      }
      console.log(`   ✓ ${backupData.mspAdvertisers.length}件のMSP広告主を復元`);

      console.log('\n5️⃣ Metaアカウントを復元中...');
      for (const account of backupData.metaAccounts) {
        // アカウント情報を復元（project_id なし）
        await sql`
          INSERT INTO report_meta_accounts (id, account_id, account_name, created_at, updated_at)
          VALUES (${account.id}, ${account.account_id}, ${account.account_name}, ${account.created_at}, ${account.updated_at})
        `;

        // 中間テーブルにリンクを作成
        if (account.project_id) {
          await sql`
            INSERT INTO project_meta_accounts (project_id, account_id)
            VALUES (${account.project_id}, ${account.id})
          `;
        }
      }
      console.log(`   ✓ ${backupData.metaAccounts.length}件のMetaアカウントを復元`);

      console.log('\n6️⃣ TikTokアカウントを復元中...');
      for (const account of backupData.tiktokAccounts) {
        // アカウント情報を復元（project_id なし）
        await sql`
          INSERT INTO report_tiktok_accounts (id, advertiser_id, advertiser_name, created_at, updated_at)
          VALUES (${account.id}, ${account.advertiser_id}, ${account.advertiser_name}, ${account.created_at}, ${account.updated_at})
        `;

        // 中間テーブルにリンクを作成
        if (account.project_id) {
          await sql`
            INSERT INTO project_tiktok_accounts (project_id, account_id)
            VALUES (${account.project_id}, ${account.id})
          `;
        }
      }
      console.log(`   ✓ ${backupData.tiktokAccounts.length}件のTikTokアカウントを復元`);

      console.log('\n7️⃣ Google Adsアカウントを復元中...');
      for (const account of backupData.googleAdsAccounts) {
        // アカウント情報を復元（project_id なし）
        await sql`
          INSERT INTO report_google_ads_accounts (id, customer_id, display_name, created_at, updated_at)
          VALUES (${account.id}, ${account.customer_id}, ${account.display_name}, ${account.created_at}, ${account.updated_at})
        `;

        // 中間テーブルにリンクを作成
        if (account.project_id) {
          await sql`
            INSERT INTO project_google_ads_accounts (project_id, account_id)
            VALUES (${account.project_id}, ${account.id})
          `;
        }
      }
      console.log(`   ✓ ${backupData.googleAdsAccounts.length}件のGoogle Adsアカウントを復元`);

      console.log('\n8️⃣ LINEアカウントを復元中...');
      for (const account of backupData.lineAccounts) {
        // アカウント情報を復元（project_id なし）
        await sql`
          INSERT INTO report_line_accounts (id, account_id, display_name, created_at, updated_at)
          VALUES (${account.id}, ${account.account_id}, ${account.display_name}, ${account.created_at}, ${account.updated_at})
        `;

        // 中間テーブルにリンクを作成
        if (account.project_id) {
          await sql`
            INSERT INTO project_line_accounts (project_id, account_id)
            VALUES (${account.project_id}, ${account.id})
          `;
        }
      }
      console.log(`   ✓ ${backupData.lineAccounts.length}件のLINEアカウントを復元`);
    });

    console.log('\n✅ データ移行が完了しました！');

    // 移行後の統計情報
    console.log('\n📊 移行後の統計:');
    const [
      projectCount,
      sectionCount,
      platformSettingCount,
      mspCount,
      metaCount,
      tiktokCount,
      googleCount,
      lineCount,
      mspLinkCount,
      metaLinkCount,
      tiktokLinkCount,
      googleLinkCount,
      lineLinkCount,
    ] = await Promise.all([
      sql`SELECT COUNT(*) FROM report_projects`.then(r => Number(r[0].count)),
      sql`SELECT COUNT(*) FROM report_sections`.then(r => Number(r[0].count)),
      sql`SELECT COUNT(*) FROM report_platform_settings`.then(r => Number(r[0].count)),
      sql`SELECT COUNT(*) FROM report_msp_advertisers`.then(r => Number(r[0].count)),
      sql`SELECT COUNT(*) FROM report_meta_accounts`.then(r => Number(r[0].count)),
      sql`SELECT COUNT(*) FROM report_tiktok_accounts`.then(r => Number(r[0].count)),
      sql`SELECT COUNT(*) FROM report_google_ads_accounts`.then(r => Number(r[0].count)),
      sql`SELECT COUNT(*) FROM report_line_accounts`.then(r => Number(r[0].count)),
      sql`SELECT COUNT(*) FROM project_msp_advertisers`.then(r => Number(r[0].count)),
      sql`SELECT COUNT(*) FROM project_meta_accounts`.then(r => Number(r[0].count)),
      sql`SELECT COUNT(*) FROM project_tiktok_accounts`.then(r => Number(r[0].count)),
      sql`SELECT COUNT(*) FROM project_google_ads_accounts`.then(r => Number(r[0].count)),
      sql`SELECT COUNT(*) FROM project_line_accounts`.then(r => Number(r[0].count)),
    ]);

    console.log(`  プロジェクト: ${projectCount}件`);
    console.log(`  セクション: ${sectionCount}件`);
    console.log(`  プラットフォーム設定: ${platformSettingCount}件`);
    console.log(`  MSP広告主: ${mspCount}件 (リンク: ${mspLinkCount}件)`);
    console.log(`  Metaアカウント: ${metaCount}件 (リンク: ${metaLinkCount}件)`);
    console.log(`  TikTokアカウント: ${tiktokCount}件 (リンク: ${tiktokLinkCount}件)`);
    console.log(`  Google Adsアカウント: ${googleCount}件 (リンク: ${googleLinkCount}件)`);
    console.log(`  LINEアカウント: ${lineCount}件 (リンク: ${lineLinkCount}件)`);

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    await sql.end();
    process.exit(1);
  }
}

migrateData();
