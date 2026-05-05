const test = require("node:test");
const assert = require("node:assert/strict");
const { HttpError } = require("./httpError");
const { __testing } = require("./lichess");

const {
	buildPuzzleAdvanceRequest,
	createUnavailablePuzzle,
	createUnavailableOpeningTree,
	mapOpeningTreeMove,
	normalizeFen,
	normalizeOpeningTreeQuery,
	normalizePuzzleAdvancePayload,
	normalizePuzzleBatchResponse,
	normalizeOpeningTreeResponse,
	normalizePuzzleQuery,
	normalizePuzzleResponse,
	resolveLichessApiToken,
} = __testing;

test("normalizeFen trims valid FEN strings", () => {
	assert.equal(
		normalizeFen(" rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 "),
		"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
	);
});

test("normalizeOpeningTreeQuery rejects missing fen", () => {
	assert.throws(
		() => normalizeOpeningTreeQuery({}),
		(error) =>
			error instanceof HttpError &&
			error.code === "invalid_query" &&
			error.message === "fen is required",
	);
});

test("normalizeFen rejects malformed FEN strings", () => {
	assert.throws(
		() => normalizeFen("not-a-fen"),
		(error) =>
			error instanceof HttpError &&
			error.code === "invalid_query" &&
			error.message === "fen must be a valid FEN string",
	);
});

test("mapOpeningTreeMove returns percentages and game count", () => {
	assert.deepEqual(
		mapOpeningTreeMove({
			san: "e4",
			uci: "e2e4",
			white: 120,
			draws: 30,
			black: 50,
			averageRating: 2120,
		}),
		{
			san: "e4",
			uci: "e2e4",
			averageRating: 2120,
			gameCount: 200,
			whitePercent: 60,
			drawPercent: 15,
			blackPercent: 25,
		},
	);
});

test("normalizeOpeningTreeResponse keeps opening metadata and drops invalid moves", () => {
	assert.deepEqual(
		normalizeOpeningTreeResponse(
			{
				opening: {
					eco: "C20",
					name: "King's Pawn Game",
				},
				moves: [
					{
						san: "e4",
						uci: "e2e4",
						white: 80,
						draws: 10,
						black: 10,
					},
					{
						san: "",
						uci: "d2d4",
						white: 20,
						draws: 10,
						black: 10,
					},
				],
			},
			"fen-value",
		),
		{
			fen: "fen-value",
			environmentTokenConfigured: false,
			tokenConfigured: false,
			opening: {
				eco: "C20",
				name: "King's Pawn Game",
			},
			moves: [
				{
					san: "e4",
					uci: "e2e4",
					averageRating: null,
					gameCount: 100,
					whitePercent: 80,
					drawPercent: 10,
					blackPercent: 10,
				},
			],
		},
	);
});

test("createUnavailableOpeningTree returns a soft-failure payload", () => {
	assert.deepEqual(
		createUnavailableOpeningTree(
			"fen-value",
			"Lichess opening explorer request was rejected",
			true,
		),
		{
			fen: "fen-value",
			opening: null,
			moves: [],
			unavailable: true,
			environmentTokenConfigured: false,
			tokenConfigured: true,
			details: "Lichess opening explorer request was rejected",
		},
	);
});

test("resolveLichessApiToken uses the request token when no env token is configured", () => {
	assert.equal(resolveLichessApiToken(" abc123 "), "abc123");
});

test("normalizePuzzleQuery accepts supported filters", () => {
	assert.deepEqual(normalizePuzzleQuery({
		angle: " fork ",
		difficulty: "harder",
		color: "black",
	}), {
		angle: "fork",
		difficulty: "harder",
		color: "black",
	});
});

test("normalizePuzzleAdvancePayload requires a puzzle id and boolean win", () => {
	assert.deepEqual(
		normalizePuzzleAdvancePayload({
			angle: "fork",
			difficulty: "harder",
			color: "black",
			puzzleId: "hACdu",
			win: true,
		}),
		{
			angle: "fork",
			difficulty: "harder",
			color: "black",
			puzzleId: "hACdu",
			win: true,
		},
	);

	assert.throws(
		() => normalizePuzzleAdvancePayload({ puzzleId: "", win: true }),
		(error) =>
			error instanceof HttpError &&
			error.code === "invalid_puzzle" &&
			error.message === "puzzleId is required",
	);
});

test("normalizePuzzleQuery rejects unsupported difficulty values", () => {
	assert.throws(
		() => normalizePuzzleQuery({ difficulty: "legendary" }),
		(error) =>
			error instanceof HttpError &&
			error.code === "invalid_query" &&
			error.message === "difficulty must be a supported option",
	);
});

test("normalizePuzzleResponse keeps puzzle metadata and selected filters", () => {
	assert.deepEqual(
		normalizePuzzleResponse(
			{
				game: {
					id: "Had79NbX",
					perf: {
						key: "blitz",
						name: "Blitz",
					},
					rated: true,
					players: [
						{ color: "white", id: "vit2014", name: "vit2014", rating: 2395 },
						{ color: "black", id: "yoda-wins", name: "Yoda-wins", rating: 2511 },
					],
					pgn: "e4 e5 Nf3 Nc6",
					clock: "3+2",
				},
				puzzle: {
					id: "hACdu",
					rating: 1567,
					plays: 6508,
					solution: ["d1d5", "d8d5", "b3d5"],
					themes: ["middlegame", "fork"],
					initialPly: 39,
					fen: "fen-value",
				},
			},
			{ angle: "fork", difficulty: "harder", color: "black" },
			true,
		),
		{
			search: {
				angle: "fork",
				difficulty: "harder",
				color: "black",
			},
			environmentTokenConfigured: false,
			tokenConfigured: true,
			game: {
				id: "Had79NbX",
				url: "https://lichess.org/Had79NbX",
				pgn: "e4 e5 Nf3 Nc6",
				rated: true,
				clock: "3+2",
				perf: {
					key: "blitz",
					name: "Blitz",
				},
				players: {
					white: {
						color: "white",
						id: "vit2014",
						name: "vit2014",
						title: null,
						rating: 2395,
					},
					black: {
						color: "black",
						id: "yoda-wins",
						name: "Yoda-wins",
						title: null,
						rating: 2511,
					},
				},
			},
			puzzle: {
				id: "hACdu",
				initialPly: 39,
				rating: 1567,
				plays: 6508,
				solution: ["d1d5", "d8d5", "b3d5"],
				themes: ["middlegame", "fork"],
				initialFen: "fen-value",
			},
		},
	);
});

test("normalizePuzzleBatchResponse reads the first returned batch puzzle", () => {
	const normalized = normalizePuzzleBatchResponse(
		{
			puzzles: [
				{
					game: {
						id: "Had79NbX",
						perf: { key: "blitz", name: "Blitz" },
						rated: true,
						players: [
							{ color: "white", id: "vit2014", name: "vit2014", rating: 2395 },
							{ color: "black", id: "yoda-wins", name: "Yoda-wins", rating: 2511 },
						],
						pgn: "e4 e5 Nf3 Nc6",
						clock: "3+2",
					},
					puzzle: {
						id: "hACdu",
						rating: 1567,
						plays: 6508,
						solution: ["d1d5", "d8d5", "b3d5"],
						themes: ["middlegame", "fork"],
						initialPly: 39,
						fen: "fen-value",
					},
				},
			],
		},
		{ angle: "fork", difficulty: "harder", color: "black" },
		true,
	);

	assert.equal(normalized.search.angle, "fork");
	assert.equal(normalized.search.difficulty, "harder");
	assert.equal(normalized.search.color, "black");
	assert.equal(normalized.tokenConfigured, true);
	assert.equal(normalized.puzzle.id, "hACdu");
	assert.equal(normalized.game.id, "Had79NbX");
});

test("buildPuzzleAdvanceRequest targets the batch solve endpoint", () => {
	assert.deepEqual(
		buildPuzzleAdvanceRequest({
			angle: "",
			difficulty: "normal",
			color: "white",
			puzzleId: "hACdu",
			win: false,
		}),
		{
			path: "/api/puzzle/batch/mix?nb=1&difficulty=normal&color=white",
			body: JSON.stringify({
				solutions: [{ id: "hACdu", win: false, rated: false }],
			}),
		},
	);
});

test("createUnavailablePuzzle returns a soft-failure payload", () => {
	assert.deepEqual(
		createUnavailablePuzzle(
			{ angle: "fork", difficulty: "normal", color: "white" },
			"Lichess request was rejected",
			false,
		),
		{
			search: {
				angle: "fork",
				difficulty: "normal",
				color: "white",
			},
			game: null,
			puzzle: null,
			unavailable: true,
			environmentTokenConfigured: false,
			tokenConfigured: false,
			details: "Lichess request was rejected",
		},
	);
});
