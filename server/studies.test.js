const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { HttpError } = require("./httpError");
const { deleteStudy, getStudy, listStudies, saveStudy, __testing } = require("./studies");

const { buildStudySummary, normalizeStudyPayload, normalizeStudyRecord } = __testing;

function createStudyPayload() {
	return {
		title: "  Najdorf ideas  ",
		variantTree: {
			rootId: "root",
			currentNodeId: "node-2",
			nodes: {
				root: { ply: 0 },
				"node-1": { ply: 1 },
				"node-2": { ply: 2 },
				"node-3": { ply: 3 },
			},
		},
		importedPgnData: {
			rawPgn: '[Event "Club Match"]\n[White "Alice"]\n[Black "Bob"]\n\n1. e4 c5 *',
			headers: [
				{ name: "Event", value: "Club Match" },
				{ name: "White", value: "Alice" },
				{ name: "Black", value: "Bob" },
			],
			mainlineComments: [{ comment: "Main idea", ply: 1 }],
			additionalComments: [{ text: "Side note", inVariation: true }],
			variationSnippets: ["1... e5"],
		},
		positionComments: [
			{ id: "comment-1", comment: "Plan here", fen: "fen-1", source: "user" },
			{ comment: "" },
		],
	};
}

async function createTempStudiesDir() {
	return fs.mkdtemp(path.join(os.tmpdir(), "chesslense-studies-"));
}

test("normalizeStudyPayload trims title and sanitizes stored fields", () => {
	const payload = normalizeStudyPayload(createStudyPayload());

	assert.equal(payload.title, "Najdorf ideas");
	assert.equal(payload.positionComments.length, 1);
	assert.deepEqual(payload.importedPgnData.headers, [
		{ name: "Event", value: "Club Match" },
		{ name: "White", value: "Alice" },
		{ name: "Black", value: "Bob" },
	]);
});

test("normalizeStudyPayload rejects payload without variant tree", () => {
	assert.throws(
		() => normalizeStudyPayload({ title: "Broken" }),
		(error) =>
			error instanceof HttpError &&
			error.code === "invalid_study" &&
			error.message === "variantTree is required.",
	);
});

test("buildStudySummary derives browse metadata", () => {
	const summary = buildStudySummary(normalizeStudyPayload(createStudyPayload()));

	assert.deepEqual(summary, {
		event: "Club Match",
		white: "Alice",
		black: "Bob",
		commentCount: 1,
		nodeCount: 4,
		maxPly: 3,
		hasImportedPgn: true,
	});
});

test("saveStudy persists study file and getStudy reloads it", async () => {
	const rootDir = await createTempStudiesDir();

	try {
		const savedStudy = await saveStudy(createStudyPayload(), { rootDir });
		const loadedStudy = await getStudy(savedStudy.id, { rootDir });

		assert.equal(savedStudy.title, "Najdorf ideas");
		assert.equal(loadedStudy.id, savedStudy.id);
		assert.equal(loadedStudy.summary.commentCount, 1);
		assert.equal(loadedStudy.summary.maxPly, 3);
		assert.deepEqual(loadedStudy.positionComments, [
			{
				id: "comment-1",
				comment: "Plan here",
				fen: "fen-1",
				ply: null,
				moveNumber: null,
				side: null,
				san: null,
				source: "user",
			},
		]);
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("listStudies returns summaries sorted by updatedAt and skips invalid files", async () => {
	const rootDir = await createTempStudiesDir();

	try {
		const firstStudy = await saveStudy(createStudyPayload(), { rootDir });
		await new Promise((resolve) => setTimeout(resolve, 5));
		const secondStudy = await saveStudy(
			{
				...createStudyPayload(),
				title: "Endgame notes",
			},
			{ rootDir },
		);
		await fs.writeFile(path.join(rootDir, "broken.json"), "{", "utf8");

		const studies = await listStudies({ rootDir });

		assert.equal(studies.length, 2);
		assert.equal(studies[0].id, secondStudy.id);
		assert.equal(studies[1].id, firstStudy.id);
		assert.equal(studies[0].summary.white, "Alice");
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("normalizeStudyRecord falls back to imported metadata for untitled studies", () => {
	const study = normalizeStudyRecord({
		id: "study-abc",
		title: "",
		createdAt: "2026-04-13T20:00:00.000Z",
		updatedAt: "2026-04-13T20:00:00.000Z",
		variantTree: {
			nodes: {
				root: { ply: 0 },
			},
		},
		importedPgnData: {
			headers: [
				{ name: "White", value: "Alice" },
				{ name: "Black", value: "Bob" },
			],
		},
		positionComments: [],
	});

	assert.equal(study.title, "Alice vs Bob");
});

test("deleteStudy removes saved study file", async () => {
	const rootDir = await createTempStudiesDir();

	try {
		const savedStudy = await saveStudy(createStudyPayload(), { rootDir });
		const deletedStudy = await deleteStudy(savedStudy.id, { rootDir });
		const studies = await listStudies({ rootDir });

		assert.deepEqual(deletedStudy, { id: savedStudy.id });
		assert.equal(studies.length, 0);
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("deleteStudy rejects unknown study id", async () => {
	const rootDir = await createTempStudiesDir();

	try {
		await assert.rejects(
			() => deleteStudy("study-missing", { rootDir }),
			(error) =>
				error instanceof HttpError &&
				error.code === "study_not_found" &&
				error.message === "Study not found.",
		);
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});
