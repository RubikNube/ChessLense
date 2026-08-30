# ChessLense Frontend

React frontend for a local chess analysis app. It renders the board, tracks game state, sends the current position to the local backend for Stockfish analysis, and provides both Lichess and OTB search/import workflows.

The frontend uses `App.jsx` as a minimal composition root. Stateful workflows are
organized in feature hooks and controllers, while feature-focused components render
the menu bar, board workspace, training tools, engine analysis, comments, imported PGN
details, and modal dialogs.

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
│   ├── controllers/
│   │   └── createMoveExecutor.js
│   ├── hooks/
│   │   ├── useAppController.js
│   │   ├── useWorkspaceActions.js
│   │   ├── useTrainingActions.js
│   │   ├── useGameAnalysisActions.js
│   │   ├── useStudyLibraryActions.js
│   │   ├── useGameSourceActions.js
│   │   └── supporting UI and persistence hooks
│   ├── components/
│   │   ├── app/
│   │   │   ├── AppView.jsx
│   │   │   ├── AppWorkspaceContent.jsx
│   │   │   ├── AppModalHost.jsx
│   │   │   ├── AppOverlays.jsx
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
│   │   │   ├── ReplayTrainingPanel.jsx
│   │   │   ├── PuzzleTrainingPanel.jsx
│   │   │   ├── GuessTheMoveTrainingPanel.jsx
│   │   │   └── PlayComputerPanel.jsx
│   │   ├── EvaluationBar.jsx
│   │   ├── MoveHistory.jsx
│   │   ├── PositionPreviewBoard.jsx
│   │   └── VariantsView.jsx
│   └── utils/
│       ├── api.js
│       ├── appChess.js
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

- `App.jsx` only connects `useAppController` to `AppView`; feature state and behavior do not belong in the composition root.
- `hooks/useAppController.js` assembles the application view model from focused action hooks for the workspace, training, engine analysis, studies, and external game sources.
- `controllers/createMoveExecutor.js` routes board moves through analysis retry, computer play, replay, guess, puzzle, or normal workspace behavior in priority order.
- `components/app/` separates top-level rendering into the menu, board workspace content, modal host, and transient overlays. Feature panels remain responsible for their own render-heavy UI.
- `utils/` contains pure chess and domain behavior. Stateful workflows belong in feature hooks, while reusable effects such as persistence, keyboard shortcuts, board sizing, sounds, and clipboard handling remain in dedicated hooks.

The primary data flow is:

```text
domain utilities -> feature action hooks/controllers -> useAppController
                 -> app composition components -> feature panels
```

Keep these boundaries when adding features: extend pure domain utilities first, place
stateful orchestration in the relevant feature hook, expose the minimum view model and
actions through `useAppController`, and render them in the appropriate composition or
feature component.
