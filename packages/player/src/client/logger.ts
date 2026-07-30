/** Injected logger for @spindeck/player (keeps the package free of Tauri deps). */

export type PlayerLogger = {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
};

const defaultLogger: PlayerLogger = {
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

let current: PlayerLogger = defaultLogger;

export function setLogger(next: PlayerLogger | null): void {
  current = next ?? defaultLogger;
}

export function getLogger(): PlayerLogger {
  return current;
}
