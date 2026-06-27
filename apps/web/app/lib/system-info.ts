import type { TFunction } from "i18next";
import { setNativeDeviceOS, type DeviceOS } from "@spindeck/player";
import { isTauri } from "./is-tauri";

export type SystemInfo = {
  os: string;
  osVersion: string;
  arch: string;
  runtime: string;
  browser: string;
  browserVersion: string;
  engine: string;
};

const OS_LABELS: Record<string, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
  ios: "iOS",
  android: "Android",
};

const WEBVIEW_LABELS: Record<string, string> = {
  macos: "WebKit (WKWebView)",
  windows: "WebView2",
  linux: "WebKitGTK",
};

const OS_TYPE_MAP: Record<string, DeviceOS> = {
  macos: "macos",
  windows: "windows",
  linux: "linux",
  android: "android",
  ios: "ios",
};

function hasTauriOsPlugin(): boolean {
  return isTauri() && "__TAURI_OS_PLUGIN_INTERNALS__" in window;
}

function formatArch(arch: string): string {
  switch (arch) {
    case "x86_64":
      return "x64";
    case "aarch64":
      return "ARM64";
    case "x86":
      return "x86";
    default:
      return arch;
  }
}

function parseBrowserFromUserAgent(ua: string, unknown: string) {
  let browser = unknown;
  let browserVersion = "";

  if (ua.includes("Firefox") && !ua.includes("Seamonkey")) {
    browser = "Firefox";
    const match = /Firefox\/(\d+(?:\.\d+)?)/.exec(ua);
    if (match?.[1]) browserVersion = match[1];
  } else if (ua.includes("Edg/")) {
    browser = "Edge";
    const match = /Edg\/(\d+(?:\.\d+)?)/.exec(ua);
    if (match?.[1]) browserVersion = match[1];
  } else if (ua.includes("Chrome") && !ua.includes("Edg/")) {
    browser = "Chrome";
    const match = /Chrome\/(\d+(?:\.\d+)?)/.exec(ua);
    if (match?.[1]) browserVersion = match[1];
  } else if (ua.includes("Safari") && !ua.includes("Chrome") && !ua.includes("Chromium")) {
    browser = "Safari";
    const match = /Version\/(\d+(?:\.\d+)?)/.exec(ua);
    if (match?.[1]) browserVersion = match[1];
  }

  let engine = unknown;
  if (ua.includes("AppleWebKit")) engine = "WebKit";
  if (ua.includes("Gecko/") && !ua.includes("AppleWebKit")) engine = "Gecko";
  if (ua.includes("Presto")) engine = "Presto";
  if (ua.includes("Trident")) engine = "Trident";

  return { browser, browserVersion, engine };
}

function parseOsFromPlatform(navigatorLike: Navigator, unknown: string): { os: string; osVersion: string } | null {
  const platform = navigatorLike.userAgentData?.platform ?? navigatorLike.platform;
  if (/Win/i.test(platform)) return { os: "Windows", osVersion: "" };
  if (/Mac/i.test(platform)) return { os: "macOS", osVersion: "" };
  if (/Linux/i.test(platform)) return { os: "Linux", osVersion: "" };
  if (/Android/i.test(platform)) return { os: "Android", osVersion: "" };
  if (/iPhone|iPad|iPod/i.test(platform)) return { os: "iOS", osVersion: "" };
  return platform ? { os: platform, osVersion: "" } : { os: unknown, osVersion: "" };
}

async function parseOsFromUserAgentData(
  navigatorLike: Navigator,
): Promise<{ os: string; osVersion: string; arch: string } | null> {
  const uaData = navigatorLike.userAgentData;
  if (!uaData) return null;

  try {
    const hints = await uaData.getHighEntropyValues(["platform", "platformVersion", "architecture"]);
    const platform = hints.platform?.toLowerCase() ?? uaData.platform.toLowerCase();
    const arch = hints.architecture ? formatArch(hints.architecture) : "";

    if (platform.includes("win")) {
      const major = hints.platformVersion?.split(".")[0];
      const versionLabel =
        major === "15" ? "11" : major === "10" ? "10" : hints.platformVersion ?? "";
      return { os: "Windows", osVersion: versionLabel, arch };
    }

    if (platform.includes("mac")) {
      return { os: "macOS", osVersion: hints.platformVersion ?? "", arch };
    }

    if (platform.includes("android")) {
      return { os: "Android", osVersion: hints.platformVersion ?? "", arch };
    }

    if (platform.includes("linux")) {
      return { os: "Linux", osVersion: hints.platformVersion ?? "", arch };
    }
  } catch {
    return null;
  }

  return null;
}

function parseOsFromUserAgent(ua: string, unknown: string): { os: string; osVersion: string } {
  if (/Android/i.test(ua)) {
    const match = /Android (\d+(?:\.\d+)?)/.exec(ua);
    return { os: "Android", osVersion: match?.[1] ?? "" };
  }

  if (/iPhone|iPad|iPod/i.test(ua)) {
    const match = /OS (\d+(?:_\d+)?(?:_\d+)?)/.exec(ua);
    return { os: "iOS", osVersion: match?.[1]?.replace(/_/g, ".") ?? "" };
  }

  if (/Windows/i.test(ua)) {
    let osVersion = "";
    if (/Windows NT 10\.0/.test(ua)) osVersion = "10/11";
    else if (/Windows NT 6\.3/.test(ua)) osVersion = "8.1";
    else if (/Windows NT 6\.2/.test(ua)) osVersion = "8";
    else if (/Windows NT 6\.1/.test(ua)) osVersion = "7";
    return { os: "Windows", osVersion };
  }

  if (/Mac OS X|Macintosh/i.test(ua)) {
    const match = /Mac OS X (\d+[._]\d+(?:[._]\d+)?)/.exec(ua);
    return { os: "macOS", osVersion: match?.[1]?.replace(/_/g, ".") ?? "" };
  }

  if (/Linux/i.test(ua)) {
    return { os: "Linux", osVersion: "" };
  }

  return { os: unknown, osVersion: "" };
}

async function collectBrowserSystemInfo(t: TFunction): Promise<SystemInfo> {
  const unknown = t("settings.device_info.unknown");
  const navigatorLike = typeof navigator !== "undefined" ? navigator : undefined;

  if (!navigatorLike) {
    return {
      os: unknown,
      osVersion: "",
      arch: "",
      runtime: t("settings.device_info.web_app"),
      browser: unknown,
      browserVersion: "",
      engine: unknown,
    };
  }

  const ua = navigatorLike.userAgent;
  const fromHints = await parseOsFromUserAgentData(navigatorLike);
  const fromPlatform = fromHints ? null : parseOsFromPlatform(navigatorLike, unknown);
  const { os, osVersion } = fromHints ?? fromPlatform ?? parseOsFromUserAgent(ua, unknown);
  const arch = fromHints?.arch ?? "";
  const { browser, browserVersion, engine } = parseBrowserFromUserAgent(ua, unknown);

  return {
    os,
    osVersion,
    arch,
    runtime: t("settings.device_info.web_app"),
    browser,
    browserVersion,
    engine,
  };
}

async function collectTauriSystemInfo(t: TFunction): Promise<SystemInfo> {
  const unknown = t("settings.device_info.unknown");

  try {
    const { arch, type, version } = await import("@tauri-apps/plugin-os");

    const osType = type();
    const osLabel = OS_LABELS[osType] ?? osType;
    const webviewLabel = WEBVIEW_LABELS[osType] ?? unknown;

    return {
      os: osLabel,
      osVersion: version(),
      arch: formatArch(arch()),
      runtime: t("settings.device_info.desktop_app"),
      browser: webviewLabel,
      browserVersion: "",
      engine: webviewLabel,
    };
  } catch {
    const fallback = await collectBrowserSystemInfo(t);
    return {
      ...fallback,
      runtime: t("settings.device_info.desktop_app"),
    };
  }
}

export async function collectSystemInfo(t: TFunction): Promise<SystemInfo> {
  if (hasTauriOsPlugin()) {
    return collectTauriSystemInfo(t);
  }
  return collectBrowserSystemInfo(t);
}

export async function bootstrapNativeDeviceOS(): Promise<void> {
  if (!isTauri()) return;

  try {
    const { type } = await import("@tauri-apps/plugin-os");
    setNativeDeviceOS(OS_TYPE_MAP[type()] ?? null);
  } catch {
    // 插件不可用时保留 UA / platform 检测，不写入错误 override
  }
}

export async function getAppVersionLabel(): Promise<string | null> {
  if (!isTauri()) return null;

  let tauriVersion: string | null = null;
  try {
    const { getVersion } = await import("@tauri-apps/api/app");
    tauriVersion = await getVersion();
  } catch {
    // fall through — still try build info
  }

  try {
    const res = await fetch("/BUILD_INFO.json", { cache: "no-store" });
    if (res.ok) {
      const info = (await res.json()) as { version?: string; commit?: string };
      const version = info.version ?? tauriVersion;
      const commit = info.commit?.slice(0, 7);
      if (version && commit) return `v${version} (${commit})`;
      if (version) return `v${version}`;
    }
  } catch {
    // ignore
  }

  return tauriVersion ? `v${tauriVersion}` : null;
}
