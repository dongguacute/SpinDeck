import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const monorepoRoot = path.resolve(desktopRoot, "../..");
const webClientDir = path.resolve(desktopRoot, "../web/build/client");
const resourcesDir = path.resolve(desktopRoot, "src-tauri/resources");

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  fs.cpSync(from, to, { recursive: true });
}

if (!fs.existsSync(path.join(webClientDir, "index.html"))) {
  throw new Error(
    "Missing web SPA build output. Run `pnpm --filter @spindeck/web build` first.",
  );
}

fs.rmSync(resourcesDir, { recursive: true, force: true });
fs.mkdirSync(resourcesDir, { recursive: true });
copyDir(webClientDir, path.join(resourcesDir, "web"));

const webPackage = JSON.parse(
  fs.readFileSync(path.join(monorepoRoot, "apps/web/package.json"), "utf8"),
);
const buildInfo = {
  version: webPackage.version ?? "unknown",
  commit: process.env.GITHUB_SHA ?? "local",
  builtAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(resourcesDir, "web/BUILD_INFO.json"),
  `${JSON.stringify(buildInfo, null, 2)}\n`,
);

console.log(`Prepared Tauri resources at ${resourcesDir}`);
console.log(`Build info: ${JSON.stringify(buildInfo)}`);
