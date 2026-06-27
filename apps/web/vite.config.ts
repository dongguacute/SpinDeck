import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";
import { defineConfig } from "vite";

/** Monorepo workspace packages bundled for SSR (desktop runtime). */
const SPINDECK_SSR_NO_EXTERNAL = [
  "@spindeck/core",
  "@spindeck/picker",
  "@spindeck/player",
  "@spindeck/ui",
  "@spindeck/vinyl-ui",
] as const;

export default defineConfig(({ command }) => ({
  plugins: [svgr(), tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  optimizeDeps: {
    exclude: ["@react-router/node"],
  },
  ssr: {
    external: ["@react-router/node"],
    // Dev: Vite 8 module-runner cannot evaluate React's CJS `module.exports`.
    // Build: bundle deps for desktop runtime (avoid duplicate React in node_modules).
    noExternal: command === "serve" ? [...SPINDECK_SSR_NO_EXTERNAL] : true,
  },
  server: {
    host: "0.0.0.0",
  },
}));
