# DNS設定整理ガイド

## 現在のDNS設定状況

### 使用中の設定
- **web.neondjneon.com** → Vercel (継続使用)
  - 用途: Supabase API + 静的サイト配信
  - 設定: CNAME → vercel-deployment-url

### 削除推奨の設定  
- **vj.neondjneon.com** → GitHub Pages (削除推奨)
  - 理由: GitHub Pages廃止により不要
  - 影響: なし（使用していない）

## DNS削除手順

### お名前.comでの削除方法
1. お名前.com管理画面にログイン
2. 「DNS設定/転送設定」を選択
3. 対象ドメイン「neondjneon.com」を選択
4. DNS設定一覧で「vj」のCNAMEレコードを削除
5. 「確認画面へ進む」→「設定する」

### 削除対象
```
削除レコード:
vj.neondjneon.com CNAME hhb001-blueiscolor.github.io
```

### 保持レコード
```
継続使用:
web.neondjneon.com CNAME vercel-deployment-url
```

## 削除による影響

### 影響なし
- **既存システム**: web.neondjneon.comで稼働継続
- **iOS アプリ**: web.neondjneon.com/api 使用で問題なし
- **個人情報**: GitHub参照完全削除でプライバシー向上

### 削除タイミング
- **推奨**: Supabase環境構築完了後
- **理由**: 旧システムの完全廃止確認後

---

**結論**: vj.neondjneon.com は安全に削除可能。個人情報漏洩リスクの完全排除に寄与。