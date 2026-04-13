function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStudyIds(studyIds) {
  if (!Array.isArray(studyIds)) {
    return [];
  }

  return [...new Set(studyIds.map((studyId) => normalizeString(studyId)).filter(Boolean))];
}

function normalizeCount(value, fallback = 0) {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

export function normalizeCollection(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const id = normalizeString(entry.id);
  const title = normalizeString(entry.title);

  if (!id || !title) {
    return null;
  }

  const studyIds = normalizeStudyIds(entry.studyIds);

  return {
    id,
    title,
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : "",
    updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : "",
    studyIds,
    studyCount: normalizeCount(entry.studyCount, studyIds.length),
  };
}

export function createCollectionPayload(title) {
  return {
    title: normalizeString(title),
  };
}

export function getCollectionsForStudy(collections, studyId) {
  const normalizedStudyId = normalizeString(studyId);

  if (!normalizedStudyId) {
    return [];
  }

  return (Array.isArray(collections) ? collections : [])
    .map((collection) => normalizeCollection(collection))
    .filter((collection) => collection?.studyIds.includes(normalizedStudyId));
}

export function filterStudiesByCollection(studies, selectedCollectionId, collections) {
  const normalizedCollectionId = normalizeString(selectedCollectionId);
  const normalizedStudies = Array.isArray(studies) ? studies : [];

  if (!normalizedCollectionId) {
    return normalizedStudies;
  }

  const matchingCollection = (Array.isArray(collections) ? collections : [])
    .map((collection) => normalizeCollection(collection))
    .find((collection) => collection?.id === normalizedCollectionId);

  if (!matchingCollection) {
    return [];
  }

  const allowedStudyIds = new Set(matchingCollection.studyIds);
  return normalizedStudies.filter((study) => allowedStudyIds.has(study?.id));
}
