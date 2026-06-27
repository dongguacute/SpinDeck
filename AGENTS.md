# Agent Instructions for SpinDeck

This project is named **SpinDeck**, and it operates under the **Apache License 2.0**.

This project is a monorepo managed with `pnpm` and `turborepo`. To ensure consistency and stability, all AI agents must follow these rules.

## Package Management

- **Mandatory Package Manager**: You MUST use `pnpm` for all package management tasks (installing dependencies, running scripts, etc.).
- **No `npm` or `yarn`**: Do not use `npm` or `yarn` commands.
- **Workspace Awareness**: Be mindful of the monorepo structure. Use `-w` or `--filter` flags with `pnpm` when necessary to target specific packages or the root workspace.

## Development Server

- **Manual Control Only**: Do NOT attempt to start the development server (e.g., `pnpm dev`, `pnpm start`) on your own.
- **Reasoning**: Starting the dev server can consume significant resources and may lead to unexpected behavior in the agent environment. The user will manage the development server manually.

## Terminal Management

- **Stuck Terminals**: If a terminal process appears to be stuck, hanging, or unresponsive (especially when running cross-platform commands or long-running tasks), you MUST terminate it immediately.
- **Cleanup**: Ensure that any background processes or orphaned tasks are cleaned up if a command fails or is interrupted.
- **Cross-Platform Compatibility**: Be aware that commands may behave differently across different operating systems (macOS, Linux, Windows). If a command fails due to OS-specific issues, stop the process and report the error rather than retrying indefinitely.

## Project Structure

- `apps/web`: The main web application. See [README.md](apps/web/README.md)
  - **Asset Management**: Do NOT put any files that need modification (like images, icons, or translation files) in the `public` folder.
  - **i18n**: Translation files MUST be placed in `apps/web/app/locales`.
  - **Assets**: Images and other static assets that are part of the source code should be placed in `apps/web/app/assets`.
  - **App icon source**: `apps/web/app/assets/icons/SpinDeckLogo.svg` is the canonical logo for web favicon and desktop (Tauri) icons.
- `apps/desktop`: Tauri 2 desktop shell for macOS / Windows / Linux. The Tauri project lives at `apps/desktop/src-tauri` only — do NOT create a root-level `src-tauri` directory.
  - **Dev**: `pnpm --filter @spindeck/desktop dev` (loads `@spindeck/web` via `http://localhost:5173`; the web dev server must be running or started by Tauri’s `beforeDevCommand`).
  - **Build**: `pnpm --filter @spindeck/desktop build` (builds web, bundles runtime resources, then runs `tauri build`).
  - **Icons**: Desktop icons reuse `SpinDeckLogo.svg` with transparent padding (`CONTENT_RATIO` in `apps/desktop/scripts/generate-icons.mjs`, default `0.78`). Run `pnpm desktop:icons` after logo or ratio changes.
  - **Generated output**: `apps/desktop/src-tauri/resources/` and `apps/desktop/.cache/` are build artifacts — do not commit.
- `packages/`: Shared libraries and components.
  - `packages/core`: Core logic and utilities. See [README.md](packages/core/README.md)
  - `packages/player`: Music player integration logic. See [README.md](packages/player/README.md)
  - `packages/vinyl-ui`: Specialized UI components for the vinyl player. See [README.md](packages/vinyl-ui/README.md)
  - `packages/ui`: General-purpose UI components. See [README.md](packages/ui/README.md)
  - `packages/picker`: Media picker functionality. See [README.md](packages/picker/README.md)
  - `packages/eslint-config`: Shared linting configurations. See [README.md](packages/eslint-config/README.md)

## Coding Standards

- Follow the existing coding style in the repository.
- Use the shared ESLint configurations provided in `packages/eslint-config`.
- Prefer using existing components from `packages/vinyl-ui` or `packages/ui` before creating new ones.
- **Mandatory Linting**: After completing any task (including all sub-steps), you MUST run `pnpm lint` (or `pnpm lint --filter <package>`) to check for and fix any introduced errors.

## Internationalization (i18n)

- **CRITICAL: Zero Hardcoding Policy**: You MUST NOT hardcode any user-facing strings (Chinese, English, or any other language) directly in the source code. This is a top priority.
- **Framework**: Use `i18next` and `react-i18next` for internationalization.
- **Translation Files**:
  - All translation keys MUST be stored in `apps/web/app/locales/{lang}/common.json`.
  - Use hierarchical keys (e.g., `settings.appearance.title`) to keep the files organized.
  - **Mandatory Sync**: When adding a new translation key, you MUST add it to ALL supported language files (e.g., both `en/common.json` and `zh-Hans/common.json`) to maintain consistency.
- **Usage in Components**:
  - Use the `useTranslation` hook from `react-i18next`.
  - Example: `const { t } = useTranslation('common');` and then `{t('key.name')}`.
  - **Check Before Coding**: Before implementing any UI change, check the existing translation keys to avoid duplicates.
- **Shared Packages**:
  - Shared UI packages (like `packages/vinyl-ui`) should NOT have a direct dependency on `i18next`.
  - Pass translated strings as props from the application layer to components in shared packages.
- **Verification**: After making UI changes, verify that no hardcoded strings remain and that all new keys are correctly defined in the locale files.

## Git Commit Standards

All AI-generated commits MUST follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

- **Format**: `<type>(<scope>): <description>`
- **Types**:
  - `feat`: A new feature
  - `fix`: A bug fix
  - `docs`: Documentation only changes
  - `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
  - `refactor`: A code change that neither fixes a bug nor adds a feature
  - `perf`: A code change that improves performance
  - `test`: Adding missing tests or correcting existing tests
  - `build`: Changes that affect the build system or external dependencies
  - `ci`: Changes to CI configuration files and scripts
  - `chore`: Other changes that don't modify src or test files
  - `revert`: Reverts a previous commit
- **Scope**: The scope should be the name of the package or app affected (e.g., `web`, `core`, `ui`, `player`, etc.).
- **Description**: Use the imperative, present tense: "change" not "changed" nor "changes".
