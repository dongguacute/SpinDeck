import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backgroundFile = path.join(
  desktopRoot,
  "src-tauri/icons/android/values/ic_launcher_background.xml",
);

fs.writeFileSync(
  backgroundFile,
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="ic_launcher_background">#dcbfa6</color>
</resources>
`,
);

console.log("Updated Android launcher background to #dcbfa6");
