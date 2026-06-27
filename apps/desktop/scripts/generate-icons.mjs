import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logoSvg = path.join(desktopRoot, "../web/app/assets/icons/SpinDeckLogo.svg");
const sourceSvg = path.join(desktopRoot, "assets/app-icon.svg");
const sourcePng = path.join(desktopRoot, "assets/app-icon.png");
const iconsDir = path.join(desktopRoot, "src-tauri/icons");

/**
 * 与网站 logo 保持一致（圆角 + 描边），仅加透明边距以适配 macOS Dock。
 * 对照 Dock 里 QQ 等原生 app，约 0.78 视觉尺寸接近。
 */
const CANVAS = 1024;
const CONTENT_RATIO = 0.78;

const contentSize = Math.round(CANVAS * CONTENT_RATIO);
const scale = contentSize / 64;
const inset = Math.round((CANVAS - contentSize) / 2);

const logoInner = fs
  .readFileSync(logoSvg, "utf8")
  .replace(/^[\s\S]*?<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "")
  .trim();

const appIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" fill="none" role="img" aria-hidden="true">
  <g transform="translate(${inset} ${inset}) scale(${scale})">
    ${logoInner}
  </g>
</svg>
`;

fs.mkdirSync(path.dirname(sourceSvg), { recursive: true });
fs.writeFileSync(sourceSvg, appIconSvg);

execSync(`rsvg-convert -w ${CANVAS} -h ${CANVAS} "${sourceSvg}" -o "${sourcePng}"`, {
  stdio: "inherit",
});

execSync(`tauri icon "${sourcePng}" -o "${iconsDir}"`, {
  cwd: desktopRoot,
  stdio: "inherit",
});

execSync("node ./scripts/fix-android-icon-bg.mjs", {
  cwd: desktopRoot,
  stdio: "inherit",
});

console.log(
  `Generated Tauri icons (web logo, ${Math.round(CONTENT_RATIO * 100)}% scale).`,
);
