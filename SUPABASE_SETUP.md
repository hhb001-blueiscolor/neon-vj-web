# Supabase環境構築ガイド

## 1. Supabaseプロジェクト作成

### 手順
1. https://supabase.com にアクセス
2. 「Start your project」をクリック
3. GitHub/Googleアカウントでサインイン
4. 「New Project」をクリック
5. 以下を設定：
   - **Name**: `neon-vj-setlist`
   - **Database Password**: 強力なパスワード（保存必須）
   - **Region**: `Asia Northeast (Tokyo)`
6. 「Create new project」をクリック
7. プロジェクト初期化完了まで2-3分待機

## 2. データベーススキーマ設定

### 手順
1. Supabaseダッシュボードで「SQL Editor」を開く
2. `supabase-schema.sql` の内容を全選択してコピー
3. SQL Editorに貼り付けて「Run」をクリック
4. 以下のテーブルが作成されることを確認：
   - `events` (イベント情報)
   - `songs` (楽曲情報)  
   - `usage_stats` (使用量統計)
   - `system_limits` (制限値管理)

## 3. API設定情報の取得

### 手順
1. 「Settings」→「API」を開く
2. 以下の値をコピー：
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: `eyJ...` (長いトークン)

## 4. Vercel環境変数設定

### 手順
1. Vercelダッシュボードでプロジェクトを開く
2. 「Settings」→「Environment Variables」を開く
3. 以下を追加：
   - `SUPABASE_URL`: Project URL
   - `SUPABASE_ANON_KEY`: anon public key

## 5. 制限値の確認・調整

### デフォルト制限値
```sql
-- 制限値確認
SELECT * FROM system_limits;

-- 調整が必要な場合（管理者のみ）
UPDATE system_limits 
SET monthly_limit = 30000, warning_threshold = 27000 
WHERE limit_type = 'api_calls';
```

### 想定使用量との対応
- **月間API呼び出し**: 50,000回 → 月25-30イベント対応
- **月間イベント作成**: 120回 → 月4イベント/日
- **月間楽曲追加**: 30,000回 → 1,000曲/日
- **月間データ取得**: 15,000回 → 500回/日

## 6. 接続テスト

### 手順
1. `npm install` で依存関係インストール
2. Vercel環境変数設定完了後
3. API endpoints にテストリクエスト送信
4. Supabaseダッシュボードでデータ確認

## 7. 監視設定

### Supabaseダッシュボード
- **Usage**: API呼び出し数確認
- **Database**: 容量使用量確認  
- **Logs**: エラーログ監視

### アラート設定（推奨）
- API使用量90%でメール通知
- データベース容量80%でメール通知
- エラー率5%超過でメール通知

## トラブルシューティング

### よくある問題
1. **RLS Policy エラー**: 
   - SQL EditorでPolicy正常作成確認
   - anon keyでの適切なアクセス権確認

2. **接続エラー**:
   - 環境変数のURL/Key確認
   - ネットワーク接続確認

3. **制限到達**:
   - 使用量統計確認 (`SELECT * FROM usage_stats`)
   - 制限値調整検討

### サポート情報
- Supabase Documentation: https://supabase.com/docs
- Discord Community: https://discord.supabase.com

---

**重要**: このセットアップが完了したら、個人情報露出問題は完全に解決されます。