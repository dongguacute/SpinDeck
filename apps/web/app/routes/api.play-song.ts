import type { PlatformType, SongInfo } from "../lib/types";
import { buildSongPlayUrls } from "../lib/play-song-urls";
import { waitForQQMusicPlaying } from "../lib/qqmusic-mac-server";
import type { Route } from "./+types/api.play-song";

/** macOS：`open -g` 后台播放，并检测 QQ 音乐是否真正开始播放 */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  if (process.platform !== "darwin") {
    return Response.json({ error: "仅 macOS 支持服务端唤起" }, { status: 400 });
  }

  let body: {
    platform?: PlatformType;
    song?: SongInfo;
    fresh?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { platform, song } = body;
  if (!platform || !song?.name) {
    return Response.json({ error: "缺少 platform 或 song" }, { status: 400 });
  }

  if (platform === "QQMusic" && song.platformNumericId == null) {
    return Response.json(
      { error: "缺少 songid，请重新导入歌单以获取 platformNumericId" },
      { status: 400 },
    );
  }

  const urls = buildSongPlayUrls(platform, song, "macos");
  if (!urls.length) {
    return Response.json({ error: "无法构建播放链接" }, { status: 400 });
  }

  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  const url = urls[0];

  try {
    await execFileAsync("open", ["-g", url]);

    let confirmed = false;
    if (platform === "QQMusic") {
      confirmed = await waitForQQMusicPlaying(execFileAsync);
    }

    console.log(
      `[api/play-song] fresh songid=${song.platformNumericId} confirmed=${confirmed} → ${url}`,
    );

    return Response.json({
      ok: true,
      playing: true,
      confirmed,
      method: "playsong",
      url,
      songid: song.platformNumericId,
    });
  } catch (err) {
    console.error("[api/play-song] failed:", err);
    return Response.json({ error: "唤起本地应用失败" }, { status: 500 });
  }
}
