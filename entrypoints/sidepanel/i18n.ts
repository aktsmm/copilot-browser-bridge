export type Language = "ja" | "en";

export const translations = {
  ja: {
    // Header
    appTitle: "🤖 Copilot Bridge",
    reconnect: "再接続",
    settings: "設定",

    // Connection
    connectionError:
      "⚠️ VS Codeとの接続に失敗しました。VS Codeが起動しているか確認してください。",
    reconnectLink: "再接続",

    // Chat
    welcome: "👋",
    welcomeMessage: "ページについて質問してください",
    welcomeExample: "例: このページを要約して",
    inputPlaceholder: "メッセージを入力...",
    send: "送信",
    stop: "停止",
    clear: "🗑️ クリア",
    executionResult: "🤖 実行結果:",
    copy: "コピー",
    copied: "コピー済み",
    screenshotPermissionWarning:
      "⚠️ スクリーンショット権限が未付与です。拡張機能アイコンを一度クリックするか、権限変更後は拡張を削除→再インストールしてください。",
    emptyServerResponse:
      "⚠️ サーバーから空の応答が返されました。もう一度お試しください。",
    emptyContinuationResponse:
      "⚠️ 続行応答が空だったため、自律実行を停止しました。",
    maxAgentLoopsReached:
      "⚠️ 最大ループ回数 ({count}) に達したため、自律実行を停止しました。",

    // Settings
    settingsTitle: "設定",
    provider: "プロバイダー",
    model: "モデル",
    refresh: "🔄 更新",
    modelNotConnected: "※ VS Code未接続のため既定モデル表示中",
    endpoint: "エンドポイント",
    modelName: "モデル名 (空欄で自動検出)",
    browserActions: "ブラウザ操作",
    browserActionsDesc: "AIがブラウザを自動操作",
    fileOperations: "ファイル操作",
    fileOperationsDesc: "AIがワークスペースにファイル作成",
    language: "言語",
  },
  en: {
    // Header
    appTitle: "🤖 Copilot Bridge",
    reconnect: "Reconnect",
    settings: "Settings",

    // Connection
    connectionError:
      "⚠️ Failed to connect to VS Code. Please check if VS Code is running.",
    reconnectLink: "Reconnect",

    // Chat
    welcome: "👋",
    welcomeMessage: "Ask questions about the page",
    welcomeExample: "Example: Summarize this page",
    inputPlaceholder: "Enter message...",
    send: "Send",
    stop: "Stop",
    clear: "🗑️ Clear",
    executionResult: "🤖 Execution Result:",
    copy: "Copy",
    copied: "Copied",
    screenshotPermissionWarning:
      "⚠️ Screenshot permission is not granted. Click the extension icon once, or reinstall the extension after changing permissions.",
    emptyServerResponse:
      "⚠️ Server returned an empty response. Please try again.",
    emptyContinuationResponse:
      "⚠️ Continuation response was empty, so autonomous execution was stopped.",
    maxAgentLoopsReached:
      "⚠️ Reached maximum loop count ({count}), so autonomous execution was stopped.",

    // Settings
    settingsTitle: "Settings",
    provider: "Provider",
    model: "Model",
    refresh: "🔄 Refresh",
    modelNotConnected: "※ Default models (VS Code not connected)",
    endpoint: "Endpoint",
    modelName: "Model name (auto-detect if empty)",
    browserActions: "Browser Actions",
    browserActionsDesc: "AI controls browser automatically",
    fileOperations: "File Operations",
    fileOperationsDesc: "AI creates files in workspace",
    language: "Language",
  },
};

export function t(key: keyof typeof translations.ja, lang: Language): string {
  const dictionary = lang === "ja" || lang === "en" ? translations[lang] : translations.en;
  return dictionary[key];
}
