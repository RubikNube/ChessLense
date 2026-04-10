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

# Server only
cd server && npm run dev        # Express server on port 3001
```

There is no test suite.

## Architecture

```
ChessLense/
├── frontend/   React + Vite SPA
│   └── src/
│       ├── App.jsx             # All app state and logic
│       ├── shortcuts.json      # Default keyboard shortcut config
│       └── components/
│           ├── EvaluationBar.jsx
│           └── MoveHistory.jsx
└── server/
    └── index.js                # Express app, single POST /api/analyze endpoint
```

**Data flow:** User makes a move on the board → `App.jsx` calls `POST /api/analyze` with the current FEN → server spawns a Stockfish process, exchanges UCI commands, parses the output → returns `{ fen, bestmove, evaluation }` → frontend renders the eval bar and engine result.

**Ports:** Frontend dev server: 5173. Backend: 3001 (hardcoded). CORS is open on the server.

## Key Conventions

### Game state in `App.jsx`
- The `chess.js` `Chess` instance (`game`) is the single source of truth for board state.
- All mutations go through `safeGameMutate(modify)`: it clones the game via `cloneGame()` (which uses `loadPgn`), calls `modify(next)`, and only calls `setGame` if the mutation succeeds.
- Redo is implemented manually as a `redoStack` of `{ from, to, promotion? }` move objects, because `chess.js` has no built-in redo.
- Frontend state (game PGN, redo stack, orientation, panel visibility) is persisted to `localStorage` under the key `chesslense.frontend-state` and loaded via `loadPersistedAppState()`.

### Evaluation format
- The server returns `evaluation: { type: "cp" | "mate", value: number }` where `value` is always from the **side to move**'s perspective (raw Stockfish output).
- `EvaluationBar.jsx` normalizes it to White's perspective via `normalizeEvaluationForWhite(evaluation, turn)` before rendering. Always pass `turn` (from `game.turn()`) when displaying evaluations.
- Centipawn values use `value / 100` to convert to pawns.

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
