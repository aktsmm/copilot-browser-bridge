import React, { useState, useEffect, useRef } from "react";
import { Settings } from "./components/Settings";
import { Chat } from "./components/Chat";
import type {
  LLMSettings,
  ChatMessage,
  ModelInfo,
  OperationMode,
  BrowserAction,
} from "./types";
import {
  executeBrowserAction,
  parseActionsFromResponse,
  parseFileActionsFromResponse,
  executeFileAction,
  captureScreenshot,
  setEvaluateActionEnabled,
} from "./browser-actions";
import type { Language } from "./i18n";
import { t } from "./i18n";
import { BRIDGE_CLIENT_HEADERS } from "./constants";
import { DEFAULT_SERVER_PORT, normalizeServerPort } from "./server-port";

const DEFAULT_SETTINGS: LLMSettings = {
  provider: "copilot-agent",
  copilot: {
    model: "gpt-4o",
  },
  lmStudio: {
    endpoint: "http://localhost:1234",
    model: "",
  },
};

const DEFAULT_AGENT_LOOPS = 500;
const MIN_AGENT_LOOPS = 1;
const MAX_AGENT_LOOPS = 1000;

function clampAgentLoops(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_AGENT_LOOPS;
  }
  return Math.min(
    MAX_AGENT_LOOPS,
    Math.max(MIN_AGENT_LOOPS, Math.round(value)),
  );
}

function isLanguage(value: unknown): value is Language {
  return value === "ja" || value === "en";
}

function isOperationMode(value: unknown): value is OperationMode {
  return value === "text" || value === "hybrid" || value === "screenshot";
}

function isValidLlmSettings(value: unknown): value is LLMSettings {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<LLMSettings>;
  if (
    candidate.provider !== "copilot" &&
    candidate.provider !== "copilot-agent" &&
    candidate.provider !== "lm-studio"
  ) {
    return false;
  }

  if (
    !candidate.copilot ||
    typeof candidate.copilot.model !== "string" ||
    !candidate.lmStudio ||
    typeof candidate.lmStudio.endpoint !== "string" ||
    typeof candidate.lmStudio.model !== "string"
  ) {
    return false;
  }

  return true;
}

type PendingAction =
  | {
      type: "question";
      text: string;
    }
  | {
      type: "summarize";
    };

function toPendingPrompt(action: unknown, lang: Language): string | null {
  if (!action || typeof action !== "object") {
    return null;
  }

  const candidate = action as Partial<PendingAction>;
  if (candidate.type === "question" && typeof candidate.text === "string") {
    const text = candidate.text.trim();
    return text.length > 0 ? text : null;
  }

  if (candidate.type === "summarize") {
    return lang === "ja" ? "このページを要約して" : "Summarize this page";
  }

  return null;
}

export default function App() {
  const [settings, setSettings] = useState<LLMSettings>(DEFAULT_SETTINGS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [browserActionsEnabled, setBrowserActionsEnabled] = useState(false);
  const [fileOperationsEnabled, setFileOperationsEnabled] = useState(true);
  const [language, setLanguage] = useState<Language>("ja");
  const [maxAgentLoops, setMaxAgentLoops] = useState(DEFAULT_AGENT_LOOPS);
  const [operationMode, setOperationMode] = useState<OperationMode>("hybrid");
  const [serverPort, setServerPort] = useState(DEFAULT_SERVER_PORT);
  const [allowEvaluateAction, setAllowEvaluateAction] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inFlightRequestRef = useRef(false);
  const screenshotPermissionWarnedRef = useRef(false);
  const settingsLoadedRef = useRef(false);
  const pendingPromptDispatchRef = useRef<string | null>(null);

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
        "serverPort",
        "allowEvaluateAction",
        "pendingAction",
      ],
      (result: {
        llmSettings?: LLMSettings;
        browserActionsEnabled?: boolean;
        fileOperationsEnabled?: boolean;
        language?: Language;
        maxAgentLoops?: number;
        operationMode?: OperationMode;
        serverPort?: number;
        allowEvaluateAction?: boolean;
        pendingAction?: PendingAction;
      }) => {
        let effectiveServerPort = DEFAULT_SERVER_PORT;
        let effectiveAllowEvaluateAction = false;

        if (isValidLlmSettings(result.llmSettings)) {
          setSettings(result.llmSettings);
        }
        if (result.browserActionsEnabled !== undefined) {
          setBrowserActionsEnabled(result.browserActionsEnabled);
        }
        if (result.fileOperationsEnabled !== undefined) {
          setFileOperationsEnabled(result.fileOperationsEnabled);
        }
        if (isLanguage(result.language)) {
          setLanguage(result.language);
        }
        if (result.maxAgentLoops !== undefined) {
          setMaxAgentLoops(clampAgentLoops(result.maxAgentLoops));
        }
        if (isOperationMode(result.operationMode)) {
          setOperationMode(result.operationMode);
        }
        if (result.serverPort !== undefined) {
          effectiveServerPort = normalizeServerPort(result.serverPort);
          setServerPort(effectiveServerPort);
        }
        if (typeof result.allowEvaluateAction === "boolean") {
          effectiveAllowEvaluateAction = result.allowEvaluateAction;
          setAllowEvaluateAction(result.allowEvaluateAction);
        }

        setEvaluateActionEnabled(effectiveAllowEvaluateAction);

        const effectiveLanguage = isLanguage(result.language)
          ? result.language
          : language;
        const nextPendingPrompt = toPendingPrompt(
          result.pendingAction,
          effectiveLanguage,
        );
        if (nextPendingPrompt) {
          setPendingPrompt(nextPendingPrompt);
        }

        settingsLoadedRef.current = true;
        void checkConnection(effectiveServerPort);
      },
    );
  }, []);

  // Save settings to storage
  useEffect(() => {
    if (!settingsLoadedRef.current) {
      return;
    }

    chrome.storage.local.set({
      llmSettings: settings,
      browserActionsEnabled,
      fileOperationsEnabled,
      language,
      maxAgentLoops,
      operationMode,
      serverPort,
      allowEvaluateAction,
    });
  }, [
    settings,
    browserActionsEnabled,
    fileOperationsEnabled,
    language,
    maxAgentLoops,
    operationMode,
    serverPort,
    allowEvaluateAction,
  ]);

  useEffect(() => {
    setEvaluateActionEnabled(allowEvaluateAction);
  }, [allowEvaluateAction]);

  const getBridgeBaseUrl = (overridePort?: number) => {
    const targetPort = normalizeServerPort(overridePort ?? serverPort);
    return `http://localhost:${targetPort}`;
  };

  const checkConnection = async (overridePort?: number) => {
    console.log("checkConnection called");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${getBridgeBaseUrl(overridePort)}/health`, {
        headers: BRIDGE_CLIENT_HEADERS,
        signal: controller.signal,
      });
      const connected = response.ok;
      console.log("Connection status:", connected);
      setIsConnected(connected);
      if (connected) {
        fetchAvailableModels(overridePort);
      }
    } catch (error) {
      console.log("Connection failed:", error);
      setIsConnected(false);
    } finally {
      clearTimeout(timeout);
    }
  };

  const fetchAvailableModels = async (overridePort?: number) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${getBridgeBaseUrl(overridePort)}/models`, {
        headers: BRIDGE_CLIENT_HEADERS,
        signal: controller.signal,
      });
      if (response.ok) {
        const models = await response.json();
        setAvailableModels(models);
      }
    } catch {
      console.error("Failed to fetch models");
    } finally {
      clearTimeout(timeout);
    }
  };

  const handleServerPortChange = (nextPort: number) => {
    const normalizedPort = normalizeServerPort(nextPort);
    setServerPort(normalizedPort);
    chrome.storage.local.set({ serverPort: normalizedPort });
    void checkConnection(normalizedPort);
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
          content: t("screenshotPermissionWarning", language),
        },
      ]);
    }
  };

  const extractPageContent = async (options?: {
    mode?: "interactive" | "content";
    autoScrollForLazyLoad?: boolean;
  }): Promise<string> => {
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
        return t("systemPageUnsupported", language).replace("{url}", tab.url);
      }

      const mode = options?.mode ?? "interactive";
      const autoScrollForLazyLoad = options?.autoScrollForLazyLoad ?? false;

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async (opts: {
          mode: "interactive" | "content";
          autoScrollForLazyLoad: boolean;
        }) => {
          const VIEWPORT_MARGIN_PX = 200;
          const MAX_VIEWPORT_CHARS = 12000;
          const MAX_FULL_CHARS = 45000;

          const shouldRejectParent = (parent: HTMLElement) => {
            const tag = parent.tagName;
            if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(tag)) {
              return true;
            }
            // Avoid password fields
            if (
              parent instanceof HTMLInputElement &&
              parent.type === "password"
            ) {
              return true;
            }
            const style = getComputedStyle(parent);
            if (style.display === "none" || style.visibility === "hidden") {
              return true;
            }
            return false;
          };

          const collectText = (
            onlyViewport: boolean,
            maxChars: number,
          ): string => {
            const walker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode: (node) => {
                  const parent = node.parentElement as HTMLElement | null;
                  if (!parent) return NodeFilter.FILTER_REJECT;
                  if (shouldRejectParent(parent))
                    return NodeFilter.FILTER_REJECT;

                  if (onlyViewport) {
                    const rect = parent.getBoundingClientRect();
                    const within =
                      rect.bottom >= -VIEWPORT_MARGIN_PX &&
                      rect.top <= window.innerHeight + VIEWPORT_MARGIN_PX;
                    if (!within) return NodeFilter.FILTER_REJECT;
                  }

                  return NodeFilter.FILTER_ACCEPT;
                },
              },
            );

            const chunks: string[] = [];
            let total = 0;
            let node: Node | null;
            while ((node = walker.nextNode())) {
              const text = node.textContent?.trim();
              if (!text) continue;
              if (text.length === 0) continue;

              chunks.push(text);
              total += text.length + 1;
              if (total >= maxChars) break;
            }

            return chunks.join("\n").slice(0, maxChars);
          };

          const autoScrollToLoad = async () => {
            const startY = window.scrollY;
            const step = Math.max(300, Math.floor(window.innerHeight * 0.9));
            let lastY = -1;
            for (let i = 0; i < 30; i++) {
              window.scrollBy(0, step);
              await new Promise((r) => setTimeout(r, 200));
              if (Math.abs(window.scrollY - lastY) < 2) break;
              lastY = window.scrollY;
              if (
                window.innerHeight + window.scrollY >=
                document.documentElement.scrollHeight - 2
              ) {
                break;
              }
            }
            window.scrollTo(0, startY);
            await new Promise((r) => setTimeout(r, 100));
          };

          if (opts.mode === "content" && opts.autoScrollForLazyLoad) {
            await autoScrollToLoad();
          }

          const scrollInfo = `ScrollY: ${Math.round(window.scrollY)} / ${Math.round(document.documentElement.scrollHeight)} (vh=${Math.round(window.innerHeight)})`;

          // Put viewport text first so the VS Code side (which may slice) keeps the most relevant content.
          const viewportText = collectText(true, MAX_VIEWPORT_CHARS);
          const fullText =
            opts.mode === "content" ? collectText(false, MAX_FULL_CHARS) : "";

          const pageText =
            `### Viewport Text\n${scrollInfo}\n\n${viewportText || "(no text found in viewport)"}` +
            (fullText ? `\n\n### Full Page Text (truncated)\n${fullText}` : "");

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

          if (opts.mode === "content") {
            return pageText;
          }

          return pageText + "\n\n" + output;
        },
        args: [{ mode, autoScrollForLazyLoad }],
      });

      return results[0]?.result || "";
    } catch (error) {
      console.warn("Failed to extract page content:", error);
      return "";
    }
  };

  const shouldRequireLoopApproval = (actions: BrowserAction[]): boolean => {
    const highRiskActionTypes: ReadonlySet<BrowserAction["type"]> = new Set([
      "navigate",
      "newTab",
      "closeTab",
      "evaluate",
      "playwright",
      "upload",
      "handleDialog",
      "drag",
      "clickXY",
    ]);

    return actions.some((action) => highRiskActionTypes.has(action.type));
  };

  const confirmActionExecution = (
    actions: BrowserAction[],
    loopNumber?: number,
  ): boolean => {
    if (actions.length === 0) {
      return true;
    }

    const actionPreview = actions
      .slice(0, 6)
      .map((action, index) => `${index + 1}. ${action.type}`)
      .join("\n");
    const extraCount = actions.length > 6 ? `\n... +${actions.length - 6}` : "";
    const loopLabel =
      typeof loopNumber === "number"
        ? language === "ja"
          ? `\n(ループ ${loopNumber})`
          : `\n(Loop ${loopNumber})`
        : "";
    const confirmationMessage = `${t("actionExecutionConfirm", language).replace("{count}", String(actions.length))}${loopLabel}\n\n${actionPreview}${extraCount}`;

    return window.confirm(confirmationMessage);
  };

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading || inFlightRequestRef.current) return;

    inFlightRequestRef.current = true;

    const wantsContentOnly =
      /\b(translate|translation|summarize|summary)\b/i.test(userMessage) ||
      /(翻訳|要約|まとめ|全文|全内容|全部|記事|英文に)/.test(userMessage);
    const autoScrollForLazyLoad = /(全文|全内容|全部|記事全体|最後まで)/.test(
      userMessage,
    );

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
          const domContent = await extractPageContent({ mode: "interactive" });
          pageContent = `[Screenshot attached - use image for visual understanding]\n\n${domContent}`;
        } catch (e) {
          console.error("Screenshot failed:", e);
          maybeWarnScreenshotPermission(e);
          pageContent = await extractPageContent({ mode: "interactive" });
        }
      } else {
        // Text or Hybrid mode: extract text
        pageContent = await extractPageContent({
          mode: wantsContentOnly ? "content" : "interactive",
          autoScrollForLazyLoad: wantsContentOnly && autoScrollForLazyLoad,
        });
      }

      // Send to VS Code extension
      const response = await fetch(`${getBridgeBaseUrl()}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...BRIDGE_CLIENT_HEADERS,
        },
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
      if (!reader) {
        throw new Error("Empty response stream from server");
      }
      const decoder = new TextDecoder();
      let assistantMessage = "";
      const assistantResponsesForFileActions: string[] = [];

      setMessages((prev: ChatMessage[]) => [
        ...prev,
        { role: "assistant", content: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          assistantMessage += decoder.decode();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
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

      if (!assistantMessage.trim()) {
        const emptyMessage = t("emptyServerResponse", language);
        setMessages((prev: ChatMessage[]) => {
          const newMessages = [...prev];
          if (
            newMessages.length > 0 &&
            newMessages[newMessages.length - 1].role === "assistant" &&
            !newMessages[newMessages.length - 1].content.trim()
          ) {
            newMessages[newMessages.length - 1] = {
              role: "assistant",
              content: emptyMessage,
            };
            return newMessages;
          }
          return [...newMessages, { role: "assistant", content: emptyMessage }];
        });
        return;
      }

      assistantResponsesForFileActions.push(assistantMessage);

      // Execute browser actions if enabled (with autonomous loop)
      console.log("[Agent] browserActionsEnabled:", browserActionsEnabled);
      console.log("[Agent] Provider:", settings.provider);
      console.log("[Agent] Initial response length:", assistantMessage.length);

      if (browserActionsEnabled) {
        const initialActions = parseActionsFromResponse(assistantMessage);
        let isActionExecutionApproved = true;

        if (initialActions.length > 0) {
          isActionExecutionApproved = confirmActionExecution(initialActions);

          if (!isActionExecutionApproved) {
            setMessages((prev: ChatMessage[]) => [
              ...prev,
              {
                role: "assistant",
                content: t("actionExecutionCancelled", language),
              },
            ]);
          }
        }

        if (isActionExecutionApproved) {
          const safeMaxAgentLoops = clampAgentLoops(maxAgentLoops);
          let currentResponse = assistantMessage;
          let loopCount = 0;
          let conversationHistory = [
            ...messages,
            newUserMessage,
            { role: "assistant" as const, content: assistantMessage },
          ];

          console.log(
            "[Agent] Starting autonomous loop, maxLoops:",
            safeMaxAgentLoops,
          );
          let consecutiveErrors = 0;
          let useScreenshotFallback = operationMode === "screenshot";

          while (
            loopCount < safeMaxAgentLoops &&
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

            if (loopCount > 0 && shouldRequireLoopApproval(actions)) {
              const approved = confirmActionExecution(actions, loopCount + 1);
              if (!approved) {
                setMessages((prev: ChatMessage[]) => [
                  ...prev,
                  {
                    role: "assistant",
                    content: t("actionExecutionCancelled", language),
                  },
                ]);
                break;
              }
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

            const resultMessage = `🤖 [Loop ${loopCount}/${safeMaxAgentLoops}] ${t("executionResult", language)}\n${actionResults.join("\n")}`;
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
                const domContent = await extractPageContent({
                  mode: "interactive",
                });
                updatedPageContent = `[Screenshot attached]\n\n${domContent}`;
                console.log("[Agent] Screenshot captured for fallback mode");
              } catch (e) {
                console.error("Screenshot fallback failed:", e);
                maybeWarnScreenshotPermission(e);
                updatedPageContent = await extractPageContent({
                  mode: "interactive",
                });
              }
            } else {
              updatedPageContent = await extractPageContent({
                mode: wantsContentOnly ? "content" : "interactive",
                autoScrollForLazyLoad:
                  wantsContentOnly && autoScrollForLazyLoad,
              });
            }

            // Add results to conversation
            conversationHistory = [
              ...conversationHistory,
              {
                role: "user" as const,
                content: t("loopContinuationPrompt", language)
                  .replace("{loop}", String(loopCount))
                  .replace("{results}", actionResults.join("\n")),
              },
            ];

            // Request next action from LLM
            try {
              const loopAbortController = abortControllerRef.current;
              if (!loopAbortController || loopAbortController.signal.aborted) {
                break;
              }

              const continueResponse = await fetch(
                `${getBridgeBaseUrl()}/chat`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...BRIDGE_CLIENT_HEADERS,
                  },
                  body: JSON.stringify({
                    settings,
                    messages: conversationHistory,
                    pageContent: updatedPageContent,
                    screenshot: updatedScreenshot || undefined,
                    operationMode: useScreenshotFallback
                      ? "screenshot"
                      : operationMode,
                  }),
                  signal: loopAbortController.signal,
                },
              );

              if (!continueResponse.ok) {
                console.error("Continue response failed");
                break;
              }

              const continueReader = continueResponse.body?.getReader();
              if (!continueReader) {
                console.error("Continue response has no stream body");
                break;
              }
              currentResponse = "";
              const continueDecoder = new TextDecoder();

              setMessages((prev: ChatMessage[]) => [
                ...prev,
                { role: "assistant", content: "" },
              ]);

              while (true) {
                const { done, value } = await continueReader.read();
                if (done) {
                  currentResponse += continueDecoder.decode();
                  break;
                }

                const chunk = continueDecoder.decode(value, { stream: true });
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

              if (!currentResponse.trim()) {
                setMessages((prev: ChatMessage[]) => {
                  const newMessages = [...prev];
                  if (
                    newMessages.length > 0 &&
                    newMessages[newMessages.length - 1].role === "assistant" &&
                    !newMessages[newMessages.length - 1].content.trim()
                  ) {
                    newMessages[newMessages.length - 1] = {
                      role: "assistant",
                      content: t("emptyContinuationResponse", language),
                    };
                    return newMessages;
                  }
                  return [
                    ...newMessages,
                    {
                      role: "assistant",
                      content: t("emptyContinuationResponse", language),
                    },
                  ];
                });
                break;
              }

              // Add LLM response to conversation history
              conversationHistory = [
                ...conversationHistory,
                { role: "assistant" as const, content: currentResponse },
              ];
              assistantResponsesForFileActions.push(currentResponse);
            } catch (error) {
              if (error instanceof Error && error.name === "AbortError") {
                console.log("Autonomous loop cancelled by user");
                break;
              }
              console.error("Error in autonomous loop:", error);
              // Continue loop even on error
            }
          }

          if (loopCount >= safeMaxAgentLoops) {
            setMessages((prev: ChatMessage[]) => [
              ...prev,
              {
                role: "assistant",
                content: t("maxAgentLoopsReached", language).replace(
                  "{count}",
                  String(safeMaxAgentLoops),
                ),
              },
            ]);
          }
        }
      }

      // Execute file actions if enabled
      if (fileOperationsEnabled) {
        const downloadResults: string[] = [];
        const processedFileMarkers = new Set<string>();

        const decodeBase64Utf8 = (b64: string) => {
          const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          return new TextDecoder("utf-8").decode(bytes);
        };

        // Pattern 1: New base64 download marker from VS Code agent tool
        const downloadRegex =
          /__DOWNLOAD_FILE__:([^:]+):([A-Za-z0-9+/=]+):__END_DOWNLOAD__/g;

        for (const responseText of assistantResponsesForFileActions) {
          let dlMatch;
          while ((dlMatch = downloadRegex.exec(responseText)) !== null) {
            const [, filePath, b64Content] = dlMatch;
            const markerKey = `b64:${filePath}:${b64Content}`;
            if (processedFileMarkers.has(markerKey)) {
              continue;
            }
            processedFileMarkers.add(markerKey);

            try {
              const content = decodeBase64Utf8(b64Content);
              const filename = filePath
                .replace(/^[\/\\]+/, "")
                .replace(/[\/\\]/g, "_");
              const result = await executeFileAction({
                type: "create",
                path: filename,
                content,
              });
              if (result.success) {
                const showLink = result.downloadId
                  ? ` ([${t("showInFolder", language)}](download-show:${result.downloadId}))`
                  : "";
                downloadResults.push(`• ✓ ${result.filename}${showLink}`);
              } else {
                downloadResults.push(
                  `• ✗ ${result.filename}: ${result.error || t("downloadFailedDefault", language)}`,
                );
              }
            } catch {
              downloadResults.push(
                `• ✗ ${t("base64DecodeError", language).replace("{path}", filePath)}`,
              );
            }
          }
          downloadRegex.lastIndex = 0;

          // Pattern 2: Legacy [FILE: create, ...] pattern
          const fileActions = parseFileActionsFromResponse(responseText);
          for (const action of fileActions) {
            const markerKey = `file:${action.type}:${action.path}:${action.content}`;
            if (processedFileMarkers.has(markerKey)) {
              continue;
            }
            processedFileMarkers.add(markerKey);

            const result = await executeFileAction(action);
            if (result.success) {
              const showLink = result.downloadId
                ? ` ([${t("showInFolder", language)}](download-show:${result.downloadId}))`
                : "";
              downloadResults.push(`• ✓ ${result.filename}${showLink}`);
            } else {
              downloadResults.push(
                `• ✗ ${result.filename}: ${result.error || t("downloadFailedDefault", language)}`,
              );
            }
          }
        }

        if (downloadResults.length > 0) {
          setMessages((prev: ChatMessage[]) => [
            ...prev,
            {
              role: "assistant",
              content: `📥 ${t("downloadComplete", language)}:\n${downloadResults.join("\n")}\n\n📂 ${t("downloadDestination", language)}`,
            },
          ]);
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
      inFlightRequestRef.current = false;
    }
  };

  useEffect(() => {
    if (isLoading || !pendingPrompt) {
      return;
    }

    if (pendingPromptDispatchRef.current === pendingPrompt) {
      return;
    }

    const prompt = pendingPrompt;
    pendingPromptDispatchRef.current = prompt;
    setPendingPrompt(null);
    chrome.storage.local.remove("pendingAction");
    void sendMessage(prompt).finally(() => {
      if (pendingPromptDispatchRef.current === prompt) {
        pendingPromptDispatchRef.current = null;
      }
    });
  }, [isLoading, pendingPrompt]);

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
          <span className="text-lg font-semibold">
            {t("appTitle", language)}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              void checkConnection();
            }}
            className="p-2 hover:bg-gray-100 rounded"
            title={t("reconnect", language)}
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
            onClick={() => {
              void checkConnection();
            }}
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
          onRefreshModels={() => {
            void fetchAvailableModels();
          }}
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
          serverPort={serverPort}
          onServerPortChange={handleServerPortChange}
          allowEvaluateAction={allowEvaluateAction}
          onAllowEvaluateActionChange={setAllowEvaluateAction}
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
