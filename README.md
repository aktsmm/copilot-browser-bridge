# Copilot Browser Bridge (Chrome Extension)

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-pending-orange?logo=google-chrome)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/github/stars/aktsmm/copilot-browser-bridge?style=social)](https://github.com/aktsmm/copilot-browser-bridge)

🌐 ブラウザのページ内容をLLM（GitHub Copilot / ローカルLLM）で解析・対話・自動操作するChrome拡張機能

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

MIT License © [yamapan](https://github.com/aktsmm)

## � プライバシーポリシー

この拡張機能は、ユーザーのプライバシーを尊重します。

### データ収集について
- **個人情報の収集**: 行いません
- **データの外部送信**: ページ内容はローカルのVS Code拡張機能にのみ送信されます（localhost通信）
- **データの保存**: ユーザー設定のみローカルストレージに保存します
- **第三者への提供**: 一切行いません

### 権限の使用目的
| 権限 | 目的 |
|------|------|
| activeTab | 現在のページ内容を取得するため |
| tabs | タブ情報（URL、タイトル）を取得するため |
| scripting | ページのDOM要素を解析するため |
| storage | ユーザー設定を保存するため |
| sidePanel | チャットUIを表示するため |
| tabCapture | スクリーンショットを取得するため |
| host_permissions | 任意のWebページで動作するため |

### LLMへのデータ送信
- **GitHub Copilot使用時**: ページ内容がGitHub/OpenAIのサーバーに送信されます
- **ローカルLLM使用時**: すべてのデータはローカルで処理され、外部に送信されません

## �🔗 関連プロジェクト

- [Copilot Browser Bridge for VS Code](https://github.com/aktsmm/copilot-browser-bridge-vscode) - 必須のVS Code拡張機能

## 👤 Author

yamapan (https://github.com/aktsmm)
