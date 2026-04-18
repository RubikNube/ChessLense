const test = require("node:test");
const assert = require("node:assert/strict");
const { HttpError } = require("./httpError");
const { __testing } = require("./lichess");

const {
	createUnavailableOpeningTree,
	mapOpeningTreeMove,
	normalizeFen,
	normalizeOpeningTreeQuery,
	normalizeOpeningTreeResponse,
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
