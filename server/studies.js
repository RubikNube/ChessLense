const fs = require("fs/promises");
const path = require("path");
const { HttpError } = require("./httpError");

const DEFAULT_STUDIES_DIR = path.join(__dirname, "data", "studies");
const POSITION_COMMENT_SOURCE_IMPORTED = "imported-mainline";
const STUDY_ID_PATTERN = /^[a-z0-9-]+$/;

function normalizeString(value) {
	return typeof value === "string" ? value.trim() : "";
}

function normalizeStudyId(studyId) {
	const normalized = normalizeString(studyId);
	return STUDY_ID_PATTERN.test(normalized) ? normalized : "";
}

function normalizeIsoTimestamp(value, fallback) {
	const normalized = normalizeString(value);

	if (!normalized) {
		return fallback;
	}

	const timestamp = new Date(normalized);
	return Number.isNaN(timestamp.getTime()) ? fallback : timestamp.toISOString();
}

function normalizeHeaderEntry(entry) {
	if (
		!entry ||
		typeof entry !== "object" ||
		typeof entry.name !== "string" ||
		!entry.name.trim() ||
		typeof entry.value !== "string"
	) {
		return null;
	}

	return {
		name: entry.name.trim(),
		value: entry.value,
	};
}

function normalizeMainlineComment(entry) {
	if (
		!entry ||
		typeof entry !== "object" ||
		typeof entry.comment !== "string" ||
		!entry.comment.trim()
	) {
		return null;
	}

	return {
		comment: entry.comment.trim(),
		fen: normalizeString(entry.fen) || null,
		ply: Number.isInteger(entry.ply) && entry.ply >= 0 ? entry.ply : null,
		moveNumber:
			Number.isInteger(entry.moveNumber) && entry.moveNumber >= 0
				? entry.moveNumber
				: null,
		side: entry.side === "white" || entry.side === "black" ? entry.side : null,
		san: normalizeString(entry.san) || null,
	};
}

function normalizeAdditionalComment(entry) {
	if (
		!entry ||
		typeof entry !== "object" ||
		typeof entry.text !== "string" ||
		!entry.text.trim()
	) {
		return null;
	}

	return {
		text: entry.text.trim(),
		inVariation: entry.inVariation === true,
	};
}

function normalizeImportedPgnData(data) {
	if (!data || typeof data !== "object") {
		return null;
	}

	const headers = Array.isArray(data.headers)
		? data.headers.map(normalizeHeaderEntry).filter(Boolean)
		: [];
	const mainlineComments = Array.isArray(data.mainlineComments)
		? data.mainlineComments.map(normalizeMainlineComment).filter(Boolean)
		: [];
	const additionalComments = Array.isArray(data.additionalComments)
		? data.additionalComments.map(normalizeAdditionalComment).filter(Boolean)
		: [];
	const variationSnippets = Array.isArray(data.variationSnippets)
		? data.variationSnippets.filter(
				(snippet) => typeof snippet === "string" && snippet.trim().length > 0,
			)
		: [];
	const rawPgn = typeof data.rawPgn === "string" ? data.rawPgn : "";

	if (
		!rawPgn &&
		!headers.length &&
		!mainlineComments.length &&
		!additionalComments.length &&
		!variationSnippets.length
	) {
		return null;
	}

	return {
		rawPgn,
		headers,
		mainlineComments,
		additionalComments,
		variationSnippets,
	};
}

function normalizePositionComment(entry, index = 0) {
	if (
		!entry ||
		typeof entry !== "object" ||
		typeof entry.comment !== "string" ||
		!entry.comment.trim()
	) {
		return null;
	}

	return {
		id: normalizeString(entry.id) || `comment-${index}`,
		comment: entry.comment.trim(),
		fen: normalizeString(entry.fen) || null,
		ply: Number.isInteger(entry.ply) && entry.ply >= 0 ? entry.ply : null,
		moveNumber:
			Number.isInteger(entry.moveNumber) && entry.moveNumber >= 0
				? entry.moveNumber
				: null,
		side: entry.side === "white" || entry.side === "black" ? entry.side : null,
		san: normalizeString(entry.san) || null,
		source:
			entry.source === POSITION_COMMENT_SOURCE_IMPORTED
				? POSITION_COMMENT_SOURCE_IMPORTED
				: "user",
	};
}

function normalizePositionComments(positionComments) {
	if (!Array.isArray(positionComments)) {
		return [];
	}

	return positionComments
		.map((entry, index) => normalizePositionComment(entry, index))
		.filter(Boolean);
}

function getHeaderValue(importedPgnData, headerName) {
	if (!importedPgnData?.headers?.length || !normalizeString(headerName)) {
		return "";
	}

	const matchingHeader = importedPgnData.headers.find(
		({ name }) =>
			typeof name === "string" && name.toLowerCase() === headerName.toLowerCase(),
	);

	return typeof matchingHeader?.value === "string" ? matchingHeader.value.trim() : "";
}

function buildFallbackStudyTitle(importedPgnData) {
	const white = getHeaderValue(importedPgnData, "White");
	const black = getHeaderValue(importedPgnData, "Black");
	const event = getHeaderValue(importedPgnData, "Event");

	if (white && black && event) {
		return `${white} vs ${black} - ${event}`;
	}

	if (white && black) {
		return `${white} vs ${black}`;
	}

	if (event) {
		return event;
	}

	return "Untitled study";
}

function normalizeStudyTitle(title, importedPgnData) {
	return (normalizeString(title) || buildFallbackStudyTitle(importedPgnData)).slice(0, 120);
}

function normalizeVariantTree(variantTree) {
	return variantTree && typeof variantTree === "object" ? variantTree : null;
}

function buildStudySummary({ variantTree, importedPgnData, positionComments }) {
	const nodes =
		variantTree?.nodes && typeof variantTree.nodes === "object" ? variantTree.nodes : {};
	let maxPly = 0;

	for (const node of Object.values(nodes)) {
		if (Number.isInteger(node?.ply) && node.ply > maxPly) {
			maxPly = node.ply;
		}
	}

	return {
		event: getHeaderValue(importedPgnData, "Event"),
		white: getHeaderValue(importedPgnData, "White"),
		black: getHeaderValue(importedPgnData, "Black"),
		commentCount: positionComments.length,
		nodeCount: Object.keys(nodes).length,
		maxPly,
		hasImportedPgn: typeof importedPgnData?.rawPgn === "string" && importedPgnData.rawPgn.length > 0,
	};
}

function normalizeStudyPayload(payload) {
	if (!payload || typeof payload !== "object") {
		throw new HttpError(400, "invalid_study", "Study payload must be an object.");
	}

	const importedPgnData = normalizeImportedPgnData(payload.importedPgnData);
	const variantTree = normalizeVariantTree(payload.variantTree);

	if (!variantTree) {
		throw new HttpError(400, "invalid_study", "variantTree is required.");
	}

	return {
		title: normalizeStudyTitle(payload.title, importedPgnData),
		variantTree,
		importedPgnData,
		positionComments: normalizePositionComments(payload.positionComments),
	};
}

function normalizeStudyRecord(record) {
	if (!record || typeof record !== "object") {
		return null;
	}

	const importedPgnData = normalizeImportedPgnData(record.importedPgnData);
	const variantTree = normalizeVariantTree(record.variantTree);
	const id = normalizeStudyId(record.id);

	if (!id || !variantTree) {
		return null;
	}

	const positionComments = normalizePositionComments(record.positionComments);
	const createdAt = normalizeIsoTimestamp(record.createdAt, new Date().toISOString());
	const updatedAt = normalizeIsoTimestamp(record.updatedAt, createdAt);

	return {
		id,
		title: normalizeStudyTitle(record.title, importedPgnData),
		createdAt,
		updatedAt,
		summary: buildStudySummary({
			variantTree,
			importedPgnData,
			positionComments,
		}),
		variantTree,
		importedPgnData,
		positionComments,
	};
}

function createStudyId() {
	return `study-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getStudiesDir(rootDir = process.env.STUDIES_DIR) {
	return normalizeString(rootDir) || DEFAULT_STUDIES_DIR;
}

async function ensureStudiesDir(rootDir) {
	await fs.mkdir(rootDir, { recursive: true });
	return rootDir;
}

function getStudyFilePath(rootDir, studyId) {
	const normalizedStudyId = normalizeStudyId(studyId);

	if (!normalizedStudyId) {
		throw new HttpError(400, "invalid_study", "studyId is invalid.");
	}

	return path.join(rootDir, `${normalizedStudyId}.json`);
}

async function readStoredStudy(filePath) {
	try {
		const rawStudy = await fs.readFile(filePath, "utf8");
		return JSON.parse(rawStudy);
	} catch (error) {
		if (error?.code === "ENOENT") {
			throw new HttpError(404, "study_not_found", "Study not found.");
		}

		if (error instanceof SyntaxError) {
			throw new HttpError(500, "invalid_study", "Stored study is invalid JSON.");
		}

		throw error;
	}
}

async function listStudies(options = {}) {
	const rootDir = await ensureStudiesDir(getStudiesDir(options.studiesRootDir ?? options.rootDir));
	const entries = await fs.readdir(rootDir, { withFileTypes: true });
	const studies = [];

	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith(".json")) {
			continue;
		}

		try {
			const study = normalizeStudyRecord(
				await readStoredStudy(path.join(rootDir, entry.name)),
			);

			if (!study) {
				continue;
			}

			studies.push({
				id: study.id,
				title: study.title,
				createdAt: study.createdAt,
				updatedAt: study.updatedAt,
				summary: study.summary,
			});
		} catch (error) {
			if (!(error instanceof HttpError && error.code === "invalid_study")) {
				throw error;
			}
		}
	}

	studies.sort((leftStudy, rightStudy) => rightStudy.updatedAt.localeCompare(leftStudy.updatedAt));
	return studies;
}

async function getStudy(studyId, options = {}) {
	const rootDir = await ensureStudiesDir(getStudiesDir(options.studiesRootDir ?? options.rootDir));
	const study = normalizeStudyRecord(
		await readStoredStudy(getStudyFilePath(rootDir, studyId)),
	);

	if (!study) {
		throw new HttpError(500, "invalid_study", "Stored study is invalid.");
	}

	return study;
}

async function saveStudy(payload, options = {}) {
	const rootDir = await ensureStudiesDir(getStudiesDir(options.studiesRootDir ?? options.rootDir));
	const normalizedPayload = normalizeStudyPayload(payload);
	const now = new Date().toISOString();
	const studyRecord = {
		id: createStudyId(),
		title: normalizedPayload.title,
		createdAt: now,
		updatedAt: now,
		variantTree: normalizedPayload.variantTree,
		importedPgnData: normalizedPayload.importedPgnData,
		positionComments: normalizedPayload.positionComments,
	};

	await fs.writeFile(
		getStudyFilePath(rootDir, studyRecord.id),
		JSON.stringify(studyRecord, null, 2),
		"utf8",
	);

	return normalizeStudyRecord(studyRecord);
}

async function deleteStudy(studyId, options = {}) {
	const rootDir = await ensureStudiesDir(getStudiesDir(options.studiesRootDir ?? options.rootDir));
	const normalizedStudyId = normalizeStudyId(studyId);

	if (!normalizedStudyId) {
		throw new HttpError(400, "invalid_study", "studyId is invalid.");
	}

	try {
		await fs.unlink(getStudyFilePath(rootDir, normalizedStudyId));
		return {
			id: normalizedStudyId,
		};
	} catch (error) {
		if (error?.code === "ENOENT") {
			throw new HttpError(404, "study_not_found", "Study not found.");
		}

		throw error;
	}
}

async function hasStudy(studyId, options = {}) {
	const rootDir = await ensureStudiesDir(getStudiesDir(options.studiesRootDir ?? options.rootDir));

	try {
		await fs.access(getStudyFilePath(rootDir, studyId));
		return true;
	} catch (error) {
		if (error?.code === "ENOENT") {
			return false;
		}

		throw error;
	}
}

module.exports = {
	DEFAULT_STUDIES_DIR,
	deleteStudy,
	getStudy,
	hasStudy,
	listStudies,
	saveStudy,
	__testing: {
		buildFallbackStudyTitle,
		buildStudySummary,
		normalizeImportedPgnData,
		normalizePositionComments,
		normalizeStudyPayload,
		normalizeStudyRecord,
		normalizeStudyTitle,
	},
};
