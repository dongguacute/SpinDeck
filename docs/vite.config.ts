import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  GitChangelog,
  GitChangelogMarkdownSection,
} from "@nolebase/vitepress-plugin-git-changelog/vite";

const ROOT_REDIRECT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SpinDeck</title>
  <script>
    (function () {
      var cookie = document.cookie.match(/(?:^|; )nf_lang=([^;]*)/);
      if (cookie && cookie[1]) {
        var lang = cookie[1].toLowerCase();
        if (lang.indexOf("zh") === 0) { location.replace("/zh/"); return; }
        if (lang.indexOf("en") === 0) { location.replace("/en/"); return; }
      }
      var langs = navigator.languages && navigator.languages.length
        ? navigator.languages
        : [navigator.language];
      var prefersZh = langs.some(function (l) {
        return l && l.toLowerCase().indexOf("zh") === 0;
      });
      location.replace(prefersZh ? "/zh/" : "/en/");
    })();
  </script>
  <meta http-equiv="refresh" content="0;url=/en/">
</head>
<body></body>
</html>`;

function localeRootRedirectPlugin() {
  return {
    name: "spindeck-docs-locale-root-redirect",
    enforce: "pre",
    configureServer(server: {
      middlewares: {
        use: (
          fn: (
            req: { url?: string; headers: Record<string, string | string[] | undefined> },
            res: { writeHead: (code: number, headers: Record<string, string>) => void; end: () => void },
            next: () => void,
          ) => void,
        ) => void;
      };
    }) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url !== "/" && url !== "/index.html") {
          next();
          return;
        }
        const acceptLang = String(req.headers["accept-language"] ?? "");
        const prefersZh = acceptLang.split(",").some((part) => {
          const code = part.trim().split(";")[0]?.toLowerCase();
          return code?.startsWith("zh");
        });
        res.writeHead(302, { Location: prefersZh ? "/zh/" : "/en/" });
        res.end();
      });
    },
    closeBundle() {
      const outDir = join(process.cwd(), ".vitepress", "dist");
      writeFileSync(join(outDir, "index.html"), ROOT_REDIRECT_HTML, "utf8");
    },
  };
}

/**
 * Plain Vite config object for VitePress to merge.
 * Avoid `defineConfig` from `vite` — the monorepo also uses Vite 8 (@spindeck/web),
 * which causes Plugin type mismatches between Vite 5 (VitePress) and Vite 8.
 */
export default {
  server: {
    port: 5174,
  },
  optimizeDeps: {
    exclude: [
      "@nolebase/vitepress-plugin-inline-link-preview/client",
      "@nolebase/vitepress-plugin-enhanced-readabilities/client",
      "@nolebase/ui",
    ],
  },
  ssr: {
    noExternal: [
      "@nolebase/vitepress-plugin-inline-link-preview",
      "@nolebase/vitepress-plugin-highlight-targeted-heading",
      "@nolebase/vitepress-plugin-enhanced-readabilities",
      "@nolebase/ui",
    ],
  },
  plugins: [
    localeRootRedirectPlugin(),
    GitChangelog({
      repoURL: () => "https://github.com/dongguacute/SpinDeck",
    }),
    GitChangelogMarkdownSection({
      // Default excludes only `index.md` (English home); locale homes are e.g. `zh/index.md`.
      exclude: (id, { helpers }) => helpers.idEndsWith("index.md"),
    }),
  ],
};
