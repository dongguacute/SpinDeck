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

function copyResolvedEntry(src, dest, copiedDirs = new Set()) {
  let resolvedSrc;
  try {
    resolvedSrc = fs.realpathSync(src);
  } catch {
    return;
  }

  let stat;
  try {
    stat = fs.statSync(resolvedSrc);
  } catch {
    return;
  }

  if (stat.isDirectory()) {
    if (copiedDirs.has(resolvedSrc)) {
      return;
    }
    copiedDirs.add(resolvedSrc);

    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(resolvedSrc)) {
      copyResolvedEntry(
        path.join(src, name),
        path.join(dest, name),
        copiedDirs,
      );
    }
    return;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(resolvedSrc, dest);
}

function assertServerRuntimeDeps(deployDir) {
  const required = [
    "@react-router/serve",
    "@react-router/node",
    "use-sync-external-store",
  ];

  for (const pkg of required) {
    const pkgDir = path.join(deployDir, "node_modules", pkg);
    if (!fs.existsSync(pkgDir)) {
      throw new Error(`Missing runtime dependency after deploy: ${pkg}`);
    }
  }
}

function assertFlatNodeModules(nodeModulesDir) {
  const pnpmStoreDir = path.join(nodeModulesDir, ".pnpm");
  if (fs.existsSync(pnpmStoreDir)) {
    throw new Error("pnpm virtual store still present under node_modules/.pnpm");
  }

  const pnpmMarker = `${path.sep}.pnpm${path.sep}`;
  const stack = [nodeModulesDir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (fullPath.includes(pnpmMarker)) {
        throw new Error(`pnpm virtual store path still present: ${fullPath}`);
      }
      if (entry.isDirectory()) {
        stack.push(fullPath);
      }
    }
  }
}

function materializeNodeModules(deployDir) {
  const nodeModulesDir = path.join(deployDir, "node_modules");
  if (!fs.existsSync(nodeModulesDir)) {
    return;
  }

  const materializedDir = path.join(deployDir, "node_modules.materialized");
  fs.rmSync(materializedDir, { recursive: true, force: true });
  fs.mkdirSync(materializedDir, { recursive: true });

  const copiedDirs = new Set();
  for (const entry of fs.readdirSync(nodeModulesDir)) {
    if (entry === ".pnpm") {
      continue;
    }

    copyResolvedEntry(
      path.join(nodeModulesDir, entry),
      path.join(materializedDir, entry),
      copiedDirs,
    );
  }

  fs.rmSync(nodeModulesDir, { recursive: true, force: true });
  fs.renameSync(materializedDir, nodeModulesDir);

  removeAllBinDirs(nodeModulesDir);
  removeBrokenSymlinks(nodeModulesDir);
  assertFlatNodeModules(nodeModulesDir);
}

function pruneDeployOutput(deployDir) {
  materializeNodeModules(deployDir);
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
assertServerRuntimeDeps(cacheDir);

fs.rmSync(resourcesDir, { recursive: true, force: true });
fs.mkdirSync(resourcesDir, { recursive: true });
copyDir(path.join(cacheDir, "build"), path.join(resourcesDir, "web-runtime/build"));
copyDir(path.join(cacheDir, "node_modules"), path.join(resourcesDir, "web-runtime/node_modules"));
fs.copyFileSync(
  path.join(cacheDir, "package.json"),
  path.join(resourcesDir, "web-runtime/package.json"),
);
assertFlatNodeModules(path.join(resourcesDir, "web-runtime/node_modules"));

fs.mkdirSync(path.join(resourcesDir, "scripts"), { recursive: true });
fs.copyFileSync(
  path.join(desktopRoot, "scripts/serve.mjs"),
  path.join(resourcesDir, "scripts/serve.mjs"),
);

console.log(`Prepared Tauri resources at ${resourcesDir}`);
