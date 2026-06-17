import { useThemeStore, type Theme } from "../lib/theme-store";
import { Sun, Moon, ArrowLeft } from "lucide-react";
import { Link } from "react-router";

export default function Settings() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* 顶部导航 */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl border-b transition-colors duration-300"
        style={{
          background: "color-mix(in srgb, var(--bg-secondary), transparent 20%)",
          borderColor: "var(--border-color)",
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
      </main>
    </div>
  );
}
