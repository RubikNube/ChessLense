# ChessLense Server

Local Express backend for running Stockfish analysis on a chess
position, proxying Lichess game search/import requests, and searching a local OTB PGN archive.

## Stack

- Node.js
- Express
- Stockfish
- Lichess public API
- Local PGN archive for OTB master games

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

### `OTB_PGN_DIR`

Optional path to a directory containing `.pgn` files for historical OTB master-game search.

If not set, the server looks in:

```text
/home/roland/own_projects/ChessLense/server/data/otb
```

Example:

```bash
OTB_PGN_DIR=/path/to/master-pgn-archive npm run dev
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

### `GET /api/otb/games`

Search historical OTB games from the configured local PGN archive.

#### Query parameters

- `player` (optional): searched player name
- `opponent` (optional): opponent name
- `color` (optional): `white` or `black`; when omitted, player color is ignored and player/opponent can match either side
- `event` (optional): event name contains filter
- `yearFrom` / `yearTo` (optional): inclusive year range
- `result` (optional): `1-0`, `0-1`, `1/2-1/2`, or `*`
- `eco` (optional): ECO contains filter
- `opening` (optional): opening contains filter
- `max` (optional): number of results to return, from `1` to `100`, defaults to `25`

At least one non-`max` filter is required.

#### Success response

```json
{
  "search": {
    "player": "Morphy",
    "opponent": "Anderssen",
    "color": "",
    "event": "",
    "eco": "",
    "opening": "",
    "result": "",
    "yearFrom": 1858,
    "yearTo": 1858,
    "max": 5
  },
  "games": [
    {
      "id": "base64url-id",
      "source": "local-pgn",
      "dateLabel": "1858.01.01",
      "year": 1858,
      "result": "1-0",
      "event": "Paris Exhibition",
      "site": "Paris",
      "eco": "C50",
      "opening": "Italian Game",
      "sourceFile": "master-games.pgn",
      "players": {
        "white": { "name": "Paul Morphy" },
        "black": { "name": "Adolf Anderssen" }
      }
    }
  ]
}
```

When both `player` and `opponent` are provided:

- the two names are matched together as a player/opponent pair, using case-insensitive name tokens instead of treating them as one loose combined search
- omitting `color` matches both `Player A vs Player B` and `Player B vs Player A`
- `color=white` requires the searched player to be White
- `color=black` requires the searched player to be Black

If no archive is configured, the API returns:

```json
{
  "error": "otb_source_not_configured",
  "details": "OTB PGN directory not found. Set OTB_PGN_DIR or add PGN files under /home/roland/own_projects/ChessLense/server/data/otb."
}
```

### `GET /api/otb/games/:gameId`

Fetch one OTB game plus its full PGN for import into the frontend.

#### Success response

```json
{
  "game": {
    "id": "base64url-id",
    "source": "local-pgn"
  },
  "pgn": "[Event \"Paris Exhibition\"]\n..."
}
```

## Notes

- The engine process is started per request
- Lichess search is public and player-centered: the frontend requires a player name before searching
- OTB search uses a local PGN archive so the source can be swapped later without changing the frontend workflow
- The API is intended for local development use
- CORS is enabled for the frontend
