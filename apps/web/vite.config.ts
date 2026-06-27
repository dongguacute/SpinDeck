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
    // Bundle all app dependencies into the server build so the desktop
    // runtime never resolves duplicate React copies from parent node_modules.
    noExternal: true,
  },
  server: {
    host: '0.0.0.0',
  },
});
