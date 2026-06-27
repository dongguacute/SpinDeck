import type { PlatformType } from "../types";
import { getDeviceOS } from "../device";
import { openDeepLink } from "./deep-link";
import { dispatchAppUrl, dispatchExternalUrl, waitForAppUrlOpener } from "./url-open";
import { isMobileQQMusicTarget } from "./qqmusic-background";

interface LaunchConfig {
  scheme: string;
  webFallback: string;
  appName: string;
}

const LAUNCH_CONFIG: Record<PlatformType, LaunchConfig> = {
  QQMusic: {
    scheme: "qqmusicmac://QQMusic/",
    webFallback: "https://y.qq.com",
    appName: "QQ音乐",
  },
  NetEaseMusic: {
    scheme: "orpheus://open",
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

function resolveLaunchScheme(platform: PlatformType, deviceOS: ReturnType<typeof getDeviceOS>): string {
  const config = LAUNCH_CONFIG[platform];
  if (platform === "KugouMusic" && deviceOS === "macos") {
    return "mackugou://open";
  }
  if (platform === "QQMusic" && (deviceOS === "ios" || deviceOS === "android" || deviceOS === "windows" || deviceOS === "linux")) {
    return "qqmusic://";
  }
  return config.scheme;
}

export interface PrelaunchOptions {
  /** 静默预启动，不打开网页 fallback */
  silent?: boolean;
}

/** 预启动本地音乐客户端（需用户主动点击） */
export async function prelaunchApp(platform: PlatformType, options?: PrelaunchOptions): Promise<void> {
  const deviceOS = getDeviceOS();
  const config = LAUNCH_CONFIG[platform];
  const scheme = resolveLaunchScheme(platform, deviceOS);
  const silent = options?.silent ?? false;
  const mobileQQ = platform === "QQMusic" && isMobileQQMusicTarget();

  console.log(`[Prelaunch] Platform: ${platform}, OS: ${deviceOS}`);

  if (!scheme) {
    if (!silent) {
      if (!(await dispatchExternalUrl(config.webFallback))) {
        window.open(config.webFallback, "_blank", "noopener,noreferrer");
      }
    }
    return;
  }

  if (mobileQQ) {
    await openDeepLink(scheme, { background: true });
    return;
  }

  await waitForAppUrlOpener();

  if (await dispatchAppUrl(scheme)) {
    console.log(`[Prelaunch] Launched via shell: ${scheme}`);
    return;
  }

  let hasFallenBack = false;
  let appLaunched = false;

  const fallbackToWeb = async (reason: string) => {
    if (hasFallenBack || silent) return;
    hasFallenBack = true;
    clearTimeout(fallbackTimer);
    window.removeEventListener("blur", handleBlur);
    console.log(`[Prelaunch] Fallback to web (${reason})`);
    if (!(await dispatchExternalUrl(config.webFallback))) {
      window.open(config.webFallback, "_blank", "noopener,noreferrer");
    }
  };

  const handleBlur = () => {
    appLaunched = true;
  };

  window.addEventListener("blur", handleBlur);

  try {
    await openDeepLink(scheme);
  } catch (e) {
    console.warn("[Prelaunch] Direct launch failed:", e);
    await fallbackToWeb("exception thrown");
    return;
  }

  const fallbackTimer = setTimeout(() => {
    window.removeEventListener("blur", handleBlur);
    if (!appLaunched && !hasFallenBack) {
      void fallbackToWeb("app not detected");
    }
  }, 700);
}
