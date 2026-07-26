import { normalizeOtbSearchFilters } from "./otbSearch.js";

export const DEFAULT_OTB_TREE_EXPORT_SETTINGS = {
  maxDepth: "20",
  minGames: "2",
  maxBranches: "5",
};

const TREE_FILTER_KEYS = [
  "player",
  "opponent",
  "event",
  "yearFrom",
  "yearTo",
  "result",
  "ecoFrom",
  "ecoTo",
  "opening",
  "moveCountMin",
  "moveCountMax",
];

export function normalizeOtbTreeScope(value) {
  const filters = normalizeOtbSearchFilters(value);

  return TREE_FILTER_KEYS.reduce((scope, key) => {
    scope[key] = filters[key];
    return scope;
  }, {});
}

export function normalizeOtbTreeExportSettings(value) {
  return {
    maxDepth:
      typeof value?.maxDepth === "string"
        ? value.maxDepth
        : DEFAULT_OTB_TREE_EXPORT_SETTINGS.maxDepth,
    minGames:
      typeof value?.minGames === "string"
        ? value.minGames
        : DEFAULT_OTB_TREE_EXPORT_SETTINGS.minGames,
    maxBranches:
      typeof value?.maxBranches === "string"
        ? value.maxBranches
        : DEFAULT_OTB_TREE_EXPORT_SETTINGS.maxBranches,
  };
}

function appendScope(params, scope) {
  TREE_FILTER_KEYS.forEach((key) => {
    if (scope[key]) {
      params.set(key, scope[key]);
    }
  });
}

export function buildOtbOpeningTreeQuery(scopeValue, color, fen) {
  const scope = normalizeOtbTreeScope(scopeValue);

  if (!scope.player) {
    return { query: "", error: "Enter a player before opening the tree." };
  }

  if (color !== "white" && color !== "black") {
    return { query: "", error: "Choose White or Black." };
  }

  if (typeof fen !== "string" || !fen.trim()) {
    return { query: "", error: "The current board position is unavailable." };
  }

  const params = new URLSearchParams();
  appendScope(params, scope);
  params.set("color", color);
  params.set("fen", fen);
  return { query: params.toString(), error: "" };
}

function validateInteger(value, label, maximum = null) {
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    return `${label} must be a positive whole number.`;
  }

  if (maximum !== null && Number(value) > maximum) {
    return `${label} cannot be greater than ${maximum}.`;
  }

  return "";
}

export function buildOtbOpeningTreeExportQuery(scopeValue, settingsValue) {
  const scope = normalizeOtbTreeScope(scopeValue);
  const settings = normalizeOtbTreeExportSettings(settingsValue);

  if (!scope.player) {
    return { query: "", error: "Enter a player before exporting the tree." };
  }

  const error =
    validateInteger(settings.maxDepth, "Maximum depth", 60) ||
    validateInteger(settings.minGames, "Minimum games") ||
    validateInteger(settings.maxBranches, "Maximum branches", 20);

  if (error) {
    return { query: "", error };
  }

  const params = new URLSearchParams();
  appendScope(params, scope);
  Object.entries(settings).forEach(([key, value]) => params.set(key, value));
  return { query: params.toString(), error: "" };
}
