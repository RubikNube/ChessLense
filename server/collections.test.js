const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { HttpError } = require("./httpError");
const {
	addStudyToCollection,
	createCollection,
	deleteCollection,
	getCollection,
	listCollections,
	removeStudyFromAllCollections,
	removeStudyFromCollection,
	__testing,
} = require("./collections");
const { saveStudy } = require("./studies");

const { buildCollectionSummary, normalizeCollectionRecord, normalizeCollectionTitle } = __testing;

function createStudyPayload() {
	return {
		title: "Study title",
		variantTree: {
			rootId: "root",
			currentNodeId: "root",
			nodes: {
				root: { ply: 0 },
			},
		},
		importedPgnData: null,
		positionComments: [],
	};
}

async function createTempRoot() {
	return fs.mkdtemp(path.join(os.tmpdir(), "chesslense-collections-"));
}

test("normalizeCollectionTitle rejects empty titles", () => {
	assert.throws(
		() => normalizeCollectionTitle("  "),
		(error) =>
			error instanceof HttpError &&
			error.code === "invalid_collection" &&
			error.message === "Collection title is required.",
	);
});

test("normalizeCollectionRecord sanitizes study ids", () => {
	assert.deepEqual(
		normalizeCollectionRecord({
			id: "collection-1",
			title: " Prep ",
			createdAt: "2026-04-13T20:00:00.000Z",
			updatedAt: "2026-04-13T20:01:00.000Z",
			studyIds: ["study-1", "study-1", " ", "study-2"],
		}),
		{
			id: "collection-1",
			title: "Prep",
			createdAt: "2026-04-13T20:00:00.000Z",
			updatedAt: "2026-04-13T20:01:00.000Z",
			studyIds: ["study-1", "study-2"],
		},
	);
});

test("buildCollectionSummary exposes count and study ids", () => {
	assert.deepEqual(
		buildCollectionSummary({
			id: "collection-1",
			title: "Prep",
			createdAt: "2026-04-13T20:00:00.000Z",
			updatedAt: "2026-04-13T20:01:00.000Z",
			studyIds: ["study-1", "study-2"],
		}),
		{
			id: "collection-1",
			title: "Prep",
			createdAt: "2026-04-13T20:00:00.000Z",
			updatedAt: "2026-04-13T20:01:00.000Z",
			studyIds: ["study-1", "study-2"],
			studyCount: 2,
		},
	);
});

test("createCollection and getCollection persist collection files", async () => {
	const rootDir = await createTempRoot();

	try {
		const collection = await createCollection({ title: "Prep" }, { rootDir });
		const loadedCollection = await getCollection(collection.id, { rootDir });

		assert.equal(collection.title, "Prep");
		assert.deepEqual(loadedCollection.studyIds, []);
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("listCollections returns sorted summaries", async () => {
	const rootDir = await createTempRoot();

	try {
		const firstCollection = await createCollection({ title: "Prep" }, { rootDir });
		await new Promise((resolve) => setTimeout(resolve, 5));
		const secondCollection = await createCollection({ title: "Endgames" }, { rootDir });
		const collections = await listCollections({ rootDir });

		assert.equal(collections.length, 2);
		assert.equal(collections[0].id, secondCollection.id);
		assert.equal(collections[1].id, firstCollection.id);
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("addStudyToCollection adds valid study membership", async () => {
	const rootDir = await createTempRoot();

	try {
		const study = await saveStudy(createStudyPayload(), { rootDir: path.join(rootDir, "studies") });
		const collection = await createCollection({ title: "Prep" }, { rootDir: path.join(rootDir, "collections") });
		const updatedCollection = await addStudyToCollection(
			collection.id,
			study.id,
			{
				rootDir: path.join(rootDir, "collections"),
				studiesRootDir: path.join(rootDir, "studies"),
			},
		);

		assert.deepEqual(updatedCollection.studyIds, [study.id]);
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("addStudyToCollection rejects missing studies", async () => {
	const rootDir = await createTempRoot();

	try {
		const collection = await createCollection({ title: "Prep" }, { rootDir });
		await assert.rejects(
			() => addStudyToCollection(collection.id, "study-missing", { rootDir }),
			(error) =>
				error instanceof HttpError &&
				error.code === "study_not_found" &&
				error.message === "Study not found.",
		);
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("removeStudyFromCollection deletes only one membership", async () => {
	const rootDir = await createTempRoot();

	try {
		const collection = await createCollection(
			{
				title: "Prep",
				studyIds: ["study-1", "study-2"],
			},
			{ rootDir },
		);
		const updatedCollection = await removeStudyFromCollection(collection.id, "study-1", { rootDir });

		assert.deepEqual(updatedCollection.studyIds, ["study-2"]);
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("removeStudyFromAllCollections prunes deleted study membership", async () => {
	const rootDir = await createTempRoot();

	try {
		await createCollection(
			{ title: "Prep", studyIds: ["study-1", "study-2"] },
			{ rootDir },
		);
		await createCollection(
			{ title: "Endgames", studyIds: ["study-1"] },
			{ rootDir },
		);

		const updatedCollections = await removeStudyFromAllCollections("study-1", { rootDir });
		const collections = await listCollections({ rootDir });

		assert.equal(updatedCollections.length, 2);
		assert.deepEqual(
			Object.fromEntries(
				collections.map((collection) => [collection.title, collection.studyIds]),
			),
			{
				Endgames: [],
				Prep: ["study-2"],
			},
		);
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});

test("deleteCollection removes saved collection file", async () => {
	const rootDir = await createTempRoot();

	try {
		const collection = await createCollection({ title: "Prep" }, { rootDir });
		const deletedCollection = await deleteCollection(collection.id, { rootDir });
		const collections = await listCollections({ rootDir });

		assert.deepEqual(deletedCollection, { id: collection.id });
		assert.equal(collections.length, 0);
	} finally {
		await fs.rm(rootDir, { recursive: true, force: true });
	}
});
