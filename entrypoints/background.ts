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

    // メッセージハンドラ（ダウンロード等）
    browser.runtime.onMessage.addListener(
      (
        message: {
          type: string;
          filename?: string;
          content?: string;
          mimeType?: string;
          downloadId?: number;
        },
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response: unknown) => void,
      ) => {
        if (message.type === "download-file") {
          const { filename, content, mimeType } = message;
          const dataUrl = `data:${mimeType || "text/plain;charset=utf-8"};base64,${btoa(unescape(encodeURIComponent(content || "")))}`;
          browser.downloads.download(
            {
              url: dataUrl,
              filename: filename || "download.txt",
              saveAs: false,
            },
            (downloadId?: number) => {
              if (browser.runtime.lastError) {
                sendResponse({
                  success: false,
                  error: browser.runtime.lastError.message,
                });
              } else {
                sendResponse({ success: true, downloadId });
              }
            },
          );
          return true; // async response
        }

        if (message.type === "show-download") {
          try {
            if (typeof message.downloadId !== "number") {
              sendResponse({ success: false, error: "downloadId is required" });
              return;
            }
            browser.downloads.show(message.downloadId);
            sendResponse({ success: true });
          } catch (e) {
            sendResponse({
              success: false,
              error: e instanceof Error ? e.message : String(e),
            });
          }
          return;
        }
      },
    );

    console.log("Copilot Browser Bridge: Background script loaded");
  },
});
