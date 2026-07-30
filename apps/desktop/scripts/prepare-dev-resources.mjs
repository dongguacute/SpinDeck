import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resourcesDir = path.resolve(desktopRoot, "src-tauri/resources");

function ensureDevResources() {
  const webDir = path.join(resourcesDir, "web");
  fs.mkdirSync(webDir, { recursive: true });

  // Tauri build script validates bundle.resources paths exist; dev loads localhost:5173.
  const indexPath = path.join(webDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    fs.writeFileSync(
      indexPath,
      "<!doctype html><html><body>SpinDeck dev stub — run prepare:resources for production.</body></html>\n",
    );
  }
}

ensureDevResources();
console.log(`Prepared dev Tauri resources at ${resourcesDir}`);
