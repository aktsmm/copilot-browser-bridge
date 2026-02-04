export type OperationMode = "text" | "hybrid" | "screenshot";

export interface LLMSettings {
  provider: "copilot" | "copilot-agent" | "lm-studio";
  copilot: {
    model: string;
  };
  lmStudio: {
    endpoint: string;
    model: string;
  };
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  settings: LLMSettings;
  messages: ChatMessage[];
  pageContent: string;
  enableBrowserActions?: boolean;
  enableFileOperations?: boolean;
}

export interface ModelInfo {
  provider: string;
  id: string;
  name: string;
}

// Browser Action Types (Playwright MCP compatible)
export type BrowserAction =
  | { type: "navigate"; url: string }
  | {
      type: "click";
      selector: string;
      doubleClick?: boolean;
      button?: "left" | "right" | "middle";
      modifiers?: ("Alt" | "Control" | "Meta" | "Shift")[];
    }
  | {
      type: "type";
      selector: string;
      text: string;
      submit?: boolean;
      slowly?: boolean;
    }
  | { type: "scroll"; direction: "up" | "down"; amount?: number }
  | { type: "back" }
  | { type: "forward" }
  | { type: "reload" }
  | { type: "newTab"; url?: string }
  | { type: "closeTab" }
  | { type: "screenshot" }
  | { type: "getHtml"; selector?: string }
  | { type: "waitForSelector"; selector: string; timeout?: number }
  | { type: "waitForText"; text: string; timeout?: number }
  | { type: "waitForTextGone"; text: string; timeout?: number }
  // Form actions
  | { type: "radio"; selector: string; value?: string }
  | { type: "check"; selector: string }
  | { type: "uncheck"; selector: string }
  | { type: "select"; selector: string; value: string }
  | { type: "slider"; selector: string; value: number }
  | { type: "fillForm"; fields: FormField[] }
  | { type: "upload"; selector: string; files: string[] }
  // Mouse actions
  | { type: "drag"; startSelector: string; endSelector: string }
  | { type: "hover"; selector: string }
  | { type: "focus"; selector: string }
  | { type: "clickXY"; x: number; y: number; button?: "left" | "right" }
  // Dialog handling
  | { type: "handleDialog"; accept: boolean; promptText?: string }
  // Keyboard
  | { type: "pressKey"; key: string }
  // JavaScript evaluation (like browser_evaluate)
  | { type: "evaluate"; script: string; selector?: string }
  // Console & Network (like browser_console_messages, browser_network_requests)
  | { type: "getConsole"; level?: "error" | "warn" | "info" | "log" }
  | { type: "getNetwork"; includeStatic?: boolean }
  // Playwright passthrough
  | { type: "playwright"; action: string; params: Record<string, unknown> };

// Form field for fillForm action
export interface FormField {
  selector: string;
  value: string;
  type?: "text" | "checkbox" | "radio" | "select";
}
