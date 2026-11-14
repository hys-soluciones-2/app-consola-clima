# AGENTS.md

Weather CLI app (Udemy course exercise). Bun + TypeScript, single entrypoint `index.ts` (currently just a stub `console.log`). The README is written in Spanish and is the product spec: interactive menu, default city, multiple saved cities, Celsius setting, and a final compiled binary. Nothing in it is implemented yet.

## Commands

- `bun install` — install deps (lockfile is `bun.lock`; use Bun, not npm/pnpm, and don't hand-edit the lockfile)
- `bun run index.ts` — run the app
- `bun run typecheck` — runs `bun check`, Bun's built-in typechecker. Use this instead of adding a `tsc --noEmit` script.
- `bun test` — no tests exist yet; if added, use `*.test.ts` so Bun's runner picks them up
- No lint/format/CI config exists (and this is not a git repo), so don't look for or invent those workflows.

Note: `bun check` prints its result to stderr, so piping it under PowerShell can surface a spurious `NativeCommandError`; trust the reported error count and exit code.

## TypeScript constraints (from tsconfig.json)

- Imports must use explicit `.ts` extensions (`allowImportingTsExtensions` + bundler resolution), e.g. `import { x } from "./lib.ts"`
- `verbatimModuleSyntax` is on: use `import type { ... }` for type-only imports
- `strict` and `noUncheckedIndexedAccess` are on — array/record lookups type as possibly `undefined`
- `noEmit` is on; `typescript` is a **peerDependency** (`^7`, native TS), not a devDependency. Don't move/downgrade it without re-running `bun install`.

## Domain facts

- Weather source is Open-Meteo, no API key. Request flow is two steps: geocode the city name, then fetch weather by lat/lon. Exact URLs are in README.md.
- There is no persistence layer or config format yet; if you add one for saved/default cities, extend `.gitignore` (it currently covers only `out`, `dist`, `.env*`, caches).
- End goal includes producing a standalone executable (`bun build --compile`); no build script exists yet.
