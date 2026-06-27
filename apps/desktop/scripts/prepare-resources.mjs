import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
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

const RUNTIME_SERVER_MODULES = [
  "@react-router/express",
  "@mjackson/node-fetch-server",
  "compression",
  "express",
  "get-port",
  "morgan",
  "use-sync-external-store",
];

function resolveRuntimePackageDir(nodeModulesDir, pkg) {
  if (pkg.startsWith("@")) {
    const [scope, name] = pkg.split("/");
    return path.join(nodeModulesDir, scope, name);
  }
  return path.join(nodeModulesDir, pkg);
}

function assertServerRuntimeDeps(deployDir) {
  const nodeModulesDir = path.join(deployDir, "node_modules");
  const required = [
    "@react-router/node",
    ...RUNTIME_SERVER_MODULES,
  ];

  for (const pkg of required) {
    const pkgDir = resolveRuntimePackageDir(nodeModulesDir, pkg);
    if (!fs.existsSync(pkgDir)) {
      throw new Error(`Missing runtime dependency after deploy: ${pkg}`);
    }
  }
}

function verifyServeRuntime(deployDir) {
  const nodeModulesDir = path.join(deployDir, "node_modules");
  const anchor = path.join(nodeModulesDir, ".spindeck-resolver.cjs");
  fs.writeFileSync(anchor, "module.exports = {};\n");
  const requireRuntime = createRequire(anchor);
  const deployRoot = `${path.resolve(deployDir)}${path.sep}`;

  for (const pkg of ["@react-router/node", ...RUNTIME_SERVER_MODULES]) {
    const resolved = requireRuntime.resolve(pkg);
    if (!path.resolve(resolved).startsWith(deployRoot)) {
      throw new Error(`${pkg} resolves outside deploy dir: ${resolved}`);
    }
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "spindeck-runtime-verify-"));
  try {
    const tempRuntime = path.join(tempRoot, "runtime");
    copyDir(path.join(deployDir, "node_modules"), path.join(tempRuntime, "node_modules"));
    const tempAnchor = path.join(tempRuntime, "node_modules/.spindeck-resolver.cjs");
    fs.writeFileSync(tempAnchor, "module.exports = {};\n");

    const verifyScript = path.join(tempRoot, "verify-runtime.mjs");
    fs.writeFileSync(
      verifyScript,
      [
        'import { createRequire } from "node:module";',
        `const requireRuntime = createRequire(${JSON.stringify(tempAnchor)});`,
        'requireRuntime("express");',
        'requireRuntime("compression");',
        'requireRuntime("morgan");',
        'requireRuntime("@react-router/express");',
      ].join("\n"),
    );

    execSync(`node ${verifyScript}`, { cwd: tempRoot, stdio: "pipe" });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }

  if (!fs.existsSync(path.join(desktopRoot, "scripts/serve.mjs"))) {
    throw new Error("Missing desktop serve.mjs script");
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

function hoistPnpmNestedDependencies(nodeModulesDir) {
  const pnpmDir = path.join(nodeModulesDir, ".pnpm");
  if (!fs.existsSync(pnpmDir)) {
    return;
  }

  const copiedDirs = new Set();
  for (const entry of fs.readdirSync(pnpmDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const virtualNodeModules = path.join(pnpmDir, entry.name, "node_modules");
    if (!fs.existsSync(virtualNodeModules)) {
      continue;
    }

    for (const pkgName of fs.readdirSync(virtualNodeModules)) {
      if (pkgName === "node_modules" || pkgName.startsWith(".")) {
        continue;
      }

      const src = path.join(virtualNodeModules, pkgName);
      const dest = path.join(nodeModulesDir, pkgName);
      if (fs.existsSync(dest)) {
        continue;
      }

      copyResolvedEntry(src, dest, copiedDirs);
    }
  }
}

function materializeNodeModules(deployDir) {
  const nodeModulesDir = path.join(deployDir, "node_modules");
  if (!fs.existsSync(nodeModulesDir)) {
    return;
  }

  hoistPnpmNestedDependencies(nodeModulesDir);

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
verifyServeRuntime(cacheDir);

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
