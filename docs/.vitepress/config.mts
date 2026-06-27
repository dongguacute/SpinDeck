import { defineConfig } from "vitepress";

export default defineConfig({
  title: "SpinDeck",
  description:
    "Cross-platform vinyl visualization player — playlist management and playback control for third-party music apps.",
  lang: "en-US",
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    logo: "/SpinDeckLogo.svg",
    nav: [
      { text: "Guide", link: "/guide/getting-started", activeMatch: "/guide/" },
      { text: "GitHub", link: "https://github.com/dongguacute/SpinDeck" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Desktop App", link: "/guide/desktop" },
          { text: "Supported Platforms", link: "/guide/platforms" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/dongguacute/SpinDeck" },
    ],
    footer: {
      message: "Released under the Apache License 2.0.",
      copyright: "Copyright © Cherry Fu",
    },
    editLink: {
      pattern:
        "https://github.com/dongguacute/SpinDeck/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },
  },
});
