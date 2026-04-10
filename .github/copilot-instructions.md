# ChessLense – Copilot Instructions

Local chess analysis tool: React frontend + Node.js/Express backend that spawns Stockfish per-request via the UCI protocol.

## Commands

```bash
# Start both server and frontend concurrently (from repo root)
./dev.sh

# Frontend only
cd frontend && npm run dev      # dev server (Vite, default port 5173)
cd frontend && npm run build    # production build
cd frontend && npm run lint     # ESLint
cd frontend && npm run test     # run frontend unit tests
cd frontend && npm run test -- src/utils/appState.test.js   # run one test file

# Server only
cd server && npm run dev        # Express server on port 3001
```

## Architecture

```
ChessLense/
├── frontend/   React + Vite SPA + Vitest unit tests
│   └── src/
│       ├── App.jsx             # Main UI orchestration
│       ├── shortcuts.json      # Default keyboard shortcut config
│       └── components/
│           ├── EvaluationBar.jsx
│           └── MoveHistory.jsx
│       └── utils/
│           ├── appState.js     # PGN, persistence, shortcut, and move helpers
│           ├── annotatedPgn.js  # Annotated PGN header/comment extraction
│           └── evaluation.js   # Evaluation normalization/formatting helpers
└── server/
    └── index.js                # Express app, single POST /api/analyze endpoint
```

**Data flow:** User makes a move on the board → `App.jsx` calls `POST /api/analyze` with the current FEN → server spawns a Stockfish process, exchanges UCI commands, parses the output → returns `{ fen, bestmove, evaluation }` → frontend renders the eval bar and engine result.

**Ports:** Frontend dev server: 5173. Backend: 3001 (hardcoded). CORS is open on the server.

## Key Conventions

### Game state in `App.jsx`
- The `chess.js` `Chess` instance (`game`) is the single source of truth for board state.
- All mutations go through `safeGameMutate(modify)`: it clones the game via `cloneGame()` from `src/utils/appState.js`, calls `modify(next)`, and only calls `setGame` if the mutation succeeds.
- Redo is implemented manually as a `redoStack` of `{ from, to, promotion? }` move objects, because `chess.js` has no built-in redo.
- Frontend state (game PGN, redo stack, orientation, panel visibility, and imported PGN metadata/comments) is persisted to `localStorage` under the key `chesslense.frontend-state` via `savePersistedAppState()` and restored via `loadPersistedAppState()`.
- Annotated PGN import uses `parseAnnotatedPgn()` from `src/utils/annotatedPgn.js`: `chess.js` still reconstructs the game state, while headers/comments/variation snippets are preserved separately in `importedPgnData`.

### Evaluation format
- The server returns `evaluation: { type: "cp" | "mate", value: number }` where `value` is always from the **side to move**'s perspective (raw Stockfish output).
- `EvaluationBar.jsx` uses helpers from `src/utils/evaluation.js` to normalize it to White's perspective via `normalizeEvaluationForWhite(evaluation, turn)` before rendering. Always pass `turn` (from `game.turn()`) when displaying evaluations.
- Centipawn values use `value / 100` to convert to pawns.

### Logic tests
- Frontend unit tests live next to the extracted helper modules in `src/utils/*.test.js`.
- Prefer adding tests for pure helpers in `src/utils/` before reaching for component-level tests.

### Styling
- Components use **plain JavaScript style objects** (defined as `const xStyle = { ... }` at the top of the file) — no CSS modules, no Tailwind, no styled-components.
- `App.css` and `index.css` handle global/layout styles; component-level overrides are inline.

### Keyboard shortcuts
- Default shortcuts are defined in `src/shortcuts.json` and mirrored as `DEFAULT_SHORTCUT_CONFIG` in `App.jsx`.
- At startup, `shortcuts.json` is loaded and merged with defaults via `normalizeShortcutConfig()`, which falls back to defaults for any invalid or missing entries.
- Add new actions to `SHORTCUT_ACTION_ORDER` in `App.jsx` to include them in the shortcut popup.

### Server / Stockfish
- A fresh Stockfish process is spawned **per request** (not a persistent engine).
- The `waitForLine(stream, matcher, timeoutMs)` helper reads stdout line-by-line until a string/predicate match; used to implement the UCI handshake sequence.
- `STOCKFISH_PATH` env var overrides the binary path (defaults to `"stockfish"`).
- Analysis depth defaults to `12`; clients can override via the `depth` field in the request body.
