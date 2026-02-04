// Content Script - ページ内容抽出用
// サイドパネルから直接 chrome.scripting.executeScript で呼び出すため、
// このファイルは将来の拡張用（自動抽出機能など）

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",

  main() {
    // メッセージリスナー（将来の拡張用）
    browser.runtime.onMessage.addListener(
      (
        message: { type: string },
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response: {
          content: string;
          interactiveElements?: string;
        }) => void,
      ) => {
        if (message.type === "extractContent") {
          const content = extractVisibleText();
          sendResponse({ content });
        }
        if (message.type === "extractContentWithElements") {
          const content = extractVisibleText();
          const interactiveElements = extractInteractiveElements();
          sendResponse({ content, interactiveElements });
        }
        return true;
      },
    );
  },
});

function extractVisibleText(): string {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const style = getComputedStyle(parent);
        if (style.display === "none" || style.visibility === "hidden") {
          return NodeFilter.FILTER_REJECT;
        }

        const tagName = parent.tagName;
        if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }

        // パスワードフィールドは除外
        if (parent instanceof HTMLInputElement && parent.type === "password") {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  const texts: string[] = [];
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent?.trim();
    if (text && text.length > 0) {
      texts.push(text);
    }
  }

  // 最大10,000文字に制限
  return texts.join(" ").slice(0, 10000);
}

function extractInteractiveElements(): string {
  const elements: string[] = [];

  // ボタン
  document.querySelectorAll("button").forEach((el, i) => {
    const text = el.textContent?.trim() || el.getAttribute("aria-label") || "";
    const id = el.id ? `#${el.id}` : "";
    const cls = el.className ? `.${el.className.split(" ")[0]}` : "";
    elements.push(
      `[Button${i}] ${text} → selector: button${id || cls || `:nth-of-type(${i + 1})`}`,
    );
  });

  // リンク
  document.querySelectorAll("a[href]").forEach((el, i) => {
    if (i > 20) return; // 最初の20個のみ
    const text = el.textContent?.trim().slice(0, 30) || "";
    const href = el.getAttribute("href")?.slice(0, 50) || "";
    elements.push(`[Link${i}] ${text} → ${href}`);
  });

  // ラジオボタン
  document
    .querySelectorAll("input[type='radio'], [role='radio']")
    .forEach((el, i) => {
      const label =
        el.getAttribute("aria-label") ||
        el.closest("label")?.textContent?.trim() ||
        (el.nextElementSibling as HTMLElement)?.textContent?.trim() ||
        "";
      const name = el.getAttribute("name") || "";
      elements.push(
        `[Radio${i}] ${label.slice(0, 40)} → selector: [role='radio']:nth-of-type(${i + 1}) or input[name='${name}']`,
      );
    });

  // チェックボックス
  document.querySelectorAll("input[type='checkbox']").forEach((el, i) => {
    const label =
      el.getAttribute("aria-label") ||
      el.closest("label")?.textContent?.trim() ||
      "";
    elements.push(`[Checkbox${i}] ${label.slice(0, 40)}`);
  });

  // テキスト入力
  document
    .querySelectorAll(
      "input[type='text'], input[type='email'], input[type='search'], textarea",
    )
    .forEach((el, i) => {
      const placeholder = el.getAttribute("placeholder") || "";
      const id = el.id ? `#${el.id}` : "";
      const name = el.getAttribute("name") || "";
      elements.push(
        `[Input${i}] ${placeholder || name} → selector: ${id || `input[name='${name}']`}`,
      );
    });

  return elements.slice(0, 50).join("\n");
}
