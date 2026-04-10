const fs = require("fs/promises");
const path = require("path");
const { HttpError } = require("./httpError");

const DEFAULT_MAX_RESULTS = 25;
const MAX_RESULTS_LIMIT = 100;
const DEFAULT_OTB_PGN_DIR = path.join(__dirname, "data", "otb");
const HEADER_PATTERN = /\[\s*([A-Za-z0-9_]+)\s+"((?:\\.|[^"\\])*)"\s*\]/g;
const RESULT_WINNER_MAP = {
	"1-0": "white",
	"0-1": "black",
};
const ALLOWED_RESULTS = new Set(["1-0", "0-1", "1/2-1/2", "*"]);

let cache = null;

function normalizeString(value) {
	return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalYear(value, fieldName) {
	const normalized = normalizeString(value);

	if (!normalized) {
		return null;
	}

	if (!/^\d{4}$/.test(normalized)) {
		throw new HttpError(400, "invalid_query", `${fieldName} must be a 4-digit year`);
	}

	return Number(normalized);
}

function normalizeMaxResults(value) {
	const normalized = normalizeString(value);

	if (!normalized) {
		return DEFAULT_MAX_RESULTS;
	}

	if (!/^\d+$/.test(normalized)) {
		throw new HttpError(400, "invalid_query", "max must be a whole number");
	}

	const max = Number(normalized);

	if (max < 1 || max > MAX_RESULTS_LIMIT) {
		throw new HttpError(
			400,
			"invalid_query",
			`max must be between 1 and ${MAX_RESULTS_LIMIT}`,
		);
	}

	return max;
}

function normalizeResult(value) {
	const normalized = normalizeString(value);

	if (!normalized) {
		return "";
	}

	if (!ALLOWED_RESULTS.has(normalized)) {
		throw new HttpError(
			400,
			"invalid_query",
			"result must be one of 1-0, 0-1, 1/2-1/2, or *",
		);
	}

	return normalized;
}

function normalizeSearchQuery(query) {
	const search = {
		player: normalizeString(query.player),
		white: normalizeString(query.white),
		black: normalizeString(query.black),
		event: normalizeString(query.event),
		eco: normalizeString(query.eco),
		opening: normalizeString(query.opening),
		result: normalizeResult(query.result),
		yearFrom: normalizeOptionalYear(query.yearFrom, "yearFrom"),
		yearTo: normalizeOptionalYear(query.yearTo, "yearTo"),
		max: normalizeMaxResults(query.max),
	};

	if (search.yearFrom && search.yearTo && search.yearFrom > search.yearTo) {
		throw new HttpError(400, "invalid_query", "yearFrom cannot be greater than yearTo");
	}

	if (
		!(
			search.player ||
			search.white ||
			search.black ||
			search.event ||
			search.eco ||
			search.opening ||
			search.result ||
			search.yearFrom ||
			search.yearTo
		)
	) {
		throw new HttpError(
			400,
			"invalid_query",
			"Enter at least one OTB search filter before searching.",
		);
	}

	return search;
}

async function pathExists(targetPath) {
	try {
		await fs.access(targetPath);
		return true;
	} catch {
		return false;
	}
}

async function listPgnFiles(rootDir) {
	const files = [];
	const directories = [rootDir];

	while (directories.length > 0) {
		const currentDirectory = directories.pop();
		const entries = await fs.readdir(currentDirectory, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(currentDirectory, entry.name);

			if (entry.isDirectory()) {
				directories.push(fullPath);
			} else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pgn")) {
				files.push(fullPath);
			}
		}
	}

	return files.sort();
}

function splitGames(rawContent) {
	const normalized = rawContent.replace(/\r\n/g, "\n").trim();

	if (!normalized) {
		return [];
	}

	return normalized
		.split(/\n{2,}(?=\[Event\s)/g)
		.map((game) => game.trim())
		.filter(Boolean);
}

function extractHeaderEntries(rawPgn) {
	const headers = [];

	for (const match of rawPgn.matchAll(HEADER_PATTERN)) {
		headers.push({
			name: match[1],
			value: match[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\"),
		});
	}

	return headers;
}

function buildHeaderMap(headers) {
	return headers.reduce((accumulator, header) => {
		accumulator[header.name] = header.value;
		return accumulator;
	}, {});
}

function parseDateMetadata(dateValue) {
	const date = normalizeString(dateValue);
	const yearMatch = date.match(/^(\d{4})/);
	const year = yearMatch ? Number(yearMatch[1]) : null;
	const preciseDateMatch = date.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
	const createdAt = preciseDateMatch
		? Date.UTC(
				Number(preciseDateMatch[1]),
				Number(preciseDateMatch[2]) - 1,
				Number(preciseDateMatch[3]),
			)
		: null;

	return {
		rawDate: date || null,
		year,
		createdAt,
	};
}

function createGameId(relativePath, index) {
	return Buffer.from(JSON.stringify({ file: relativePath, index }), "utf8").toString("base64url");
}

function decodeGameId(gameId) {
	try {
		const parsed = JSON.parse(Buffer.from(gameId, "base64url").toString("utf8"));

		if (
			!parsed ||
			typeof parsed !== "object" ||
			typeof parsed.file !== "string" ||
			!Number.isInteger(parsed.index) ||
			parsed.index < 0
		) {
			throw new Error("Invalid game id");
		}

		return parsed;
	} catch {
		throw new HttpError(400, "invalid_query", "gameId is invalid");
	}
}

function mapGameSummary(game) {
	return {
		id: game.id,
		source: "local-pgn",
		url: null,
		rated: null,
		perf: null,
		speed: null,
		variant: normalizeString(game.headers.Variant) || "standard",
		status: null,
		winner: RESULT_WINNER_MAP[game.headers.Result] ?? null,
		createdAt: game.date.createdAt,
		dateLabel: game.date.rawDate,
		year: game.date.year,
		result: normalizeString(game.headers.Result) || null,
		event: normalizeString(game.headers.Event) || null,
		site: normalizeString(game.headers.Site) || null,
		round: normalizeString(game.headers.Round) || null,
		eco: normalizeString(game.headers.ECO) || null,
		opening: normalizeString(game.headers.Opening) || null,
		sourceFile: game.relativePath,
		players: {
			white: {
				name: normalizeString(game.headers.White) || "Unknown White",
				id: null,
				title: null,
				rating: null,
				ratingDiff: null,
			},
			black: {
				name: normalizeString(game.headers.Black) || "Unknown Black",
				id: null,
				title: null,
				rating: null,
				ratingDiff: null,
			},
		},
	};
}

function includesIgnoreCase(source, query) {
	return normalizeString(source).toLowerCase().includes(normalizeString(query).toLowerCase());
}

function matchesSearch(game, search) {
	const white = normalizeString(game.headers.White);
	const black = normalizeString(game.headers.Black);
	const event = normalizeString(game.headers.Event);
	const opening = normalizeString(game.headers.Opening);
	const eco = normalizeString(game.headers.ECO);
	const result = normalizeString(game.headers.Result);
	const year = game.date.year;

	if (search.player && !(includesIgnoreCase(white, search.player) || includesIgnoreCase(black, search.player))) {
		return false;
	}

	if (search.white && !includesIgnoreCase(white, search.white)) {
		return false;
	}

	if (search.black && !includesIgnoreCase(black, search.black)) {
		return false;
	}

	if (search.event && !includesIgnoreCase(event, search.event)) {
		return false;
	}

	if (search.eco && !includesIgnoreCase(eco, search.eco)) {
		return false;
	}

	if (search.opening && !includesIgnoreCase(opening, search.opening)) {
		return false;
	}

	if (search.result && result !== search.result) {
		return false;
	}

	if (search.yearFrom && (!year || year < search.yearFrom)) {
		return false;
	}

	if (search.yearTo && (!year || year > search.yearTo)) {
		return false;
	}

	return true;
}

async function buildIndex(rootDir) {
	const files = await listPgnFiles(rootDir);
	const games = [];
	const gamesById = new Map();

	for (const filePath of files) {
		const relativePath = path.relative(rootDir, filePath);
		const content = await fs.readFile(filePath, "utf8");
		const fileGames = splitGames(content);

		fileGames.forEach((rawPgn, index) => {
			const headers = buildHeaderMap(extractHeaderEntries(rawPgn));
			const id = createGameId(relativePath, index);
			const game = {
				id,
				rawPgn,
				headers,
				relativePath,
				date: parseDateMetadata(headers.Date),
			};

			games.push(game);
			gamesById.set(id, game);
		});
	}

	cache = {
		rootDir,
		files,
		games,
		gamesById,
	};

	return cache;
}

async function loadIndex() {
	const configuredRoot = normalizeString(process.env.OTB_PGN_DIR) || DEFAULT_OTB_PGN_DIR;

	if (!(await pathExists(configuredRoot))) {
		throw new HttpError(
			503,
			"otb_source_not_configured",
			`OTB PGN directory not found. Set OTB_PGN_DIR or add PGN files under ${DEFAULT_OTB_PGN_DIR}.`,
		);
	}

	if (cache && cache.rootDir === configuredRoot) {
		return cache;
	}

	return buildIndex(configuredRoot);
}

async function searchGames(rawQuery) {
	const search = normalizeSearchQuery(rawQuery);
	const index = await loadIndex();
	const games = index.games
		.filter((game) => matchesSearch(game, search))
		.sort((left, right) => {
			const leftYear = left.date.year ?? 0;
			const rightYear = right.date.year ?? 0;
			return rightYear - leftYear;
		})
		.slice(0, search.max)
		.map(mapGameSummary);

	return {
		search,
		games,
	};
}

async function getGame(gameId) {
	decodeGameId(gameId);
	const index = await loadIndex();
	const game = index.gamesById.get(gameId);

	if (!game) {
		throw new HttpError(404, "not_found", "OTB game not found");
	}

	return {
		game: mapGameSummary(game),
		pgn: game.rawPgn,
	};
}

module.exports = {
	getGame,
	searchGames,
};
