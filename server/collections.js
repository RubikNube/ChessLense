const fs = require("fs/promises");
const path = require("path");
const { HttpError } = require("./httpError");
const { hasStudy } = require("./studies");

const DEFAULT_COLLECTIONS_DIR = path.join(__dirname, "data", "collections");
const COLLECTION_ID_PATTERN = /^[a-z0-9-]+$/;

function normalizeString(value) {
	return typeof value === "string" ? value.trim() : "";
}

function normalizeCollectionId(collectionId) {
	const normalized = normalizeString(collectionId);
	return COLLECTION_ID_PATTERN.test(normalized) ? normalized : "";
}

function normalizeIsoTimestamp(value, fallback) {
	const normalized = normalizeString(value);

	if (!normalized) {
		return fallback;
	}

	const timestamp = new Date(normalized);
	return Number.isNaN(timestamp.getTime()) ? fallback : timestamp.toISOString();
}

function normalizeStudyIds(studyIds) {
	if (!Array.isArray(studyIds)) {
		return [];
	}

	return [...new Set(studyIds.map((studyId) => normalizeString(studyId)).filter(Boolean))];
}

function normalizeCollectionTitle(title) {
	const normalized = normalizeString(title);

	if (!normalized) {
		throw new HttpError(400, "invalid_collection", "Collection title is required.");
	}

	return normalized.slice(0, 120);
}

function buildCollectionSummary(collectionRecord) {
	return {
		id: collectionRecord.id,
		title: collectionRecord.title,
		createdAt: collectionRecord.createdAt,
		updatedAt: collectionRecord.updatedAt,
		studyIds: collectionRecord.studyIds,
		studyCount: collectionRecord.studyIds.length,
	};
}

function normalizeCollectionRecord(record) {
	if (!record || typeof record !== "object") {
		return null;
	}

	const id = normalizeCollectionId(record.id);

	if (!id) {
		return null;
	}

	const createdAt = normalizeIsoTimestamp(record.createdAt, new Date().toISOString());
	const updatedAt = normalizeIsoTimestamp(record.updatedAt, createdAt);

	try {
		const title = normalizeCollectionTitle(record.title);
		const studyIds = normalizeStudyIds(record.studyIds);

		return {
			id,
			title,
			createdAt,
			updatedAt,
			studyIds,
		};
	} catch {
		return null;
	}
}

function createCollectionId() {
	return `collection-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getCollectionsDir(rootDir = process.env.COLLECTIONS_DIR) {
	return normalizeString(rootDir) || DEFAULT_COLLECTIONS_DIR;
}

async function ensureCollectionsDir(rootDir) {
	await fs.mkdir(rootDir, { recursive: true });
	return rootDir;
}

function getCollectionFilePath(rootDir, collectionId) {
	const normalizedCollectionId = normalizeCollectionId(collectionId);

	if (!normalizedCollectionId) {
		throw new HttpError(400, "invalid_collection", "collectionId is invalid.");
	}

	return path.join(rootDir, `${normalizedCollectionId}.json`);
}

async function readStoredCollection(filePath) {
	try {
		const rawCollection = await fs.readFile(filePath, "utf8");
		return JSON.parse(rawCollection);
	} catch (error) {
		if (error?.code === "ENOENT") {
			throw new HttpError(404, "collection_not_found", "Collection not found.");
		}

		if (error instanceof SyntaxError) {
			throw new HttpError(500, "invalid_collection", "Stored collection is invalid JSON.");
		}

		throw error;
	}
}

async function writeCollectionRecord(rootDir, collectionRecord) {
	await fs.writeFile(
		getCollectionFilePath(rootDir, collectionRecord.id),
		JSON.stringify(collectionRecord, null, 2),
		"utf8",
	);
}

async function listCollections(options = {}) {
	const rootDir = await ensureCollectionsDir(getCollectionsDir(options.rootDir));
	const entries = await fs.readdir(rootDir, { withFileTypes: true });
	const collections = [];

	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith(".json")) {
			continue;
		}

		try {
			const collection = normalizeCollectionRecord(
				await readStoredCollection(path.join(rootDir, entry.name)),
			);

			if (!collection) {
				continue;
			}

			collections.push(buildCollectionSummary(collection));
		} catch (error) {
			if (!(error instanceof HttpError && error.code === "invalid_collection")) {
				throw error;
			}
		}
	}

	collections.sort((leftCollection, rightCollection) =>
		rightCollection.updatedAt.localeCompare(leftCollection.updatedAt),
	);
	return collections;
}

async function getCollection(collectionId, options = {}) {
	const rootDir = await ensureCollectionsDir(getCollectionsDir(options.rootDir));
	const collection = normalizeCollectionRecord(
		await readStoredCollection(getCollectionFilePath(rootDir, collectionId)),
	);

	if (!collection) {
		throw new HttpError(500, "invalid_collection", "Stored collection is invalid.");
	}

	return collection;
}

async function createCollection(payload, options = {}) {
	if (!payload || typeof payload !== "object") {
		throw new HttpError(400, "invalid_collection", "Collection payload must be an object.");
	}

	const rootDir = await ensureCollectionsDir(getCollectionsDir(options.rootDir));
	const now = new Date().toISOString();
	const collectionRecord = {
		id: createCollectionId(),
		title: normalizeCollectionTitle(payload.title),
		createdAt: now,
		updatedAt: now,
		studyIds: normalizeStudyIds(payload.studyIds),
	};

	await writeCollectionRecord(rootDir, collectionRecord);
	return collectionRecord;
}

async function deleteCollection(collectionId, options = {}) {
	const rootDir = await ensureCollectionsDir(getCollectionsDir(options.rootDir));
	const normalizedCollectionId = normalizeCollectionId(collectionId);

	if (!normalizedCollectionId) {
		throw new HttpError(400, "invalid_collection", "collectionId is invalid.");
	}

	try {
		await fs.unlink(getCollectionFilePath(rootDir, normalizedCollectionId));
		return { id: normalizedCollectionId };
	} catch (error) {
		if (error?.code === "ENOENT") {
			throw new HttpError(404, "collection_not_found", "Collection not found.");
		}

		throw error;
	}
}

async function addStudyToCollection(collectionId, studyId, options = {}) {
	const normalizedStudyId = normalizeString(studyId);

	if (!normalizedStudyId) {
		throw new HttpError(400, "invalid_collection", "studyId is required.");
	}

	if (!(await hasStudy(normalizedStudyId, options))) {
		throw new HttpError(404, "study_not_found", "Study not found.");
	}

	const rootDir = await ensureCollectionsDir(getCollectionsDir(options.rootDir));
	const collection = await getCollection(collectionId, options);
	const nextStudyIds = normalizeStudyIds([...collection.studyIds, normalizedStudyId]);
	const updatedCollection = {
		...collection,
		studyIds: nextStudyIds,
		updatedAt: new Date().toISOString(),
	};

	await writeCollectionRecord(rootDir, updatedCollection);
	return updatedCollection;
}

async function removeStudyFromCollection(collectionId, studyId, options = {}) {
	const normalizedStudyId = normalizeString(studyId);

	if (!normalizedStudyId) {
		throw new HttpError(400, "invalid_collection", "studyId is required.");
	}

	const rootDir = await ensureCollectionsDir(getCollectionsDir(options.rootDir));
	const collection = await getCollection(collectionId, options);
	const updatedCollection = {
		...collection,
		studyIds: collection.studyIds.filter((currentStudyId) => currentStudyId !== normalizedStudyId),
		updatedAt: new Date().toISOString(),
	};

	await writeCollectionRecord(rootDir, updatedCollection);
	return updatedCollection;
}

async function removeStudyFromAllCollections(studyId, options = {}) {
	const normalizedStudyId = normalizeString(studyId);

	if (!normalizedStudyId) {
		return [];
	}

	const rootDir = await ensureCollectionsDir(getCollectionsDir(options.rootDir));
	const collections = await listCollections(options);
	const updatedCollections = [];

	for (const collectionSummary of collections) {
		if (!collectionSummary.studyIds.includes(normalizedStudyId)) {
			continue;
		}

		const collection = await getCollection(collectionSummary.id, options);
		const updatedCollection = {
			...collection,
			studyIds: collection.studyIds.filter((currentStudyId) => currentStudyId !== normalizedStudyId),
			updatedAt: new Date().toISOString(),
		};
		await writeCollectionRecord(rootDir, updatedCollection);
		updatedCollections.push(updatedCollection);
	}

	return updatedCollections;
}

module.exports = {
	DEFAULT_COLLECTIONS_DIR,
	addStudyToCollection,
	createCollection,
	deleteCollection,
	getCollection,
	listCollections,
	removeStudyFromAllCollections,
	removeStudyFromCollection,
	__testing: {
		buildCollectionSummary,
		normalizeCollectionRecord,
		normalizeCollectionTitle,
		normalizeStudyIds,
	},
};
