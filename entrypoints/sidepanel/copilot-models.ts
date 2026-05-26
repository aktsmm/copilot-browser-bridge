import type { ModelInfo } from "./types";

export interface CopilotModelOption {
  value: string;
  label: string;
}

export const FALLBACK_COPILOT_MODELS: CopilotModelOption[] = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o mini" },
  { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "claude-sonnet-4", label: "Claude Sonnet 4" },
  { value: "claude-opus-4", label: "Claude Opus 4" },
  { value: "o1", label: "o1" },
  { value: "o1-mini", label: "o1 mini" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
];

const ALLOWED_VENDORS = ["anthropic", "openai", "google", "copilot"];
const ALLOWED_FAMILIES = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4",
  "gpt-4-turbo",
  "o1",
  "o1-mini",
  "o1-preview",
  "o3",
  "o3-mini",
  "claude-3.5-sonnet",
  "claude-3-opus",
  "claude-3-sonnet",
  "claude-3-haiku",
  "claude-sonnet-4",
  "claude-opus-4",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-pro",
];

function ensureSelectedModelOption(
  models: CopilotModelOption[],
  selectedModel: string,
): CopilotModelOption[] {
  if (!selectedModel || models.some((model) => model.value === selectedModel)) {
    return models;
  }

  return [{ value: selectedModel, label: selectedModel }, ...models];
}

export function buildDisplayedCopilotModels(
  availableModels: ModelInfo[],
  selectedModel: string,
): CopilotModelOption[] {
  const filteredModels = availableModels.filter(
    (model) =>
      ALLOWED_VENDORS.some((vendor) =>
        model.provider.toLowerCase().includes(vendor),
      ) ||
      ALLOWED_FAMILIES.some((family) =>
        model.id.toLowerCase().includes(family),
      ),
  );

  const copilotModels = filteredModels.filter(
    (model) => model.provider === "copilot",
  );

  const modelOptions =
    copilotModels.length > 0
      ? copilotModels.map((model) => ({ value: model.id, label: model.name }))
      : [...FALLBACK_COPILOT_MODELS];

  return ensureSelectedModelOption(modelOptions, selectedModel);
}
