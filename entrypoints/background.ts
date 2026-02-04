// Background Script - Service Worker
// サイドパネルの開閉制御、コンテキストメニュー

export default defineBackground({
  type: "module",

  main() {
    // アクションクリックでサイドパネルを開く
    browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

    // コンテキストメニュー作成
    browser.runtime.onInstalled.addListener(() => {
      browser.contextMenus.create({
        id: "askAboutSelection",
        title: "Copilot Bridgeで質問",
        contexts: ["selection"],
      });

      browser.contextMenus.create({
        id: "summarizePage",
        title: "このページを要約",
        contexts: ["page"],
      });
    });

    // コンテキストメニュークリック
    browser.contextMenus.onClicked.addListener(
      async (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
        if (!tab?.windowId) return;

        // サイドパネルを開く
        await browser.sidePanel.open({ windowId: tab.windowId });

        // 選択テキストがある場合は送信
        if (info.menuItemId === "askAboutSelection" && info.selectionText) {
          // storage経由でサイドパネルに渡す
          await browser.storage.local.set({
            pendingAction: {
              type: "question",
              text: info.selectionText,
            },
          });
        }

        if (info.menuItemId === "summarizePage") {
          await browser.storage.local.set({
            pendingAction: {
              type: "summarize",
            },
          });
        }
      },
    );

    console.log("Copilot Browser Bridge: Background script loaded");
  },
});
