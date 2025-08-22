# NeoN VJ Supabase 完全セットアップガイド

> **重要**: このガイドに従えば、個人情報露出問題が完全に解決されます

## 📋 事前準備

### 必要なアカウント
- [x] Supabase アカウント (https://supabase.com)
- [x] Vercel アカウント (https://vercel.com) 
- [x] GitHub アカウント

### 実行環境
- [x] Node.js 18+ インストール済み
- [x] git コマンド利用可能

---

## Phase 1: Supabase環境構築 (15分)

### 1-1. Supabaseプロジェクト作成

1. **Supabaseにサインイン**
   ```
   https://supabase.com → Sign in
   ```

2. **新規プロジェクト作成**
   - 「New Project」をクリック
   - **Organization**: 既存または新規作成
   - **Name**: `neon-vj-setlist`
   - **Database Password**: 強力なパスワード生成（必ず保存）
   - **Region**: `Asia Northeast (Tokyo)` 
   - 「Create new project」をクリック

3. **初期化完了を待機** (2-3分)
   - ダッシュボードが利用可能になるまで待機

### 1-2. データベーススキーマ設定

1. **SQL Editorを開く**
   ```
   Supabaseダッシュボード → SQL Editor
   ```

2. **スキーマ実行**
   - `supabase-schema.sql` の内容を全選択
   - SQL Editorに貼り付け
   - 「Run」をクリック

3. **テーブル作成確認**
   ```
   作成されるテーブル:
   ✅ events (イベント情報)
   ✅ songs (楽曲情報)
   ✅ usage_stats (使用量統計)
   ✅ system_limits (制限値管理)
   ```

### 1-3. API設定情報取得

1. **Settings → API を開く**

2. **以下の値をコピー**
   ```
   Project URL: https://xxxxxxxxxxxxxxxx.supabase.co
   anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## Phase 2: Vercel環境設定 (10分)

### 2-1. プロジェクトデプロイ

1. **Vercelダッシュボードを開く**
   ```
   https://vercel.com/dashboard
   ```

2. **既存プロジェクト確認**
   - neon-vj-web プロジェクトを選択

### 2-2. 環境変数設定

1. **Settings → Environment Variables を開く**

2. **以下の環境変数を追加**
   ```
   SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **全環境に適用**
   - Production ✅
   - Preview ✅  
   - Development ✅

### 2-3. 依存関係更新とデプロイ

1. **ローカルで依存関係更新**
   ```bash
   cd /tmp/neon-vj-web
   npm install @supabase/supabase-js@^2.38.0
   git add package.json package-lock.json
   git commit -m "feat: Add Supabase dependency"
   git push origin main
   ```

2. **自動デプロイ確認**
   - Vercelが自動でデプロイを開始
   - Deployments タブで成功確認

---

## Phase 3: 接続テスト (10分)

### 3-1. API接続テスト

1. **テストスクリプト実行**
   ```bash
   cd /tmp/neon-vj-web
   node test-api.js
   ```

2. **期待される結果**
   ```
   🧪 Supabase API テスト開始
   
   === 使用量チェックテスト ===
   api_calls: ✅ (200)
   events_created: ✅ (200)
   songs_added: ✅ (200)
   data_retrieved: ✅ (200)
   
   === イベント作成テスト ===
   イベント作成: ✅ (201)
   
   === 楽曲追加テスト ===
   楽曲追加: ✅ (201)
   
   === イベントデータ取得テスト ===
   データ取得: ✅ (200)
   
   ✅ すべてのテストが完了しました
   ```

### 3-2. Webページ確認

1. **イベント作成テスト**
   ```
   https://web.neondjneon.com → イベント名入力 → 作成
   ```

2. **ライブページ確認**
   ```
   生成されたURL: https://web.neondjneon.com/live.html?event=xxxxxxxx
   ```

---

## Phase 4: iOS アプリ設定 (5分)

### 4-1. アプリでの動作確認

1. **Xcodeでアプリ起動**
   ```bash
   # シミュレータで起動
   open "ShazamVJ2.xcodeproj"
   ```

2. **セットリスト機能テスト**
   - Settings → Setlist → イベント名入力 → 開始
   - 音楽認識 → セットリスト公開確認

3. **制限値確認**
   - 使用量警告の表示確認
   - エラーハンドリング動作確認

---

## Phase 5: 監視・保守 (継続)

### 5-1. 使用量監視

1. **Supabaseダッシュボード確認**
   ```
   Settings → Usage:
   - Database Size: < 500MB
   - API Requests: < 50,000/月
   - Auth Users: < 50,000
   ```

2. **制限値調整** (必要時)
   ```sql
   -- system_limits テーブルで制限値変更
   UPDATE system_limits 
   SET monthly_limit = 30000, warning_threshold = 27000 
   WHERE limit_type = 'songs_added';
   ```

### 5-2. アラート設定

1. **Supabaseアラート有効化**
   - Settings → Notifications
   - 使用量90%でメール通知

2. **Vercelアラート設定**
   - Settings → Notifications  
   - Function Error Rate > 5%でアラート

---

## 🚨 重要な制限事項

### 無料枠制限
```
月間制限:
✅ API呼び出し: 50,000回 → 月25-30イベント対応
✅ DB容量: 500MB → 十分
✅ 同時接続: 60 → 十分
❌ 月60-120イベント → 制限超過リスク
```

### 推奨運用
- **イベント数**: 月25回以下
- **楽曲数**: 150曲/イベント以下
- **使用頻度**: 週1-2回程度

---

## ❌ トラブルシューティング

### よくある問題と解決法

1. **API接続エラー**
   ```
   原因: 環境変数設定ミス
   解決: SUPABASE_URL/ANON_KEYを再確認
   ```

2. **RLS Policy エラー**
   ```
   原因: Row Level Security設定問題
   解決: supabase-schema.sql を再実行
   ```

3. **制限到達エラー**
   ```
   原因: 月間制限超過
   解決: 翌月まで待機、または有料プラン検討
   ```

4. **iOS アプリ接続失敗**
   ```
   原因: APIエンドポイントURL間違い
   解決: web.neondjneon.com/api を確認
   ```

---

## ✅ セットアップ完了チェックリスト

- [ ] Supabaseプロジェクト作成完了
- [ ] データベーススキーマ実行完了
- [ ] Vercel環境変数設定完了
- [ ] API接続テスト成功
- [ ] iOS アプリ動作確認完了
- [ ] Webページ動作確認完了
- [ ] 使用量監視設定完了

**🎉 セットアップ完了後は個人情報露出問題が完全に解決されます**

---

## 📞 サポート

### 公式ドキュメント
- Supabase: https://supabase.com/docs
- Vercel: https://vercel.com/docs

### コミュニティ
- Supabase Discord: https://discord.supabase.com
- Vercel Community: https://github.com/vercel/vercel/discussions