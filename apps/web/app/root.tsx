import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from "react-router";
import type { Route } from "./+types/root";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useThemeStore, THEME_BOOTSTRAP_SCRIPT } from "./lib/theme-store";
import { useBackgroundRefresh } from "./lib/use-background-refresh";
import { isTauri } from "./lib/is-tauri";
import { bootstrapNativeDeviceOS } from "./lib/system-info";
import { ensureExternalOpenersReady } from "./lib/open-external";
import { bootstrapAccessibilityHandler } from "./lib/accessibility";
import { bootstrapDesktopBridge } from "./lib/desktop-bridge";
import {
  initLogger,
  installGlobalErrorHandlers,
  logger,
} from "./lib/logger";
import { DesktopDragRegion } from "./components/DesktopDragRegion";
import i18n from "./i18n";
import spinDeckLogo from "./assets/icons/SpinDeckLogo.svg?url";

import "./app.css";

const LANGUAGE_KEY = "spindeck_language";

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: spinDeckLogo },
];

export function meta(): Route.MetaDescriptors {
  return [{ title: "SpinDeck" }];
}

export function Layout({ children }: { children: React.ReactNode }) {
  // Keep hook mounted at layout level so theme DOM stays in sync on every route.
  useThemeStore();
  useBackgroundRefresh();
  const [showDragRegion, setShowDragRegion] = useState(false);

  useEffect(() => {
    void initLogger().then(() => {
      installGlobalErrorHandlers();
    });
    void ensureExternalOpenersReady();
    void (async () => {
      await bootstrapDesktopBridge();
      await bootstrapNativeDeviceOS();
      await ensureExternalOpenersReady();
      void bootstrapAccessibilityHandler();
      const { getDeviceOS } = await import("@spindeck/player");
      if (isTauri() && getDeviceOS() === "macos") {
        document.documentElement.setAttribute("data-tauri-overlay", "");
        setShowDragRegion(true);
      }
    })();
  }, []);

  // 客户端挂载后，根据本地存储或浏览器语言切换语言
  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage && (savedLanguage === "zh-Hans" || savedLanguage === "en")) {
      if (i18n.language !== savedLanguage) {
        i18n.changeLanguage(savedLanguage);
      }
    } else {
      const browserLang = navigator.language;
      const targetLang = browserLang.startsWith("zh") ? "zh-Hans" : "en";
      if (i18n.language !== targetLang) {
        i18n.changeLanguage(targetLang);
      }
    }
  }, []);

  return (
    <html lang={i18n.language} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        {showDragRegion ? <DesktopDragRegion /> : null}
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

/** SPA build-time shell while client hydrates */
export function HydrateFallback() {
  return null;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t } = useTranslation("common");

  useEffect(() => {
    if (isRouteErrorResponse(error)) {
      logger.error(
        "[ErrorBoundary] route error",
        error.status,
        error.statusText,
        error.data,
      );
      return;
    }
    if (error instanceof Error) {
      logger.error("[ErrorBoundary]", error.message, error.stack);
      return;
    }
    logger.error("[ErrorBoundary] unknown error", error);
  }, [error]);

  return (
    <div
      className="min-h-screen desktop-page-chrome flex flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <h1
        className="text-2xl font-semibold tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        {t("error_boundary.title")}
      </h1>
      <p className="max-w-md text-sm" style={{ color: "var(--text-muted)" }}>
        {t("error_boundary.description")}
      </p>
      <button
        type="button"
        className="mt-2 rounded-2xl px-6 py-3 text-sm font-bold border cursor-pointer"
        style={{
          backgroundColor: "var(--bg-tertiary)",
          color: "var(--text-primary)",
          borderColor: "var(--border-highlight)",
        }}
        onClick={() => {
          window.location.reload();
        }}
      >
        {t("error_boundary.reload")}
      </button>
    </div>
  );
}
