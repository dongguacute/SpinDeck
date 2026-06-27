import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const runtimeRoot = process.env.SPINDECK_RUNTIME_ROOT
  ? path.resolve(process.env.SPINDECK_RUNTIME_ROOT)
  : path.resolve(scriptDir, "../web-runtime");

const webRoot = process.env.SPINDECK_WEB_ROOT
  ? path.resolve(process.env.SPINDECK_WEB_ROOT)
  : path.join(runtimeRoot, "build");

const port = Number(process.env.PORT ?? "17345");
const serverEntry = path.join(webRoot, "server/index.js");
const runtimeNodeModules = path.join(runtimeRoot, "node_modules");
const resolverAnchor = path.join(runtimeNodeModules, ".spindeck-resolver.cjs");

const RUNTIME_MODULES = [
  "@react-router/express",
  "@mjackson/node-fetch-server",
  "compression",
  "express",
  "morgan",
];

function createRuntimeRequire() {
  if (!fs.existsSync(runtimeNodeModules)) {
    throw new Error(`Missing runtime node_modules: ${runtimeNodeModules}`);
  }

  if (!fs.existsSync(resolverAnchor)) {
    fs.writeFileSync(resolverAnchor, "module.exports = {};\n");
  }

  return createRequire(resolverAnchor);
}

function assertRuntimeModules(requireRuntime) {
  const missing = [];

  for (const moduleId of RUNTIME_MODULES) {
    try {
      requireRuntime.resolve(moduleId);
    } catch {
      missing.push(moduleId);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing runtime modules: ${missing.join(", ")}. Reinstall SpinDeck or rebuild the desktop bundle.`,
    );
  }
}

async function main() {
  if (!fs.existsSync(serverEntry)) {
    throw new Error(`Missing server build: ${serverEntry}`);
  }

  process.env.NODE_ENV = process.env.NODE_ENV ?? "production";

  const requireRuntime = createRuntimeRequire();
  assertRuntimeModules(requireRuntime);

  const express = requireRuntime("express");
  const compression = requireRuntime("compression");
  const morgan = requireRuntime("morgan");
  const { createRequestHandler } = requireRuntime("@react-router/express");

  const buildModule = await import(pathToFileURL(path.resolve(serverEntry)).href);
  const buildPath = path.resolve(serverEntry);
  const assetsBuildDirectory = path.resolve(path.dirname(buildPath), "../client");
  const publicPath = "/";

  const app = express();
  app.disable("x-powered-by");
  app.use(compression());
  app.use(
    path.posix.join(publicPath, "assets"),
    express.static(path.join(assetsBuildDirectory, "assets"), {
      immutable: true,
      maxAge: "1y",
    }),
  );
  app.use(publicPath, express.static(assetsBuildDirectory));
  app.use(morgan("tiny"));
  app.all(
    "*",
    createRequestHandler({
      build: buildModule,
      mode: process.env.NODE_ENV,
    }),
  );

  const onListen = () => {
    const address = Object.values(os.networkInterfaces())
      .flat()
      .find((ip) => String(ip?.family).includes("4") && !ip?.internal)?.address;

    if (!address) {
      console.log(`[react-router-serve] http://localhost:${port}`);
      return;
    }

    console.log(
      `[react-router-serve] http://localhost:${port} (http://${address}:${port})`,
    );
  };

  const server = process.env.HOST
    ? app.listen(port, process.env.HOST, onListen)
    : app.listen(port, onListen);

  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.once(signal, () => server?.close(console.error));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
