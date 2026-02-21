import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { ChatMessage } from "../types";
import type { Language } from "../i18n";
import { t } from "../i18n";

const markdownSanitizeSchema = {
  ...defaultSchema,
  tagNames: Array.from(
    new Set([...(defaultSchema.tagNames ?? []), "details", "summary"]),
  ),
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    // Allow summary content; keep everything else default
    summary: ["className"],
    details: ["open", "className"],
    a: ["href", "title", ...(defaultSchema.attributes?.a ?? [])],
  },
};

type QuickAction = {
  icon: string;
  label: string;
  prompt: string;
};

// Collapse tool execution logs into <details> blocks
function collapseToolLogs(content: string): string {
  // Remove download markers (already processed by App.tsx)
  let cleaned = content.replace(
    /__DOWNLOAD_FILE__:[^:]+:[A-Za-z0-9+/=]+:__END_DOWNLOAD__/g,
    "",
  );

  // Pattern: 🔧 ツール実行: {name}\n📋 結果: {result}
  cleaned = cleaned.replace(
    /\n*🔧 ツール実行: ([^\n]+)\n📋 結果: ([^\n]*(?:\n(?!🔧|\[Agent|##|\n\n)[^\n]*)*)\n*/g,
    (_, toolName, result) => {
      const escapedResult = result
        .trim()
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `\n<details><summary>🔧 ${toolName.trim()}</summary>\n\n\`\`\`\n${escapedResult}\n\`\`\`\n\n</details>\n\n`;
    },
  );

  return cleaned;
}

function getQuickActions(lang: Language): QuickAction[] {
  return lang === "ja"
    ? [
        { icon: "➡️", label: "続けて", prompt: "続けて" },
        {
          icon: "🔑",
          label: "要点",
          prompt: "要点を箇条書きで教えて",
        },
        {
          icon: "✅",
          label: "次どうする？",
          prompt: "次にやるべきことを3つ提案して",
        },
        {
          icon: "💾",
          label: "MD保存",
          prompt: "Markdownでまとめて保存して",
        },
      ]
    : [
        { icon: "➡️", label: "Continue", prompt: "Continue" },
        {
          icon: "🔑",
          label: "Key points",
          prompt: "List the key points as bullet points",
        },
        {
          icon: "✅",
          label: "Next steps",
          prompt: "Suggest 3 next steps",
        },
        {
          icon: "💾",
          label: "Save as MD",
          prompt: "Save the result as a Markdown file",
        },
      ];
}

interface ChatProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onClearMessages: () => void;
  onStopGeneration: () => void;
  language: Language;
}

export function Chat({
  messages,
  isLoading,
  onSendMessage,
  onClearMessages,
  onStopGeneration,
  language,
}: ChatProps) {
  const [input, setInput] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleMarkdownLinkClick = async (href: string) => {
    if (href.startsWith("download-show:")) {
      const idStr = href.slice("download-show:".length);
      const downloadId = Number.parseInt(idStr, 10);
      if (!Number.isFinite(downloadId)) return;
      chrome.runtime.sendMessage({ type: "show-download", downloadId });
      return;
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages Header with Clear Button */}
      {messages.length > 0 && (
        <div className="flex justify-end px-4 pt-2">
          <button
            onClick={onClearMessages}
            className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1"
            title={t("clear", language)}
          >
            {t("clear", language)}
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="mt-6 px-2">
            <p className="text-2xl text-center mb-1">
              {t("welcome", language)}
            </p>
            <p className="text-center text-gray-500 text-sm mb-4">
              {t("welcomeMessage", language)}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(language === "ja"
                ? [
                    {
                      icon: "📝",
                      label: "要約して",
                      prompt: "このページを要約して",
                    },
                    {
                      icon: "🔑",
                      label: "要点を抽出",
                      prompt: "このページの要点を箇条書きで教えて",
                    },
                    {
                      icon: "🌐",
                      label: "英語に翻訳",
                      prompt: "このページの内容を英語に翻訳して",
                    },
                    {
                      icon: "🔗",
                      label: "リンク一覧",
                      prompt: "このページのリンク一覧を抽出して",
                    },
                    {
                      icon: "❓",
                      label: "Q&A作成",
                      prompt: "このページの内容からQ&Aを5つ作って",
                    },
                    {
                      icon: "💾",
                      label: "MDで保存",
                      prompt: "このページを要約してMarkdownでまとめて保存して",
                    },
                  ]
                : [
                    {
                      icon: "📝",
                      label: "Summarize",
                      prompt: "Summarize this page",
                    },
                    {
                      icon: "🔑",
                      label: "Key Points",
                      prompt: "List the key points of this page",
                    },
                    {
                      icon: "🌐",
                      label: "Translate to JP",
                      prompt: "Translate this page to Japanese",
                    },
                    {
                      icon: "🔗",
                      label: "Extract Links",
                      prompt: "Extract all links from this page",
                    },
                    {
                      icon: "❓",
                      label: "Generate Q&A",
                      prompt: "Create 5 Q&A pairs from this page",
                    },
                    {
                      icon: "💾",
                      label: "Save as MD",
                      prompt: "Summarize this page and save as Markdown",
                    },
                  ]
              ).map((card) => (
                <button
                  key={card.label}
                  onClick={() => onSendMessage(card.prompt)}
                  className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-all text-left text-sm shadow-sm"
                >
                  <span className="text-lg">{card.icon}</span>
                  <span className="text-gray-700 font-medium">
                    {card.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-lg relative group ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white border shadow-sm"
              }`}
            >
              {message.role === "assistant" && (
                <button
                  onClick={() => handleCopy(message.content, index)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                  title={t("copy", language)}
                >
                  {copiedIndex === index ? "✓" : "📋"}
                </button>
              )}
              <div
                className={`break-words ${message.role === "user" ? "whitespace-pre-wrap" : "markdown-body"}`}
              >
                {message.role === "assistant" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[
                      rehypeRaw,
                      [rehypeSanitize, markdownSanitizeSchema],
                    ]}
                    components={{
                      a: ({ href, children, ...props }) => {
                        const safeHref = href || "";
                        if (safeHref.startsWith("download-show:")) {
                          return (
                            <a
                              href={safeHref}
                              {...props}
                              onClick={(e) => {
                                e.preventDefault();
                                handleMarkdownLinkClick(safeHref);
                              }}
                            >
                              {children}
                            </a>
                          );
                        }
                        return (
                          <a href={safeHref} {...props}>
                            {children}
                          </a>
                        );
                      },
                    }}
                  >
                    {collapseToolLogs(message.content)}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
                {isLoading &&
                  index === messages.length - 1 &&
                  message.role === "assistant" && (
                    <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse" />
                  )}

                {/* Quick actions at end of latest assistant message */}
                {!isLoading &&
                  message.role === "assistant" &&
                  index === messages.length - 1 && (
                    <div className="mt-3 pt-2 border-t border-gray-200 flex flex-wrap gap-2">
                      {getQuickActions(language).map((action) => (
                        <button
                          key={action.label}
                          onClick={() => onSendMessage(action.prompt)}
                          className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                        >
                          <span className="mr-1">{action.icon}</span>
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("inputPlaceholder", language)}
            rows={1}
            className="flex-1 p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {isLoading ? (
            <button
              type="button"
              onClick={onStopGeneration}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              {t("stop", language)}
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {t("send", language)}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
