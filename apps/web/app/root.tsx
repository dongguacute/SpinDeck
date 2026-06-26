import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { useEffect } from "react";
import { useThemeStore } from "./lib/theme-store";
import { useBackgroundRefresh } from "./lib/use-background-refresh";
import i18n from "./i18n";

import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();
  useBackgroundRefresh();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

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
