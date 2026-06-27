import { h } from "vue";
import DefaultTheme from "vitepress/theme";
import type { Theme as ThemeConfig } from "vitepress";
import { inBrowser } from "vitepress";
import { NolebaseGitChangelogPlugin } from "@nolebase/vitepress-plugin-git-changelog/client";
import { NolebaseInlineLinkPreviewPlugin } from "@nolebase/vitepress-plugin-inline-link-preview/client";
import { NolebaseHighlightTargetedHeading } from "@nolebase/vitepress-plugin-highlight-targeted-heading/client";
import {
  NolebaseEnhancedReadabilitiesMenu,
  NolebaseEnhancedReadabilitiesScreenMenu,
} from "@nolebase/vitepress-plugin-enhanced-readabilities/client";
import FooterYearUpdater from "./components/FooterYearUpdater.vue";
import LocaleCookieSync from "./components/LocaleCookieSync.vue";
import { resolveLocaleHomePath } from "./locale-redirect";

import "@nolebase/vitepress-plugin-git-changelog/client/style.css";
import "@nolebase/vitepress-plugin-inline-link-preview/client/style.css";
import "@nolebase/vitepress-plugin-enhanced-mark/client/style.css";
import "@nolebase/vitepress-plugin-highlight-targeted-heading/client/style.css";
import "@nolebase/vitepress-plugin-enhanced-readabilities/client/style.css";

/* Cafe theme overrides must load after VitePress default theme styles */
import "./styles/cafe.css";
import "./styles/main.css";

function isRootPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/index\.html$/, "").replace(/\/$/, "");
  return normalized === "";
}

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      "layout-top": () => [h(NolebaseHighlightTargetedHeading)],
      "nav-bar-content-after": () => h(NolebaseEnhancedReadabilitiesMenu),
      "nav-screen-content-after": () => h(NolebaseEnhancedReadabilitiesScreenMenu),
      "layout-bottom": () => [h(LocaleCookieSync), h(FooterYearUpdater)],
    });
  },
  enhanceApp({ app, router }) {
    app.use(NolebaseGitChangelogPlugin);
    app.use(NolebaseInlineLinkPreviewPlugin);

    if (inBrowser) {
      router.onBeforeRouteChange = async (href) => {
        const url = new URL(href, "http://localhost");
        if (isRootPath(url.pathname)) {
          const target = resolveLocaleHomePath();
          window.location.replace(target + url.search + url.hash);
          return false;
        }
      };
    }
  },
} satisfies ThemeConfig;
