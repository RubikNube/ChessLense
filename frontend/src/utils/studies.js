import { normalizeImportedPgnData } from "./annotatedPgn.js";
import { normalizePositionComments } from "./appState.js";
import { createEmptyVariantTree, normalizeVariantTree } from "./variantTree.js";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
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

export function buildStudyTitle(importedPgnData, requestedTitle = "") {
  const normalizedTitle = normalizeString(requestedTitle);

  if (normalizedTitle) {
    return normalizedTitle;
  }

  const normalizedImportedPgnData = normalizeImportedPgnData(importedPgnData);
  const white = getHeaderValue(normalizedImportedPgnData, "White");
  const black = getHeaderValue(normalizedImportedPgnData, "Black");
  const event = getHeaderValue(normalizedImportedPgnData, "Event");

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

export function normalizeStudySummary(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const id = normalizeString(entry.id);
  const title = buildStudyTitle(entry.importedPgnData, entry.title);

  if (!id || !title) {
    return null;
  }

  const summary =
    entry.summary && typeof entry.summary === "object" ? entry.summary : {};

  return {
    id,
    title,
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : "",
    updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : "",
    summary: {
      event: normalizeString(summary.event),
      white: normalizeString(summary.white),
      black: normalizeString(summary.black),
      commentCount: normalizeCount(summary.commentCount),
      nodeCount: normalizeCount(summary.nodeCount),
      maxPly: normalizeCount(summary.maxPly),
      hasImportedPgn: summary.hasImportedPgn === true,
    },
  };
}

export function normalizeStudy(entry) {
  if (!entry || typeof entry !== "object" || !entry.variantTree || typeof entry.variantTree !== "object") {
    return null;
  }

  const summary = normalizeStudySummary(entry);

  if (!summary) {
    return null;
  }

  return {
    ...summary,
    variantTree: normalizeVariantTree(entry.variantTree),
    importedPgnData: normalizeImportedPgnData(entry.importedPgnData),
    positionComments: normalizePositionComments(entry.positionComments),
  };
}

export function createStudySavePayload({
  title,
  variantTree,
  importedPgnData,
  positionComments,
}) {
  const normalizedImportedPgnData = normalizeImportedPgnData(importedPgnData);

  return {
    title: buildStudyTitle(normalizedImportedPgnData, title),
    variantTree: normalizeVariantTree(variantTree ?? createEmptyVariantTree()),
    importedPgnData: normalizedImportedPgnData,
    positionComments: normalizePositionComments(positionComments),
  };
}
