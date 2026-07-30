import { isTauri } from "./is-tauri";

export type LogLevel = "debug" | "info" | "warn" | "error";

type NativeLogFns = {
  debug: (message: string) => Promise<void>;
  info: (message: string) => Promise<void>;
  warn: (message: string) => Promise<void>;
  error: (message: string) => Promise<void>;
};

let native: NativeLogFns | null = null;
let initPromise: Promise<void> | null = null;

function formatArgs(message: string, args: unknown[]): string {
  if (args.length === 0) return message;
  const extras = args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg instanceof Error) return arg.stack ?? arg.message;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
  return `${message} ${extras}`;
}

function writeConsole(level: LogLevel, message: string, args: unknown[]): void {
  switch (level) {
    case "debug":
      console.debug(message, ...args);
      break;
    case "info":
      console.info(message, ...args);
      break;
    case "warn":
      console.warn(message, ...args);
      break;
    case "error":
      console.error(message, ...args);
      break;
  }
}

function writeNative(level: LogLevel, message: string, args: unknown[]): void {
  if (!native) return;
  const line = formatArgs(message, args);
  void native[level](line).catch(() => {
    // Native log bridge failed; console already received the message.
  });
}

function emit(level: LogLevel, message: string, args: unknown[]): void {
  writeConsole(level, message, args);
  writeNative(level, message, args);
}

/** Initialize Tauri file logging bridge (no-op in the browser). */
export async function initLogger(): Promise<void> {
  if (!isTauri()) return;
  if (native) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const mod = await import("@tauri-apps/plugin-log");
      native = {
        debug: mod.debug,
        info: mod.info,
        warn: mod.warn,
        error: mod.error,
      };
    } catch (err) {
      console.warn("[Logger] Failed to init Tauri log plugin:", err);
      native = null;
    }
  })();

  return initPromise;
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    emit("debug", message, args);
  },
  info(message: string, ...args: unknown[]): void {
    emit("info", message, args);
  },
  warn(message: string, ...args: unknown[]): void {
    emit("warn", message, args);
  },
  error(message: string, ...args: unknown[]): void {
    emit("error", message, args);
  },
};

/** Attach window-level handlers so uncaught errors reach the log file. */
let globalHandlersInstalled = false;

export function installGlobalErrorHandlers(): void {
  if (typeof window === "undefined" || globalHandlersInstalled) return;
  globalHandlersInstalled = true;

  window.addEventListener("error", (event) => {
    logger.error(
      "[UnhandledError]",
      event.message,
      event.filename,
      event.lineno,
      event.error,
    );
  });

  window.addEventListener("unhandledrejection", (event) => {
    logger.error("[UnhandledRejection]", event.reason);
  });
}
