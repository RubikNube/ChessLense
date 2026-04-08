# ChessLense Frontend

React frontend for a local chess analysis app. It renders the board, tracks game state, and sends the current position to the local backend for Stockfish analysis.

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
