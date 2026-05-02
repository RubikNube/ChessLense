const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { HttpError } = require("./httpError");

const DEFAULT_GUESS_HISTORY_DIR = path.join(__dirname, "data", "guess-history");

function normalizeString(value) {
	return typeof value === "string" ? value.trim() : "";
}

function normalizeIsoTimestamp(value, fallback = null) {
	const normalized = normalizeString(value);

	if (!normalized) {
		return fallback;
	}

	const timestamp = new Date(normalized);
	return Number.isNaN(timestamp.getTime()) ? fallback : timestamp.toISOString();
}

function normalizeGameKey(value) {
	const normalized = normalizeString(value);
	return /^[a-f0-9]{64}$/i.test(normalized) ? normalized.toLowerCase() : "";
}

function normalizeMove(move) {
	if (
		!move ||
		typeof move !== "object" ||
		typeof move.from !== "string" ||
		!move.from.trim() ||
		typeof move.to !== "string" ||
		!move.to.trim()
	) {
		return null;
	}

	return {
		from: move.from.trim(),
		to: move.to.trim(),
		...(typeof move.promotion === "string" && move.promotion.trim()
			? { promotion: move.promotion.trim().toLowerCase() }
			: {}),
	};
}

function normalizeReferenceMove(entry) {
	if (!entry || typeof entry !== "object") {
		return null;
	}

	const move = normalizeMove(entry.move);
	const san = normalizeString(entry.san);
	const fenBefore = normalizeString(entry.fenBefore);
	const fenAfter = normalizeString(entry.fenAfter);

	if (!move || !san || !fenBefore || !fenAfter) {
		return null;
	}

	return {
		ply: Number.isInteger(entry.ply) && entry.ply > 0 ? entry.ply : null,
		moveNumber:
			Number.isInteger(entry.moveNumber) && entry.moveNumber > 0 ? entry.moveNumber : null,
		side: entry.side === "white" || entry.side === "black" ? entry.side : null,
		san,
		move,
		fenBefore,
		fenAfter,
	};
}

function normalizeEvaluation(entry) {
	if (
		entry &&
		typeof entry === "object" &&
		(entry.type === "cp" || entry.type === "mate") &&
		typeof entry.value === "number"
	) {
		return {
			type: entry.type,
			value: entry.value,
		};
	}

	return null;
}

function normalizeAttempt(entry) {
	if (!entry || typeof entry !== "object") {
		return null;
	}

	const expectedMove = normalizeMove(entry.expectedMove);
	const userMove = normalizeMove(entry.userMove);
	const expectedSan = normalizeString(entry.expectedSan);
	const userSan = normalizeString(entry.userSan);

	if (!expectedMove || !userMove || !expectedSan || !userSan) {
		return null;
	}

	return {
		ply: Number.isInteger(entry.ply) && entry.ply > 0 ? entry.ply : null,
		moveNumber:
			Number.isInteger(entry.moveNumber) && entry.moveNumber > 0 ? entry.moveNumber : null,
		side: entry.side === "white" || entry.side === "black" ? entry.side : null,
		expectedSan,
		userSan,
		expectedMove,
		userMove,
		outcome: entry.outcome === "match" ? "match" : "mismatch",
		classification:
			entry.classification === "better" ||
			entry.classification === "equal" ||
			entry.classification === "worse"
				? entry.classification
				: null,
		deltaCp: Number.isFinite(entry.deltaCp) ? entry.deltaCp : null,
		isCritical: entry.isCritical === true,
		referenceEvaluation: normalizeEvaluation(entry.referenceEvaluation),
		userEvaluation: normalizeEvaluation(entry.userEvaluation),
		resultingFen: normalizeString(entry.resultingFen) || null,
	};
}

function createGameSummary(rawPgn) {
	const headers = {};

	for (const match of rawPgn.matchAll(/\[(\w+)\s+"([^"]*)"\]/g)) {
		headers[match[1]] = match[2];
	}

	return {
		event: normalizeString(headers.Event),
		white: normalizeString(headers.White),
		black: normalizeString(headers.Black),
	};
}

function normalizeGuessHistoryEntry(entry, { requireId = true } = {}) {
	if (!entry || typeof entry !== "object") {
		return null;
	}

	const id = normalizeString(entry.id);
	const completedAt = normalizeIsoTimestamp(entry.completedAt);
	const referenceMoves = Array.isArray(entry.referenceMoves)
		? entry.referenceMoves.map(normalizeReferenceMove).filter(Boolean)
		: [];
	const attempts = Array.isArray(entry.attempts)
		? entry.attempts.map(normalizeAttempt).filter(Boolean)
		: [];

	if (
		(requireId && !id) ||
		!completedAt ||
		(entry.playerSide !== "white" && entry.playerSide !== "black") ||
		(entry.status !== "completed" && entry.status !== "ended") ||
		!referenceMoves.length
	) {
		return null;
	}

	return {
		...(id ? { id } : {}),
		completedAt,
		playerSide: entry.playerSide,
		status: entry.status,
		referenceMoves,
		attempts,
	};
}

function normalizeGuessHistoryRecord(record) {
	if (!record || typeof record !== "object") {
		return null;
	}

	const gameKey = normalizeGameKey(record.gameKey);
	const createdAt = normalizeIsoTimestamp(record.createdAt, new Date().toISOString());
	const updatedAt = normalizeIsoTimestamp(record.updatedAt, createdAt);
	const rawPgn = normalizeString(record.rawPgn);
	const entries = Array.isArray(record.entries)
		? record.entries.map((entry) => normalizeGuessHistoryEntry(entry)).filter(Boolean)
		: [];

	if (!gameKey) {
		return null;
	}

	return {
		gameKey,
		createdAt,
		updatedAt,
		rawPgn,
		game: {
			event: normalizeString(record.game?.event),
			white: normalizeString(record.game?.white),
			black: normalizeString(record.game?.black),
		},
		entries: entries.sort((leftEntry, rightEntry) =>
			rightEntry.completedAt.localeCompare(leftEntry.completedAt),
		),
	};
}

function getGuessHistoryDir(rootDir = process.env.GUESS_HISTORY_DIR) {
	return normalizeString(rootDir) || DEFAULT_GUESS_HISTORY_DIR;
}

async function ensureGuessHistoryDir(rootDir) {
	await fs.mkdir(rootDir, { recursive: true });
	return rootDir;
}

function getGameKey(rawPgn) {
	const normalizedRawPgn = normalizeString(rawPgn);

	if (!normalizedRawPgn) {
		throw new HttpError(400, "invalid_guess_history", "rawPgn is required.");
	}

	return crypto.createHash("sha256").update(normalizedRawPgn).digest("hex");
}

function getGuessHistoryFilePath(rootDir, gameKey) {
	return path.join(rootDir, `${gameKey}.json`);
}

async function readStoredGuessHistory(filePath) {
	try {
		const rawRecord = await fs.readFile(filePath, "utf8");
		return JSON.parse(rawRecord);
	} catch (error) {
		if (error?.code === "ENOENT") {
			return null;
		}

		if (error instanceof SyntaxError) {
			throw new HttpError(
				500,
				"invalid_guess_history",
				"Stored guess history is invalid JSON.",
			);
		}

		throw error;
	}
}

function createGuessHistoryEntryId() {
	return `guess-history-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildGuessHistoryBrowseEntry(record) {
	if (!record?.gameKey || !record.rawPgn || !record.entries.length) {
		return null;
	}

	return {
		gameKey: record.gameKey,
		updatedAt: record.updatedAt,
		game: record.game,
		runCount: record.entries.length,
		latestEntry: record.entries[0],
	};
}

async function listGuessHistory(rawPgn, options = {}) {
	const normalizedRawPgn = normalizeString(rawPgn);

	if (!normalizedRawPgn) {
		return {
			gameKey: "",
			game: {
				event: "",
				white: "",
				black: "",
			},
			entries: [],
		};
	}

	const gameKey = getGameKey(normalizedRawPgn);
	const rootDir = await ensureGuessHistoryDir(
		getGuessHistoryDir(options.guessHistoryRootDir ?? options.rootDir),
	);
	const record = normalizeGuessHistoryRecord(
		await readStoredGuessHistory(getGuessHistoryFilePath(rootDir, gameKey)),
	);

	if (!record) {
		return {
			gameKey,
			game: createGameSummary(normalizedRawPgn),
			entries: [],
		};
	}

	return {
		gameKey: record.gameKey,
		game: record.game,
		entries: record.entries,
	};
}

async function getGuessHistoryGame(gameKey, options = {}) {
	const normalizedGameKey = normalizeGameKey(gameKey);

	if (!normalizedGameKey) {
		throw new HttpError(400, "invalid_guess_history", "gameKey is invalid.");
	}

	const rootDir = await ensureGuessHistoryDir(
		getGuessHistoryDir(options.guessHistoryRootDir ?? options.rootDir),
	);
	const record = normalizeGuessHistoryRecord(
		await readStoredGuessHistory(getGuessHistoryFilePath(rootDir, normalizedGameKey)),
	);

	if (!record?.rawPgn || !record.entries.length) {
		throw new HttpError(404, "guess_history_not_found", "Guess history game not found.");
	}

	return {
		gameKey: record.gameKey,
		game: record.game,
		rawPgn: record.rawPgn,
		entries: record.entries,
	};
}

async function listGuessHistoryGames(options = {}) {
	const rootDir = await ensureGuessHistoryDir(
		getGuessHistoryDir(options.guessHistoryRootDir ?? options.rootDir),
	);
	const entries = await fs.readdir(rootDir, { withFileTypes: true });
	const games = [];

	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith(".json")) {
			continue;
		}

		const record = normalizeGuessHistoryRecord(
			await readStoredGuessHistory(path.join(rootDir, entry.name)),
		);
		const browseEntry = buildGuessHistoryBrowseEntry(record);

		if (browseEntry) {
			games.push(browseEntry);
		}
	}

	return games.sort((leftGame, rightGame) =>
		rightGame.updatedAt.localeCompare(leftGame.updatedAt),
	);
}

async function appendGuessHistory(rawPgn, entryPayload, options = {}) {
	const normalizedRawPgn = normalizeString(rawPgn);
	const gameKey = getGameKey(normalizedRawPgn);
	const nextEntry = normalizeGuessHistoryEntry(entryPayload, { requireId: false });

	if (!nextEntry) {
		throw new HttpError(
			400,
			"invalid_guess_history",
			"Guess history entry is invalid.",
		);
	}

	const rootDir = await ensureGuessHistoryDir(
		getGuessHistoryDir(options.guessHistoryRootDir ?? options.rootDir),
	);
	const filePath = getGuessHistoryFilePath(rootDir, gameKey);
	const existingRecord =
		normalizeGuessHistoryRecord(await readStoredGuessHistory(filePath)) ??
		{
			gameKey,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			rawPgn: normalizedRawPgn,
			game: createGameSummary(normalizedRawPgn),
			entries: [],
		};
	const now = new Date().toISOString();
	const record = {
		...existingRecord,
		updatedAt: now,
		rawPgn: normalizedRawPgn,
		entries: [
			{
				id: createGuessHistoryEntryId(),
				...nextEntry,
			},
			...existingRecord.entries,
		],
	};

	await fs.writeFile(filePath, JSON.stringify(record, null, 2), "utf8");

	return normalizeGuessHistoryRecord(record);
}

module.exports = {
	appendGuessHistory,
	getGuessHistoryGame,
	getGameKey,
	listGuessHistory,
	listGuessHistoryGames,
	__testing: {
		buildGuessHistoryBrowseEntry,
		createGameSummary,
		normalizeAttempt,
		normalizeGuessHistoryEntry,
		normalizeGameKey,
		normalizeGuessHistoryRecord,
		normalizeReferenceMove,
	},
};
