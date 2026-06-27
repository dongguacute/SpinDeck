import { readFileSync } from "node:fs";
import { chdir, cwd } from "node:process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type DefaultTheme } from "vitepress";
import { InlineLinkPreviewElementTransform } from "@nolebase/vitepress-plugin-inline-link-preview/markdown-it";
import { calculateSidebar } from "@nolebase/vitepress-plugin-sidebar";
import { releaseNavButtonLabel } from "./theme/release-nav";

const docsDir = join(dirname(fileURLToPath(import.meta.url)), "..");

function readFrontmatterWeight(filePath: string): number {
  try {
    const content = readFileSync(filePath, "utf-8");
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return Number.POSITIVE_INFINITY;
    const weightMatch = match[1].match(/^weight:\s*(\d+)\s*$/m);
    return weightMatch ? Number(weightMatch[1]) : Number.POSITIVE_INFINITY;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

type SidebarEntry = DefaultTheme.SidebarItem & { index?: string };

function sortSidebarByWeight(
  items: DefaultTheme.SidebarItem[],
): DefaultTheme.SidebarItem[] {
  const sorted = [...items].sort((a, b) => {
    const weightA = a.link
      ? readFrontmatterWeight(join(docsDir, `${a.link.slice(1)}.md`))
      : Number.POSITIVE_INFINITY;
    const weightB = b.link
      ? readFrontmatterWeight(join(docsDir, `${b.link.slice(1)}.md`))
      : Number.POSITIVE_INFINITY;
    if (weightA !== weightB) return weightA - weightB;
    return (a.text ?? "").localeCompare(b.text ?? "");
  });

  return sorted.map((item) =>
    item.items?.length
      ? { ...item, items: sortSidebarByWeight(item.items) }
      : item,
  );
}

function getAutoSidebar(targets: string[]): SidebarEntry[] {
  const previousCwd = cwd();
  chdir(docsDir);
  const sidebar = calculateSidebar(targets);
  chdir(previousCwd);
  if (Array.isArray(sidebar)) return sidebar;
  const first = Object.values(sidebar)[0];
  return Array.isArray(first) ? first : [];
}

function getLocaleGuideSidebar(localeDir: string): DefaultTheme.SidebarItem[] {
  const sidebar = getAutoSidebar([localeDir]);
  const guide = sidebar.find((item) => item.index === "guide");
  const items = guide?.items ?? sidebar;
  return sortSidebarByWeight(items);
}

const footerYear = new Date().getFullYear();

const sharedFooterCopyright = `Copyright © <span class="vp-footer-year">${footerYear}</span> <a href="https://github.com/dongguacute" target="_blank" rel="noopener noreferrer">Cherry Fu</a>`;

const enThemeI18n = {
  outline: { label: "On this page" },
  docFooter: { prev: "Previous page", next: "Next page" },
  darkModeSwitchLabel: "Appearance",
  lightModeSwitchTitle: "Switch to light theme",
  darkModeSwitchTitle: "Switch to dark theme",
  sidebarMenuLabel: "Menu",
  returnToTopLabel: "Return to top",
  langMenuLabel: "Change language",
  skipToContentLabel: "Skip to content",
  notFound: {
    title: "PAGE NOT FOUND",
    quote:
      "But if you don't change your direction, and if you keep looking, you may end up where you are heading.",
    linkLabel: "go to home",
    linkText: "Take me home",
  },
  lastUpdated: {
    text: "Last updated",
    formatOptions: {
      forceLocale: true,
      dateStyle: "short",
      timeStyle: "short",
    },
  },
} as const;

const zhThemeI18n = {
  outline: { label: "本页目录" },
  docFooter: { prev: "上一页", next: "下一页" },
  darkModeSwitchLabel: "外观",
  lightModeSwitchTitle: "切换到浅色模式",
  darkModeSwitchTitle: "切换到深色模式",
  sidebarMenuLabel: "菜单",
  returnToTopLabel: "回到顶部",
  langMenuLabel: "选择语言",
  skipToContentLabel: "跳转到主要内容",
  notFound: {
    title: "页面未找到",
    quote: "找不到你要打开的页面，但也许换个方向就能找到路。",
    linkLabel: "返回首页",
    linkText: "返回首页",
  },
  lastUpdated: {
    text: "最后更新于",
    formatOptions: {
      forceLocale: true,
      dateStyle: "short",
      timeStyle: "short",
    },
  },
} as const;

const socialLinks = [
  { icon: "github", link: "https://github.com/dongguacute/SpinDeck" },
  {
    icon: "youtube",
    link: "https://www.youtube.com/@dongguacute",
    ariaLabel: "YouTube",
  },
  {
    icon: {
      svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .8.11V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.51A6.25 6.25 0 0 0 15.82 16V8.5a8.29 8.29 0 0 0 5.18 1.81V6.82a4.79 4.79 0 0 1-1.41-.13z"/></svg>',
    },
    link: "https://v.douyin.com/fPdV873AnKo",
    ariaLabel: "Douyin",
  },
];

const GITHUB_RELEASES_URL = "https://github.com/dongguacute/SpinDeck/releases";

/** Newest first — add new tags here when publishing releases. */
const RELEASE_VERSIONS = ["v1.0.0-beta.2", "v1.0.0-beta.1"] as const;

function releaseTagUrl(tag: string) {
  return `${GITHUB_RELEASES_URL}/tag/${tag}`;
}

function getDownloadNavItem(
  locale: "en" | "zh",
): DefaultTheme.NavItemWithChildren {
  const latestVersion = RELEASE_VERSIONS[0];
  return {
    text: releaseNavButtonLabel(latestVersion),
    items: [
      ...RELEASE_VERSIONS.map((version) => ({
        text: version,
        link: releaseTagUrl(version),
        noIcon: true,
      })),
      {
        text: locale === "en" ? "All releases" : "全部版本",
        link: GITHUB_RELEASES_URL,
        noIcon: true,
      },
    ],
  };
}

export default defineConfig({
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/SpinDeckLogo.svg" }],
  ],
  markdown: {
    config(md) {
      md.use(InlineLinkPreviewElementTransform);
    },
  },
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    logo: {
      light: "/SpinDeckLogo.svg",
      dark: "/SpinDeckLogo.svg",
      alt: "SpinDeck",
    },
    socialLinks,
    search: {
      provider: "local",
      options: {
        locales: {
          en: {
            translations: {
              button: {
                buttonText: "Search",
                buttonAriaLabel: "Search",
              },
              modal: {
                displayDetails: "Display detailed list",
                resetButtonTitle: "Reset search",
                backButtonTitle: "Close search",
                noResultsText: "No results found",
                footer: {
                  selectText: "Select",
                  selectKeyAriaLabel: "Enter key",
                  navigateText: "Navigate",
                  navigateUpKeyAriaLabel: "Up arrow",
                  navigateDownKeyAriaLabel: "Down arrow",
                  closeText: "Close",
                  closeKeyAriaLabel: "Escape key",
                },
              },
            },
          },
          zh: {
            translations: {
              button: {
                buttonText: "搜索",
                buttonAriaLabel: "搜索",
              },
              modal: {
                displayDetails: "显示详细列表",
                resetButtonTitle: "清除查询条件",
                backButtonTitle: "返回",
                noResultsText: "无法找到相关结果",
                footer: {
                  selectText: "选择",
                  selectKeyAriaLabel: "Enter 键",
                  navigateText: "切换",
                  navigateUpKeyAriaLabel: "上箭头",
                  navigateDownKeyAriaLabel: "下箭头",
                  closeText: "关闭",
                  closeKeyAriaLabel: "Esc 键",
                },
              },
            },
          },
        },
      },
    },
  },
  locales: {
    en: {
      label: "English",
      lang: "en-US",
      link: "/en/",
      title: "SpinDeck",
      description:
        "Cross-platform vinyl visualization player — playlist management and playback control for third-party music apps.",
      themeConfig: {
        nav: [
          {
            text: "Guide",
            link: "/en/guide/getting-started",
            activeMatch: "/en/guide/",
          },
          getDownloadNavItem("en"),
          { text: "GitHub", link: "https://github.com/dongguacute/SpinDeck" },
        ],
        sidebar: getLocaleGuideSidebar("en"),
        footer: {
          message: "Released under the Apache License 2.0.",
          copyright: sharedFooterCopyright,
        },
        editLink: {
          pattern:
            "https://github.com/dongguacute/SpinDeck/edit/main/docs/:path",
          text: "Edit this page on GitHub",
        },
        ...enThemeI18n,
      },
    },
    zh: {
      label: "简体中文",
      lang: "zh-Hans",
      link: "/zh/",
      title: "SpinDeck",
      description:
        "跨平台黑胶可视化播放器——歌单管理与第三方音乐应用播放控制。",
      themeConfig: {
        nav: [
          {
            text: "指南",
            link: "/zh/guide/getting-started",
            activeMatch: "/zh/guide/",
          },
          getDownloadNavItem("zh"),
          { text: "GitHub", link: "https://github.com/dongguacute/SpinDeck" },
        ],
        sidebar: getLocaleGuideSidebar("zh"),
        footer: {
          message: "基于 Apache License 2.0 发布。",
          copyright: sharedFooterCopyright,
        },
        editLink: {
          pattern:
            "https://github.com/dongguacute/SpinDeck/edit/main/docs/:path",
          text: "在 GitHub 上编辑此页",
        },
        ...zhThemeI18n,
      },
    },
  },
});
