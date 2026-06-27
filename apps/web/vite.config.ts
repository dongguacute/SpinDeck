import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svgr(), tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  optimizeDeps: {
    exclude: ["@react-router/node"],
  },
  ssr: {
    external: ["@react-router/node"],
    noExternal: [
      "@spindeck/core",
      "@spindeck/picker",
      "@spindeck/player",
      "@spindeck/ui",
      "@spindeck/vinyl-ui",
    ],
  },
  server: {
    host: '0.0.0.0',
  },
});
