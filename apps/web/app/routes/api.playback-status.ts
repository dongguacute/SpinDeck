import type { PlatformType, SongInfo } from "../lib/types";
import { isQQMusicPlaying } from "../lib/qqmusic-mac-server";
import { canResumeSong, isSameSongInSession } from "../lib/playback-session";
import type { Route } from "./+types/api.playback-status";

/** 查询 QQ 音乐播放状态，并结合当前页面会话判断是否同一首歌 */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  if (process.platform !== "darwin") {
    return Response.json({ playing: false, paused: false, idle: true });
  }

  let body: { platform?: PlatformType; song?: SongInfo };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { platform, song } = body;
  if (!platform) {
    return Response.json({ error: "缺少 platform" }, { status: 400 });
  }

  if (platform !== "QQMusic") {
    return Response.json({ playing: false, paused: false, idle: true });
  }

  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  try {
    const playing = await isQQMusicPlaying(execFileAsync);
    const paused = !playing;
    const sameSongInSession = song ? isSameSongInSession(song) : false;
    const canResume = song ? canResumeSong(song) : false;

    return Response.json({
      playing,
      paused,
      idle: !playing,
      sameSongInSession,
      canResume,
    });
  } catch (err) {
    console.error("[api/playback-status] failed:", err);
    return Response.json({ playing: false, paused: false, idle: true });
  }
}
