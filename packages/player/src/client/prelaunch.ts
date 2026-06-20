import type { PlatformType } from "../types";
import { getDeviceOS } from "../device";
import { openDeepLink } from "./deep-link";

interface LaunchConfig {
  scheme: string;
  webFallback: string;
  appName: string;
}

const LAUNCH_CONFIG: Record<PlatformType, LaunchConfig> = {
  QQMusic: {
    scheme: "qqmusicmac://",
    webFallback: "https://y.qq.com",
    appName: "QQ音乐",
  },
  NetEaseMusic: {
    scheme: "neteasecloudmusic://",
    webFallback: "https://music.163.com",
    appName: "网易云音乐",
  },
  KugouMusic: {
    scheme: "kugoumusic://",
    webFallback: "https://www.kugou.com",
    appName: "酷狗音乐",
  },
  AppleMusic: {
    scheme: "music://",
    webFallback: "https://music.apple.com",
    appName: "Apple Music",
  },
  Spotify: {
    scheme: "spotify://",
    webFallback: "https://open.spotify.com",
    appName: "Spotify",
  },
  YTMusic: {
    scheme: "",
    webFallback: "https://music.youtube.com",
    appName: "YouTube Music",
  },
};

/** 预启动本地音乐客户端 */
export function prelaunchApp(platform: PlatformType): void {
  const deviceOS = getDeviceOS();
  const config = LAUNCH_CONFIG[platform];
  console.log(`[Prelaunch] Platform: ${platform}, OS: ${deviceOS}`);

  if (!config.scheme) {
    window.open(config.webFallback, "_blank", "noopener,noreferrer");
    return;
  }

  let hasFallenBack = false;
  let appLaunched = false;

  const fallbackToWeb = (reason: string) => {
    if (hasFallenBack) return;
    hasFallenBack = true;
    clearTimeout(fallbackTimer);
    window.removeEventListener("blur", handleBlur);
    console.log(`[Prelaunch] Fallback to web (${reason})`);
    window.open(config.webFallback, "_blank", "noopener,noreferrer");
  };

  const handleBlur = () => {
    appLaunched = true;
  };

  window.addEventListener("blur", handleBlur);

  try {
    openDeepLink(config.scheme);
  } catch (e) {
    console.warn("[Prelaunch] Direct launch failed:", e);
    fallbackToWeb("exception thrown");
    return;
  }

  const fallbackTimer = setTimeout(() => {
    window.removeEventListener("blur", handleBlur);
    if (!appLaunched && !hasFallenBack) {
      fallbackToWeb("app not detected");
    }
  }, 700);
}
