import type { ExecFileAsync } from "../types";

export async function createNodeExec(): Promise<ExecFileAsync> {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  return promisify(execFile) as ExecFileAsync;
}

export function nodePlatform(): NodeJS.Platform {
  return process.platform;
}
