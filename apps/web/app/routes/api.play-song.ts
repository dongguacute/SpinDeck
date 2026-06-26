import type { PlatformType, SongInfo } from "@spindeck/player";
import { serverPlaySong } from "@spindeck/player/server";
import type { Route } from "./+types/api.play-song";

/** 播放器 HTTP 接口：从头播放，逻辑见 @spindeck/player/server → serverPlaySong */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
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

  if ((platform === "QQMusic" || platform === "NetEaseMusic") && song.platformNumericId == null) {
    return Response.json(
      { error: `缺少 songid，请重新导入歌单以获取 ${platform} 的 platformNumericId` },
      { status: 400 },
    );
  }

  try {
    const result = await serverPlaySong(platform, song);
    if (!result.ok) {
      return Response.json({ error: result.error ?? "播放失败" }, { status: result.error?.includes("macOS") ? 400 : 500 });
    }

    console.log(
      `[api/play-song] fresh songid=${song.platformNumericId} confirmed=${result.confirmed} → ${result.url}`,
    );

    return Response.json(result);
  } catch (err) {
    console.error("[api/play-song] failed:", err);
    return Response.json({ error: "唤起本地应用失败" }, { status: 500 });
  }
}
