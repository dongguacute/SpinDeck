import tseslint from "typescript-eslint";
import { config } from "../../packages/eslint-config/react";

export default tseslint.config(
  ...config,
  {
    ignores: ["dist/**"],
  },
);
