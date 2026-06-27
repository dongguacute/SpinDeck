import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const monorepoRoot = path.resolve(desktopRoot, "../..");
const webBuildDir = path.resolve(desktopRoot, "../web/build");
const cacheDir = path.join(desktopRoot, ".cache/web-runtime");
const resourcesDir = path.resolve(desktopRoot, "src-tauri/resources");

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  fs.cpSync(from, to, { recursive: true });
}

if (!fs.existsSync(path.join(webBuildDir, "server/index.js"))) {
  throw new Error("Missing web build output. Run `pnpm --filter @spindeck/web build` first.");
}

fs.rmSync(cacheDir, { recursive: true, force: true });
execSync(`pnpm --filter @spindeck/web deploy ${cacheDir}`, {
  cwd: monorepoRoot,
  stdio: "inherit",
});

copyDir(path.join(webBuildDir, "client"), path.join(cacheDir, "build/client"));
copyDir(path.join(webBuildDir, "server"), path.join(cacheDir, "build/server"));

fs.rmSync(resourcesDir, { recursive: true, force: true });
fs.mkdirSync(resourcesDir, { recursive: true });
fs.cpSync(cacheDir, path.join(resourcesDir, "web-runtime"), {
  recursive: true,
});
fs.mkdirSync(path.join(resourcesDir, "scripts"), { recursive: true });
fs.copyFileSync(
  path.join(desktopRoot, "scripts/serve.mjs"),
  path.join(resourcesDir, "scripts/serve.mjs"),
);

console.log(`Prepared Tauri resources at ${resourcesDir}`);
