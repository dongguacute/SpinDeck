import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";
import { defineConfig } from "vite";

/** Local Rust API (Tauri desktop / optional local axum). */
const RUST_API_TARGET = "http://127.0.0.1:17345";

export default defineConfig({
  plugins: [svgr(), tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: RUST_API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
