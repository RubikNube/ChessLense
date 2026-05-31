# ChessLense Frontend

React frontend for a local chess analysis app. It renders the board, tracks game state, sends the current position to the local backend for Stockfish analysis, and provides both Lichess and OTB search/import workflows.

The frontend now uses a thin `App.jsx` orchestration layer plus feature-focused components for the menu bar, board workspace, training, engine, comments, imported PGN details, and modal dialogs.

## Stack

- React
- Vite
- chess.js
- react-chessboard

## Features

- Interactive chessboard
- Legal move handling with `chess.js`
- Current position shown as FEN
- Local analysis request to Stockfish through the backend
- PGN import into the current board state
- Public Lichess game search by player with optional opponent, year, color, and speed filters
- One-click import of a selected Lichess result into the existing PGN/annotation flow
- Historical OTB master-game search from a local PGN archive with player, opponent, optional player color, event, year range, result, inclusive ECO range, and opening filters
- One-click import of a selected OTB result into the existing PGN/annotation flow
- Reset to starting position

## Deployment

For local development, leave the backend connection unset so frontend `/api`
requests continue to use the Vite proxy to `http://localhost:3001`.

For GitHub Pages or any other static hosting, configure:

- `VITE_BASE_PATH`: optional asset base path for subpath hosting, for example
  `/ChessLense/` for a repository GitHub Pages site

For local development, leaving the backend connection unset keeps frontend
`/api` requests on the current site origin so the Vite proxy can forward them to
`http://localhost:3001`.

On hosted sites, configure the backend in **Help -> Backend Connection** and
save the absolute backend origin there, for example
`https://chesslense-api.example.com`. If the hosted site already reverse-proxies
the backend on the same origin, use **Use local /api** instead.

For a private backend, save the same personal API token in
**Help -> Backend Connection** that the server expects via
`CHESSLENSE_API_TOKEN`. The token is stored only in this browser.

GitHub Pages only hosts the frontend build. Engine analysis, saved
studies/collections, puzzle progress, Lichess proxying, and OTB archive access
still require the separately hosted backend.

## Project structure

```text
frontend/
├── public/
├── src/
│   ├── App.jsx                  # Top-level orchestration and feature wiring
│   ├── App.css
│   ├── index.css
│   ├── main.jsx
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.js
│   │   └── useTrainingController.js
│   ├── components/
│   │   ├── app/
│   │   │   └── AppMenuBar.jsx
│   │   ├── board/
│   │   │   └── BoardWorkspace.jsx
│   │   ├── comments/
│   │   │   └── CommentsPanel.jsx
│   │   ├── engine/
│   │   │   └── EnginePanel.jsx
│   │   ├── modals/
│   │   │   ├── ModalShell.jsx
│   │   │   ├── ShortcutsModal.jsx
│   │   │   ├── ImportPgnModal.jsx
│   │   │   ├── SaveStudyModal.jsx
│   │   │   ├── StudiesModal.jsx
│   │   │   ├── CreateCollectionModal.jsx
│   │   │   ├── ManageCollectionsModal.jsx
│   │   │   ├── LichessSearchModal.jsx
│   │   │   ├── OtbSearchModal.jsx
│   │   │   └── modalStyles.js
│   │   ├── pgn/
│   │   │   └── ImportedPgnPanel.jsx
│   │   ├── training/
│   │   │   └── TrainingPanel.jsx
│   │   ├── EvaluationBar.jsx
│   │   ├── MoveHistory.jsx
│   │   ├── PositionPreviewBoard.jsx
│   │   └── VariantsView.jsx
│   └── utils/
│       ├── api.js
│       ├── appState.js
│       ├── annotatedPgn.js
│       ├── evaluation.js
│       ├── lichessSearch.js
│       ├── otbSearch.js
│       ├── studies.js
│       ├── training.js
│       └── variantTree.js
├── package.json
└── vite.config.js
```

## Frontend architecture

- `App.jsx` owns cross-feature state and wires together the extracted panels, modals, and hooks.
- `components/board/BoardWorkspace.jsx` renders the chessboard, evaluation bar, move history slot, and right-side reference column layout.
- Feature panels (`TrainingPanel`, `EnginePanel`, `CommentsPanel`, `ImportedPgnPanel`) encapsulate the large render-heavy cards that previously lived inline in `App.jsx`.
- `components/modals/` contains the reusable modal shell plus dedicated dialogs for PGN import, studies, collections, shortcuts, and game search workflows.
- `hooks/useKeyboardShortcuts.js` and `hooks/useTrainingController.js` keep keyboard/focus/preview effects separate from the main render tree.
