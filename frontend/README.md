# ChessLense Frontend

React frontend for a local chess analysis app. It renders the board, tracks game state, sends the current position to the local backend for Stockfish analysis, and provides both Lichess and OTB search/import workflows.

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

## Project structure

```text
frontend/
├── public/
├── src/
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── package.json
└── vite.config.js
