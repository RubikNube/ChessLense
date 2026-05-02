const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { createApp } = require("./index");
const { searchGames } = require("./otb");

const SAMPLE_PGN = `
[Event "Paris Exhibition"]
[Site "Paris"]
[Date "1858.01.01"]
[Round "1"]
[White "Paul Morphy"]
[Black "Adolf Anderssen"]
[Result "1-0"]
[ECO "C50"]
[Opening "Italian Game"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 1-0

[Event "London Match"]
[Site "London"]
[Date "1858.02.01"]
[Round "2"]
[White "Adolf Anderssen"]
[Black "Paul Morphy"]
[Result "0-1"]
[ECO "B01"]
[Opening "Scandinavian Defense"]

1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5 0-1
`;

async function createTempDbPath() {
	const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "chesslense-otb-api-"));
	return {
		dbPath: path.join(rootDir, "otb.sqlite"),
		rootDir,
	};
}

async function createTempGuessHistoryDir() {
	return fs.mkdtemp(path.join(os.tmpdir(), "chesslense-guess-history-api-"));
}

async function startServer() {
	const app = createApp();
	const server = await new Promise((resolve) => {
		const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
	});
	const address = server.address();

	return {
		baseUrl: `http://127.0.0.1:${address.port}`,
		server,
	};
}

async function closeServer(server) {
	await new Promise((resolve, reject) => {
		server.close((error) => {
			if (error) {
				reject(error);
				return;
			}

			resolve();
		});
	});
}

test("POST /api/otb/import imports a PGN file into the SQLite database", async () => {
	const previousDbPath = process.env.OTB_DB_PATH;
	const { dbPath, rootDir } = await createTempDbPath();
	process.env.OTB_DB_PATH = dbPath;

	try {
		const { baseUrl, server } = await startServer();

		try {
			const response = await fetch(`${baseUrl}/api/otb/import`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					fileName: "masters.pgn",
					pgn: SAMPLE_PGN.trim(),
				}),
			});
			const data = await response.json();

			assert.equal(response.status, 201);
			assert.equal(data.fileName, "masters.pgn");
			assert.equal(data.fileCount, 1);
			assert.equal(data.totalGames, 2);
			assert.equal(data.importedGames, 2);
			assert.equal(data.skippedGames, 0);

			const searchResult = await searchGames(
				{
					player: "Morphy",
					pageSize: 10,
				},
				{ dbPath },
			);
			assert.equal(searchResult.games.length, 2);
		} finally {
			await closeServer(server);
		}
	} finally {
		if (typeof previousDbPath === "string") {
			process.env.OTB_DB_PATH = previousDbPath;
		} else {
			delete process.env.OTB_DB_PATH;
		}

		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("POST /api/otb/import rejects invalid uploads", async () => {
	const previousDbPath = process.env.OTB_DB_PATH;
	const { dbPath, rootDir } = await createTempDbPath();
	process.env.OTB_DB_PATH = dbPath;

	try {
		const { baseUrl, server } = await startServer();

		try {
			const response = await fetch(`${baseUrl}/api/otb/import`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					fileName: "masters.txt",
					pgn: SAMPLE_PGN.trim(),
				}),
			});
			const data = await response.json();

			assert.equal(response.status, 400);
			assert.equal(data.error, "invalid_import");
			assert.equal(data.details, "fileName must end with .pgn.");
		} finally {
			await closeServer(server);
		}
	} finally {
		if (typeof previousDbPath === "string") {
			process.env.OTB_DB_PATH = previousDbPath;
		} else {
			delete process.env.OTB_DB_PATH;
		}

		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("GET /api/otb/games includes pagination metadata", async () => {
	const previousDbPath = process.env.OTB_DB_PATH;
	const { dbPath, rootDir } = await createTempDbPath();
	process.env.OTB_DB_PATH = dbPath;

	try {
		const { baseUrl, server } = await startServer();

		try {
			await fetch(`${baseUrl}/api/otb/import`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					fileName: "masters.pgn",
					pgn: SAMPLE_PGN.trim(),
				}),
			});

			const response = await fetch(
				`${baseUrl}/api/otb/games?player=Morphy&page=1&pageSize=1`,
			);
			const data = await response.json();

			assert.equal(response.status, 200);
			assert.equal(data.games.length, 1);
			assert.deepEqual(data.pagination, {
				page: 1,
				pageSize: 1,
				totalResults: 2,
				totalPages: 2,
				hasPreviousPage: false,
				hasNextPage: true,
			});
		} finally {
			await closeServer(server);
		}
	} finally {
		if (typeof previousDbPath === "string") {
			process.env.OTB_DB_PATH = previousDbPath;
		} else {
			delete process.env.OTB_DB_PATH;
		}

		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("POST /api/guess-history saves and reloads guess-the-move runs for a PGN", async () => {
	const previousGuessHistoryDir = process.env.GUESS_HISTORY_DIR;
	const rootDir = await createTempGuessHistoryDir();
	process.env.GUESS_HISTORY_DIR = rootDir;

	try {
		const { baseUrl, server } = await startServer();

		try {
			const rawPgn = `
[Event "Training Match"]
[White "Alice"]
[Black "Bob"]

1. e4 e5 2. Nf3 Nc6 *
`.trim();
			const entry = {
				completedAt: "2026-05-02T12:00:00.000Z",
				playerSide: "white",
				status: "completed",
				referenceMoves: [
					{
						ply: 1,
						moveNumber: 1,
						side: "white",
						san: "e4",
						move: { from: "e2", to: "e4" },
						fenBefore: "start",
						fenAfter: "after-e4",
					},
				],
				attempts: [
					{
						ply: 1,
						moveNumber: 1,
						side: "white",
						expectedSan: "e4",
						userSan: "e4",
						expectedMove: { from: "e2", to: "e4" },
						userMove: { from: "e2", to: "e4" },
						outcome: "match",
						classification: null,
						deltaCp: null,
						isCritical: false,
						referenceEvaluation: null,
						userEvaluation: null,
						resultingFen: "after-e4",
					},
				],
			};
			const saveResponse = await fetch(`${baseUrl}/api/guess-history`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ rawPgn, entry }),
			});
			const savedData = await saveResponse.json();
			const queryResponse = await fetch(`${baseUrl}/api/guess-history/query`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ rawPgn }),
			});
			const queriedData = await queryResponse.json();

			assert.equal(saveResponse.status, 201);
			assert.equal(savedData.entries.length, 1);
			assert.match(savedData.entries[0].id, /^guess-history-/);
			assert.equal(queryResponse.status, 200);
			assert.deepEqual(queriedData.entries, savedData.entries);
		} finally {
			await closeServer(server);
		}
	} finally {
		if (typeof previousGuessHistoryDir === "string") {
			process.env.GUESS_HISTORY_DIR = previousGuessHistoryDir;
		} else {
			delete process.env.GUESS_HISTORY_DIR;
		}

		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("GET /api/guess-history/games browses saved guess-history games and loads one by key", async () => {
	const previousGuessHistoryDir = process.env.GUESS_HISTORY_DIR;
	const rootDir = await createTempGuessHistoryDir();
	process.env.GUESS_HISTORY_DIR = rootDir;

	try {
		const { baseUrl, server } = await startServer();

		try {
			const rawPgn = `
[Event "Training Match"]
[White "Alice"]
[Black "Bob"]

1. e4 e5 2. Nf3 Nc6 *
`.trim();
			const entry = {
				completedAt: "2026-05-02T12:00:00.000Z",
				playerSide: "white",
				status: "completed",
				referenceMoves: [
					{
						ply: 1,
						moveNumber: 1,
						side: "white",
						san: "e4",
						move: { from: "e2", to: "e4" },
						fenBefore: "start",
						fenAfter: "after-e4",
					},
				],
				attempts: [
					{
						ply: 1,
						moveNumber: 1,
						side: "white",
						expectedSan: "e4",
						userSan: "e4",
						expectedMove: { from: "e2", to: "e4" },
						userMove: { from: "e2", to: "e4" },
						outcome: "match",
						classification: null,
						deltaCp: null,
						isCritical: false,
						referenceEvaluation: null,
						userEvaluation: null,
						resultingFen: "after-e4",
					},
				],
			};
			await fetch(`${baseUrl}/api/guess-history`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ rawPgn, entry }),
			});
			const listResponse = await fetch(`${baseUrl}/api/guess-history/games`);
			const listData = await listResponse.json();
			const gameKey = listData.games[0]?.gameKey;
			const detailResponse = await fetch(`${baseUrl}/api/guess-history/games/${gameKey}`);
			const detailData = await detailResponse.json();

			assert.equal(listResponse.status, 200);
			assert.equal(listData.games.length, 1);
			assert.equal(listData.games[0].game.white, "Alice");
			assert.equal(listData.games[0].runCount, 1);
			assert.equal(detailResponse.status, 200);
			assert.equal(detailData.rawPgn, rawPgn);
			assert.equal(detailData.entries.length, 1);
		} finally {
			await closeServer(server);
		}
	} finally {
		if (typeof previousGuessHistoryDir === "string") {
			process.env.GUESS_HISTORY_DIR = previousGuessHistoryDir;
		} else {
			delete process.env.GUESS_HISTORY_DIR;
		}

		await fs.rm(rootDir, { recursive: true, force: true });
	}
});
