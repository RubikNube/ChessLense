# ChessLense Server

Local Express backend for running Stockfish analysis on a chess
position.

## Stack

- Node.js
- Express
- Stockfish

## Requirements

- Node.js installed
- Stockfish available in `PATH`, or `STOCKFISH_PATH` set explicitly

On Debian or Ubuntu, Stockfish can be installed with:

```bash
sudo apt update
sudo apt install stockfish
```

## Install

```bash
cd /home/roland/own_projects/ChessLense/server
npm install
```

## Run

```bash
npm run dev
```

The server starts on:

```text
http://localhost:3001
```

## Configuration

### `STOCKFISH_PATH`

Optional environment variable for the Stockfish binary path.

Example:

```bash
STOCKFISH_PATH=/usr/games/stockfish npm run dev
```

If not set, the server uses:

```text
stockfish
```

## API

### `POST /api/analyze`

Analyze a position from a FEN string.

#### Request body

```json
{
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "depth": 12
}
```

- `fen` is required
- `depth` is optional and defaults to `12`

#### Success response

```json
{
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "bestmove": "e2e4",
  "evaluation": {
    "type": "cp",
    "value": 34
  }
}
```

`evaluation.type` can be:

- `cp` for centipawn evaluation
- `mate` for mate distance

`evaluation` may be `null` if no score was parsed.

#### Error responses

Missing FEN:

```json
{
  "error": "fen is required"
}
```

Engine failure:

```json
{
  "error": "engine_failed",
  "details": "Timeout waiting for: bestmove",
  "stderr": ""
}
```

## Notes

- The engine process is started per request
- The API is intended for local development use
- CORS is enabled for the frontend
