import { useThemeStore } from "../lib/theme-store";
import { useState } from "react";
import { ArrowLeft, Monitor, Check, Sun, Moon, ExternalLink, ShieldAlert, X } from "lucide-react";

const GithubIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const DouyinIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-5 h-5"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .8.11V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.51A6.25 6.25 0 0 0 15.82 16V8.5a8.29 8.29 0 0 0 5.18 1.81V6.82a4.79 4.79 0 0 1-1.41-.13z" />
  </svg>
);
import { Link } from "react-router";
import { THEME_CONFIGS, THEMES, type AppearanceMode, type ThemeType } from "@spindeck/ui";

// 获取系统信息的辅助函数
function getSystemInfo() {
  if (typeof navigator === "undefined") return { os: "未知", osVersion: "", browser: "未知", browserVersion: "" };
  const ua = navigator.userAgent;
  let os = "未知系统";
  let osVersion = "";

  if (ua.includes("Mac OS X")) {
    os = "macOS";
    const match = /Mac OS X (\d+[._]\d+(?:[._]\d+)?)/.exec(ua);
    if (match) osVersion = match[1].replace(/_/g, ".");
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
      if (match) osVersion = match[1];
    }
  } else if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) {
    os = "iOS";
    const match = /OS (\d+(?:_\d+)?(?:_\d+)?)/.exec(ua);
    if (match) osVersion = match[1].replace(/_/g, ".");
  }

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

  // 检测内核
  let engine = "未知内核";
  if (ua.includes("AppleWebKit")) engine = "WebKit";
  if (ua.includes("Gecko") && !ua.includes("WebKit")) engine = "Gecko";
  if (ua.includes("Presto")) engine = "Presto";
  if (ua.includes("Trident")) engine = "Trident";

  return { os, osVersion, browser, browserVersion, engine };
}

export default function Settings() {
  const { theme, setTheme, mode, setMode, resolvedMode } = useThemeStore();
  const systemInfo = getSystemInfo();
  const [confirmLink, setConfirmLink] = useState<{ url: string; title: string } | null>(null);

  const handleLinkClick = (e: React.MouseEvent, url: string, title: string) => {
    e.preventDefault();
    setConfirmLink({ url, title });
  };

  const confirmJump = () => {
    if (confirmLink) {
      window.open(confirmLink.url, '_blank', 'noopener,noreferrer');
      setConfirmLink(null);
    }
  };

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* 顶部导航 */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl transition-all duration-300"
        style={{
          background: "color-mix(in srgb, var(--bg-secondary), transparent 20%)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="group flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
            style={{ 
              background: "var(--bg-tertiary)",
              boxShadow: "var(--shadow-raised)",
              border: "1px solid var(--border-highlight)"
            }}
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" style={{ color: "var(--text-primary)" }} />
          </Link>

          <h1
            className="font-bold text-lg tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            设置
          </h1>

          <div className="w-10" /> {/* 保持居中对齐的占位 */}
        </div>
      </header>

      {/* 设置内容 */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 外观模式设置 */}
        <section>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            外观模式
          </h2>
          <div
            className="rounded-2xl border p-1.5 flex gap-1.5 transition-colors duration-300"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-color)",
            }}
          >
            {[
              { id: 'light', name: '浅色', icon: Sun },
              { id: 'dark', name: '深色', icon: Moon },
              { id: 'system', name: '系统', icon: Monitor },
            ].map((item) => {
              const isActive = mode === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setMode(item.id as AppearanceMode)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                  style={
                    isActive
                      ? {
                          background: "var(--bg-tertiary)",
                          color: "var(--text-primary)",
                          boxShadow: "var(--shadow-raised)",
                        }
                      : { color: "var(--text-muted)" }
                  }
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* 主题族设置 */}
        <section className="mt-8">
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            主题风格
          </h2>
          <div
            className="rounded-2xl border overflow-hidden transition-colors duration-300"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="p-4 grid grid-cols-2 gap-4">
              {Object.entries(THEME_CONFIGS).map(([id, cfg]) => {
                const isActive = theme === id;
                const previewColor = resolvedMode === 'dark' ? cfg.preview.dark : cfg.preview.light;
                
                return (
                  <button
                    key={id}
                    onClick={() => setTheme(id as ThemeType)}
                    className={`group relative flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-300 cursor-pointer text-left ${
                      isActive ? "scale-[1.02]" : "hover:scale-[1.01]"
                    }`}
                    style={{
                      background: isActive ? "var(--bg-tertiary)" : "var(--surface-color)",
                      borderColor: isActive ? "var(--text-secondary)" : "var(--border-color)",
                      boxShadow: isActive ? "var(--shadow-raised)" : "var(--shadow-card)",
                    }}
                  >
                    {/* 预览小样 */}
                    <div 
                      className="w-full aspect-video rounded-lg border flex flex-col gap-1.5 p-2 overflow-hidden transition-colors"
                      style={{ 
                        background: previewColor,
                        borderColor: resolvedMode === 'dark' ? "#0f0d0c" : "#ebe3d5"
                      }}
                    >
                      <div className="w-2/3 h-2 rounded-full" style={{ background: resolvedMode === 'dark' ? "#e8e2d9" : "#4a3f35", opacity: 0.8 }} />
                      <div className="w-full h-2 rounded-full" style={{ background: resolvedMode === 'dark' ? "#b5a48b" : "#8c7e6d", opacity: 0.4 }} />
                      <div className="mt-auto flex gap-1">
                        <div className="w-4 h-4 rounded-md" style={{ background: resolvedMode === 'dark' ? "#2d2824" : "#ebe3d5" }} />
                        <div className="w-4 h-4 rounded-md" style={{ background: resolvedMode === 'dark' ? "#2d2824" : "#ebe3d5" }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {cfg.name}
                      </span>
                      {isActive && (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
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
            className="rounded-2xl border overflow-hidden transition-colors duration-300"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                SpinDeck — 音乐歌单管理工具
              </p>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                当前版本 v0.1.0
              </p>
            </div>
            
            <a
              href="https://github.com/dongguacute/SpinDeck"
              onClick={(e) => handleLinkClick(e, "https://github.com/dongguacute/SpinDeck", "GitHub 项目地址")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-5 py-4 hover:bg-(--bg-tertiary) transition-colors duration-200 group cursor-pointer"
              style={{ borderBottom: "1px solid var(--border-color)" }}
            >
              <div className="flex items-center gap-3" style={{ color: "var(--text-secondary)" }}>
                <GithubIcon />
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                  GitHub 项目地址
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  查看源码
                </span>
                <ArrowLeft className="w-4 h-4 rotate-180 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" style={{ color: "var(--text-muted)" }} />
              </div>
            </a>

            <a
              href="https://v.douyin.com/fPdV873AnKo"
              onClick={(e) => handleLinkClick(e, "https://v.douyin.com/fPdV873AnKo", "作者抖音主页")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-5 py-4 hover:bg-(--bg-tertiary) transition-colors duration-200 group cursor-pointer"
            >
              <div className="flex items-center gap-3" style={{ color: "var(--text-secondary)" }}>
                <DouyinIcon />
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                  作者抖音主页
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  关注作者
                </span>
                <ArrowLeft className="w-4 h-4 rotate-180 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" style={{ color: "var(--text-muted)" }} />
              </div>
            </a>
          </div>
        </section>

        {/* 免责声明 */}
        <section className="mt-8">
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            免责声明
          </h2>
          <div
            className="rounded-2xl border px-5 py-4 transition-colors duration-300"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="flex gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
              <div className="space-y-2">
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  仅供个人学习使用
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  本项目仅作为个人学习和技术交流使用，不得用于任何商业用途。
                  所有媒体内容和数据均由第三方服务提供，本项目不托管也不存储任何受版权保护的音乐文件。
                </p>
              </div>
            </div>
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
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--border-color)" }}
            >
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

            {/* 内核 */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                  内核
                </span>
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                {systemInfo.engine}
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* 跳转确认弹窗 */}
      {confirmLink && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 backdrop-blur-sm transition-opacity duration-300" 
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setConfirmLink(null)}
          />
          <div 
            className="relative w-full max-w-sm border rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200"
            style={{ 
              background: "var(--bg-tertiary)", 
              borderColor: "var(--border-color)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <ExternalLink className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                外部链接确认
              </h3>
              <button
                onClick={() => setConfirmLink(null)}
                className="p-2 rounded-xl transition-all cursor-pointer hover:bg-(--surface-hover)"
                style={{ color: "var(--text-muted)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                您即将离开 SpinDeck，前往：
              </p>
              <div 
                className="mt-2 p-3 rounded-xl border text-xs break-all font-mono"
                style={{ 
                  background: "var(--bg-secondary)", 
                  borderColor: "var(--border-color)",
                  color: "var(--text-muted)"
                }}
              >
                {confirmLink.url}
              </div>
              <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
                请确保您信任该链接。
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLink(null)}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer border hover:bg-(--surface-hover)"
                style={{ 
                  borderColor: "var(--border-color)",
                  color: "var(--text-secondary)"
                }}
              >
                取消
              </button>
              <button
                onClick={confirmJump}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer text-white hover:opacity-90 active:scale-95"
                style={{ 
                  background: "var(--text-primary)",
                  color: "var(--bg-primary)",
                  boxShadow: "var(--shadow-raised)"
                }}
              >
                确认前往
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
