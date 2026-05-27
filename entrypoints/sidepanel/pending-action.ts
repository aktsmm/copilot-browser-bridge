import type { Language } from "./i18n";

export type PendingAction =
  | {
      type: "question";
      text: string;
    }
  | {
      type: "summarize";
    };

export function toPendingPrompt(
  action: unknown,
  lang: Language,
): string | null {
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
