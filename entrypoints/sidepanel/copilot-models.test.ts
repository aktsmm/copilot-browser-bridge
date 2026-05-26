import { describe, expect, it } from "vitest";
import { buildDisplayedCopilotModels } from "./copilot-models";
import type { ModelInfo } from "./types";

describe("buildDisplayedCopilotModels", () => {
  it("keeps the selected model visible when falling back", () => {
    expect(buildDisplayedCopilotModels([], "o3-mini")[0]).toEqual({
      value: "o3-mini",
      label: "o3-mini",
    });
  });

  it("prefers live Copilot models when available", () => {
    const models: ModelInfo[] = [
      { provider: "copilot", id: "claude-sonnet-4", name: "Claude Sonnet 4" },
      { provider: "copilot", id: "o3-mini", name: "o3-mini" },
      { provider: "other", id: "random-model", name: "Random Model" },
    ];

    expect(buildDisplayedCopilotModels(models, "claude-sonnet-4")).toEqual([
      { value: "claude-sonnet-4", label: "Claude Sonnet 4" },
      { value: "o3-mini", label: "o3-mini" },
    ]);
  });

  it("filters to supported vendors and families", () => {
    const models: ModelInfo[] = [
      { provider: "anthropic", id: "claude-opus-4", name: "Claude Opus 4" },
      {
        provider: "unknown",
        id: "custom-local-model",
        name: "Custom Local Model",
      },
    ];

    expect(buildDisplayedCopilotModels(models, "claude-opus-4")).toEqual([
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o mini" },
      { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
      { value: "claude-sonnet-4", label: "Claude Sonnet 4" },
      { value: "claude-opus-4", label: "Claude Opus 4" },
      { value: "o1", label: "o1" },
      { value: "o1-mini", label: "o1 mini" },
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    ]);
  });
});
