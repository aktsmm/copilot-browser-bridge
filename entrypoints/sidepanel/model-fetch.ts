import type { ModelInfo } from "./types";

export const MODEL_FETCH_TIMEOUT_MS = 12000;
export const MODEL_FETCH_MAX_ATTEMPTS = 2;

export interface FetchModelsResult {
  ok: boolean;
  models: ModelInfo[];
  errorDetail: string | null;
}

interface FetchModelsOptions {
  baseUrl: string;
  headers: HeadersInit;
  extensionOrigin: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxAttempts?: number;
}

function buildDebugContext(baseUrl: string, extensionOrigin: string): string {
  return `Endpoint: ${baseUrl}/models | Origin: ${extensionOrigin}`;
}

function formatHttpErrorDetail(
  response: Response,
  responseText: string,
  baseUrl: string,
  extensionOrigin: string,
): string {
  const debugContext = buildDebugContext(baseUrl, extensionOrigin);
  const body = responseText.trim();

  if (response.status === 401) {
    return `Model list request was rejected as an unauthorized client (401). ${debugContext}${body ? ` | ${body}` : ""}`;
  }

  if (response.status === 403) {
    return `Model list request was rejected for this extension origin (403). Add ${extensionOrigin} to copilotBrowserBridge.allowedExtensionOrigins if needed. ${debugContext}${body ? ` | ${body}` : ""}`;
  }

  return `Model list request failed (${response.status} ${response.statusText}). ${debugContext}${body ? ` | ${body}` : ""}`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

async function fetchModelsOnce(
  baseUrl: string,
  headers: HeadersInit,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(`${baseUrl}/models`, {
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchModelsWithRetry({
  baseUrl,
  headers,
  extensionOrigin,
  fetchImpl = fetch,
  timeoutMs = MODEL_FETCH_TIMEOUT_MS,
  maxAttempts = MODEL_FETCH_MAX_ATTEMPTS,
}: FetchModelsOptions): Promise<FetchModelsResult> {
  let lastErrorDetail: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetchModelsOnce(
        baseUrl,
        headers,
        timeoutMs,
        fetchImpl,
      );

      if (!response.ok) {
        const responseText = await response.text();
        return {
          ok: false,
          models: [],
          errorDetail: formatHttpErrorDetail(
            response,
            responseText,
            baseUrl,
            extensionOrigin,
          ),
        };
      }

      const models = (await response.json()) as ModelInfo[];
      if (!Array.isArray(models) || models.length === 0) {
        return {
          ok: false,
          models: [],
          errorDetail:
            `Model list request returned no models. ${buildDebugContext(baseUrl, extensionOrigin)} ` +
            "GitHub Copilot may not be ready in VS Code yet.",
        };
      }

      return {
        ok: true,
        models,
        errorDetail: null,
      };
    } catch (error) {
      if (isAbortError(error)) {
        lastErrorDetail =
          `Timed out after ${timeoutMs}ms while requesting the model list. ${buildDebugContext(baseUrl, extensionOrigin)}`;
      } else {
        lastErrorDetail = `${error instanceof Error ? error.message : String(error)}. ${buildDebugContext(baseUrl, extensionOrigin)}`;
      }

      if (attempt >= maxAttempts) {
        return {
          ok: false,
          models: [],
          errorDetail: lastErrorDetail,
        };
      }
    }
  }

  return {
    ok: false,
    models: [],
    errorDetail: lastErrorDetail,
  };
}