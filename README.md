# hare-bi

社内向けにBigQueryのデータを可視化するダッシュボードです。Supabase Auth と Drizzle で管理者 / 代理店ロールを管理し、代理店は担当セクションのみ参照できます。

## 必要な環境変数

`.env.local` などに以下を設定してください。

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_DB_URI=postgres://...
BIGQUERY_PROJECT_ID=...
BIGQUERY_CLIENT_EMAIL=...
BIGQUERY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
BIGQUERY_DATASET=hare-local-project.hare_ad_data # 任意
BIGQUERY_LOCATION=asia-northeast1 # 任意
```

- `SUPABASE_DB_URI` は Supabase ダッシュボードの「Connection string」> `psql` を使用します。
- `SUPABASE_SERVICE_ROLE_KEY`（または `SUPABASE_SERVICE_ROLE`）は **サーバーサイドのみ** で利用してください。
- BigQueryの環境変数は既存実装から引き継ぎです。

## Drizzle / Supabase セットアップ

1. `npm run db:generate` でスキーマから SQL を生成します。
2. Supabase CLI などでマイグレーションを適用してください。
3. Supabase の `profiles` テーブルは `admin` / `agent` ロールと担当セクションIDを管理します。
4. 初回の管理者レコードは SQL で直接作成してください（例: `insert into profiles (id, email, role) values (...)`）。

## 開発コマンド

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド |
| `npm run lint` | ESLint 実行 |
| `npm run db:generate` | Drizzle で SQL 生成 |
| `npm run db:migrate` | 生成済み SQL を Supabase に適用 |
| `npm run create-admin -- <email> <password>` | サービスロール経由で管理者アカウントを作成 |

## 認証と権限

- `/login`: Supabase Auth へのログインフォーム。
- 管理者のみ `/projects` `/platforms` `/agents` にアクセス可能です。
- 代理店は `/sections` のみ表示され、割り当てられたセクション以外のデータは取得されません。
- `/agents` から管理者が代理店アカウントを作成できます（メール/初期パスワード/セクションを指定）。

## 注意点

- `profiles` に対応する Supabase Auth ユーザーが存在しない場合、ログインできません。
- 代理店のセクション割り当てを変更する場合は `/agents` で再作成するか、DB を直接更新してください。
- Sneaker Gacha App 側のファイルは変更していません。
- 初回の管理者は `npm run create-admin -- admin@example.com password123` のように作成し、追加で代理店が必要になったら `/agents` から作成してください。
