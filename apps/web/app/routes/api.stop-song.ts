import type { PlatformType } from "../lib/types";
import { QQ_MUSIC_PAUSE_SCRIPT } from "../lib/qqmusic-mac-server";
import type { Route } from "./+types/api.stop-song";

/** macOS：后台暂停 QQ 音乐 */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  if (process.platform !== "darwin") {
    return Response.json({ error: "仅 macOS 支持服务端控制" }, { status: 400 });
  }

  let body: { platform?: PlatformType };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { platform } = body;
  if (!platform) {
    return Response.json({ error: "缺少 platform" }, { status: 400 });
  }

  if (platform !== "QQMusic") {
    return Response.json({ ok: true, stopped: false });
  }

  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  try {
    const { stdout } = await execFileAsync("osascript", ["-e", QQ_MUSIC_PAUSE_SCRIPT]);
    const stopped = String(stdout).trim() === "paused";
    console.log(`[api/stop-song] stopped=${stopped}`);
    return Response.json({ ok: true, stopped });
  } catch (err) {
    console.error("[api/stop-song] failed:", err);
    return Response.json({ error: "暂停失败" }, { status: 500 });
  }
}
