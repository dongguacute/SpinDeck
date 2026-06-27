import type { TFunction } from "i18next";
import type { DeviceOS } from "@spindeck/player";
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
    if (match) browserVersion = match[1];
  } else if (ua.includes("Edg/")) {
    browser = "Edge";
    const match = /Edg\/(\d+(?:\.\d+)?)/.exec(ua);
    if (match) browserVersion = match[1];
  } else if (ua.includes("Chrome") && !ua.includes("Edg/")) {
    browser = "Chrome";
    const match = /Chrome\/(\d+(?:\.\d+)?)/.exec(ua);
    if (match) browserVersion = match[1];
  } else if (ua.includes("Safari") && !ua.includes("Chrome") && !ua.includes("Chromium")) {
    browser = "Safari";
    const match = /Version\/(\d+(?:\.\d+)?)/.exec(ua);
    if (match) browserVersion = match[1];
  }

  let engine = unknown;
  if (ua.includes("AppleWebKit")) engine = "WebKit";
  if (ua.includes("Gecko/") && !ua.includes("AppleWebKit")) engine = "Gecko";
  if (ua.includes("Presto")) engine = "Presto";
  if (ua.includes("Trident")) engine = "Trident";

  return { browser, browserVersion, engine };
}

async function parseOsFromUserAgentData(): Promise<{ os: string; osVersion: string } | null> {
  const uaData = navigator.userAgentData;
  if (!uaData) return null;

  try {
    const hints = await uaData.getHighEntropyValues(["platform", "platformVersion"]);
    const platform = hints.platform?.toLowerCase() ?? uaData.platform.toLowerCase();

    if (platform.includes("win")) {
      const major = hints.platformVersion?.split(".")[0];
      const versionLabel =
        major === "15" ? "11" : major === "10" ? "10" : hints.platformVersion ?? "";
      return { os: "Windows", osVersion: versionLabel };
    }

    if (platform.includes("mac")) {
      const version = hints.platformVersion?.replace(/\./g, "_") ?? "";
      return { os: "macOS", osVersion: version.replace(/_/g, ".") };
    }

    if (platform.includes("android")) {
      return { os: "Android", osVersion: hints.platformVersion ?? "" };
    }

    if (platform.includes("linux")) {
      return { os: "Linux", osVersion: hints.platformVersion ?? "" };
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
  if (typeof navigator === "undefined") {
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

  const ua = navigator.userAgent;
  const fromHints = await parseOsFromUserAgentData();
  const { os, osVersion } = fromHints ?? parseOsFromUserAgent(ua, unknown);
  const { browser, browserVersion, engine } = parseBrowserFromUserAgent(ua, unknown);

  return {
    os,
    osVersion,
    arch: "",
    runtime: t("settings.device_info.web_app"),
    browser,
    browserVersion,
    engine,
  };
}

async function collectTauriSystemInfo(t: TFunction): Promise<SystemInfo> {
  const unknown = t("settings.device_info.unknown");
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
}

export async function collectSystemInfo(t: TFunction): Promise<SystemInfo> {
  if (isTauri()) {
    return collectTauriSystemInfo(t);
  }
  return collectBrowserSystemInfo(t);
}

export async function bootstrapNativeDeviceOS(): Promise<void> {
  if (!isTauri()) return;

  const [{ type }, { setNativeDeviceOS }] = await Promise.all([
    import("@tauri-apps/plugin-os"),
    import("@spindeck/player"),
  ]);

  const osMap: Record<string, DeviceOS> = {
    macos: "macos",
    windows: "windows",
    linux: "linux",
    android: "android",
    ios: "ios",
  };

  setNativeDeviceOS(osMap[type()] ?? null);
}

export async function getAppVersionLabel(): Promise<string | null> {
  if (!isTauri()) return null;

  const { getVersion } = await import("@tauri-apps/api/app");
  const version = await getVersion();
  return `v${version}`;
}
