# ChessLense

ChessLense is a local chess analysis tool that uses Stockfish to evaluate positions, Lichess to search public online games, and a local SQLite database to search historical OTB master games. It consists of a Node.js backend plus a React frontend that provides an interactive chessboard, PGN import, and search tools.

## Development

Use `./dev.sh` from the project root to start the server and frontend
concurrently for local development.

The frontend expects the backend API to be available during development. The
recommended way to run both together is:

```bash
./dev.sh
```

## GitHub Pages deployment

GitHub Pages can host the static frontend, but **not** the Express backend. To
publish ChessLense with its current feature set, deploy the frontend to GitHub
Pages and host the backend separately.

The repository now includes `.github/workflows/deploy-github-pages.yml`, which:

- builds the frontend from `frontend/`
- publishes `frontend/dist` to GitHub Pages

Before using the workflow:

1. Deploy the backend somewhere that can run Node.js and Stockfish.
2. In **Settings -> Pages**, set the source to **GitHub Actions**.
3. After the site is deployed, open **Help -> Backend Connection** in the UI
   and save your backend origin there, for example
   `https://chesslense-api.example.com`.

The workflow sets the Vite base path automatically to the repository Pages URL,
so the deployed site works from `https://<owner>.github.io/<repo>/`.

## Formatting

Install the repository formatting tool once from the project root:

```bash
npm install
```

Then use Prettier from the project root:

```bash
npm run format
npm run format:check
```

## Highlights

- Analyze the current position with Stockfish
- Import a PGN directly into the board
- Import one local `.pgn` file into the OTB SQLite database from the app
- Search public Lichess games by player with optional filters such as opponent, year, color, and speed
- Search historical OTB master games from a local SQLite archive with player, opponent, optional player color, event, year range, result, ECO, and opening filters
- Import a selected Lichess game back into the existing PGN/annotation flow
- Import a selected OTB game back into the existing PGN/annotation flow

## OTB archive setup

Historical OTB search uses a SQLite database at either:

- `OTB_DB_PATH`, if set
- or `server/data/otb.sqlite`, by default

Example:

```bash
cd server
npm run otb:import -- /path/to/master-pgn-archive
```

Optional database location:

```bash
cd server
OTB_DB_PATH=/path/to/otb.sqlite npm run otb:import -- /path/to/master-pgn-archive
```

You can also import a single `.pgn` file into the OTB database directly from the app via
**Import PGN**. The CLI importer remains the better option for bulk archive loads.

## Frontend

See [ChessLense Frontend](./frontend/README.md) for details on the React frontend.

## Server

See [ChessLense Server](./server/README.md) for details on the Node.js backend.
