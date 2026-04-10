# ChessLense Server

Local Express backend for running Stockfish analysis on a chess
position and proxying Lichess game search/import requests.

## Stack

- Node.js
- Express
- Stockfish
- Lichess public API

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

### `GET /api/lichess/games`

Search public Lichess games for a player and return compact game summaries for the frontend.

#### Query parameters

- `player` (required): Lichess username used as the search anchor
- `opponent` (optional): exact opponent filter
- `year` (optional): 4-digit UTC year, from `2013` to the current year
- `color` (optional): `white` or `black`
- `perfType` (optional): Lichess speed/variant filter such as `blitz`, `rapid`, or `atomic`
- `max` (optional): number of results to return, from `1` to `50`, defaults to `10`

#### Success response

```json
{
  "search": {
    "player": "MagnusCarlsen",
    "opponent": "Hikaru",
    "year": 2024,
    "color": "",
    "perfType": "blitz",
    "max": 5
  },
  "games": [
    {
      "id": "abcd1234",
      "url": "https://lichess.org/abcd1234",
      "rated": true,
      "perf": "blitz",
      "speed": "blitz",
      "variant": "standard",
      "status": "mate",
      "winner": "white",
      "createdAt": 1712083200000,
      "lastMoveAt": 1712083500000,
      "opening": "Sicilian Defense",
      "players": {
        "white": {
          "name": "MagnusCarlsen",
          "id": "magnuscarlsen",
          "title": "GM",
          "rating": 3200,
          "ratingDiff": 4
        },
        "black": {
          "name": "Hikaru",
          "id": "hikaru",
          "title": "GM",
          "rating": 3185,
          "ratingDiff": -4
        }
      },
      "opponent": "Hikaru"
    }
  ]
}
```

#### Validation and upstream errors

```json
{
  "error": "invalid_query",
  "details": "player is required"
}
```

```json
{
  "error": "rate_limited",
  "details": "Lichess rate limit exceeded"
}
```

### `GET /api/lichess/games/:gameId`

Fetch a single public Lichess game plus its PGN for import into the frontend.

#### Success response

```json
{
  "game": {
    "id": "abcd1234",
    "url": "https://lichess.org/abcd1234"
  },
  "pgn": "[Event \"Rated Blitz game\"]\n..."
}
```

## Notes

- The engine process is started per request
- Lichess search is public and player-centered: the frontend requires a player name before searching
- The API is intended for local development use
- CORS is enabled for the frontend
