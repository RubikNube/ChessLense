const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { HttpError } = require("./httpError");
const { clearOtbDatabase, openOtbDatabase } = require("./otbDb");

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE_LIMIT = 100;
const DEFAULT_OTB_PGN_DIR = path.join(__dirname, "data", "otb");
const HEADER_PATTERN = /\[\s*([A-Za-z0-9_]+)\s+"((?:\\.|[^"\\])*)"\s*\]/g;
const RESULT_WINNER_MAP = {
	"1-0": "white",
	"0-1": "black",
};
const ALLOWED_RESULTS = new Set(["1-0", "0-1", "1/2-1/2", "*"]);
const ALLOWED_COLORS = new Set(["white", "black"]);
const ECO_CODE_PATTERN = /^[A-E]\d{2}$/i;
const GAME_ID_PATTERN = /^otb-[a-f0-9]{64}$/;

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

function normalizePositiveInteger(value, fieldName) {
	const normalized = normalizeString(value);

	if (!normalized) {
		return null;
	}

	if (!/^\d+$/.test(normalized)) {
		throw new HttpError(400, "invalid_query", `${fieldName} must be a whole number`);
	}

	return Number(normalized);
}

function normalizePage(value) {
	const page = normalizePositiveInteger(value, "page");

	if (page === null) {
		return DEFAULT_PAGE;
	}

	if (page < 1) {
		throw new HttpError(400, "invalid_query", "page must be at least 1");
	}

	return page;
}

function normalizePageSize(value) {
	const pageSize = normalizePositiveInteger(value, "pageSize");

	if (pageSize === null) {
		return DEFAULT_PAGE_SIZE;
	}

	if (pageSize < 1 || pageSize > MAX_PAGE_SIZE_LIMIT) {
		throw new HttpError(
			400,
			"invalid_query",
			`pageSize must be between 1 and ${MAX_PAGE_SIZE_LIMIT}`,
		);
	}

	return pageSize;
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

function normalizeColor(value) {
	const normalized = normalizeString(value).toLowerCase();

	if (!normalized) {
		return "";
	}

	if (!ALLOWED_COLORS.has(normalized)) {
		throw new HttpError(400, "invalid_query", "color must be white or black");
	}

	return normalized;
}

function normalizeEcoCode(value, fieldName) {
	const normalized = normalizeString(value).toUpperCase();

	if (!normalized) {
		return "";
	}

	if (!ECO_CODE_PATTERN.test(normalized)) {
		throw new HttpError(400, "invalid_query", `${fieldName} must be an ECO code like C50`);
	}

	return normalized;
}

function normalizeEcoHeader(value) {
	const normalized = normalizeString(value).toUpperCase();
	return ECO_CODE_PATTERN.test(normalized) ? normalized : "";
}

function normalizeEcoRange(query) {
	const ecoFrom = normalizeEcoCode(query.ecoFrom, "ecoFrom");
	const ecoTo = normalizeEcoCode(query.ecoTo, "ecoTo");

	if (ecoFrom && ecoTo && ecoFrom > ecoTo) {
		throw new HttpError(400, "invalid_query", "ecoFrom cannot be greater than ecoTo");
	}

	return {
		ecoFrom,
		ecoTo,
	};
}

function normalizePlayerFilters(query) {
	const player = normalizeString(query.player);
	const opponent = normalizeString(query.opponent);
	const color = normalizeColor(query.color);

	if (player || opponent || color) {
		if (color && !player) {
			throw new HttpError(400, "invalid_query", "color requires player");
		}

		return {
			player,
			opponent,
			color,
		};
	}

	const legacyWhite = normalizeString(query.white);
	const legacyBlack = normalizeString(query.black);

	if (legacyWhite && legacyBlack) {
		return {
			player: legacyWhite,
			opponent: legacyBlack,
			color: "white",
		};
	}

	if (legacyWhite) {
		return {
			player: legacyWhite,
			opponent: "",
			color: "white",
		};
	}

	if (legacyBlack) {
		return {
			player: legacyBlack,
			opponent: "",
			color: "black",
		};
	}

	return {
		player: "",
		opponent: "",
		color: "",
	};
}

function normalizeSearchQuery(query) {
	const playerFilters = normalizePlayerFilters(query);
	const ecoRange = normalizeEcoRange(query);
	const search = {
		player: playerFilters.player,
		opponent: playerFilters.opponent,
		color: playerFilters.color,
		event: normalizeString(query.event),
		ecoFrom: ecoRange.ecoFrom,
		ecoTo: ecoRange.ecoTo,
		opening: normalizeString(query.opening),
		result: normalizeResult(query.result),
		yearFrom: normalizeOptionalYear(query.yearFrom, "yearFrom"),
		yearTo: normalizeOptionalYear(query.yearTo, "yearTo"),
		page: normalizePage(query.page),
		pageSize: normalizePageSize(query.pageSize ?? query.max),
	};

	if (search.yearFrom && search.yearTo && search.yearFrom > search.yearTo) {
		throw new HttpError(400, "invalid_query", "yearFrom cannot be greater than yearTo");
	}

	if (
		!(
			search.player ||
			search.opponent ||
			search.event ||
			search.ecoFrom ||
			search.ecoTo ||
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
				files.push({
					fullPath,
					relativePath: path.relative(rootDir, fullPath),
				});
			}
		}
	}

	return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
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

function parsePlyCount(value) {
	const normalized = normalizeString(value);

	if (!/^\d+$/.test(normalized)) {
		return null;
	}

	return Number(normalized);
}

function countMoves(rawPgn) {
	const headerPlyCountMatch = rawPgn.match(/\[\s*PlyCount\s+"(\d+)"\s*\]/i);

	if (headerPlyCountMatch) {
		const plyCount = parsePlyCount(headerPlyCountMatch[1]);

		if (Number.isInteger(plyCount) && plyCount > 0) {
			return {
				plyCount,
				moveCount: Math.ceil(plyCount / 2),
			};
		}
	}

	const movetext = rawPgn
		.replace(/\r\n/g, "\n")
		.replace(/\[\s*[A-Za-z0-9_]+\s+"(?:\\.|[^"\\])*"\s*\]\s*/g, " ")
		.replace(/\{[^}]*\}/g, " ")
		.replace(/;[^\n]*/g, " ")
		.replace(/\([^)]*\)/g, " ");
	const sanTokens = movetext
		.split(/\s+/)
		.map((token) => token.trim().replace(/^\d+\.(?:\.\.)?/, ""))
		.filter(Boolean)
		.filter((token) => !/^\$\d+$/.test(token))
		.filter((token) => !["1-0", "0-1", "1/2-1/2", "*"].includes(token));
	const plyCount = sanTokens.length;

	return {
		plyCount,
		moveCount: plyCount > 0 ? Math.ceil(plyCount / 2) : 0,
	};
}

function normalizePgnForStorage(rawPgn) {
	return rawPgn.replace(/\r\n/g, "\n").trim();
}

function createGameId(rawPgn) {
	return `otb-${crypto.createHash("sha256").update(normalizePgnForStorage(rawPgn)).digest("hex")}`;
}

function normalizeGameId(gameId) {
	const normalized = normalizeString(gameId);

	if (!GAME_ID_PATTERN.test(normalized)) {
		throw new HttpError(400, "invalid_query", "gameId is invalid");
	}

	return normalized;
}

function includesIgnoreCase(source, query) {
	return normalizeString(source).toLowerCase().includes(normalizeString(query).toLowerCase());
}

function splitNameTokens(value) {
	return normalizeString(value)
		.toLowerCase()
		.split(/[^\p{L}\p{N}]+/u)
		.filter(Boolean);
}

function normalizeNameForSearch(value, fallback = "Unknown Player") {
	const normalized = normalizeString(value) || fallback;
	const tokens = splitNameTokens(normalized);

	return {
		displayName: normalized,
		normalizedName: tokens.join(" "),
		searchName: tokens.length > 0 ? ` ${tokens.join(" ")} ` : " ",
	};
}

function matchesNameTokens(source, query) {
	const queryTokens = splitNameTokens(query);

	if (queryTokens.length === 0) {
		return false;
	}

	const sourceTokens = new Set(splitNameTokens(source));
	return queryTokens.every((token) => sourceTokens.has(token));
}

function matchesEcoRange(eco, search) {
	if (!search.ecoFrom && !search.ecoTo) {
		return true;
	}

	const normalizedEco = normalizeEcoHeader(eco);

	if (!normalizedEco) {
		return false;
	}

	if (search.ecoFrom && normalizedEco < search.ecoFrom) {
		return false;
	}

	if (search.ecoTo && normalizedEco > search.ecoTo) {
		return false;
	}

	return true;
}

function matchesSearch(game, search) {
	const white = normalizeString(game.headers.White);
	const black = normalizeString(game.headers.Black);
	const event = normalizeString(game.headers.Event);
	const opening = normalizeString(game.headers.Opening);
	const result = normalizeString(game.headers.Result);
	const year = game.date.year;
	const isPairSearch = search.player && search.opponent;
	const matchesWhitePlayer = search.player
		? isPairSearch
			? matchesNameTokens(white, search.player)
			: includesIgnoreCase(white, search.player)
		: true;
	const matchesBlackPlayer = search.player
		? isPairSearch
			? matchesNameTokens(black, search.player)
			: includesIgnoreCase(black, search.player)
		: true;
	const matchesWhiteOpponent = search.opponent
		? isPairSearch
			? matchesNameTokens(white, search.opponent)
			: includesIgnoreCase(white, search.opponent)
		: true;
	const matchesBlackOpponent = search.opponent
		? isPairSearch
			? matchesNameTokens(black, search.opponent)
			: includesIgnoreCase(black, search.opponent)
		: true;

	if (isPairSearch) {
		if (search.color === "white" && !(matchesWhitePlayer && matchesBlackOpponent)) {
			return false;
		}

		if (search.color === "black" && !(matchesBlackPlayer && matchesWhiteOpponent)) {
			return false;
		}

		if (
			!search.color &&
			!(
				(matchesWhitePlayer && matchesBlackOpponent) ||
				(matchesBlackPlayer && matchesWhiteOpponent)
			)
		) {
			return false;
		}
	} else {
		if (search.player) {
			if (search.color === "white" && !matchesWhitePlayer) {
				return false;
			}

			if (search.color === "black" && !matchesBlackPlayer) {
				return false;
			}

			if (!search.color && !(matchesWhitePlayer || matchesBlackPlayer)) {
				return false;
			}
		}

		if (search.opponent && !(matchesWhiteOpponent || matchesBlackOpponent)) {
			return false;
		}
	}

	if (search.event && !includesIgnoreCase(event, search.event)) {
		return false;
	}

	if (!matchesEcoRange(game.headers.ECO, search)) {
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

function buildImportedGameRecord(rawPgn, sourceFile) {
	const normalizedPgn = normalizePgnForStorage(rawPgn);
	const headers = buildHeaderMap(extractHeaderEntries(normalizedPgn));
	const whitePlayer = normalizeNameForSearch(headers.White, "Unknown White");
	const blackPlayer = normalizeNameForSearch(headers.Black, "Unknown Black");
	const date = parseDateMetadata(headers.Date);
	const moveData = countMoves(normalizedPgn);
	const now = new Date().toISOString();

	return {
		id: createGameId(normalizedPgn),
		rawPgn: normalizedPgn,
		source: "sqlite",
		sourceFile: normalizeString(sourceFile) || null,
		event: normalizeString(headers.Event) || null,
		site: normalizeString(headers.Site) || null,
		round: normalizeString(headers.Round) || null,
		result: normalizeString(headers.Result) || null,
		variant: normalizeString(headers.Variant) || "standard",
		dateLabel: date.rawDate,
		year: date.year,
		createdAt: date.createdAt,
		eco: normalizeString(headers.ECO) || null,
		ecoNormalized: normalizeEcoHeader(headers.ECO) || null,
		opening: normalizeString(headers.Opening) || null,
		plyCount: moveData.plyCount,
		moveCount: moveData.moveCount,
		importedAt: now,
		players: {
			white: whitePlayer,
			black: blackPlayer,
		},
	};
}

function mapGameSummaryRow(row) {
	return {
		id: row.id,
		source: row.source || "sqlite",
		url: null,
		rated: null,
		perf: null,
		speed: null,
		variant: normalizeString(row.variant) || "standard",
		status: null,
		winner: RESULT_WINNER_MAP[row.result] ?? null,
		createdAt: Number.isInteger(row.createdAt) ? row.createdAt : null,
		dateLabel: normalizeString(row.dateLabel) || null,
		year: Number.isInteger(row.year) ? row.year : null,
		result: normalizeString(row.result) || null,
		moveCount: Number.isInteger(row.moveCount) ? row.moveCount : 0,
		plyCount: Number.isInteger(row.plyCount) ? row.plyCount : 0,
		event: normalizeString(row.event) || null,
		site: normalizeString(row.site) || null,
		round: normalizeString(row.round) || null,
		eco: normalizeString(row.eco) || null,
		opening: normalizeString(row.opening) || null,
		sourceFile: normalizeString(row.sourceFile) || null,
		players: {
			white: {
				name: normalizeString(row.whiteName) || "Unknown White",
				id: null,
				title: null,
				rating: null,
				ratingDiff: null,
			},
			black: {
				name: normalizeString(row.blackName) || "Unknown Black",
				id: null,
				title: null,
				rating: null,
				ratingDiff: null,
			},
		},
	};
}

function escapeLikePattern(value) {
	return normalizeString(value).replace(/[\\%_]/g, "\\$&").toLowerCase();
}

function buildContainsClause(column, value) {
	return {
		clause: `lower(${column}) LIKE ? ESCAPE '\\'`,
		params: [`%${escapeLikePattern(value)}%`],
	};
}

function buildTokenClause(column, value) {
	const tokens = splitNameTokens(value);

	if (tokens.length === 0) {
		return {
			clause: "0",
			params: [],
		};
	}

	return {
		clause: `(${tokens.map(() => `${column} LIKE ? ESCAPE '\\'`).join(" AND ")})`,
		params: tokens.map((token) => `% ${escapeLikePattern(token)} %`),
	};
}

function appendMatchClause(clauses, params, match) {
	clauses.push(match.clause);
	params.push(...match.params);
}

function buildSearchQueryDefinition(search) {
	const clauses = [];
	const params = [];
	const isPairSearch = Boolean(search.player && search.opponent);

	if (isPairSearch) {
		const playerWhite = buildTokenClause("pw.search_name", search.player);
		const playerBlack = buildTokenClause("pb.search_name", search.player);
		const opponentWhite = buildTokenClause("pw.search_name", search.opponent);
		const opponentBlack = buildTokenClause("pb.search_name", search.opponent);

		if (search.color === "white") {
			appendMatchClause(clauses, params, {
				clause: `(${playerWhite.clause} AND ${opponentBlack.clause})`,
				params: [...playerWhite.params, ...opponentBlack.params],
			});
		} else if (search.color === "black") {
			appendMatchClause(clauses, params, {
				clause: `(${playerBlack.clause} AND ${opponentWhite.clause})`,
				params: [...playerBlack.params, ...opponentWhite.params],
			});
		} else {
			appendMatchClause(clauses, params, {
				clause: `((${playerWhite.clause} AND ${opponentBlack.clause}) OR (${playerBlack.clause} AND ${opponentWhite.clause}))`,
				params: [
					...playerWhite.params,
					...opponentBlack.params,
					...playerBlack.params,
					...opponentWhite.params,
				],
			});
		}
	} else {
		if (search.player) {
			if (search.color === "white") {
				appendMatchClause(clauses, params, buildContainsClause("pw.name", search.player));
			} else if (search.color === "black") {
				appendMatchClause(clauses, params, buildContainsClause("pb.name", search.player));
			} else {
				const whitePlayerMatch = buildContainsClause("pw.name", search.player);
				const blackPlayerMatch = buildContainsClause("pb.name", search.player);
				appendMatchClause(clauses, params, {
					clause: `(${whitePlayerMatch.clause} OR ${blackPlayerMatch.clause})`,
					params: [...whitePlayerMatch.params, ...blackPlayerMatch.params],
				});
			}
		}

		if (search.opponent) {
			const whiteOpponentMatch = buildContainsClause("pw.name", search.opponent);
			const blackOpponentMatch = buildContainsClause("pb.name", search.opponent);
			appendMatchClause(clauses, params, {
				clause: `(${whiteOpponentMatch.clause} OR ${blackOpponentMatch.clause})`,
				params: [...whiteOpponentMatch.params, ...blackOpponentMatch.params],
			});
		}
	}

	if (search.event) {
		appendMatchClause(clauses, params, buildContainsClause("g.event", search.event));
	}

	if (search.ecoFrom) {
		clauses.push("g.eco_normalized >= ?");
		params.push(search.ecoFrom);
	}

	if (search.ecoTo) {
		clauses.push("g.eco_normalized <= ?");
		params.push(search.ecoTo);
	}

	if (search.opening) {
		appendMatchClause(clauses, params, buildContainsClause("g.opening", search.opening));
	}

	if (search.result) {
		clauses.push("g.result = ?");
		params.push(search.result);
	}

	if (search.yearFrom) {
		clauses.push("g.year >= ?");
		params.push(search.yearFrom);
	}

	if (search.yearTo) {
		clauses.push("g.year <= ?");
		params.push(search.yearTo);
	}

	return {
		fromClause: `
			FROM otb_games g
			JOIN otb_game_players gpw
				ON gpw.game_id = g.id AND gpw.color = 'white'
			JOIN otb_players pw
				ON pw.id = gpw.player_id
			JOIN otb_game_players gpb
				ON gpb.game_id = g.id AND gpb.color = 'black'
			JOIN otb_players pb
				ON pb.id = gpb.player_id
		`,
		whereClause: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
		params,
	};
}

async function importPgnDirectory(options = {}) {
	const rootDir = normalizeString(options.rootDir) || normalizeString(process.env.OTB_PGN_DIR) || DEFAULT_OTB_PGN_DIR;

	if (!(await pathExists(rootDir))) {
		throw new HttpError(
			404,
			"otb_source_not_configured",
			`OTB PGN directory not found. Set OTB_PGN_DIR or pass a directory to npm run otb:import.`,
		);
	}

	const files = await listPgnFiles(rootDir);
	const result = await importPgnSourceEntries(
		files.map((file) => ({
			sourceFile: file.relativePath,
			loadContent: () => fs.readFile(file.fullPath, "utf8"),
		})),
		{
			dbPath: options.dbPath,
			reset: options.reset,
		},
	);

	return {
		...result,
		rootDir,
	};
}

async function importPgnFile(options = {}) {
	const sourceFile = normalizeString(options.sourceFile);
	const rawContent = typeof options.content === "string" ? options.content : "";

	if (!sourceFile) {
		throw new HttpError(400, "invalid_import", "fileName is required.");
	}

	if (!sourceFile.toLowerCase().endsWith(".pgn")) {
		throw new HttpError(400, "invalid_import", "fileName must end with .pgn.");
	}

	if (!normalizeString(rawContent)) {
		throw new HttpError(400, "invalid_import", "PGN file content is required.");
	}

	const result = await importPgnSourceEntries(
		[
			{
				sourceFile,
				loadContent: async () => rawContent,
			},
		],
		{
			dbPath: options.dbPath,
		},
	);

	if (result.totalGames < 1) {
		throw new HttpError(400, "invalid_import", "No PGN games were found in the uploaded file.");
	}

	return {
		...result,
		fileName: sourceFile,
	};
}

async function importPgnSourceEntries(sourceEntries, options = {}) {
	const entries = Array.isArray(sourceEntries) ? sourceEntries : [];
	const { database, dbPath } = await openOtbDatabase({
		create: true,
		dbPath: options.dbPath,
	});

	try {
		const insertPlayerStatement = database.prepare(`
			INSERT OR IGNORE INTO otb_players (name, normalized_name, search_name)
			VALUES (?, ?, ?)
		`);
		const selectPlayerStatement = database.prepare(`
			SELECT id
			FROM otb_players
			WHERE normalized_name = ? AND name = ?
		`);
		const insertGameStatement = database.prepare(`
			INSERT OR IGNORE INTO otb_games (
				id,
				raw_pgn,
				source,
				source_file,
				event,
				site,
				round,
				result,
				variant,
				date_label,
				year,
				created_at,
				eco,
				eco_normalized,
				opening,
				ply_count,
				move_count,
				imported_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);
		const insertGamePlayerStatement = database.prepare(`
			INSERT INTO otb_game_players (game_id, color, player_id)
			VALUES (?, ?, ?)
			ON CONFLICT(game_id, color) DO UPDATE SET player_id = excluded.player_id
		`);
		let totalGames = 0;
		let importedGames = 0;
		let skippedGames = 0;
		let transactionOpen = false;

		const getOrCreatePlayerId = (player) => {
			insertPlayerStatement.run(player.displayName, player.normalizedName, player.searchName);
			const row = selectPlayerStatement.get(player.normalizedName, player.displayName);

			if (!row?.id) {
				throw new Error(`Unable to resolve player id for ${player.displayName}`);
			}

			return row.id;
		};

		try {
			database.exec("BEGIN IMMEDIATE");
			transactionOpen = true;

			if (options.reset) {
				clearOtbDatabase(database);
			}

			for (const entry of entries) {
				const content = await entry.loadContent();
				const fileGames = splitGames(content);

				for (const rawPgn of fileGames) {
					const game = buildImportedGameRecord(rawPgn, entry.sourceFile);
					totalGames += 1;

					const insertResult = insertGameStatement.run(
						game.id,
						game.rawPgn,
						game.source,
						game.sourceFile,
						game.event,
						game.site,
						game.round,
						game.result,
						game.variant,
						game.dateLabel,
						game.year,
						game.createdAt,
						game.eco,
						game.ecoNormalized,
						game.opening,
						game.plyCount,
						game.moveCount,
						game.importedAt,
					);

					if (insertResult.changes === 0) {
						skippedGames += 1;
						continue;
					}

					const whitePlayerId = getOrCreatePlayerId(game.players.white);
					const blackPlayerId = getOrCreatePlayerId(game.players.black);

					insertGamePlayerStatement.run(game.id, "white", whitePlayerId);
					insertGamePlayerStatement.run(game.id, "black", blackPlayerId);
					importedGames += 1;
				}
			}

			database.exec("COMMIT");
			transactionOpen = false;
		} catch (error) {
			if (transactionOpen) {
				database.exec("ROLLBACK");
			}

			throw error;
		}

		return {
			dbPath,
			fileCount: entries.length,
			totalGames,
			importedGames,
			skippedGames,
		};
	} finally {
		database.close();
	}
}

async function searchGames(rawQuery, options = {}) {
	const search = normalizeSearchQuery(rawQuery);
	const { database } = await openOtbDatabase({
		dbPath: options.dbPath,
	});

	try {
		const queryDefinition = buildSearchQueryDefinition(search);
		const totalResults =
			database
				.prepare(`
					SELECT COUNT(*) AS totalResults
					${queryDefinition.fromClause}
					${queryDefinition.whereClause}
				`)
				.get(...queryDefinition.params)?.totalResults ?? 0;
		const totalPages = totalResults > 0 ? Math.ceil(totalResults / search.pageSize) : 1;
		const currentPage = Math.min(search.page, totalPages);
		const offset = (currentPage - 1) * search.pageSize;
		const games = database
			.prepare(`
				SELECT
					g.id,
					g.source,
					g.source_file AS sourceFile,
					g.variant,
					g.result,
					g.created_at AS createdAt,
					g.date_label AS dateLabel,
					g.year,
					g.move_count AS moveCount,
					g.ply_count AS plyCount,
					g.event,
					g.site,
					g.round,
					g.eco,
					g.opening,
					pw.name AS whiteName,
					pb.name AS blackName
					${queryDefinition.fromClause}
					${queryDefinition.whereClause}
					ORDER BY COALESCE(g.year, 0) DESC, COALESCE(g.created_at, 0) DESC, g.id ASC
					LIMIT ? OFFSET ?
			`)
			.all(...queryDefinition.params, search.pageSize, offset)
			.map(mapGameSummaryRow);

		return {
			search: {
				...search,
				page: currentPage,
				totalResults,
				totalPages,
			},
			games,
			pagination: {
				page: currentPage,
				pageSize: search.pageSize,
				totalResults,
				totalPages,
				hasPreviousPage: currentPage > 1,
				hasNextPage: currentPage < totalPages,
			},
		};
	} finally {
		database.close();
	}
}

async function getGame(gameId, options = {}) {
	const normalizedGameId = normalizeGameId(gameId);
	const { database } = await openOtbDatabase({
		dbPath: options.dbPath,
	});

	try {
		const row = database
			.prepare(`
				SELECT
					g.id,
					g.raw_pgn AS rawPgn,
					g.source,
					g.source_file AS sourceFile,
					g.variant,
					g.result,
					g.created_at AS createdAt,
					g.date_label AS dateLabel,
					g.year,
					g.move_count AS moveCount,
					g.ply_count AS plyCount,
					g.event,
					g.site,
					g.round,
					g.eco,
					g.opening,
					pw.name AS whiteName,
					pb.name AS blackName
				FROM otb_games g
				JOIN otb_game_players gpw
					ON gpw.game_id = g.id AND gpw.color = 'white'
				JOIN otb_players pw
					ON pw.id = gpw.player_id
				JOIN otb_game_players gpb
					ON gpb.game_id = g.id AND gpb.color = 'black'
				JOIN otb_players pb
					ON pb.id = gpb.player_id
				WHERE g.id = ?
			`)
			.get(normalizedGameId);

		if (!row) {
			throw new HttpError(404, "not_found", "OTB game not found");
		}

		return {
			game: mapGameSummaryRow(row),
			pgn: row.rawPgn,
		};
	} finally {
		database.close();
	}
}

module.exports = {
	DEFAULT_OTB_PGN_DIR,
	getGame,
	importPgnDirectory,
	importPgnFile,
	searchGames,
	__testing: {
		buildImportedGameRecord,
		matchesEcoRange,
		matchesSearch,
		normalizeEcoCode,
		normalizeGameId,
		normalizeNameForSearch,
		normalizeSearchQuery,
		splitGames,
	},
};
