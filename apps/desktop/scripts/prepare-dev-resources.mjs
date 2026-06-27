import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resourcesDir = path.resolve(desktopRoot, "src-tauri/resources");
const serveScript = path.resolve(desktopRoot, "scripts/serve.mjs");

function ensureDevResources() {
  const scriptsDir = path.join(resourcesDir, "scripts");
  const webRuntimeDir = path.join(resourcesDir, "web-runtime");

  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.mkdirSync(webRuntimeDir, { recursive: true });

  fs.copyFileSync(serveScript, path.join(scriptsDir, "serve.mjs"));

  // Tauri build script validates bundle.resources paths exist; dev loads localhost:5173.
  const stubMarker = path.join(webRuntimeDir, ".dev-stub");
  if (!fs.existsSync(stubMarker)) {
    fs.writeFileSync(stubMarker, "SpinDeck dev stub — run prepare:resources for production.\n");
  }
}

ensureDevResources();
console.log(`Prepared dev Tauri resources at ${resourcesDir}`);
