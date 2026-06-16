import type { Route } from "./+types/api.image";

/**
 * 图片代理 —— 解决 QQ 音乐 CDN 等第三方图片在浏览器端
 * Canvas / WebGL 加载时的 CORS 问题
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const target = url.searchParams.get("url");

  if (!target) {
    return new Response("missing url param", { status: 400 });
  }

  let resp: Response;
  try {
    resp = await fetch(target, {
      headers: {
        Referer: "https://y.qq.com/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
  } catch {
    return new Response("fetch failed", { status: 502 });
  }

  if (!resp.ok) {
    return new Response("upstream error", { status: 502 });
  }

  const body = await resp.arrayBuffer();
  const contentType =
    resp.headers.get("content-type") || "image/jpeg";

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
