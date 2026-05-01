const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { HttpError } = require("./httpError");
const { getGame, importPgnDirectory, searchGames, __testing } = require("./otb");

const {
	buildImportedGameRecord,
	matchesEcoRange,
	matchesSearch,
	normalizeEcoCode,
	normalizeGameId,
	normalizeSearchQuery,
} = __testing;

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

const SECOND_PGN = `
[Event "World Championship"]
[Site "Moscow"]
[Date "1985.10.15"]
[Round "16"]
[White "Garry Kasparov"]
[Black "Anatoly Karpov"]
[Result "1/2-1/2"]
[ECO "C65"]
[Opening "Ruy Lopez, Berlin Defense"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 1/2-1/2
`;

async function createTempOtbWorkspace() {
	const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "chesslense-otb-"));
	const archiveDir = path.join(rootDir, "archive");
	const dbPath = path.join(rootDir, "otb.sqlite");

	await fs.mkdir(path.join(archiveDir, "nested"), { recursive: true });
	await fs.writeFile(path.join(archiveDir, "masters.pgn"), SAMPLE_PGN.trim(), "utf8");
	await fs.writeFile(path.join(archiveDir, "nested", "championship.pgn"), SECOND_PGN.trim(), "utf8");

	return {
		archiveDir,
		dbPath,
		rootDir,
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
		page: 1,
		pageSize: 25,
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

test("buildImportedGameRecord creates a stable database id", () => {
	const game = buildImportedGameRecord(SAMPLE_PGN.split(/\n\s*\n(?=\[Event)/)[0], "masters.pgn");

	assert.match(game.id, /^otb-[a-f0-9]{64}$/);
	assert.equal(normalizeGameId(game.id), game.id);
});

test("importPgnDirectory loads PGN archives into SQLite and skips duplicates", async () => {
	const { archiveDir, dbPath, rootDir } = await createTempOtbWorkspace();

	try {
		const firstImport = await importPgnDirectory({
			rootDir: archiveDir,
			dbPath,
		});
		const secondImport = await importPgnDirectory({
			rootDir: archiveDir,
			dbPath,
		});

		assert.equal(firstImport.totalGames, 3);
		assert.equal(firstImport.importedGames, 3);
		assert.equal(firstImport.skippedGames, 0);
		assert.equal(secondImport.importedGames, 0);
		assert.equal(secondImport.skippedGames, 3);
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("searchGames supports pair searches with and without color constraints", async () => {
	const { archiveDir, dbPath, rootDir } = await createTempOtbWorkspace();

	try {
		await importPgnDirectory({
			rootDir: archiveDir,
			dbPath,
		});

		const anyColor = await searchGames(
			{
				player: "Morphy",
				opponent: "Anderssen",
				pageSize: 10,
			},
			{ dbPath },
		);
		const whiteOnly = await searchGames(
			{
				player: "Morphy",
				opponent: "Anderssen",
				color: "white",
				pageSize: 10,
			},
			{ dbPath },
		);
		const blackOnly = await searchGames(
			{
				player: "Morphy",
				opponent: "Anderssen",
				color: "black",
				pageSize: 10,
			},
			{ dbPath },
		);

		assert.equal(anyColor.games.length, 2);
		assert.equal(whiteOnly.games.length, 1);
		assert.equal(whiteOnly.games[0].players.white.name, "Paul Morphy");
		assert.equal(blackOnly.games.length, 1);
		assert.equal(blackOnly.games[0].players.black.name, "Paul Morphy");
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("searchGames filters SQLite-backed OTB results by ECO, year, event, opening, and result", async () => {
	const { archiveDir, dbPath, rootDir } = await createTempOtbWorkspace();

	try {
		await importPgnDirectory({
			rootDir: archiveDir,
			dbPath,
		});

		const filtered = await searchGames(
			{
				event: "world",
				opening: "berlin",
				ecoFrom: "C60",
				ecoTo: "C99",
				result: "1/2-1/2",
				yearFrom: "1985",
				yearTo: "1985",
				pageSize: 10,
			},
			{ dbPath },
		);

		assert.equal(filtered.games.length, 1);
		assert.equal(filtered.games[0].event, "World Championship");
		assert.equal(filtered.games[0].eco, "C65");
		assert.equal(filtered.games[0].source, "sqlite");
		assert.equal(filtered.games[0].sourceFile, path.join("nested", "championship.pgn"));
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("getGame returns imported PGN text from SQLite", async () => {
	const { archiveDir, dbPath, rootDir } = await createTempOtbWorkspace();

	try {
		await importPgnDirectory({
			rootDir: archiveDir,
			dbPath,
		});

		const searchResult = await searchGames(
			{
				event: "paris",
				pageSize: 1,
			},
			{ dbPath },
		);
		const loadedGame = await getGame(searchResult.games[0].id, { dbPath });

		assert.equal(loadedGame.game.event, "Paris Exhibition");
		assert.match(loadedGame.pgn, /\[White "Paul Morphy"\]/);
		assert.match(loadedGame.pgn, /1\. e4 e5 2\. Nf3 Nc6 3\. Bc4 Bc5 1-0/);
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("searchGames returns pagination metadata and page slices", async () => {
	const { archiveDir, dbPath, rootDir } = await createTempOtbWorkspace();

	try {
		await importPgnDirectory({
			rootDir: archiveDir,
			dbPath,
		});

		const firstPage = await searchGames(
			{
				player: "Morphy",
				page: "1",
				pageSize: "1",
			},
			{ dbPath },
		);
		const secondPage = await searchGames(
			{
				player: "Morphy",
				page: "2",
				pageSize: "1",
			},
			{ dbPath },
		);

		assert.equal(firstPage.games.length, 1);
		assert.equal(secondPage.games.length, 1);
		assert.notEqual(firstPage.games[0].id, secondPage.games[0].id);
		assert.deepEqual(firstPage.pagination, {
			page: 1,
			pageSize: 1,
			totalResults: 2,
			totalPages: 2,
			hasPreviousPage: false,
			hasNextPage: true,
		});
		assert.deepEqual(secondPage.pagination, {
			page: 2,
			pageSize: 1,
			totalResults: 2,
			totalPages: 2,
			hasPreviousPage: true,
			hasNextPage: false,
		});
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});
