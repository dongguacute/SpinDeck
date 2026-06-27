import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import { useEffect, useState } from "react";
import { useThemeStore, THEME_BOOTSTRAP_SCRIPT } from "./lib/theme-store";
import { useBackgroundRefresh } from "./lib/use-background-refresh";
import { isTauri } from "./lib/is-tauri";
import { bootstrapNativeDeviceOS } from "./lib/system-info";
import { ensureExternalOpenersReady } from "./lib/open-external";
import { bootstrapAccessibilityHandler } from "./lib/accessibility";
import { DesktopDragRegion } from "./components/DesktopDragRegion";
import i18n from "./i18n";
import spinDeckLogo from "./assets/icons/SpinDeckLogo.svg?url";

import "./app.css";

const LANGUAGE_KEY = 'spindeck_language';

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
    void ensureExternalOpenersReady();
    void (async () => {
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
    if (savedLanguage && (savedLanguage === 'zh-Hans' || savedLanguage === 'en')) {
      if (i18n.language !== savedLanguage) {
        i18n.changeLanguage(savedLanguage);
      }
    } else {
      const browserLang = navigator.language;
      const targetLang = browserLang.startsWith('zh') ? 'zh-Hans' : 'en';
      if (i18n.language !== targetLang) {
        i18n.changeLanguage(targetLang);
      }
    }
  }, []);

  return (
    <html lang={i18n.language} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
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
