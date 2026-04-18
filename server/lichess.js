const { HttpError } = require("./httpError");

const LICHESS_API_BASE_URL = "https://lichess.org";
const LICHESS_EXPLORER_BASE_URL = "https://explorer.lichess.ovh";
const LICHESS_API_TOKEN = normalizeString(process.env.LICHESS_API_TOKEN);
const LICHESS_REQUEST_TOKEN_HEADER = "x-lichess-api-token";
const DEFAULT_MAX_RESULTS = 10;
const MAX_RESULTS_LIMIT = 50;
const DEFAULT_OPENING_TREE_MOVE_LIMIT = 12;
const MIN_LICHESS_YEAR = 2013;
const PERF_TYPES = new Set([
	"ultraBullet",
	"bullet",
	"blitz",
	"rapid",
	"classical",
	"correspondence",
	"standard",
	"chess960",
	"crazyhouse",
	"antichess",
	"atomic",
	"horde",
	"kingOfTheHill",
	"racingKings",
	"threeCheck",
]);

function normalizeString(value) {
	return typeof value === "string" ? value.trim() : "";
}

function getYearRange(year) {
	return {
		since: Date.UTC(year, 0, 1),
		until: Date.UTC(year + 1, 0, 1) - 1,
	};
}

function normalizePlayerName(value, fieldName) {
	const normalized = normalizeString(value);

	if (!normalized) {
		throw new HttpError(400, "invalid_query", `${fieldName} is required`);
	}

	return normalized;
}

function normalizeOptionalChoice(value, allowedValues, fieldName) {
	const normalized = normalizeString(value);

	if (!normalized) {
		return "";
	}

	if (!allowedValues.has(normalized)) {
		throw new HttpError(400, "invalid_query", `${fieldName} must be a supported option`);
	}

	return normalized;
}

function normalizeYear(value) {
	const normalized = normalizeString(value);

	if (!normalized) {
		return null;
	}

	if (!/^\d{4}$/.test(normalized)) {
		throw new HttpError(400, "invalid_query", "year must be a 4-digit number");
	}

	const year = Number(normalized);
	const currentYear = new Date().getUTCFullYear();

	if (year < MIN_LICHESS_YEAR || year > currentYear) {
		throw new HttpError(
			400,
			"invalid_query",
			`year must be between ${MIN_LICHESS_YEAR} and ${currentYear}`,
		);
	}

	return year;
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

function normalizeFen(value) {
	const normalized = normalizeString(value);

	if (!normalized) {
		throw new HttpError(400, "invalid_query", "fen is required");
	}

	if (normalized.split(/\s+/).length !== 6) {
		throw new HttpError(400, "invalid_query", "fen must be a valid FEN string");
	}

	return normalized;
}

function formatPlayer(player) {
	const user = player?.user ?? null;
	const name = user?.name ?? player?.name ?? "Anonymous";

	return {
		name,
		id: user?.id ?? null,
		title: user?.title ?? null,
		rating: Number.isInteger(player?.rating) ? player.rating : null,
		ratingDiff: Number.isInteger(player?.ratingDiff) ? player.ratingDiff : null,
	};
}

function getOpponentName(game, anchorName) {
	const normalizedAnchorName = anchorName.toLowerCase();
	const whiteName = formatPlayer(game.players?.white).name;
	const blackName = formatPlayer(game.players?.black).name;

	if (whiteName.toLowerCase() === normalizedAnchorName) {
		return blackName;
	}

	if (blackName.toLowerCase() === normalizedAnchorName) {
		return whiteName;
	}

	return whiteName;
}

function matchesOpponent(game, opponent) {
	if (!opponent) {
		return true;
	}

	const normalizedOpponent = opponent.toLowerCase();
	const whiteName = formatPlayer(game.players?.white).name.toLowerCase();
	const blackName = formatPlayer(game.players?.black).name.toLowerCase();
	const whiteId = game.players?.white?.user?.id?.toLowerCase?.() ?? "";
	const blackId = game.players?.black?.user?.id?.toLowerCase?.() ?? "";

	return (
		whiteName === normalizedOpponent ||
		blackName === normalizedOpponent ||
		whiteId === normalizedOpponent ||
		blackId === normalizedOpponent
	);
}

function matchesYear(game, year) {
	if (!year) {
		return true;
	}

	return new Date(game.createdAt).getUTCFullYear() === year;
}

function mapGameSummary(game, anchorName) {
	const white = formatPlayer(game.players?.white);
	const black = formatPlayer(game.players?.black);

	return {
		id: game.id,
		url: `${LICHESS_API_BASE_URL}/${game.id}`,
		rated: game.rated === true,
		perf: typeof game.perf === "string" ? game.perf : null,
		speed: typeof game.speed === "string" ? game.speed : null,
		variant: typeof game.variant === "string" ? game.variant : null,
		status: typeof game.status === "string" ? game.status : null,
		winner: typeof game.winner === "string" ? game.winner : null,
		createdAt: Number.isInteger(game.createdAt) ? game.createdAt : null,
		lastMoveAt: Number.isInteger(game.lastMoveAt) ? game.lastMoveAt : null,
		opening: typeof game.opening?.name === "string" ? game.opening.name : null,
		players: {
			white,
			black,
		},
		opponent: anchorName ? getOpponentName(game, anchorName) : null,
	};
}

function resolveLichessApiToken(requestToken) {
	return normalizeString(LICHESS_API_TOKEN || requestToken);
}

async function fetchFromRemote(
	baseUrl,
	path,
	{ headers = {}, responseLabel = "Lichess", requestToken = "" } = {},
) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 10000);
	const apiToken = resolveLichessApiToken(requestToken);

	try {
		const response = await fetch(`${baseUrl}${path}`, {
			headers: {
				"User-Agent": "ChessLense/1.0",
				...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
				...headers,
			},
			signal: controller.signal,
		});

		if (response.status === 404) {
			throw new HttpError(404, "not_found", `${responseLabel} resource not found`);
		}

		if (response.status === 429) {
			throw new HttpError(429, "rate_limited", `${responseLabel} rate limit exceeded`);
		}

		if (response.status === 401 || response.status === 403) {
			throw new HttpError(
				502,
				"lichess_request_rejected",
				`${responseLabel} request was rejected`,
			);
		}

		if (!response.ok) {
			throw new HttpError(
				502,
				"lichess_request_failed",
				`${responseLabel} request failed with ${response.status}`,
			);
		}

		return response;
	} catch (error) {
		if (error instanceof HttpError) {
			throw error;
		}

		if (error?.name === "AbortError") {
			throw new HttpError(504, "lichess_timeout", `${responseLabel} request timed out`);
		}

		throw new HttpError(502, "lichess_unreachable", `Failed to reach ${responseLabel}`);
	} finally {
		clearTimeout(timeout);
	}
}

async function fetchFromLichess(path, options = {}) {
	return fetchFromRemote(LICHESS_API_BASE_URL, path, {
		...options,
		responseLabel: "Lichess",
	});
}

async function fetchFromLichessExplorer(path, options = {}) {
	return fetchFromRemote(LICHESS_EXPLORER_BASE_URL, path, {
		...options,
		responseLabel: "Lichess opening explorer",
	});
}

function parseNdjson(text) {
	return text
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			try {
				return JSON.parse(line);
			} catch {
				throw new HttpError(502, "invalid_lichess_response", "Lichess returned invalid game data");
			}
		});
}

function buildSearchRequest(search) {
	const params = new URLSearchParams({
		max: String(search.max),
		moves: "false",
		opening: "true",
		sort: "dateDesc",
	});

	if (search.opponent) {
		params.set("vs", search.opponent);
	}

	if (search.color) {
		params.set("color", search.color);
	}

	if (search.perfType) {
		params.set("perfType", search.perfType);
	}

	if (search.year) {
		const { since, until } = getYearRange(search.year);
		params.set("since", String(since));
		params.set("until", String(until));
	}

	return `/api/games/user/${encodeURIComponent(search.player)}?${params.toString()}`;
}

function normalizeSearchQuery(query) {
	return {
		player: normalizePlayerName(query.player, "player"),
		opponent: normalizeString(query.opponent),
		year: normalizeYear(query.year),
		color: normalizeOptionalChoice(query.color, new Set(["white", "black"]), "color"),
		perfType: normalizeOptionalChoice(query.perfType, PERF_TYPES, "perfType"),
		max: normalizeMaxResults(query.max),
	};
}

function normalizeOpeningTreeQuery(query) {
	return {
		fen: normalizeFen(query.fen),
	};
}

async function searchGames(rawQuery) {
	const search = normalizeSearchQuery(rawQuery);
	const response = await fetchFromLichess(buildSearchRequest(search), {
		headers: {
			Accept: "application/x-ndjson",
		},
	});
	const payload = await response.text();
	const games = parseNdjson(payload).filter(
		(game) => matchesOpponent(game, search.opponent) && matchesYear(game, search.year),
	);

	return {
		search,
		games: games.map((game) => mapGameSummary(game, search.player)),
	};
}

function normalizeGameId(gameId) {
	const normalized = normalizeString(gameId);

	if (!/^[A-Za-z0-9]{8}$/.test(normalized)) {
		throw new HttpError(400, "invalid_query", "gameId must be an 8-character Lichess id");
	}

	return normalized;
}

async function getGame(gameId) {
	const normalizedGameId = normalizeGameId(gameId);
	const params = new URLSearchParams({
		pgnInJson: "true",
		clocks: "true",
		evals: "true",
		opening: "true",
		literate: "false",
	});
	const response = await fetchFromLichess(`/game/export/${normalizedGameId}?${params.toString()}`, {
		headers: {
			Accept: "application/json",
		},
	});

	let payload;

	try {
		payload = await response.json();
	} catch {
		throw new HttpError(502, "invalid_lichess_response", "Lichess returned invalid game data");
	}

	if (typeof payload?.pgn !== "string" || !payload.pgn.trim()) {
		throw new HttpError(502, "missing_pgn", "Lichess did not provide PGN for this game");
	}

	return {
		game: mapGameSummary(payload, ""),
		pgn: payload.pgn,
	};
}

function normalizeExplorerStat(value) {
	return Number.isFinite(value) && value >= 0 ? value : 0;
}

function formatPercentage(count, total) {
	if (total <= 0) {
		return 0;
	}

	return Math.round((count / total) * 1000) / 10;
}

function mapOpeningTreeMove(move) {
	if (!move || typeof move !== "object") {
		return null;
	}

	const san = typeof move.san === "string" && move.san.trim() ? move.san.trim() : "";
	const uci = typeof move.uci === "string" && move.uci.trim() ? move.uci.trim() : "";

	if (!san || !uci) {
		return null;
	}

	const white = normalizeExplorerStat(move.white);
	const draws = normalizeExplorerStat(move.draws);
	const black = normalizeExplorerStat(move.black);
	const gameCount = white + draws + black;

	return {
		san,
		uci,
		averageRating: Number.isFinite(move.averageRating) ? move.averageRating : null,
		gameCount,
		whitePercent: formatPercentage(white, gameCount),
		drawPercent: formatPercentage(draws, gameCount),
		blackPercent: formatPercentage(black, gameCount),
	};
}

function normalizeOpeningTreeResponse(payload, fen, tokenConfigured = false) {
	const moves = Array.isArray(payload?.moves)
		? payload.moves.map((move) => mapOpeningTreeMove(move)).filter(Boolean)
		: [];

	return {
		fen,
		environmentTokenConfigured: !!LICHESS_API_TOKEN,
		tokenConfigured,
		opening:
			typeof payload?.opening?.name === "string" && payload.opening.name.trim()
				? {
						eco:
							typeof payload.opening.eco === "string" && payload.opening.eco.trim()
								? payload.opening.eco.trim()
								: null,
						name: payload.opening.name.trim(),
					}
				: null,
		moves,
	};
}

function createUnavailableOpeningTree(fen, details, tokenConfigured = false) {
	return {
		fen,
		opening: null,
		moves: [],
		unavailable: true,
		environmentTokenConfigured: !!LICHESS_API_TOKEN,
		tokenConfigured,
		details:
			typeof details === "string" && details.trim()
				? details.trim()
				: "Lichess opening explorer is unavailable right now.",
	};
}

function buildOpeningTreeRequest(search) {
	const params = new URLSearchParams({
		variant: "standard",
		fen: search.fen,
		moves: String(DEFAULT_OPENING_TREE_MOVE_LIMIT),
		topGames: "0",
		recentGames: "0",
	});

	return `/lichess?${params.toString()}`;
}

async function getOpeningTree(rawQuery, options = {}) {
	const search = normalizeOpeningTreeQuery(rawQuery);
	const requestToken = normalizeString(options.requestToken);
	const tokenConfigured = !!resolveLichessApiToken(requestToken);
	try {
		const response = await fetchFromLichessExplorer(buildOpeningTreeRequest(search), {
			headers: {
				Accept: "application/json",
			},
			requestToken,
		});

		let payload;

		try {
			payload = await response.json();
		} catch {
			throw new HttpError(
				502,
				"invalid_lichess_response",
				"Lichess returned invalid opening explorer data",
			);
		}

		return normalizeOpeningTreeResponse(payload, search.fen, tokenConfigured);
	} catch (error) {
		if (
			error instanceof HttpError &&
			[
				"lichess_request_rejected",
				"lichess_request_failed",
				"lichess_timeout",
				"lichess_unreachable",
				"rate_limited",
			].includes(error.code)
		) {
			return createUnavailableOpeningTree(search.fen, error.message, tokenConfigured);
		}

		throw error;
	}
}

module.exports = {
	HttpError,
	LICHESS_REQUEST_TOKEN_HEADER,
	getGame,
	getOpeningTree,
	searchGames,
	__testing: {
		createUnavailableOpeningTree,
		mapOpeningTreeMove,
		normalizeFen,
		normalizeOpeningTreeQuery,
		normalizeOpeningTreeResponse,
		resolveLichessApiToken,
	},
};
