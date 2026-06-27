import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import { useEffect } from "react";
import { useThemeStore } from "./lib/theme-store";
import { useBackgroundRefresh } from "./lib/use-background-refresh";
import i18n from "./i18n";
import spinDeckLogo from "./assets/icons/SpinDeckLogo.svg?url";

import "./app.css";

const LANGUAGE_KEY = 'spindeck_language';

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: spinDeckLogo },
  { rel: "apple-touch-icon", href: spinDeckLogo },
];

export function meta(): Route.MetaDescriptors {
  return [{ title: "SpinDeck" }];
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();
  useBackgroundRefresh();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

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
    <html lang={i18n.language} data-theme={theme} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
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
