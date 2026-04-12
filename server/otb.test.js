const test = require("node:test");
const assert = require("node:assert/strict");
const { HttpError } = require("./httpError");
const { __testing } = require("./otb");

const { matchesEcoRange, matchesSearch, normalizeEcoCode, normalizeSearchQuery } = __testing;

function createGame(eco) {
	return {
		headers: {
			White: "Paul Morphy",
			Black: "Adolf Anderssen",
			Event: "Paris",
			Opening: "Italian Game",
			ECO: eco,
			Result: "1-0",
		},
		date: {
			year: 1858,
		},
	};
}

test("normalizeEcoCode trims and uppercases valid ECO codes", () => {
	assert.equal(normalizeEcoCode(" c50 ", "ecoFrom"), "C50");
});

test("normalizeSearchQuery accepts ECO-only range searches", () => {
	assert.deepEqual(normalizeSearchQuery({ ecoFrom: " b12 ", ecoTo: "b20" }), {
		player: "",
		opponent: "",
		color: "",
		event: "",
		ecoFrom: "B12",
		ecoTo: "B20",
		opening: "",
		result: "",
		yearFrom: null,
		yearTo: null,
		max: 25,
	});
});

test("normalizeSearchQuery rejects malformed ECO codes", () => {
	assert.throws(
		() => normalizeSearchQuery({ ecoFrom: "C5" }),
		(error) =>
			error instanceof HttpError &&
			error.code === "invalid_query" &&
			error.message === "ecoFrom must be an ECO code like C50",
	);
});

test("normalizeSearchQuery rejects reversed ECO ranges", () => {
	assert.throws(
		() => normalizeSearchQuery({ ecoFrom: "C50", ecoTo: "B99" }),
		(error) =>
			error instanceof HttpError &&
			error.code === "invalid_query" &&
			error.message === "ecoFrom cannot be greater than ecoTo",
	);
});

test("matchesEcoRange supports partial and bounded ranges", () => {
	assert.equal(matchesEcoRange("C50", { ecoFrom: "C20", ecoTo: "C99" }), true);
	assert.equal(matchesEcoRange("B99", { ecoFrom: "C20", ecoTo: "" }), false);
	assert.equal(matchesEcoRange("C50", { ecoFrom: "", ecoTo: "C50" }), true);
});

test("matchesSearch applies the ECO range against PGN headers", () => {
	const search = normalizeSearchQuery({ ecoFrom: "C20", ecoTo: "C50" });

	assert.equal(matchesSearch(createGame("C42"), search), true);
	assert.equal(matchesSearch(createGame("C51"), search), false);
	assert.equal(matchesSearch(createGame(""), search), false);
	assert.equal(matchesSearch(createGame("not-an-eco"), search), false);
});
