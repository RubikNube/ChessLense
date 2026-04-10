# ChessLense

ChessLense is a local chess analysis tool that uses Stockfish to evaluate positions, Lichess to search public online games, and a local PGN archive to search historical OTB master games. It consists of a Node.js backend plus a React frontend that provides an interactive chessboard, PGN import, and search tools.

## Development

Use `./dev.sh` from the project root to start the server and frontend
concurrently for local development.

The frontend expects the backend API to be available during development. The
recommended way to run both together is:

```bash
./dev.sh
```

## Highlights

- Analyze the current position with Stockfish
- Import a PGN directly into the board
- Search public Lichess games by player with optional filters such as opponent, year, color, and speed
- Search historical OTB master games from a local PGN archive with player, event, year range, result, ECO, and opening filters
- Import a selected Lichess game back into the existing PGN/annotation flow
- Import a selected OTB game back into the existing PGN/annotation flow

## OTB archive setup

Historical OTB search reads `.pgn` files from either:

- `OTB_PGN_DIR`, if set
- or `server/data/otb`, by default

Example:

```bash
OTB_PGN_DIR=/path/to/master-pgn-archive ./dev.sh
```

## Frontend

See [ChessLense Frontend](./frontend/README.md) for details on the React frontend.

## Server

See [ChessLense Server](./server/README.md) for details on the Node.js backend.
