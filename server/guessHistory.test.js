const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { HttpError } = require("./httpError");
const {
	appendGuessHistory,
	getGameKey,
	getGuessHistoryGame,
	listGuessHistory,
	listGuessHistoryGames,
	__testing,
} = require("./guessHistory");

const { buildGuessHistoryBrowseEntry, createGameSummary, normalizeGuessHistoryEntry } = __testing;

const SAMPLE_PGN = `
[Event "Training Match"]
[White "Alice"]
[Black "Bob"]

1. e4 e5 2. Nf3 Nc6 *
`;

function createGuessHistoryEntryPayload() {
	return {
		completedAt: "2026-05-02T12:00:00.000Z",
		playerSide: "white",
		status: "completed",
		referenceMoves: [
			{
				ply: 1,
				moveNumber: 1,
				side: "white",
				san: "e4",
				move: {
					from: "e2",
					to: "e4",
				},
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
				expectedMove: {
					from: "e2",
					to: "e4",
				},
				userMove: {
					from: "e2",
					to: "e4",
				},
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
}

async function createTempGuessHistoryDir() {
	return fs.mkdtemp(path.join(os.tmpdir(), "chesslense-guess-history-"));
}

test("createGameSummary extracts core PGN headers", () => {
	assert.deepEqual(createGameSummary(SAMPLE_PGN), {
		event: "Training Match",
		white: "Alice",
		black: "Bob",
	});
});

test("normalizeGuessHistoryEntry rejects incomplete payloads", () => {
	assert.equal(normalizeGuessHistoryEntry({ status: "completed" }, { requireId: false }), null);
});

test("appendGuessHistory persists entries keyed by the imported PGN", async () => {
	const rootDir = await createTempGuessHistoryDir();

	try {
		const savedRecord = await appendGuessHistory(SAMPLE_PGN, createGuessHistoryEntryPayload(), {
			guessHistoryRootDir: rootDir,
		});
		const loadedRecord = await listGuessHistory(SAMPLE_PGN, {
			guessHistoryRootDir: rootDir,
		});

		assert.equal(savedRecord.gameKey, getGameKey(SAMPLE_PGN));
		assert.equal(savedRecord.rawPgn, SAMPLE_PGN.trim());
		assert.equal(savedRecord.entries.length, 1);
		assert.match(savedRecord.entries[0].id, /^guess-history-/);
		assert.deepEqual(loadedRecord.entries, savedRecord.entries);
		assert.deepEqual(loadedRecord.game, {
			event: "Training Match",
			white: "Alice",
			black: "Bob",
		});
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("buildGuessHistoryBrowseEntry exposes metadata for the browser panel", async () => {
	const rootDir = await createTempGuessHistoryDir();

	try {
		const savedRecord = await appendGuessHistory(SAMPLE_PGN, createGuessHistoryEntryPayload(), {
			guessHistoryRootDir: rootDir,
		});

		assert.deepEqual(buildGuessHistoryBrowseEntry(savedRecord), {
			gameKey: savedRecord.gameKey,
			updatedAt: savedRecord.updatedAt,
			game: {
				event: "Training Match",
				white: "Alice",
				black: "Bob",
			},
			runCount: 1,
			latestEntry: savedRecord.entries[0],
		});
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("listGuessHistoryGames returns saved games sorted by recency", async () => {
	const rootDir = await createTempGuessHistoryDir();

	try {
		const olderPgn = `
[Event "Older Match"]
[White "Carol"]
[Black "Dan"]

1. d4 d5 *
`;
		await appendGuessHistory(olderPgn, createGuessHistoryEntryPayload(), {
			guessHistoryRootDir: rootDir,
		});
		await new Promise((resolve) => setTimeout(resolve, 5));
		await appendGuessHistory(SAMPLE_PGN, createGuessHistoryEntryPayload(), {
			guessHistoryRootDir: rootDir,
		});

		const games = await listGuessHistoryGames({
			guessHistoryRootDir: rootDir,
		});

		assert.equal(games.length, 2);
		assert.equal(games[0].game.white, "Alice");
		assert.equal(games[1].game.white, "Carol");
		assert.equal(games[0].runCount, 1);
		assert.match(games[0].latestEntry.id, /^guess-history-/);
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("getGuessHistoryGame reloads a saved game including raw PGN", async () => {
	const rootDir = await createTempGuessHistoryDir();

	try {
		const savedRecord = await appendGuessHistory(SAMPLE_PGN, createGuessHistoryEntryPayload(), {
			guessHistoryRootDir: rootDir,
		});
		const game = await getGuessHistoryGame(savedRecord.gameKey, {
			guessHistoryRootDir: rootDir,
		});

		assert.equal(game.gameKey, savedRecord.gameKey);
		assert.equal(game.rawPgn, SAMPLE_PGN.trim());
		assert.deepEqual(game.entries, savedRecord.entries);
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("listGuessHistory returns an empty result for games without saved attempts", async () => {
	const rootDir = await createTempGuessHistoryDir();

	try {
		const history = await listGuessHistory(SAMPLE_PGN, {
			guessHistoryRootDir: rootDir,
		});

		assert.deepEqual(history, {
			gameKey: getGameKey(SAMPLE_PGN),
			game: {
				event: "Training Match",
				white: "Alice",
				black: "Bob",
			},
			entries: [],
		});
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("appendGuessHistory rejects invalid payloads", async () => {
	const rootDir = await createTempGuessHistoryDir();

	try {
		await assert.rejects(
			() => appendGuessHistory(SAMPLE_PGN, { status: "completed" }, { guessHistoryRootDir: rootDir }),
			(error) =>
				error instanceof HttpError &&
				error.code === "invalid_guess_history" &&
				error.message === "Guess history entry is invalid.",
		);
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});
