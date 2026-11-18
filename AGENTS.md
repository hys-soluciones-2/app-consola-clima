# AGENTS.md

Weather CLI app (Udemy course exercise). Bun + TypeScript. The README is written in Spanish and is the product spec: interactive menu, default city, multiple saved cities, Celsius/Fahrenheit setting, and a final compiled binary.

Layout (layers under `src/`, see `reference/file-system.md`): `src/index.ts` (composition root) → `src/presentation/` (menu loop, input, output) → `src/actions/` (user actions) → `src/api/` (Open-Meteo HTTP) and `src/storage/` (config persistence). Shared contracts live in `src/types/`; reusable helpers in `src/utils/`. Tests are co-located as `*.test.ts`.

## Commands

- `bun install` — install deps (lockfile is `bun.lock`; use Bun, not npm/pnpm, and don't hand-edit the lockfile)
- `bun run src/index.ts` — run the app
- `bun run build` — `bun build --compile` into `dist/weather.exe` (Windows; `dist/` is gitignored)
- `bun run typecheck` — runs `bun check`, Bun's built-in typechecker. Use this instead of adding a `tsc --noEmit` script.
- `bun test` — runs the co-located `*.test.ts` files (`src/utils/format.test.ts`, `src/api/weather.test.ts`)
- To smoke-test without touching the real config, set `USERPROFILE`/`HOME` to a temp dir and pipe a menu sequence: `"3`nOttawa`n1`n9`n" | bun run src/index.ts`
- No lint/format/CI config exists (and this is not a git repo), so don't look for or invent those workflows.

Note: `bun check` prints its result to stderr, so piping it under PowerShell can surface a spurious `NativeCommandError`; trust the reported error count and exit code.

## TypeScript constraints (from tsconfig.json)

- Imports must use explicit `.ts` extensions (`allowImportingTsExtensions` + bundler resolution), e.g. `import { x } from "./lib.ts"`
- `verbatimModuleSyntax` is on: use `import type { ... }` for type-only imports
- `strict` and `noUncheckedIndexedAccess` are on — array/record lookups type as possibly `undefined`
- `noEmit` is on; `typescript` is a **peerDependency** (`^7`, native TS), not a devDependency. Don't move/downgrade it without re-running `bun install`.

## Domain facts

- Weather source is Open-Meteo, no API key. Two-step flow: `src/api/geocoding.ts` geocodes the city name (`count=5`, `language=es`), then `src/api/weather.ts` fetches `current`/`daily` weather by lat/lon. Shared HTTP plumbing and `WeatherError` live in `src/api/client.ts`; expected failures are shown and return to the menu instead of crashing.
- Config persists to `~/.weather-cli/config.json` (`CONFIG_PATH` in `src/utils/constants.ts`), via `src/storage/citiesStorage.ts`, not the repo. `normalizeConfig` tolerates missing/corrupt files; keep the pure helpers (`addCity`, `removeCity` in `citiesStorage.ts`; `setDefaultCity`, `toggleUnit` in `settingsStorage.ts`) side-effect free so they stay testable.
- Unit switching is delegated to the API (`temperature_unit`/`wind_speed_unit`); display labels come from the response's `current_units`, not hardcoded strings. Don't add local conversion.
- `src/presentation/input.ts` has two input paths: `rl.question()` for real TTYs and an async line iterator for pipes. `rl.question()` drops already-buffered lines when stdin hits EOF, so piped smoke tests hang/fail without the iterator — keep this split when editing input handling. It also owns `askForIndex()`, the shared numbered-selection validator used by the actions.
- The compiled binary (and `bun run`) emits OEM-codepage bytes when stdout is redirected on Windows, so read captured output with `Get-Content -Encoding OEM` or it looks like mojibake.
