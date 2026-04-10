export const DEFAULT_OTB_SEARCH_FILTERS = {
  player: "",
  white: "",
  black: "",
  event: "",
  yearFrom: "",
  yearTo: "",
  result: "",
  eco: "",
  opening: "",
  max: "25",
};

export const OTB_RESULT_OPTIONS = [
  { value: "", label: "Any result" },
  { value: "1-0", label: "1-0" },
  { value: "0-1", label: "0-1" },
  { value: "1/2-1/2", label: "1/2-1/2" },
  { value: "*", label: "*" },
];

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOtbSearchFilters(filters) {
  return {
    player: normalizeString(filters?.player),
    white: normalizeString(filters?.white),
    black: normalizeString(filters?.black),
    event: normalizeString(filters?.event),
    yearFrom: normalizeString(filters?.yearFrom),
    yearTo: normalizeString(filters?.yearTo),
    result: normalizeString(filters?.result),
    eco: normalizeString(filters?.eco),
    opening: normalizeString(filters?.opening),
    max: normalizeString(filters?.max) || DEFAULT_OTB_SEARCH_FILTERS.max,
  };
}

export function buildOtbSearchQuery(filters) {
  const normalized = normalizeOtbSearchFilters(filters);
  const hasQueryFilter =
    normalized.player ||
    normalized.white ||
    normalized.black ||
    normalized.event ||
    normalized.yearFrom ||
    normalized.yearTo ||
    normalized.result ||
    normalized.eco ||
    normalized.opening;

  if (!hasQueryFilter) {
    return {
      query: "",
      error: "Enter at least one OTB search filter.",
    };
  }

  if (normalized.yearFrom && !/^\d{4}$/.test(normalized.yearFrom)) {
    return {
      query: "",
      error: "From year must use four digits.",
    };
  }

  if (normalized.yearTo && !/^\d{4}$/.test(normalized.yearTo)) {
    return {
      query: "",
      error: "To year must use four digits.",
    };
  }

  if (
    normalized.yearFrom &&
    normalized.yearTo &&
    Number(normalized.yearFrom) > Number(normalized.yearTo)
  ) {
    return {
      query: "",
      error: "From year cannot be greater than to year.",
    };
  }

  const params = new URLSearchParams();

  Object.entries(normalized).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  return {
    query: params.toString(),
    error: "",
  };
}

export function formatOtbGameDate(game) {
  if (typeof game?.dateLabel === "string" && game.dateLabel.trim()) {
    return game.dateLabel;
  }

  if (Number.isFinite(game?.createdAt)) {
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(game.createdAt));
  }

  if (Number.isInteger(game?.year)) {
    return String(game.year);
  }

  return "Unknown date";
}

export function formatOtbResult(game) {
  if (typeof game?.result === "string" && game.result.trim()) {
    return game.result;
  }

  return "Unknown result";
}
