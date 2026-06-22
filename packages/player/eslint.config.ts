import tseslint from "typescript-eslint";
import { config } from "../../packages/eslint-config/base";

export default tseslint.config(
  ...config,
  {
    ignores: ["dist/**"],
  },
);
