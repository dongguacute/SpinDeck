import { useThemeStore, type Theme } from "../lib/theme-store";
import { Sun, Moon, ArrowLeft, Monitor } from "lucide-react";
import { Link } from "react-router";

// 获取系统信息的辅助函数
function getSystemInfo() {
  const ua = navigator.userAgent;
  let os = "未知系统";
  let osVersion = "";

  // 检测操作系统
  if (ua.includes("Mac OS X")) {
    os = "macOS";
    const match = /Mac OS X (\d+[._]\d+(?:[._]\d+)?)/.exec(ua);
    if (match) {
      osVersion = match[1].replace(/_/g, ".");
    }
  } else if (ua.includes("Windows")) {
    os = "Windows";
    if (ua.includes("Windows NT 10.0")) osVersion = "10/11";
    else if (ua.includes("Windows NT 6.3")) osVersion = "8.1";
    else if (ua.includes("Windows NT 6.2")) osVersion = "8";
    else if (ua.includes("Windows NT 6.1")) osVersion = "7";
  } else if (ua.includes("Linux")) {
    os = "Linux";
    if (ua.includes("Android")) {
      os = "Android";
      const match = /Android (\d+(?:\.\d+)?)/.exec(ua);
      if (match) {
        osVersion = match[1];
      }
    }
  } else if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) {
    os = "iOS";
    const match = /OS (\d+(?:_\d+)?(?:_\d+)?)/.exec(ua);
    if (match) {
      osVersion = match[1].replace(/_/g, ".");
    }
  }

  // 检测浏览器及内核版本
  let browser = "未知浏览器";
  let browserVersion = "";
  if (ua.includes("Firefox") && !ua.includes("Seamonkey")) {
    browser = "Firefox";
    const match = /Firefox\/(\d+(?:\.\d+)?)/.exec(ua);
    if (match) browserVersion = match[1];
  } else if (ua.includes("Edg")) {
    browser = "Edge";
    const match = /Edg(?:e)?\/(\d+(?:\.\d+)?)/.exec(ua);
    if (match) browserVersion = match[1];
  } else if (ua.includes("Chrome") && !ua.includes("Edg")) {
    browser = "Chromium";
    const match = /Chrome\/(\d+(?:\.\d+)?)/.exec(ua);
    if (match) browserVersion = match[1];
  } else if (ua.includes("Safari") && !ua.includes("Chrome") && !ua.includes("Chromium")) {
    browser = "Safari";
    const match = /Version\/(\d+(?:\.\d+)?)/.exec(ua);
    if (match) browserVersion = match[1];
  }

  return { os, osVersion, browser, browserVersion };
}

export default function Settings() {
  const { theme, setTheme } = useThemeStore();
  const systemInfo = getSystemInfo();

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* 顶部导航 */}
      <header
        className="sticky top-0 z-40 border-b transition-colors duration-300"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-color)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            返回主页
          </Link>
          <h1
            className="font-semibold text-base tracking-wide"
            style={{ color: "var(--text-primary)" }}
          >
            设置
          </h1>
          <div className="w-16" /> {/* 占位保持居中 */}
        </div>
      </header>

      {/* 设置内容 */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 外观设置 */}
        <section>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            外观
          </h2>

          <div
            className="rounded-2xl border overflow-hidden transition-colors duration-300"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-color)",
            }}
          >
            {/* 主题切换 */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-full flex items-center justify-between px-5 py-4 cursor-pointer transition-colors duration-200 text-left"
              style={{
                color: "var(--text-primary)",
                borderBottom: "1px solid var(--border-color)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--surface-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div className="flex items-center gap-3">
                {theme === "dark" ? (
                  <Moon className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
                ) : (
                  <Sun className="w-5 h-5" style={{ color: "#f59e0b" }} />
                )}
                <div>
                  <p className="text-sm font-medium">主题模式</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    当前: {theme === "dark" ? "深色模式" : "浅色模式"}
                  </p>
                </div>
              </div>

              {/* 切换开关 */}
              <div
                className="relative w-12 h-7 rounded-full transition-colors duration-300"
                style={{
                  background:
                    theme === "dark"
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(59,130,246,0.4)",
                }}
              >
                <div
                  className="absolute top-1 w-5 h-5 rounded-full shadow-md transition-transform duration-300 flex items-center justify-center"
                  style={{
                    left: theme === "dark" ? "4px" : "calc(100% - 24px)",
                    background: theme === "dark" ? "#e5e7eb" : "#fff",
                    transform: "translateX(0)",
                  }}
                >
                  {theme === "dark" ? (
                    <Moon className="w-3 h-3" color="#6b7280" />
                  ) : (
                    <Sun className="w-3 h-3" color="#f59e0b" />
                  )}
                </div>
              </div>
            </button>

            {/* 选项卡 */}
            <div className="flex p-2 gap-1">
              {(["dark", "light"] as Theme[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setTheme(mode)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    theme === mode ? "" : ""
                  }`}
                  style={
                    theme === mode
                      ? {
                          background: "var(--surface-hover)",
                          color: "var(--text-primary)",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                        }
                      : { color: "var(--text-muted)" }
                  }
                  onMouseEnter={(e) => {
                    if (theme !== mode)
                      e.currentTarget.style.background = "var(--surface-color)";
                  }}
                  onMouseLeave={(e) => {
                    if (theme !== mode)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  {mode === "dark" ? (
                    <Moon className="w-4 h-4" />
                  ) : (
                    <Sun className="w-4 h-4" />
                  )}
                  {mode === "dark" ? "深色" : "浅色"}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 关于信息 */}
        <section className="mt-8">
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            关于
          </h2>
          <div
            className="rounded-2xl border px-5 py-4 transition-colors duration-300"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-color)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              SpinDeck — 音乐歌单管理工具
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              管理你的音乐收藏，打造专属播放列表
            </p>
          </div>
        </section>

        {/* 设备信息 */}
        <section className="mt-8">
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            设备信息
          </h2>
          <div
            className="rounded-2xl border overflow-hidden transition-colors duration-300"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-color)",
            }}
          >
            {/* 操作系统 */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--border-color)" }}
            >
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                  系统
                </span>
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                {systemInfo.os} {systemInfo.osVersion && `v${systemInfo.osVersion}`}
              </span>
            </div>

            {/* 浏览器 */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                  浏览器
                </span>
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                {systemInfo.browser}
                {systemInfo.browserVersion && ` v${systemInfo.browserVersion}`}
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
