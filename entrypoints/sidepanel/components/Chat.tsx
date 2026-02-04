import React, { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "../types";
import type { Language } from "../i18n";
import { t } from "../i18n";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          <div className="text-center text-gray-500 mt-8">
            <p className="text-2xl mb-2">{t("welcome", language)}</p>
            <p>{t("welcomeMessage", language)}</p>
            <p className="text-sm mt-2">{t("welcomeExample", language)}</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-lg ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white border shadow-sm"
              }`}
            >
              <div className="whitespace-pre-wrap break-words">
                {message.content}
                {isLoading &&
                  index === messages.length - 1 &&
                  message.role === "assistant" && (
                    <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse" />
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
