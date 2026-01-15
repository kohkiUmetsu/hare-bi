# hare-bi 仕様書

作成日: 2026-01-08

## 1. 概要
- 目的: 社内向けに BigQuery 上の広告データを可視化する BI ダッシュボード。
- 対象ユーザー: 管理者 (admin) と代理店 (agent)。
- 主な機能:
  - プロジェクト / セクション / プラットフォーム単位の KPI 可視化。
  - 期間フィルタ (プリセット + カレンダー) による集計切替。
  - プラットフォームの実CV (actual_cv) の手動編集と履歴記録。
  - レポート設定 (プロジェクト、セクション、媒体設定、媒体アカウント) の管理。
  - 代理店アカウント管理。

## 2. 技術スタック
- Frontend: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- Chart: Recharts
- Auth: Supabase Auth (SSR), Supabase client/admin SDK
- DB (設定管理): Supabase Postgres + Drizzle ORM
- DWH (指標データ): BigQuery

## 3. 環境変数
`README.md` の記載通り。
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URI`
- BigQuery: `BIGQUERY_PROJECT_ID`, `BIGQUERY_CLIENT_EMAIL`, `BIGQUERY_PRIVATE_KEY`, `BIGQUERY_DATASET` (任意), `BIGQUERY_LOCATION` (任意)

## 4. 認証・権限制御
- ログイン: `/login` で Supabase Auth によるメール/パスワード認証。
- セッション取得: `lib/auth-server.ts` で `profiles` テーブルからロール/担当セクションを取得。
- 権限:
  - admin: `/projects`, `/sections`, `/platforms`, `/agents`, `/data-updates`, `/settings` にアクセス可能。
  - agent: `/sections` のみ。担当セクション以外のデータは表示しない。
- ルーティング:
  - `/` はログイン済みなら admin は `/projects`、agent は `/sections` へリダイレクト。
- Middleware: `middleware.ts` で Supabase SSR Cookie を更新。

## 5. データソース
### 5.1 BigQuery (指標データ)
#### 参照テーブル
- `project`: `id`, `project_name`
- `section`: `id`, `label`, `project_id`
- `platform`: `id`, `platform_label`, `section_id`
- `project_data`: 日次集計データ
- `section_data`: 日次集計データ
- `platform_data`: 日次集計データ

#### `*_data` 必須カラム (BigQuery 側)
- 共通: `aggregation_type`, `created_at`, `updated_at`
- 指標:
  - `actual_ad_cost`
  - `msp_cv`
  - `actual_cv`
  - `impressions`
  - `clicks`
  - `m_cv` (未設定の場合は `clicks` を代用)
  - `platform_cv`
  - `performance_based_fee` (project/section でのみ集計)
- 結合キー:
  - `project_data`: `project_id`
  - `section_data`: `section_id`
  - `platform_data`: `platform_id`

#### 指標計算ロジック
`lib/metrics.ts` の SQL に準拠。
- `CPA = SUM(actual_ad_cost) / SUM(msp_cv)`
- `CPC = SUM(actual_ad_cost) / SUM(clicks)`
- `CTR = SUM(clicks) / SUM(impressions)`
- `CVR = SUM(msp_cv) / SUM(clicks)`
- `mCVR = SUM(m_cv) / SUM(clicks)`
- `mCPA = SUM(actual_ad_cost) / SUM(m_cv)`
- `CPM = SUM(actual_ad_cost) / SUM(impressions) * 1000`
- すべて `SAFE_DIVIDE` + `NULLIF` + `COALESCE(…, 0)` で 0 除算を回避。

#### 実CV編集履歴テーブル
- テーブル名: `platform_actual_cv_edits`
- 目的: 実CV編集の履歴を保存し、UI上で編集済み日を可視化。
- 推奨 DDL (BigQuery):
  - `edit_id` STRING
  - `platform_id` STRING
  - `section_id` STRING
  - `project_id` STRING
  - `target_date` DATE
  - `previous_actual_cv` INT64
  - `new_actual_cv` INT64
  - `delta` INT64
  - `edited_at` TIMESTAMP
  - `editor_id` STRING
  - `editor_email` STRING
  - `PARTITION BY DATE(edited_at)`
  - `CLUSTER BY platform_id, section_id, project_id, target_date`

### 5.2 Supabase Postgres (設定管理)
`db/schema/*` に定義。

#### 主要テーブル
- `profiles`
  - `id` (Supabase auth user id), `email`, `role` (admin/agent), `section_id`, timestamps
- `report_projects`
  - `project_name`, `total_report_type`, `performance_unit_price`
- `report_sections`
  - `section_name`, `project_id`, `msp_prefixes`, `campaign_prefixes`, `campaign_keywords`, `catch_all_msp`, `catch_all_campaign`, `in_house_operation`
- `report_platform_settings`
  - `section_id`, `platform`, `report_type`, `fee_settings` (jsonb), `agency_unit_price`, `internal_unit_price`, `gross_profit_fee`, `msp_link_prefixes`
- `report_*_accounts` (MSP/Meta/TikTok/Google/LINE)
  - 各媒体アカウントの ID/名前
- `project_*` (join テーブル)
  - プロジェクトと媒体アカウントの紐付け
- `report_updates`
  - データ更新リクエストの `project_id`, `start_date`, `end_date`, `status`, `error_reason`

#### 設定の取得と更新
- `lib/settings.ts` で Drizzle を使ってリレーション取得。
- Upsert/Delete は `app/(dashboard)/settings/actions.ts` 経由で実行。
- 変更後は `revalidatePath` で `/settings` 系を再検証。

## 6. 画面構成と機能
### 6.1 共通レイアウト
- `app/(dashboard)/layout.tsx`
  - Header + Sidebar + Main で構成。
  - Sidebar のナビは role により切替。
  - Header 右側は email + 役割バッジ + logout。

### 6.2 認証
- `/login`: メール/パスワード入力。エラーはフォーム内に表示。
- 成功時は `/` へリダイレクト。

### 6.3 Projects (admin)
- URL: `/projects`
- フィルタ: プロジェクト + 期間 (DateRangePicker)
- 取得データ: BigQuery `project_data`
- 表示:
  - 上部 KPI (実広告費 / 総実CV / 平均MSP CPA)
  - KPIミニチャート
  - トレンドチャート (CV件数/CPA, 実広告費)
  - 中段 KPI (impressions, clicks, mCV, CPC, CPM, CTR, mCVR, CVR)
  - 日次テーブル
  - セクション別内訳 (上位 5 件)

### 6.4 Sections (admin/agent)
- URL: `/sections`
- admin: プロジェクト + セクション + 期間を選択
- agent: 割当セクションのみ表示
- 取得データ: BigQuery `section_data`
- 表示: Projects と同様の KPI + トレンド + 日次テーブル + プラットフォーム別内訳

### 6.5 Platforms (admin)
- URL: `/platforms`
- フィルタ: プロジェクト → セクション → プラットフォーム → 期間
- 取得データ: BigQuery `platform_data`
- 表示:
  - KPI + トレンド
  - 日次テーブル (プラットフォーム別)
  - 実CVの編集モーダル

#### 実CV編集フロー
- テーブル行クリックで編集モーダルを開く。
- 編集可能項目: 実CVのみ (整数, 0以上)。
- 保存時:
  - `platform_data.actual_cv` 更新
  - `section_data.actual_cv` に差分 (delta) を加算
  - `project_data.actual_cv` に差分 (delta) を加算
  - `platform_actual_cv_edits` に履歴を INSERT
- 編集済み日付はテーブルの実CV列が色変更 (amber)。

### 6.6 Agents (admin)
- URL: `/agents`
- 機能: 代理店アカウントの作成 / 削除
- 作成時:
  - Supabase Admin API でユーザー作成
  - `profiles` に role=agent を upsert
  - `app_metadata` に role/sectionId を付与

### 6.7 Data Updates (admin)
- URL: `/data-updates`
- 機能: 更新リクエスト (1件) の保存/削除
- 保存時: `report_updates` に upsert (`status='未実行'`)

### 6.8 Settings (admin)
- URL: `/settings`
- プロジェクト一覧 + 紐付け媒体 + セクション数
- 行クリックで `/settings/projects/[projectName]` へ遷移

### 6.9 Settings > Accounts (admin)
- URL: `/settings/accounts`
- Tabs: MSP / Meta / TikTok / Google / LINE
- 各タブでアカウント一覧と追加/削除

### 6.10 Settings > New Project Wizard (admin)
- URL: `/settings/projects/new`
- 3 ステップ:
  1) プロジェクト作成
     - `project_name`, `total_report_type`, `performance_unit_price` (成果報酬時)
     - 媒体アカウント紐付け (複数選択)
  2) セクション作成
     - `section_name`
     - `msp_ad_prefixes`, `campaign_prefixes`, `campaign_keywords`
     - `catch_all_msp`, `catch_all_campaign`, `in_house_operation`
  3) 媒体設定
     - `section_name`, `platform`, `report_type`
     - `fee_settings` (name + value)
     - `agency_unit_price`, `internal_unit_price` (成果報酬時)
     - `gross_profit_fee` (予算運用時)
     - `msp_link_prefixes`

### 6.11 Settings > Project Detail (admin)
- URL: `/settings/projects/[projectName]`
- プロジェクト設定、セクション設定、媒体設定を編集。
- セクション・媒体設定は同名キーで upsert、削除可能。

## 7. API
### 7.1 GET `/api/settings`
- `lib/settings.ts` の情報を外部向け JSON に整形して返却。
- 目的: 外部ツール/ETL などからの設定参照。

## 8. UI/デザイン指針
- カラーパレット (`app/globals.css`)
  - `--accent-color-600: #003B53`
  - `--accent-color-500: #004A67`
  - `--accent-color-400: #00658D`
  - `--accent-color: var(--accent-color-600)`
  - `--chart-line-color: #2A9CFF`
  - `--primary-color: #EFEDED`
- Header: accent-color-600
- Sidebar: accent-color-500
- Sidebar active: accent-color-400
- グラフ線色: `--chart-line-color`
- 角丸: ボタン以外は基本的に使用しない

## 9. 主要コンポーネント仕様
- DateRangePicker: プリセット (今日/昨日/過去7日/過去30日/今月/昨月)。
- Calendar: react-day-picker を使用。選択開始/終了のみ accent-color で強調。
- MetricsPanel:
  - KPI + ミニチャート + トレンドチャート + 日次テーブル
  - 内訳テーブルは上位 5 件
- MetricsTrendCharts:
  - CV件数/CPA: `ComposedChart` (Line + Bar)
  - 実広告費: `AreaChart`
  - すべて `type="linear"` でカクカクの線 (平滑化なし)

## 10. 運用・スクリプト
- `npm run dev`, `npm run build`, `npm run lint`
- Drizzle: `npm run db:generate`, `npm run db:migrate`
- 管理者作成: `npm run create-admin -- <email> <password>`
- `scripts/backup-data.mjs`, `scripts/migrate-data.mjs` などの補助スクリプトあり

## 11. 注意点 / 想定
- BigQuery テーブルが存在しない場合はエラー表示。
- `platform_actual_cv_edits` が存在しない場合は編集履歴表示をスキップ。
- 代理店ユーザーは必ず `profiles.section_id` を持つ必要がある。
- 指標に 0 除算が発生する箇所は BigQuery 側で 0 に補正。

