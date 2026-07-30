/** @type {import('lint-staged').Configuration} */
export default {
  "*.{js,jsx,ts,tsx}": "eslint --fix",
  // Clippy/fmt take the whole crate; ignore staged file args.
  "apps/desktop/src-tauri/**/*.{rs,toml}": () =>
    "pnpm --filter @spindeck/desktop lint",
};
