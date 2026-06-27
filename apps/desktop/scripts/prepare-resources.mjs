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

function removeAllBinDirs(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.name === ".bin") {
      fs.rmSync(fullPath, { recursive: true, force: true });
      continue;
    }

    removeAllBinDirs(fullPath);
  }
}

function removeBrokenSymlinks(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isSymbolicLink()) {
      try {
        fs.statSync(fullPath);
      } catch {
        fs.unlinkSync(fullPath);
      }
      continue;
    }

    if (entry.isDirectory()) {
      removeBrokenSymlinks(fullPath);
    }
  }
}

function pruneDeployOutput(deployDir) {
  const nodeModulesDir = path.join(deployDir, "node_modules");
  removeAllBinDirs(nodeModulesDir);
  removeBrokenSymlinks(nodeModulesDir);
}

if (!fs.existsSync(path.join(webBuildDir, "server/index.js"))) {
  throw new Error("Missing web build output. Run `pnpm --filter @spindeck/web build` first.");
}

fs.rmSync(cacheDir, { recursive: true, force: true });
execSync(`pnpm --filter @spindeck/web deploy --prod ${cacheDir}`, {
  cwd: monorepoRoot,
  stdio: "inherit",
});

copyDir(path.join(webBuildDir, "client"), path.join(cacheDir, "build/client"));
copyDir(path.join(webBuildDir, "server"), path.join(cacheDir, "build/server"));
pruneDeployOutput(cacheDir);

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
