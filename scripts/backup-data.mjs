#!/usr/bin/env node
import 'dotenv/config';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function backupData() {
  console.log('📦 データバックアップを開始します...');

  const connectionString = process.env.SUPABASE_DB_URI;
  if (!connectionString) {
    console.error('❌ SUPABASE_DB_URI environment variable is not set');
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    console.log('データベースからデータを取得中...');

    const [
      projects,
      sections,
      platformSettings,
      mspAdvertisers,
      metaAccounts,
      tiktokAccounts,
      googleAdsAccounts,
      lineAccounts,
    ] = await Promise.all([
      sql`SELECT * FROM report_projects ORDER BY project_name`,
      sql`SELECT * FROM report_sections ORDER BY section_name`,
      sql`SELECT * FROM report_platform_settings ORDER BY created_at`,
      sql`SELECT * FROM report_msp_advertisers ORDER BY name`,
      sql`SELECT * FROM report_meta_accounts ORDER BY account_name`,
      sql`SELECT * FROM report_tiktok_accounts ORDER BY advertiser_name`,
      sql`SELECT * FROM report_google_ads_accounts ORDER BY display_name`,
      sql`SELECT * FROM report_line_accounts ORDER BY display_name`,
    ]);

    console.log('✓ データ取得完了:');
    console.log(`  - プロジェクト: ${projects.length}件`);
    console.log(`  - セクション: ${sections.length}件`);
    console.log(`  - プラットフォーム設定: ${platformSettings.length}件`);
    console.log(`  - MSP広告主: ${mspAdvertisers.length}件`);
    console.log(`  - Metaアカウント: ${metaAccounts.length}件`);
    console.log(`  - TikTokアカウント: ${tiktokAccounts.length}件`);
    console.log(`  - Google Adsアカウント: ${googleAdsAccounts.length}件`);
    console.log(`  - LINEアカウント: ${lineAccounts.length}件`);

    const backupData = {
      timestamp: new Date().toISOString(),
      projects,
      sections,
      platformSettings,
      mspAdvertisers,
      metaAccounts,
      tiktokAccounts,
      googleAdsAccounts,
      lineAccounts,
    };

    // バックアップディレクトリを作成
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // バックアップファイルを保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

    console.log(`\n✅ バックアップ完了: ${backupFile}`);

    // 統計情報を表示
    console.log('\n📊 統計情報:');

    // プロジェクトごとのアカウント数を集計
    const projectAccountCounts = new Map();

    projects.forEach(project => {
      projectAccountCounts.set(project.id, {
        msp: mspAdvertisers.filter(a => a.project_id === project.id).length,
        meta: metaAccounts.filter(a => a.project_id === project.id).length,
        tiktok: tiktokAccounts.filter(a => a.project_id === project.id).length,
        google: googleAdsAccounts.filter(a => a.project_id === project.id).length,
        line: lineAccounts.filter(a => a.project_id === project.id).length,
      });
    });

    console.log('\nプロジェクトごとのアカウント数:');
    projects.forEach(project => {
      const counts = projectAccountCounts.get(project.id);
      if (counts) {
        const total = counts.msp + counts.meta + counts.tiktok + counts.google + counts.line;
        console.log(`  ${project.project_name}:`);
        console.log(`    MSP: ${counts.msp}, Meta: ${counts.meta}, TikTok: ${counts.tiktok}, Google: ${counts.google}, LINE: ${counts.line} (合計: ${total})`);
      }
    });

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    await sql.end();
    process.exit(1);
  }
}

backupData();
