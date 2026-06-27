import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const semverPattern = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;

/**
 * Extract a semver from release title text, e.g. "v1.2.3" or "SpinDeck 1.2.3".
 */
export function parseVersionFromTitle(title) {
  const trimmed = title.trim();
  const match = trimmed.match(/v?(\d+\.\d+\.\d+(?:-[\w.]+)?(?:\+[\w.]+)?)/i);
  if (match) {
    return match[1];
  }

  const withoutPrefix = trimmed.replace(/^v/i, "").trim();
  if (semverPattern.test(withoutPrefix)) {
    return withoutPrefix;
  }

  return null;
}

function updateJsonVersion(filePath, version) {
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  json.version = version;
  fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`);
}

function updateTauriConf(filePath, version) {
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  json.version = version;
  fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`);
}

function updateCargoToml(filePath, version) {
  const cargo = fs.readFileSync(filePath, "utf8");
  const updated = cargo.replace(
    /^version = "[^"]*"$/m,
    `version = "${version}"`,
  );
  if (updated === cargo) {
    throw new Error(`Could not update version in ${filePath}`);
  }
  fs.writeFileSync(filePath, updated);
}

export function setProjectVersion(rootDir, version) {
  if (!semverPattern.test(version)) {
    throw new Error(`Invalid semver: ${version}`);
  }

  updateJsonVersion(path.join(rootDir, "package.json"), version);
  updateJsonVersion(path.join(rootDir, "apps/web/package.json"), version);
  updateJsonVersion(path.join(rootDir, "apps/desktop/package.json"), version);
  updateTauriConf(
    path.join(rootDir, "apps/desktop/src-tauri/tauri.conf.json"),
    version,
  );
  updateCargoToml(
    path.join(rootDir, "apps/desktop/src-tauri/Cargo.toml"),
    version,
  );
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runCli() {
  const input = process.argv[2];

  if (!input) {
    console.error("Usage: node scripts/set-version.mjs <semver-or-release-title>");
    process.exit(1);
  }

  const version = semverPattern.test(input) ? input : parseVersionFromTitle(input);
  if (!version) {
    console.error(
      `Could not parse semver from "${input}". Use formats like 1.0.0 or v1.0.0.`,
    );
    process.exit(1);
  }

  setProjectVersion(rootDir, version);
  console.log(`Version set to ${version}`);
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  runCli();
}
