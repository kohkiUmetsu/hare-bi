# データ移行スクリプト

プロジェクトと媒体アカウントの関係を1対多から多対多に移行するためのスクリプトです。

## 移行手順

### 1. データバックアップ

マイグレーション前に既存データをバックアップします：

```bash
npm run backup-data
```

このスクリプトは：
- 既存のすべてのプロジェクト、セクション、プラットフォーム設定、媒体アカウントのデータを取得
- `scripts/backups/backup-YYYY-MM-DDTHH-mm-ss.json` に保存
- 統計情報を表示

### 2. データベースマイグレーション

スキーマを更新します：

```bash
npm run db:generate  # マイグレーションファイル生成
npm run db:migrate   # マイグレーション実行
```

このマイグレーションは：
- 媒体アカウントテーブルから `project_id` カラムを削除
- 中間テーブル（`project_msp_advertisers`, `project_meta_accounts`, `project_tiktok_accounts`, `project_google_ads_accounts`, `project_line_accounts`）を作成

### 3. データ移行

バックアップしたデータを新しいスキーマに移行します：

```bash
npm run migrate-data
```

このスクリプトは：
- 最新のバックアップファイルを読み込み
- プロジェクト、セクション、プラットフォーム設定を復元
- 媒体アカウントを復元（`project_id` なし）
- 中間テーブルにプロジェクトとアカウントの関連を作成
- 移行後の統計情報を表示

## 注意事項

- **必ずバックアップを取ってから**マイグレーションを実行してください
- マイグレーション中は本番環境を停止することを推奨します
- バックアップファイルは `scripts/backups/` ディレクトリに保存されます
- 移行スクリプトは最新のバックアップファイルを自動的に使用します

## トラブルシューティング

### バックアップファイルが見つからない

```bash
# バックアップディレクトリを確認
ls scripts/backups/

# 存在しない場合は再度バックアップを実行
npm run backup-data
```

### 移行中にエラーが発生した場合

1. エラーメッセージを確認
2. データベースをロールバック（必要に応じて）
3. バックアップファイルを確認
4. 修正後、再度移行スクリプトを実行

### 特定のバックアップファイルを使用したい場合

`scripts/migrate-data.ts` の `latestBackup` 変数を変更してください。

## 変更内容

### スキーマ変更

**変更前（1対多）:**
```typescript
// 各アカウントテーブルに project_id カラムがある
reportMetaAccountsTable {
  id: uuid
  account_id: text
  account_name: text
  project_id: uuid  // ← これを削除
}
```

**変更後（多対多）:**
```typescript
// アカウントテーブルには project_id なし
reportMetaAccountsTable {
  id: uuid
  account_id: text
  account_name: text
}

// 中間テーブルで関連を管理
projectMetaAccountsTable {
  project_id: uuid
  account_id: uuid
  created_at: timestamp
}
```

### メリット

- ✅ 1つの広告アカウントを複数のプロジェクトに登録可能
- ✅ プロジェクト間でアカウントを共有できる
- ✅ データの重複を防げる
