const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { Chess, DEFAULT_POSITION } = require("chess.js");
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
const UCI_MOVE_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const OPENING_TREE_COLORS = new Set(["white", "black"]);
const DEFAULT_EXPORT_DEPTH = 20;
const DEFAULT_EXPORT_MIN_GAMES = 2;
const DEFAULT_EXPORT_MAX_BRANCHES = 5;

function normalizeString(value) {
	return typeof value === "string" ? value.trim() : "";
}

function normalizePositionKey(fen) {
	const normalizedFen = normalizeString(fen);

	try {
		const position = new Chess(normalizedFen || DEFAULT_POSITION);
		return position.fen().split(/\s+/).slice(0, 4).join(" ");
	} catch {
		throw new HttpError(
			400,
			"invalid_query",
			"fen must be a valid chess position",
		);
	}
}

function formatMoveAsUci(move) {
	return `${move.from}${move.to}${move.promotion || ""}`;
}

function normalizeOptionalYear(value, fieldName) {
	const normalized = normalizeString(value);

	if (!normalized) {
		return null;
	}

	if (!/^\d{4}$/.test(normalized)) {
		throw new HttpError(
			400,
			"invalid_query",
			`${fieldName} must be a 4-digit year`,
		);
	}

	return Number(normalized);
}

function normalizePositiveInteger(value, fieldName) {
	const normalized = normalizeString(value);

	if (!normalized) {
		return null;
	}

	if (!/^\d+$/.test(normalized)) {
		throw new HttpError(
			400,
			"invalid_query",
			`${fieldName} must be a whole number`,
		);
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

function normalizeMoveCount(value, fieldName) {
	const moveCount = normalizePositiveInteger(value, fieldName);

	if (moveCount === null) {
		return null;
	}

	if (moveCount < 1) {
		throw new HttpError(
			400,
			"invalid_query",
			`${fieldName} must be at least 1`,
		);
	}

	return moveCount;
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
		throw new HttpError(
			400,
			"invalid_query",
			`${fieldName} must be an ECO code like C50`,
		);
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
		throw new HttpError(
			400,
			"invalid_query",
			"ecoFrom cannot be greater than ecoTo",
		);
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
		moveCountMin: normalizeMoveCount(query.moveCountMin, "moveCountMin"),
		moveCountMax: normalizeMoveCount(query.moveCountMax, "moveCountMax"),
		page: normalizePage(query.page),
		pageSize: normalizePageSize(query.pageSize ?? query.max),
	};

	if (search.yearFrom && search.yearTo && search.yearFrom > search.yearTo) {
		throw new HttpError(
			400,
			"invalid_query",
			"yearFrom cannot be greater than yearTo",
		);
	}

	if (
		search.moveCountMin &&
		search.moveCountMax &&
		search.moveCountMin > search.moveCountMax
	) {
		throw new HttpError(
			400,
			"invalid_query",
			"moveCountMin cannot be greater than moveCountMax",
		);
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
			search.yearTo ||
			search.moveCountMin ||
			search.moveCountMax
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

	return files.sort((left, right) =>
		left.relativePath.localeCompare(right.relativePath),
	);
}

function splitGames(rawContent) {
	const normalized = rawContent.replace(/\r\n/g, "\n").trim();

	if (!normalized) {
		return [];
	}

	return normalized
		.split(/\n(?:\s*\n)+(?=\s*\[Event\s)/g)
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
	return normalizeString(source)
		.toLowerCase()
		.includes(normalizeString(query).toLowerCase());
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
	const moveCount = Number.isInteger(game.moveCount)
		? game.moveCount
		: (() => {
				const plyCount = parsePlyCount(game.headers.PlyCount);
				return Number.isInteger(plyCount) && plyCount > 0
					? Math.ceil(plyCount / 2)
					: null;
			})();
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
		if (
			search.color === "white" &&
			!(matchesWhitePlayer && matchesBlackOpponent)
		) {
			return false;
		}

		if (
			search.color === "black" &&
			!(matchesBlackPlayer && matchesWhiteOpponent)
		) {
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

	if (search.moveCountMin && (!moveCount || moveCount < search.moveCountMin)) {
		return false;
	}

	if (search.moveCountMax && (!moveCount || moveCount > search.moveCountMax)) {
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

function indexGameMoves(database, game) {
	const deleteMoves = database.prepare(
		"DELETE FROM otb_game_moves WHERE game_id = ?",
	);
	const updateStatus = database.prepare(`
		UPDATE otb_games
		SET move_index_status = ?, move_index_error = ?
		WHERE id = ?
	`);
	deleteMoves.run(game.id);

	if (
		normalizeString(game.variant).toLowerCase() !== "standard" ||
		/\[\s*(?:FEN|SetUp)\s+"/i.test(game.rawPgn)
	) {
		updateStatus.run(
			"skipped",
			"Only standard games from the initial position are supported.",
			game.id,
		);
		return { indexed: false, skipped: true };
	}

	try {
		const chess = new Chess();
		const didLoad = chess.loadPgn(game.rawPgn);

		if (didLoad === false) {
			throw new Error("Invalid PGN movetext.");
		}

		const moves = chess.history({ verbose: true });
		const insertMove = database.prepare(`
			INSERT INTO otb_game_moves (game_id, ply, position_key, uci, san)
			VALUES (?, ?, ?, ?, ?)
		`);

		for (const [ply, move] of moves.entries()) {
			insertMove.run(
				game.id,
				ply,
				normalizePositionKey(move.before),
				formatMoveAsUci(move),
				move.san,
			);
		}

		updateStatus.run("indexed", null, game.id);
		return { indexed: true, skipped: false };
	} catch (error) {
		updateStatus.run(
			"skipped",
			normalizeString(error?.message) || "Unable to parse PGN.",
			game.id,
		);
		return { indexed: false, skipped: true };
	}
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
	return normalizeString(value)
		.replace(/[\\%_]/g, "\\$&")
		.toLowerCase();
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
				appendMatchClause(
					clauses,
					params,
					buildContainsClause("pw.name", search.player),
				);
			} else if (search.color === "black") {
				appendMatchClause(
					clauses,
					params,
					buildContainsClause("pb.name", search.player),
				);
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
			const whiteOpponentMatch = buildContainsClause(
				"pw.name",
				search.opponent,
			);
			const blackOpponentMatch = buildContainsClause(
				"pb.name",
				search.opponent,
			);
			appendMatchClause(clauses, params, {
				clause: `(${whiteOpponentMatch.clause} OR ${blackOpponentMatch.clause})`,
				params: [...whiteOpponentMatch.params, ...blackOpponentMatch.params],
			});
		}
	}

	if (search.event) {
		appendMatchClause(
			clauses,
			params,
			buildContainsClause("g.event", search.event),
		);
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
		appendMatchClause(
			clauses,
			params,
			buildContainsClause("g.opening", search.opening),
		);
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

	if (search.moveCountMin) {
		clauses.push("g.move_count >= ?");
		params.push(search.moveCountMin);
	}

	if (search.moveCountMax) {
		clauses.push("g.move_count <= ?");
		params.push(search.moveCountMax);
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
	const rootDir =
		normalizeString(options.rootDir) ||
		normalizeString(process.env.OTB_PGN_DIR) ||
		DEFAULT_OTB_PGN_DIR;

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
		throw new HttpError(
			400,
			"invalid_import",
			"No PGN games were found in the uploaded file.",
		);
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
			insertPlayerStatement.run(
				player.displayName,
				player.normalizedName,
				player.searchName,
			);
			const row = selectPlayerStatement.get(
				player.normalizedName,
				player.displayName,
			);

			if (!row?.id) {
				throw new Error(
					`Unable to resolve player id for ${player.displayName}`,
				);
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
					indexGameMoves(database, game);
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
				.prepare(
					`
					SELECT COUNT(*) AS totalResults
					${queryDefinition.fromClause}
					${queryDefinition.whereClause}
				`,
				)
				.get(...queryDefinition.params)?.totalResults ?? 0;
		const totalPages =
			totalResults > 0 ? Math.ceil(totalResults / search.pageSize) : 1;
		const currentPage = Math.min(search.page, totalPages);
		const offset = (currentPage - 1) * search.pageSize;
		const games = database
			.prepare(
				`
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
			`,
			)
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
			.prepare(
				`
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
			`,
			)
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

function normalizeOpeningTreeQuery(rawQuery, forcedColor) {
	const player = normalizeString(rawQuery.player);
	const color = normalizeString(forcedColor || rawQuery.color).toLowerCase();

	if (!player) {
		throw new HttpError(
			400,
			"invalid_query",
			"player is required for an OTB opening tree",
		);
	}

	if (!OPENING_TREE_COLORS.has(color)) {
		throw new HttpError(400, "invalid_query", "color must be white or black");
	}

	const search = normalizeSearchQuery({
		...rawQuery,
		player,
		color,
		page: "1",
		pageSize: String(MAX_PAGE_SIZE_LIMIT),
	});

	return {
		search,
		color,
		positionKey: normalizePositionKey(rawQuery.fen),
	};
}

function getMatchingIndexSummary(database, search) {
	const queryDefinition = buildSearchQueryDefinition(search);
	const rows = database
		.prepare(
			`
				SELECT DISTINCT
					g.id,
					g.raw_pgn AS rawPgn,
					g.variant,
					g.move_index_status AS moveIndexStatus
				${queryDefinition.fromClause}
				${queryDefinition.whereClause}
			`,
		)
		.all(...queryDefinition.params);

	return {
		rows,
		indexedGames: rows.filter((row) => row.moveIndexStatus === "indexed")
			.length,
		skippedGames: rows.filter((row) => row.moveIndexStatus === "skipped")
			.length,
	};
}

function ensureMatchingGamesIndexed(database, search) {
	const before = getMatchingIndexSummary(database, search);
	const pendingGames = before.rows.filter(
		(row) =>
			row.moveIndexStatus !== "indexed" && row.moveIndexStatus !== "skipped",
	);
	let transactionOpen = false;

	try {
		if (pendingGames.length > 0) {
			database.exec("BEGIN IMMEDIATE");
			transactionOpen = true;

			for (const game of pendingGames) {
				indexGameMoves(database, game);
			}

			database.exec("COMMIT");
			transactionOpen = false;
		}
	} catch (error) {
		if (transactionOpen) {
			database.exec("ROLLBACK");
		}

		throw error;
	}

	const after = getMatchingIndexSummary(database, search);
	return {
		totalGames: after.rows.length,
		indexedGames: after.indexedGames,
		skippedGames: after.skippedGames,
		newlyProcessedGames: pendingGames.length,
	};
}

function getPlayerOutcomeSql(color, outcome) {
	if (outcome === "win") {
		return color === "white" ? "result = '1-0'" : "result = '0-1'";
	}

	if (outcome === "loss") {
		return color === "white" ? "result = '0-1'" : "result = '1-0'";
	}

	return "result = '1/2-1/2'";
}

function toPercent(value, total) {
	return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
}

function queryOpeningMoves(database, search, positionKey, color) {
	const queryDefinition = buildSearchQueryDefinition(search);
	return database
		.prepare(
			`
				WITH continuations AS (
					SELECT DISTINCT
						g.id AS gameId,
						g.result AS result,
						gm.uci AS uci,
						gm.san AS san
					${queryDefinition.fromClause}
					JOIN otb_game_moves gm ON gm.game_id = g.id
					${queryDefinition.whereClause}
						${queryDefinition.whereClause ? "AND" : "WHERE"} gm.position_key = ?
						AND g.move_index_status = 'indexed'
				)
				SELECT
					uci,
					san,
					COUNT(*) AS gameCount,
					SUM(CASE WHEN ${getPlayerOutcomeSql(color, "win")} THEN 1 ELSE 0 END) AS playerWins,
					SUM(CASE WHEN ${getPlayerOutcomeSql(color, "draw")} THEN 1 ELSE 0 END) AS draws,
					SUM(CASE WHEN ${getPlayerOutcomeSql(color, "loss")} THEN 1 ELSE 0 END) AS playerLosses
				FROM continuations
				GROUP BY uci, san
				ORDER BY gameCount DESC, san COLLATE NOCASE ASC
			`,
		)
		.all(...queryDefinition.params, positionKey);
}

async function getOpeningTree(rawQuery, options = {}) {
	const { search, color, positionKey } = normalizeOpeningTreeQuery(rawQuery);
	const { database } = await openOtbDatabase({ dbPath: options.dbPath });

	try {
		const indexing = ensureMatchingGamesIndexed(database, search);
		const rows = queryOpeningMoves(database, search, positionKey, color);
		const gamesAtPosition = rows.reduce(
			(total, row) => total + Number(row.gameCount || 0),
			0,
		);

		return {
			scope: {
				player: search.player,
				color,
				filters: {
					opponent: search.opponent,
					event: search.event,
					yearFrom: search.yearFrom,
					yearTo: search.yearTo,
					result: search.result,
					ecoFrom: search.ecoFrom,
					ecoTo: search.ecoTo,
					opening: search.opening,
					moveCountMin: search.moveCountMin,
					moveCountMax: search.moveCountMax,
				},
			},
			positionKey,
			gamesAtPosition,
			indexing,
			moves: rows.map((row) => {
				const gameCount = Number(row.gameCount || 0);
				const playerWins = Number(row.playerWins || 0);
				const draws = Number(row.draws || 0);
				const playerLosses = Number(row.playerLosses || 0);

				return {
					uci: row.uci,
					san: row.san,
					gameCount,
					frequencyPercent: toPercent(gameCount, gamesAtPosition),
					playerWins,
					draws,
					playerLosses,
					playerWinPercent: toPercent(playerWins, gameCount),
					drawPercent: toPercent(draws, gameCount),
					playerLossPercent: toPercent(playerLosses, gameCount),
				};
			}),
		};
	} finally {
		database.close();
	}
}

function normalizeOpeningTreeGamesQuery(rawQuery) {
	const player = normalizeString(rawQuery.player);
	const color = normalizeString(rawQuery.color).toLowerCase();
	const uci = normalizeString(rawQuery.uci).toLowerCase();

	if (!player) {
		throw new HttpError(
			400,
			"invalid_query",
			"player is required for OTB opening tree games",
		);
	}

	if (!OPENING_TREE_COLORS.has(color)) {
		throw new HttpError(400, "invalid_query", "color must be white or black");
	}

	if (!UCI_MOVE_PATTERN.test(uci)) {
		throw new HttpError(400, "invalid_query", "uci must be a valid UCI move");
	}

	return {
		search: normalizeSearchQuery({ ...rawQuery, player, color }),
		positionKey: normalizePositionKey(rawQuery.fen),
		uci,
	};
}

function queryOpeningTreeGames(database, search, positionKey, uci) {
	const queryDefinition = buildSearchQueryDefinition(search);
	const positionClause = `${queryDefinition.whereClause ? "AND" : "WHERE"} gm.position_key = ?
		AND gm.uci = ?
		AND g.move_index_status = 'indexed'`;
	const params = [...queryDefinition.params, positionKey, uci];
	const totalResults =
		database
			.prepare(
				`
				SELECT COUNT(DISTINCT g.id) AS totalResults
				${queryDefinition.fromClause}
				JOIN otb_game_moves gm ON gm.game_id = g.id
				${queryDefinition.whereClause}
				${positionClause}
			`,
			)
			.get(...params)?.totalResults ?? 0;
	const totalPages =
		totalResults > 0 ? Math.ceil(totalResults / search.pageSize) : 1;
	const currentPage = Math.min(search.page, totalPages);
	const offset = (currentPage - 1) * search.pageSize;
	const games = database
		.prepare(
			`
			SELECT DISTINCT
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
			JOIN otb_game_moves gm ON gm.game_id = g.id
			${queryDefinition.whereClause}
			${positionClause}
			ORDER BY COALESCE(g.year, 0) DESC, COALESCE(g.created_at, 0) DESC, g.id ASC
			LIMIT ? OFFSET ?
		`,
		)
		.all(...params, search.pageSize, offset)
		.map(mapGameSummaryRow);

	return {
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
}

async function getOpeningTreeGames(rawQuery, options = {}) {
	const { search, positionKey, uci } = normalizeOpeningTreeGamesQuery(rawQuery);
	const { database } = await openOtbDatabase({ dbPath: options.dbPath });

	try {
		const indexing = ensureMatchingGamesIndexed(database, search);
		const { games, pagination } = queryOpeningTreeGames(
			database,
			search,
			positionKey,
			uci,
		);

		return {
			search: {
				...search,
				page: pagination.page,
				totalResults: pagination.totalResults,
				totalPages: pagination.totalPages,
				positionKey,
				uci,
			},
			games,
			pagination,
			indexing,
		};
	} finally {
		database.close();
	}
}

function normalizeExportInteger(value, fallback, fieldName, maximum = null) {
	const normalized = normalizeString(value);
	const parsed = normalized
		? normalizePositiveInteger(normalized, fieldName)
		: fallback;

	if (parsed < 1 || (maximum !== null && parsed > maximum)) {
		throw new HttpError(
			400,
			"invalid_query",
			`${fieldName} must be between 1 and ${maximum ?? "a positive integer"}`,
		);
	}

	return parsed;
}

function addOutcome(node, result, color) {
	if (result === "1/2-1/2") {
		node.draws += 1;
	} else if (
		(color === "white" && result === "1-0") ||
		(color === "black" && result === "0-1")
	) {
		node.playerWins += 1;
	} else if (result === "1-0" || result === "0-1") {
		node.playerLosses += 1;
	}
}

function createExportNode() {
	return {
		gameCount: 0,
		playerWins: 0,
		draws: 0,
		playerLosses: 0,
		children: new Map(),
	};
}

function loadExportGames(database, search, maxDepth) {
	const queryDefinition = buildSearchQueryDefinition(search);
	return database
		.prepare(
			`
				SELECT
					g.id,
					g.result,
					gm.ply,
					gm.san,
					gm.uci
				${queryDefinition.fromClause}
				JOIN otb_game_moves gm ON gm.game_id = g.id
				${queryDefinition.whereClause}
					${queryDefinition.whereClause ? "AND" : "WHERE"} g.move_index_status = 'indexed'
					AND gm.ply < ?
				ORDER BY g.id ASC, gm.ply ASC
			`,
		)
		.all(...queryDefinition.params, maxDepth);
}

function buildExportTrie(rows, color) {
	const root = createExportNode();
	let currentGameId = "";
	let currentNode = root;

	for (const row of rows) {
		if (row.id !== currentGameId) {
			currentGameId = row.id;
			currentNode = root;
			root.gameCount += 1;
			addOutcome(root, row.result, color);
		}

		const key = `${row.uci}\u0000${row.san}`;
		let child = currentNode.children.get(key);

		if (!child) {
			child = {
				...createExportNode(),
				uci: row.uci,
				san: row.san,
				ply: row.ply,
			};
			currentNode.children.set(key, child);
		}

		child.gameCount += 1;
		addOutcome(child, row.result, color);
		currentNode = child;
	}

	return root;
}

function formatExportMove(ply, san) {
	const moveNumber = Math.floor(ply / 2) + 1;
	return ply % 2 === 0 ? `${moveNumber}. ${san}` : `${moveNumber}... ${san}`;
}

function renderExportNode(node, options, depth = 0) {
	const eligible = [...node.children.values()]
		.filter((child) => child.gameCount >= options.minGames)
		.sort(
			(left, right) =>
				right.gameCount - left.gameCount || left.san.localeCompare(right.san),
		);
	const visible = eligible.slice(0, options.maxBranches);
	const lines = [];

	for (const child of visible) {
		const frequency = toPercent(child.gameCount, node.gameCount);
		lines.push(
			`${"  ".repeat(depth)}- ${formatExportMove(child.ply, child.san)} — ${child.gameCount} games (${frequency}%); player W/D/L ${child.playerWins}/${child.draws}/${child.playerLosses}`,
		);
		lines.push(...renderExportNode(child, options, depth + 1));
	}

	if (eligible.length > visible.length) {
		lines.push(
			`${"  ".repeat(depth)}- [${eligible.length - visible.length} lower-frequency continuations omitted]`,
		);
	}

	return lines;
}

function formatScopeFilters(search) {
	const entries = [
		["Opponent", search.opponent],
		["Event", search.event],
		[
			"Years",
			search.yearFrom || search.yearTo
				? `${search.yearFrom || "any"}–${search.yearTo || "any"}`
				: "",
		],
		["Result", search.result],
		[
			"ECO",
			search.ecoFrom || search.ecoTo
				? `${search.ecoFrom || "any"}–${search.ecoTo || "any"}`
				: "",
		],
		["Opening", search.opening],
		[
			"Move count",
			search.moveCountMin || search.moveCountMax
				? `${search.moveCountMin || "any"}–${search.moveCountMax || "any"}`
				: "",
		],
	].filter(([, value]) => value);

	return entries.length > 0
		? entries.map(([label, value]) => `${label}: ${value}`).join("; ")
		: "None";
}

function sanitizeFileName(value) {
	return (
		normalizeString(value)
			.toLowerCase()
			.replace(/[^\p{L}\p{N}]+/gu, "-")
			.replace(/^-+|-+$/g, "") || "player"
	);
}

async function exportOpeningTree(rawQuery, options = {}) {
	const maxDepth = normalizeExportInteger(
		rawQuery.maxDepth,
		DEFAULT_EXPORT_DEPTH,
		"maxDepth",
		60,
	);
	const minGames = normalizeExportInteger(
		rawQuery.minGames,
		DEFAULT_EXPORT_MIN_GAMES,
		"minGames",
	);
	const maxBranches = normalizeExportInteger(
		rawQuery.maxBranches,
		DEFAULT_EXPORT_MAX_BRANCHES,
		"maxBranches",
		20,
	);
	const player = normalizeString(rawQuery.player);

	if (!player) {
		throw new HttpError(400, "invalid_query", "player is required");
	}

	const { database } = await openOtbDatabase({ dbPath: options.dbPath });

	try {
		const sections = [];
		const summaries = {};

		for (const color of ["white", "black"]) {
			const { search } = normalizeOpeningTreeQuery(
				{ ...rawQuery, fen: DEFAULT_POSITION },
				color,
			);
			const indexing = ensureMatchingGamesIndexed(database, search);
			const rows = loadExportGames(database, search, maxDepth);
			const trie = buildExportTrie(rows, color);
			summaries[color] = {
				gameCount: trie.gameCount,
				indexing,
			};
			sections.push(
				`## As ${color === "white" ? "White" : "Black"} (${trie.gameCount} games)`,
				"",
				...(trie.gameCount > 0
					? renderExportNode(trie, { minGames, maxBranches })
					: ["No matching indexed games."]),
				"",
			);
		}

		const referenceSearch = normalizeOpeningTreeQuery(
			{ ...rawQuery, fen: DEFAULT_POSITION },
			"white",
		).search;
		const text = [
			`# OTB opening tree: ${player}`,
			"",
			`Filters: ${formatScopeFilters(referenceSearch)}`,
			`Limits: ${maxDepth} plies, minimum ${minGames} games, maximum ${maxBranches} branches per position.`,
			"Statistics use the selected player's perspective. W/D/L means player wins, draws, and player losses.",
			"",
			...sections,
		].join("\n");

		return {
			text,
			filename: `${sanitizeFileName(player)}-otb-opening-tree.md`,
			summary: {
				player,
				maxDepth,
				minGames,
				maxBranches,
				colors: summaries,
			},
		};
	} finally {
		database.close();
	}
}

module.exports = {
	DEFAULT_OTB_PGN_DIR,
	exportOpeningTree,
	getGame,
	getOpeningTree,
	getOpeningTreeGames,
	importPgnDirectory,
	importPgnFile,
	searchGames,
	__testing: {
		buildImportedGameRecord,
		buildExportTrie,
		indexGameMoves,
		matchesEcoRange,
		matchesSearch,
		normalizeEcoCode,
		normalizeGameId,
		normalizeNameForSearch,
		normalizeSearchQuery,
		normalizePositionKey,
		renderExportNode,
		splitGames,
	},
};
