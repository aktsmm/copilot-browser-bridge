import React, { useState, useEffect, useRef } from "react";
import { Settings } from "./components/Settings";
import { Chat } from "./components/Chat";
import type {
  LLMSettings,
  ChatMessage,
  ModelInfo,
  OperationMode,
} from "./types";
import {
  executeBrowserAction,
  parseActionsFromResponse,
  parseFileActionsFromResponse,
  executeFileAction,
  captureScreenshot,
} from "./browser-actions";
import type { Language } from "./i18n";
import { t } from "./i18n";

const DEFAULT_SETTINGS: LLMSettings = {
  provider: "copilot",
  copilot: {
    model: "gpt-4o",
  },
  lmStudio: {
    endpoint: "http://localhost:1234",
    model: "",
  },
};

export default function App() {
  const [settings, setSettings] = useState<LLMSettings>(DEFAULT_SETTINGS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [browserActionsEnabled, setBrowserActionsEnabled] = useState(true);
  const [fileOperationsEnabled, setFileOperationsEnabled] = useState(true);
  const [language, setLanguage] = useState<Language>("ja");
  const [maxAgentLoops, setMaxAgentLoops] = useState(500);
  const [operationMode, setOperationMode] = useState<OperationMode>("text");
  const abortControllerRef = useRef<AbortController | null>(null);
  const screenshotPermissionWarnedRef = useRef(false);

  // Load settings from storage
  useEffect(() => {
    chrome.storage.local.get(
      [
        "llmSettings",
        "browserActionsEnabled",
        "fileOperationsEnabled",
        "language",
        "maxAgentLoops",
        "operationMode",
      ],
      (result: {
        llmSettings?: LLMSettings;
        browserActionsEnabled?: boolean;
        fileOperationsEnabled?: boolean;
        language?: Language;
        maxAgentLoops?: number;
        operationMode?: OperationMode;
      }) => {
        if (result.llmSettings) {
          setSettings(result.llmSettings);
        }
        if (result.browserActionsEnabled !== undefined) {
          setBrowserActionsEnabled(result.browserActionsEnabled);
        }
        if (result.fileOperationsEnabled !== undefined) {
          setFileOperationsEnabled(result.fileOperationsEnabled);
        }
        if (result.language) {
          setLanguage(result.language);
        }
        if (result.maxAgentLoops !== undefined) {
          setMaxAgentLoops(result.maxAgentLoops);
        }
        if (result.operationMode) {
          setOperationMode(result.operationMode);
        }
      },
    );
    checkConnection();
  }, []);

  // Save settings to storage
  useEffect(() => {
    chrome.storage.local.set({
      llmSettings: settings,
      browserActionsEnabled,
      fileOperationsEnabled,
      language,
      maxAgentLoops,
      operationMode,
    });
  }, [
    settings,
    browserActionsEnabled,
    fileOperationsEnabled,
    language,
    maxAgentLoops,
    operationMode,
  ]);

  const checkConnection = async () => {
    console.log("checkConnection called");
    try {
      const response = await fetch("http://localhost:3210/health");
      const connected = response.ok;
      console.log("Connection status:", connected);
      setIsConnected(connected);
      if (connected) {
        fetchAvailableModels();
      }
    } catch (error) {
      console.log("Connection failed:", error);
      setIsConnected(false);
    }
  };

  const fetchAvailableModels = async () => {
    try {
      const response = await fetch("http://localhost:3210/models");
      if (response.ok) {
        const models = await response.json();
        setAvailableModels(models);
      }
    } catch {
      console.error("Failed to fetch models");
    }
  };

  const maybeWarnScreenshotPermission = (error: unknown) => {
    if (screenshotPermissionWarnedRef.current) return;
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("SCREENSHOT_PERMISSION") ||
      message.includes("activeTab")
    ) {
      screenshotPermissionWarnedRef.current = true;
      setMessages((prev: ChatMessage[]) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ スクリーンショット権限が未付与です。拡張機能アイコンを一度クリックするか、権限変更後は拡張を削除→再インストールしてください。",
        },
      ]);
    }
  };

  const extractPageContent = async (): Promise<string> => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab.id || !tab.url) return "";

      // chrome://, edge://, about: などのシステムページはスキップ
      if (
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("edge://") ||
        tab.url.startsWith("about:") ||
        tab.url.startsWith("chrome-extension://")
      ) {
        return `[システムページ: ${tab.url}] - このページの内容は取得できません`;
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Extract visible text content
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
                if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) {
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
          const pageText = texts.join(" ").slice(0, 2000);

          // Playwright-style snapshot: structured element tree
          const elements: string[] = [];
          let refCounter = 0;
          const refMap = new Map<Element, string>();
          const maxRefs = 120; // prioritize current viewport but allow more overall

          // Helper: check if element is visible
          const isVisible = (el: Element): boolean => {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            const style = getComputedStyle(el);
            if (
              style.display === "none" ||
              style.visibility === "hidden" ||
              style.opacity === "0"
            )
              return false;
            return true;
          };

          // Helper: get element role and name
          const getElementInfo = (
            el: Element,
          ): { role: string; name: string; inputLike?: HTMLInputElement } => {
            const tag = el.tagName.toLowerCase();
            const explicitRole = el.getAttribute("role");
            const labelEl = tag === "label" ? (el as HTMLLabelElement) : null;
            const associatedInput =
              labelEl?.control ||
              (labelEl?.querySelector(
                "input, select, textarea",
              ) as HTMLInputElement | null);
            const inputEl = (associatedInput || el) as HTMLInputElement;
            const type = inputEl?.type || "";
            const ariaLabel = el.getAttribute("aria-label") || "";
            const text =
              (el as HTMLElement).textContent?.trim().slice(0, 40) || "";
            const placeholder = el.getAttribute("placeholder") || "";
            const value = inputEl?.value?.slice(0, 20) || "";
            const title = el.getAttribute("title") || "";

            // Determine role
            let role = explicitRole || "";
            if (!role) {
              if (tag === "button" || type === "button" || type === "submit")
                role = "button";
              else if (tag === "a") role = "link";
              else if (type === "radio") role = "radio";
              else if (type === "checkbox") role = "checkbox";
              else if (tag === "input") role = "textbox";
              else if (tag === "select") role = "combobox";
              else if (tag === "textarea") role = "textbox";
              else if (tag === "label" && type === "radio") role = "radio";
              else if (tag === "label" && type === "checkbox")
                role = "checkbox";
              else if (tag === "label" && type) role = type;
              else if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag))
                role = "heading";
              else role = tag;
            }

            // Determine name
            let name = ariaLabel || title || "";
            if (!name) {
              if (role === "textbox") name = placeholder || value;
              else if (role === "radio" || role === "checkbox")
                name = ariaLabel || text || value;
              else name = text.slice(0, 30);
            }

            return { role, name, inputLike: inputEl || undefined };
          };

          // Collect interactive elements in document order
          const interactiveSelectors = [
            "button",
            "a[href]",
            "input",
            "select",
            "textarea",
            "label",
            '[role="button"]',
            '[role="radio"]',
            '[role="checkbox"]',
            '[role="link"]',
            '[role="tab"]',
            '[role="menuitem"]',
            '[role="menuitemcheckbox"]',
            '[role="menuitemradio"]',
            '[role="option"]',
            '[aria-checked="true"]',
            '[aria-checked="false"]',
            '[aria-pressed="true"]',
            '[aria-pressed="false"]',
            "[onclick]",
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]',
          ];

          // Group elements by their parent group/fieldset for context
          const groups = new Map<
            string,
            { label: string; elements: string[] }
          >();
          let currentGroup = "main";

          const candidates: Array<{ el: Element; rect: DOMRect }> = [];
          const seen = new Set<Element>();

          document
            .querySelectorAll(interactiveSelectors.join(", "))
            .forEach((el) => {
              if (!isVisible(el)) return;
              if (seen.has(el)) return;
              seen.add(el);
              const rect = el.getBoundingClientRect();
              candidates.push({ el, rect });
            });

          // Add pointer-cursor elements (often clickable divs/spans)
          document.querySelectorAll("*").forEach((el) => {
            if (!isVisible(el)) return;
            const style = getComputedStyle(el);
            if (style.cursor === "pointer") {
              if (seen.has(el)) return;
              seen.add(el);
              const rect = el.getBoundingClientRect();
              candidates.push({ el, rect });
            }
          });

          // Prioritize elements near the current viewport so refs map to what user sees
          const viewportTop = -200;
          const viewportBottom = window.innerHeight + 400;

          const usedRefIds = new Set<string>();

          candidates
            .sort((a, b) => a.rect.top - b.rect.top)
            .sort((a, b) => {
              const aIn =
                a.rect.top <= viewportBottom && a.rect.bottom >= viewportTop;
              const bIn =
                b.rect.top <= viewportBottom && b.rect.bottom >= viewportTop;
              if (aIn === bIn) return 0;
              return aIn ? -1 : 1;
            })
            .forEach(({ el }) => {
              const existingRef = el.getAttribute("data-copilot-ref");
              if (!existingRef && refCounter >= maxRefs) return;

              let refId = existingRef || "";
              if (refId) {
                refId = refId.toLowerCase();
                usedRefIds.add(refId);
              } else {
                while (usedRefIds.has(`e${refCounter}`)) {
                  refCounter++;
                }
                refId = `e${refCounter++}`;
                el.setAttribute("data-copilot-ref", refId);
                usedRefIds.add(refId);
              }
              refMap.set(el, refId);

              const { role, name, inputLike } = getElementInfo(el);

              // Check if in a fieldset/group
              const fieldset = el.closest(
                'fieldset, [role="group"], [role="radiogroup"]',
              );
              if (fieldset) {
                const legend =
                  fieldset.querySelector("legend")?.textContent?.trim() ||
                  fieldset.getAttribute("aria-label") ||
                  (fieldset.getAttribute("aria-labelledby") &&
                    document
                      .getElementById(fieldset.getAttribute("aria-labelledby")!)
                      ?.textContent?.trim()) ||
                  "";
                if (legend && legend !== currentGroup) {
                  currentGroup = legend.slice(0, 50);
                  if (!groups.has(currentGroup)) {
                    groups.set(currentGroup, {
                      label: currentGroup,
                      elements: [],
                    });
                  }
                }
              }

              // Build element description
              const checked = inputLike?.checked ? " [checked]" : "";
              const disabled = inputLike?.disabled ? " [disabled]" : "";
              const desc = `[${refId}] ${role}${checked}${disabled} "${name}"`;

              if (groups.has(currentGroup)) {
                groups.get(currentGroup)!.elements.push(desc);
              } else {
                elements.push(desc);
              }
            });

          // Build output
          let output = `
### Page Snapshot (use ref:X to click)
**Usage:** [ACTION: click, ref:e5] to click element e5

`;

          // Add ungrouped elements
          if (elements.length > 0) {
            output += `### Main Elements\n`;
            elements.forEach((e) => (output += e + "\n"));
          }

          // Add grouped elements
          groups.forEach((group, label) => {
            if (group.elements.length > 0) {
              output += `\n### ${label}\n`;
              group.elements.forEach((e) => (output += "  " + e + "\n"));
            }
          });

          return pageText + "\n" + output;
        },
      });

      return results[0]?.result || "";
    } catch (error) {
      console.warn("Failed to extract page content:", error);
      return "";
    }
  };

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    const newUserMessage: ChatMessage = {
      role: "user",
      content: userMessage,
    };

    setMessages((prev: ChatMessage[]) => [...prev, newUserMessage]);
    setIsLoading(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Get page content based on operation mode
      let pageContent = "";
      let screenshotBase64 = "";

      if (operationMode === "screenshot") {
        // Screenshot mode: capture screenshot + DOM elements for ref-based clicking
        try {
          screenshotBase64 = await captureScreenshot();
          // Also get DOM elements for ref-based clicking
          const domContent = await extractPageContent();
          pageContent = `[Screenshot attached - use image for visual understanding]\n\n${domContent}`;
        } catch (e) {
          console.error("Screenshot failed:", e);
          maybeWarnScreenshotPermission(e);
          pageContent = await extractPageContent();
        }
      } else {
        // Text or Hybrid mode: extract text
        pageContent = await extractPageContent();
      }

      // Send to VS Code extension
      const response = await fetch("http://localhost:3210/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings,
          messages: [...messages, newUserMessage],
          pageContent,
          screenshot: screenshotBase64 || undefined,
          operationMode,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      setMessages((prev: ChatMessage[]) => [
        ...prev,
        { role: "assistant", content: "" },
      ]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantMessage += chunk;

        setMessages((prev: ChatMessage[]) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: "assistant",
            content: assistantMessage,
          };
          return newMessages;
        });
      }

      // Execute browser actions if enabled (with autonomous loop)
      console.log("[Agent] browserActionsEnabled:", browserActionsEnabled);
      console.log("[Agent] Provider:", settings.provider);
      console.log("[Agent] Initial response length:", assistantMessage.length);

      if (browserActionsEnabled) {
        let currentResponse = assistantMessage;
        let loopCount = 0;
        let conversationHistory = [
          ...messages,
          newUserMessage,
          { role: "assistant" as const, content: assistantMessage },
        ];

        console.log(
          "[Agent] Starting autonomous loop, maxLoops:",
          maxAgentLoops,
        );
        let consecutiveErrors = 0;
        let useScreenshotFallback = operationMode === "screenshot";

        while (
          loopCount < maxAgentLoops &&
          !abortControllerRef.current?.signal.aborted
        ) {
          const actions = parseActionsFromResponse(currentResponse);
          console.log(
            `[Agent Loop] Loop ${loopCount}, Actions found: ${actions.length}`,
            actions,
          );
          console.log(
            `[Agent Loop] Current response:`,
            currentResponse.slice(0, 200),
          );

          // Check if response indicates completion (only when NO actions found)
          if (actions.length === 0) {
            // No actions to execute - check if truly done or just needs prompting
            const isCompletion = (() => {
              const lower = currentResponse.toLowerCase();
              // Very strict: only final completion phrases, not mid-task reports
              const jpFinal =
                /(以上で完了|すべて完了|タスク完了|作業が完了|全て完了|完了です。$|完了しました。$)/;
              const enFinal =
                /\b(all done|task completed|finished all|completed successfully)\b/;
              return jpFinal.test(currentResponse) || enFinal.test(lower);
            })();

            if (isCompletion) {
              console.log("[Agent Loop] Completion detected, stopping loop");
            } else {
              console.log("[Agent Loop] No actions found, stopping loop");
            }
            break;
          }

          // Actions found - continue regardless of any "完了" in text

          loopCount++;
          const actionResults: string[] = [];
          let errorCount = 0;

          for (const action of actions) {
            try {
              // All modes now use improved local DOM operations
              // (Playwright-style: auto-wait, multiple click methods, etc.)
              const result = await executeBrowserAction(action);
              console.log(`[Action] ${action.type} -> ${result}`);

              actionResults.push(`• ${result}`);
              if (
                result.includes("not found") ||
                result.includes("Error") ||
                result.includes("error")
              ) {
                errorCount++;
              }
            } catch (error) {
              actionResults.push(
                `• Error: ${error instanceof Error ? error.message : String(error)}`,
              );
              errorCount++;
            }

            // Short delay between actions (80-200ms)
            await new Promise((resolve) =>
              setTimeout(resolve, 80 + Math.random() * 120),
            );
          }

          // Track consecutive errors for hybrid mode fallback
          if (errorCount > 0) {
            consecutiveErrors++;
            // In hybrid mode, switch to screenshot after 3 consecutive errors
            if (
              operationMode === "hybrid" &&
              consecutiveErrors >= 3 &&
              !useScreenshotFallback
            ) {
              console.log(
                "[Agent] Hybrid mode: switching to screenshot fallback after 3 consecutive errors",
              );
              useScreenshotFallback = true;
              actionResults.push(
                "📸 Switching to screenshot mode for better accuracy",
              );
            }
          } else {
            consecutiveErrors = 0;
          }

          const resultMessage = `🤖 [Loop ${loopCount}/${maxAgentLoops}] ${t("executionResult", language)}\n${actionResults.join("\n")}`;
          setMessages((prev: ChatMessage[]) => [
            ...prev,
            { role: "assistant", content: resultMessage },
          ]);

          // Only continue autonomous loop in agent mode
          // For chat mode, stop after first execution (user can click "つづけて" to continue)
          if (settings.provider !== "copilot-agent") {
            console.log(
              "[Agent] Chat mode - stopping after first action. Use Agent mode for autonomous loop.",
            );
            break;
          }

          console.log("[Agent] Agent mode - continuing autonomous loop...");

          // Short wait between loops (0.5-1.0 seconds)
          const waitTime = 500 + Math.random() * 500;
          console.log(
            `[Agent] Waiting ${Math.round(waitTime / 1000)}s before next loop...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));

          // Get updated page content (with screenshot if in fallback mode)
          let updatedPageContent = "";
          let updatedScreenshot = "";

          if (useScreenshotFallback) {
            try {
              updatedScreenshot = await captureScreenshot();
              // Also get DOM elements for ref-based clicking
              const domContent = await extractPageContent();
              updatedPageContent = `[Screenshot attached]\n\n${domContent}`;
              console.log("[Agent] Screenshot captured for fallback mode");
            } catch (e) {
              console.error("Screenshot fallback failed:", e);
              maybeWarnScreenshotPermission(e);
              updatedPageContent = await extractPageContent();
            }
          } else {
            updatedPageContent = await extractPageContent();
          }

          // Add results to conversation
          conversationHistory = [
            ...conversationHistory,
            {
              role: "user" as const,
              content: `アクション実行結果 (Loop ${loopCount}):\n${actionResults.join("\n")}\n\n続けてください。エラーがあれば別の方法を試してください。完了したら「完了」と報告してください。`,
            },
          ];

          // Request next action from LLM
          try {
            const continueResponse = await fetch("http://localhost:3210/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                settings,
                messages: conversationHistory,
                pageContent: updatedPageContent,
                screenshot: updatedScreenshot || undefined,
                operationMode: useScreenshotFallback
                  ? "screenshot"
                  : operationMode,
              }),
              signal: abortControllerRef.current?.signal,
            });

            if (!continueResponse.ok) {
              console.error("Continue response failed");
              break;
            }

            const continueReader = continueResponse.body?.getReader();
            currentResponse = "";

            setMessages((prev: ChatMessage[]) => [
              ...prev,
              { role: "assistant", content: "" },
            ]);

            while (continueReader) {
              const { done, value } = await continueReader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              currentResponse += chunk;

              setMessages((prev: ChatMessage[]) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: currentResponse,
                };
                return newMessages;
              });
            }

            // Add LLM response to conversation history
            conversationHistory = [
              ...conversationHistory,
              { role: "assistant" as const, content: currentResponse },
            ];
          } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
              console.log("Autonomous loop cancelled by user");
              break;
            }
            console.error("Error in autonomous loop:", error);
            // Continue loop even on error
          }
        }

        if (loopCount >= maxAgentLoops) {
          setMessages((prev: ChatMessage[]) => [
            ...prev,
            {
              role: "assistant",
              content: `⚠️ 最大ループ回数 (${maxAgentLoops}) に達しました。`,
            },
          ]);
        }
      }

      // Execute file actions if enabled
      if (fileOperationsEnabled) {
        const fileActions = parseFileActionsFromResponse(assistantMessage);
        if (fileActions.length > 0) {
          const fileResults: string[] = [];
          for (const action of fileActions) {
            const result = await executeFileAction(action);
            fileResults.push(`• ${result}`);
          }
          if (fileResults.length > 0) {
            setMessages((prev: ChatMessage[]) => [
              ...prev,
              {
                role: "assistant",
                content: `📁 ${language === "ja" ? "ファイル操作結果" : "File operation results"}:\n${fileResults.join("\n")}`,
              },
            ]);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // User cancelled - don't show error
        console.log("Request cancelled by user");
      } else {
        console.error("Error sending message:", error);
        setMessages((prev: ChatMessage[]) => [
          ...prev,
          {
            role: "assistant",
            content: t("connectionError", language),
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">🤖 Copilot Bridge</span>
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={checkConnection}
            className="p-2 hover:bg-gray-100 rounded"
            title="再接続"
          >
            🔄
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 rounded"
            title={t("settings", language)}
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Connection Error Banner */}
      {!isConnected && (
        <div className="px-4 py-2 bg-red-100 text-red-700 text-sm">
          {t("connectionError", language)}
          <button
            onClick={checkConnection}
            className="ml-2 underline hover:no-underline"
          >
            {t("reconnectLink", language)}
          </button>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <Settings
          settings={settings}
          onSettingsChange={setSettings}
          onClose={() => setShowSettings(false)}
          availableModels={availableModels}
          onRefreshModels={fetchAvailableModels}
          browserActionsEnabled={browserActionsEnabled}
          onBrowserActionsChange={setBrowserActionsEnabled}
          fileOperationsEnabled={fileOperationsEnabled}
          onFileOperationsChange={setFileOperationsEnabled}
          language={language}
          onLanguageChange={setLanguage}
          maxAgentLoops={maxAgentLoops}
          onMaxAgentLoopsChange={setMaxAgentLoops}
          operationMode={operationMode}
          onOperationModeChange={setOperationMode}
        />
      )}

      {/* Chat Area */}
      <Chat
        messages={messages}
        isLoading={isLoading}
        onSendMessage={sendMessage}
        onClearMessages={() => {
          console.log("Clear messages called");
          setMessages([]);
        }}
        onStopGeneration={stopGeneration}
        language={language}
      />
    </div>
  );
}
