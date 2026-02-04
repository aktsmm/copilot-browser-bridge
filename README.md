# Copilot Browser Bridge (Chrome Extension)

🌐 ブラウザのページ内容をGitHub Copilot / ローカルLLMで解析・対話・自動操作するChrome拡張機能

## ✨ 特徴

- **ページ解析**: 現在表示中のWebページをLLMが理解し、質問に回答
- **ブラウザ自動操作**: クリック、入力、スクロールなどをLLMが自動実行
- **3つの動作モード**:
  - 📝 **テキストモード**: DOM解析ベース（高速・軽量）
  - 📸 **スクリーンショットモード**: Vision APIで視覚的理解
  - 🔄 **ハイブリッドモード**: テキスト優先、失敗時スクリーンショット
- **Playwright互換アクション**: ダブルクリック、右クリック、フォーム一括入力など

## 🚀 インストール

### 開発版（ローカルインストール）

1. このリポジトリをクローン
2. `npm install` で依存関係をインストール
3. `npm run build` でビルド
4. `chrome://extensions` を開く
5. 「デベロッパーモード」を有効化
6. 「パッケージ化されていない拡張機能を読み込む」→ `.output/chrome-mv3` フォルダを選択

### Chrome Web Store（準備中）

Coming soon...

## 📋 必要条件

- **VS Code拡張機能**: [Copilot Browser Bridge for VS Code](https://github.com/aktsmm/copilot-browser-bridge-vscode) が必要です
- **GitHub Copilot** または **ローカルLLM**（LM Studio等）

## 🎮 使い方

1. VS Code拡張機能を起動（自動起動設定可）
2. Chrome拡張機能のサイドパネルを開く
3. 任意のWebページで質問や操作指示を入力

### 操作例

```
「このページの内容を要約して」
「テストを受けるボタンをクリックして」
「フォームに名前を入力して送信して」
```

## ⚙️ 設定

サイドパネルの設定ボタンから以下を設定可能:

- **プロバイダー**: Copilot / LM Studio
- **モデル選択**: claude-sonnet, gpt-4o など
- **動作モード**: テキスト / スクリーンショット / ハイブリッド
- **最大ループ数**: 自動操作の最大繰り返し回数

## 🔧 開発

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# ZIP作成（Chrome Web Store用）
npm run zip
```

## 📄 ライセンス

MIT License

## 🔗 関連プロジェクト

- [Copilot Browser Bridge for VS Code](https://github.com/aktsmm/copilot-browser-bridge-vscode)
