import type { PlatformType } from "../lib/types";
import { QQ_MUSIC_RESUME_SCRIPT, waitForQQMusicPlaying } from "../lib/qqmusic-mac-server";
import type { Route } from "./+types/api.resume-song";

/** macOS：继续播放（菜单「播放」） */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  if (process.platform !== "darwin") {
    return Response.json({ error: "仅 macOS 支持" }, { status: 400 });
  }

  let body: { platform?: PlatformType };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.platform !== "QQMusic") {
    return Response.json({ ok: true, playing: false, method: "noop" });
  }

  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  try {
    const { stdout } = await execFileAsync("osascript", ["-e", QQ_MUSIC_RESUME_SCRIPT]);
    const resumed = String(stdout).trim() === "resumed";
    const alreadyPlaying = !resumed && (await waitForQQMusicPlaying(execFileAsync));
    const playing = resumed ? await waitForQQMusicPlaying(execFileAsync) : alreadyPlaying;

    console.log(`[api/resume-song] resumed=${resumed} playing=${playing}`);
    return Response.json({
      ok: true,
      playing: playing || alreadyPlaying,
      confirmed: playing,
      method: "resume",
    });
  } catch (err) {
    console.error("[api/resume-song] failed:", err);
    return Response.json({ error: "继续播放失败" }, { status: 500 });
  }
}
