# Repository Guidelines

## Project Structure & Module Organization

ChessLense has two Node.js packages. `frontend/` contains the React 19/Vite UI: feature components live under `src/components/`, reusable state and API logic under `src/utils/`, hooks under `src/hooks/`, and static assets under `public/`. `server/` contains the CommonJS Express API, Stockfish integration, Lichess client, SQLite-backed OTB search, and JSON-backed study features. Server maintenance scripts are in `server/scripts/`. Tests are colocated with implementation as `*.test.js`. GitHub Actions workflows live in `.github/workflows/`.

## Build, Test, and Development Commands

Install dependencies independently at the root, in `frontend/`, and in `server/` with `npm ci`.

- `./dev.sh`: start the Vite frontend and watched API server together.
- `cd frontend && npm run build`: produce the production bundle in `frontend/dist/`.
- `cd frontend && npm run lint`: run ESLint over frontend JavaScript and JSX.
- `cd frontend && npm test`: run Vitest once; use `npm run test:watch` while developing.
- `cd server && npm test`: run the Node.js test runner.
- `npm run format:check`: verify repository-wide Prettier formatting; `npm run format` applies it.

Stockfish must be on `PATH`, or set `STOCKFISH_PATH=/usr/games/stockfish`. The local frontend proxies `/api` to port 3001.

## Coding Style & Naming Conventions

Let Prettier define whitespace: server JavaScript uses tabs via `.prettierrc.json`; other files use Prettier defaults. Frontend code uses ES modules and JSX; server code uses `require`/`module.exports`. Name React components and their files in PascalCase (`EnginePanel.jsx`), hooks with `use...`, and utilities in camelCase. Keep feature logic in focused modules instead of expanding `App.jsx` or `server/index.js` unnecessarily.

## Testing Guidelines

Add or update colocated `*.test.js` files for behavior changes. Frontend tests use Vitest; backend tests use `node:test` and `node:assert`. Cover success, validation, and failure paths, especially for API, persistence, PGN parsing, and chess-state changes. No fixed coverage threshold is configured; all existing tests must pass.

## Commit & Pull Request Guidelines

Recent history follows Conventional Commits with scopes, such as `feat(training): add guess review arrows`. Use imperative, focused subjects (`fix(otb): reject invalid year ranges`). Pull requests should explain the user-visible change, note configuration or data migrations, link relevant issues, and include screenshots for UI changes. Before requesting review, run formatting, frontend lint/tests/build, and server tests.

## Security & Configuration

Never commit API tokens, local SQLite databases, or generated study/history data. Production settings such as `CHESSLENSE_API_TOKEN`, `CHESSLENSE_ALLOWED_ORIGINS`, `TRUST_PROXY`, and `OTB_DB_PATH` belong in the deployment environment.
