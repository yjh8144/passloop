# PassLoop

[中文](../README.md) | [English](README.en.md) | [한국어](README.ko.md) | [Français](README.fr.md)

ローカル軽量クイズプラットフォーム。問題のインポート/エクスポート、複数の練習モード、LLM 支援解析、誤答管理、解答統計に対応。すべてのデータはブラウザの localStorage に保存され、バックエンド不要ですぐに使えます。

## スクリーンショット

![問題管理](screenshot-home.png)

![練習モード](screenshot-practice.png)

## 機能

### 練習

- **練習モード**：一問ずつ回答し、提出後に正誤と解説を表示
- **暗記モード**：正解と解説を直接表示し、記憶を補助
- **一問 / 一括**：一問ずつ閲覧、または全問一括提出
- **解答表示**：即時表示または全問回答後に表示
- **回答後自動次へ**：オプションの高速練習ペース
- **検索とフィルター**：タイトル、問題文、タイプで素早く検索
- **ナビゲーショングリッド**：色分けで回答状況を可視化
- **完了サマリー**：全問回答後に正答率と時間を集計

### 問題タイプ

- 単一選択、複数選択、正誤判定、穴埋め、記述式、複合問題（サブ問題付き）

### 問題管理

- 手動で問題の追加・編集・削除
- JSON インポート/エクスポート（ローカルファイルまたは URL からインポート、ローディングアニメーション付き）
- リストの作成・編集・削除
- 全量バックアップと復元（マージまたは上書きモード）
- フローティング編集パネル、小画面デバイスでも便利に管理

### LLM 支援

- OpenAI / Anthropic / Gemini または互換 API に接続
- CORS プロキシ対応、クロスオリジン問題を解決
- 未整理テキストを貼り付けまたはアップロードし、ワンクリックで標準クイズ JSON に変換
- 解答と解説の自動補充（ストリーミングプレビュー対応）
- 接続テストとモデルリスト取得
- 自助モード：外部 AI 生成の JSON を手動で貼り付けて検証インポート

### 誤答管理

- 誤答の自動記録
- 練習完了後に誤答リストを作成して集中復習
- 誤答を独立リストとしてエクスポート
- セッションタイマーとリアルタイム統計

### 解答統計

- 正答率、平均時間
- 提出進捗の追跡
- 問題別統計
- 誤答数統計

### カスタマイズ & レスポンシブ

- 7 テーマ：Mint、Paper、Lavender、Ocean、Rose、Night、Nord
- 5 言語：中国語、English、日本語、한국어、Français
- レスポンシブレイアウト（デスクトップ & モバイル対応）
- モバイル下部ナビバーとフローティングパネル
- サイドバー折りたたみ可能

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | React 18 |
| 言語 | TypeScript |
| ビルド | Vite 7 |
| アイコン | Lucide React |
| ストレージ | localStorage |
| デプロイ | 純静的ファイル、任意の Web サーバー |

## クイックスタート

### 直接使用（インストール不要）

[Releases](https://github.com/yjh8144/passloop/releases) から `passloop.html` をダウンロードし、ブラウザで開くだけ。すべての機能がこの 1 ファイルに統合されています。

### ローカル開発

要件：Node.js >= 18、npm >= 9

```bash
# プロジェクトをクローン
git clone https://github.com/yjh8144/passloop.git
cd passloop

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

開発サーバーはデフォルトで `http://localhost:5173` で起動し、LAN アクセスに対応。

### Lint & フォーマット

```bash
npm run lint      # ESLint チェック
npm run format    # Prettier フォーマット
```

### プロダクションビルド

```bash
npm run build          # 通常ビルド、dist/ に出力
npm run build:single   # 単一ファイルビルド、dist-single/index.html に出力
```

出力先は `dist/`。単一ファイル版は `dist-single/index.html` に出力され、ブラウザで直接開けます。

### プロダクションプレビュー

```bash
npm run preview
```

## デプロイ

PassLoop のビルド成果物は純静的ファイル（HTML + CSS + JS）で、任意の静的ホスティング（Vercel、Netlify、GitHub Pages、Cloudflare Pages 等）にデプロイ可能。Nginx や Docker でのセルフホストも対応。

ビルドコマンド：`npm run build`、出力ディレクトリ：`dist`。

## CORS プロキシ

LLM API にはクロスオリジン制限があります。`proxy/` ディレクトリに 2 つのプロキシ方式を用意：

- **Cloudflare Workers** — サーバーレス、無料枠あり
- **Node.js** — 自前 VPS デプロイ、Docker 対応

詳細は [proxy/README.md](../proxy/README.md) を参照。

## データ

すべてのユーザーデータはブラウザの localStorage に保存：

| Key | 内容 |
|-----|------|
| `passloop.app.v1` | 問題、リスト、解答記録、設定 |
| `passloop.llm-config.v1` | LLM API 設定 |
| `passloop.debug` | デバッグモード切替 |

ブラウザデータを削除するとすべての問題と記録が失われます。定期的にバックアップをエクスポートしてください。

## ライセンス

MIT
