# ChessLense Server

Local Express backend for running Stockfish analysis on a chess
position, proxying Lichess game search/import requests, searching a local OTB PGN archive,
and storing studies as server-backed JSON files.

## Stack

- Node.js
- Express
- Stockfish
- Lichess public API
- Local PGN archive for OTB master games
- Local JSON storage for saved studies

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
cd ~/own_projects/ChessLense/server
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
~/own_projects/ChessLense/server/data/otb
```

Example:

```bash
OTB_PGN_DIR=/path/to/master-pgn-archive npm run dev
```

### `STUDIES_DIR`

Optional path to directory containing saved study JSON files.

If not set, the server stores studies in:

```text
~/own_projects/ChessLense/server/data/studies
```

Example:

```bash
STUDIES_DIR=/path/to/chesslense-studies npm run dev
```

### `COLLECTIONS_DIR`

Optional path to directory containing saved collection JSON files.

If not set, the server stores collections in:

```text
~/own_projects/ChessLense/server/data/collections
```

Example:

```bash
COLLECTIONS_DIR=/path/to/chesslense-collections npm run dev
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
- `ecoFrom` / `ecoTo` (optional): inclusive ECO code range bounds such as `C20` to `C99`
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
    "ecoFrom": "C20",
    "ecoTo": "C99",
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

When either ECO bound is provided:

- ECO codes are validated in `A00` through `E99` format
- `ecoFrom` and `ecoTo` are both inclusive
- either bound may be provided on its own
- `ecoFrom` cannot be greater than `ecoTo`

If no archive is configured, the API returns:

```json
{
  "error": "otb_source_not_configured",
  "details": "OTB PGN directory not found. Set OTB_PGN_DIR or add PGN files under ~/own_projects/ChessLense/server/data/otb."
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

### `GET /api/studies`

List saved studies for studies browser.

#### Success response

```json
{
  "studies": [
    {
      "id": "study-m9x3k2-ab12cd",
      "title": "Alice vs Bob - Club Match",
      "createdAt": "2026-04-13T20:00:00.000Z",
      "updatedAt": "2026-04-13T20:00:00.000Z",
      "summary": {
        "event": "Club Match",
        "white": "Alice",
        "black": "Bob",
        "commentCount": 3,
        "nodeCount": 14,
        "maxPly": 18,
        "hasImportedPgn": true
      }
    }
  ]
}
```

### `GET /api/studies/:studyId`

Load full saved study snapshot for frontend.

#### Success response

```json
{
  "id": "study-m9x3k2-ab12cd",
  "title": "Alice vs Bob - Club Match",
  "createdAt": "2026-04-13T20:00:00.000Z",
  "updatedAt": "2026-04-13T20:00:00.000Z",
  "summary": {
    "event": "Club Match",
    "white": "Alice",
    "black": "Bob",
    "commentCount": 3,
    "nodeCount": 14,
    "maxPly": 18,
    "hasImportedPgn": true
  },
  "variantTree": {},
  "importedPgnData": {},
  "positionComments": []
}
```

#### Not found response

```json
{
  "error": "study_not_found",
  "details": "Study not found."
}
```

### `POST /api/studies`

Save current frontend workspace as new study.

#### Request body

```json
{
  "title": "Najdorf ideas",
  "variantTree": {},
  "importedPgnData": {},
  "positionComments": []
}
```

- `variantTree` is required
- `title` is optional; if omitted, server derives it from PGN metadata when possible

#### Success response

Returns `201 Created` with full saved study payload.

#### Validation response

```json
{
  "error": "invalid_study",
  "details": "variantTree is required."
}
```

### `DELETE /api/studies/:studyId`

Remove one saved study.

#### Success response

```json
{
  "id": "study-m9x3k2-ab12cd"
}
```

#### Not found response

```json
{
  "error": "study_not_found",
  "details": "Study not found."
}
```

Deleting study also removes its membership from all collections.

### `GET /api/collections`

List saved collections for studies browser.

#### Success response

```json
{
  "collections": [
    {
      "id": "collection-m9x3k2-ab12cd",
      "title": "Najdorf",
      "createdAt": "2026-04-13T20:00:00.000Z",
      "updatedAt": "2026-04-13T20:00:00.000Z",
      "studyIds": ["study-a", "study-b"],
      "studyCount": 2
    }
  ]
}
```

### `GET /api/collections/:collectionId`

Load full saved collection.

#### Success response

```json
{
  "id": "collection-m9x3k2-ab12cd",
  "title": "Najdorf",
  "createdAt": "2026-04-13T20:00:00.000Z",
  "updatedAt": "2026-04-13T20:00:00.000Z",
  "studyIds": ["study-a", "study-b"]
}
```

### `POST /api/collections`

Create collection.

#### Request body

```json
{
  "title": "Najdorf"
}
```

#### Success response

Returns `201 Created` with full collection payload.

### `POST /api/collections/:collectionId/studies`

Add study membership to collection.

#### Request body

```json
{
  "studyId": "study-a"
}
```

#### Error responses

```json
{
  "error": "study_not_found",
  "details": "Study not found."
}
```

```json
{
  "error": "collection_not_found",
  "details": "Collection not found."
}
```

### `DELETE /api/collections/:collectionId/studies/:studyId`

Remove study membership from collection.

#### Success response

Returns updated full collection payload.

### `DELETE /api/collections/:collectionId`

Remove one saved collection.

#### Success response

```json
{
  "id": "collection-m9x3k2-ab12cd"
}
```

## Notes

- The engine process is started per request
- Lichess search is public and player-centered: the frontend requires a player name before searching
- OTB search uses a local PGN archive so the source can be swapped later without changing the frontend workflow
- Studies are stored as one JSON file per study under `STUDIES_DIR`
- Collections are stored as one JSON file per collection under `COLLECTIONS_DIR`
- The API is intended for local development use
- CORS is enabled for the frontend
