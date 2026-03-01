type ChromeRecord = Record<string, unknown>;

type ChromeTabLike = {
  id?: number;
  url?: string;
  windowId?: number;
};

type ChromeStorageArea = {
  get(
    keys: string | string[] | ChromeRecord,
    callback: (items: ChromeRecord) => void,
  ): void;
  set(items: ChromeRecord, callback?: () => void): void;
  remove(keys: string | string[], callback?: () => void): void;
};

type ChromeExecuteScriptResult<T = unknown> = {
  result: T;
};

declare const chrome: {
  storage: {
    local: ChromeStorageArea;
  };
  tabs: {
    query(queryInfo: ChromeRecord): Promise<ChromeTabLike[]>;
    update(
      tabId: number,
      updateProperties: ChromeRecord,
    ): Promise<ChromeTabLike>;
    goBack(tabId: number): Promise<void>;
    goForward(tabId: number): Promise<void>;
    reload(tabId: number): Promise<void>;
    create(createProperties: ChromeRecord): Promise<ChromeTabLike>;
    remove(tabId: number): Promise<void>;
    captureVisibleTab(
      windowId?: number,
      options?: {
        format?: "jpeg" | "png";
        quality?: number;
      },
    ): Promise<string>;
  };
  scripting: {
    executeScript<TArgs extends unknown[], TResult>(injection: {
      target: { tabId: number };
      func: (...args: TArgs) => TResult;
      args?: TArgs;
    }): Promise<Array<ChromeExecuteScriptResult<Awaited<TResult>>>>;
  };
  runtime: {
    sendMessage(
      message: ChromeRecord,
      callback?: (response?: ChromeRecord) => void,
    ): void;
    lastError?: {
      message?: string;
    };
  };
};
