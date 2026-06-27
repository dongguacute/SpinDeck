import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const runtimeRoot = process.env.SPINDECK_RUNTIME_ROOT
  ? path.resolve(process.env.SPINDECK_RUNTIME_ROOT)
  : path.resolve(scriptDir, "../web-runtime");

const webRoot = process.env.SPINDECK_WEB_ROOT
  ? path.resolve(process.env.SPINDECK_WEB_ROOT)
  : path.join(runtimeRoot, "build");

const port = process.env.PORT ?? "17345";
const serverEntry = path.join(webRoot, "server/index.js");
const serveBin = path.join(runtimeRoot, "node_modules/@react-router/serve/bin.js");

const runtimeNodeModules = path.join(runtimeRoot, "node_modules");

const child = spawn(process.execPath, [serveBin, serverEntry], {
  cwd: runtimeRoot,
  env: {
    ...process.env,
    PORT: port,
    NODE_ENV: "production",
    SPINDECK_RUNTIME_ROOT: runtimeRoot,
    SPINDECK_WEB_ROOT: webRoot,
    // Prefer bundled dependencies over any parent monorepo node_modules.
    NODE_PATH: runtimeNodeModules,
  },
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
