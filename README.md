# ChessLense

ChessLense is a local chess analysis tool that uses Stockfish to evaluate positions and Lichess to search and import public games. It consists of a Node.js backend that interfaces with Stockfish and Lichess plus a React frontend that provides an interactive chessboard, PGN import, and game search tools.

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
- Import a selected Lichess game back into the existing PGN/annotation flow

## Frontend

See [ChessLense Frontend](./frontend/README.md) for details on the React frontend.

## Server

See [ChessLense Server](./server/README.md) for details on the Node.js backend.
