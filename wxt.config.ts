import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Copilot Browser Bridge",
    description: "ブラウザのページ内容をCopilot/ローカルLLMで解析・対話",
    version: "0.1.0",
    permissions: [
      "activeTab",
      "tabCapture",
      "tabs",
      "scripting",
      "storage",
      "sidePanel",
      "contextMenus",
    ],
    host_permissions: ["<all_urls>"],
    side_panel: {
      default_path: "sidepanel.html",
    },
    action: {
      default_title: "Copilot Browser Bridge",
    },
  },
});
