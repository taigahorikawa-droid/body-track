# Body Track

体重・カロリー管理アプリ（Next.js + TypeScript + Tailwind CSS + Recharts）

## 機能

- 初期設定（現在の体重・体脂肪率、目標値、ジム頻度など）
- 日次記録（カロリー、ジム時間、体重、体脂肪率）
- 進捗チャート（スコアベースの可視化）
- 認証機能（メールアドレス・パスワード）
- データ保存（localStorage または Supabase）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```env
# Supabaseを使用する場合
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_USE_SUPABASE=true

# Supabaseを使用しない場合（localStorageを使用）
NEXT_PUBLIC_USE_SUPABASE=false
```

### 3. Supabaseのセットアップ（オプション）

Supabaseを使用する場合：

1. [Supabase](https://app.supabase.com) でプロジェクトを作成
2. SQL Editorで `supabase/schema.sql` を実行
3. `.env.local` にプロジェクトURLとAnon Keyを設定
4. `NEXT_PUBLIC_USE_SUPABASE=true` に設定

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 使用方法

### 初回使用時

1. アプリを開くとログイン画面が表示されます
2. 「新規登録」でメールアドレスとパスワードを設定
3. ログイン後、「初期設定」で現在の体重・体脂肪率、目標値を入力
4. 「日次記録」で毎日のカロリーや体重を記録
5. 「チャート」で進捗を確認

### データ保存について

- **localStorage**: ブラウザのローカルストレージに保存（デフォルト）
- **Supabase**: クラウドデータベースに保存（環境変数で有効化）

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **チャート**: Recharts
- **認証・データベース**: Supabase（オプション）
- **状態管理**: React Hooks

## プロジェクト構造

```
body-track/
├── app/              # Next.js App Router
│   ├── page.tsx      # メインページ
│   ├── layout.tsx    # ルートレイアウト
│   └── globals.css   # グローバルスタイル
├── components/       # Reactコンポーネント
│   ├── AuthForm.tsx           # 認証フォーム
│   ├── InitialSetupForm.tsx   # 初期設定フォーム
│   ├── DailyEntryForm.tsx     # 日次記録フォーム
│   └── ChartSection.tsx       # チャート表示
├── lib/              # ユーティリティ
│   ├── supabase/     # Supabaseクライアント
│   ├── data/         # データストレージ層
│   ├── useAuth.ts    # 認証フック
│   ├── useDataStorage.ts  # データストレージフック
│   └── simulation.ts # カロリー計算・シミュレーション
├── types/            # TypeScript型定義
└── supabase/         # Supabaseスキーマ
    └── schema.sql    # データベーススキーマ
```

## ライセンス

MIT

