import type { PlatformType } from "@spindeck/player";
import { serverPauseSong } from "@spindeck/player/server";
import type { Route } from "./+types/api.stop-song";

/** 播放器 HTTP 接口：暂停，逻辑见 @spindeck/player/server → serverPauseSong */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: { platform?: PlatformType; cancelOnly?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { platform, cancelOnly } = body;
  if (!platform) {
    return Response.json({ error: "缺少 platform" }, { status: 400 });
  }

  try {
    const result = await serverPauseSong(platform, { cancelOnly: Boolean(cancelOnly) });

    if (!result.ok) {
      if (result.needsAccessibility) {
        console.warn("[api/stop-song] needs accessibility permission");
        return Response.json(
          {
            error: result.error ?? "需要辅助功能权限",
            needsAccessibility: true,
          },
          { status: 403 },
        );
      }
      return Response.json({ error: result.error ?? "暂停失败" }, { status: 500 });
    }
    console.log(`[api/stop-song] stopped=${result.stopped} method=${result.method}`);
    return Response.json({ ok: true, stopped: result.stopped });
  } catch (err) {
    console.error("[api/stop-song] failed:", err);
    return Response.json({ error: "暂停失败" }, { status: 500 });
  }
}
