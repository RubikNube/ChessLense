export const DEFAULT_OTB_SEARCH_FILTERS = {
  player: "",
  opponent: "",
  color: "",
  event: "",
  yearFrom: "",
  yearTo: "",
  result: "",
  ecoFrom: "",
  ecoTo: "",
  opening: "",
  pageSize: "25",
};

export const OTB_PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];

export const OTB_RESULT_OPTIONS = [
  { value: "", label: "Any result" },
  { value: "1-0", label: "1-0" },
  { value: "0-1", label: "0-1" },
  { value: "1/2-1/2", label: "1/2-1/2" },
  { value: "*", label: "*" },
];

export const OTB_COLOR_OPTIONS = [
  { value: "", label: "Ignore player color" },
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
];

const ECO_CODE_PATTERN = /^[A-E]\d{2}$/i;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOtbSearchFilters(filters) {
  return {
    player: normalizeString(filters?.player),
    opponent: normalizeString(filters?.opponent),
    color: normalizeString(filters?.color),
    event: normalizeString(filters?.event),
    yearFrom: normalizeString(filters?.yearFrom),
    yearTo: normalizeString(filters?.yearTo),
    result: normalizeString(filters?.result),
    ecoFrom: normalizeString(filters?.ecoFrom).toUpperCase(),
    ecoTo: normalizeString(filters?.ecoTo).toUpperCase(),
    opening: normalizeString(filters?.opening),
    pageSize:
      normalizeString(filters?.pageSize) ||
      normalizeString(filters?.max) ||
      DEFAULT_OTB_SEARCH_FILTERS.pageSize,
  };
}

export function buildOtbSearchQuery(filters, page = 1) {
  const normalized = normalizeOtbSearchFilters(filters);

  if (normalized.color && !normalized.player) {
    return {
      query: "",
      error: "Choose a player before filtering by color.",
    };
  }

  const hasQueryFilter =
    normalized.player ||
    normalized.opponent ||
    normalized.event ||
    normalized.yearFrom ||
    normalized.yearTo ||
    normalized.result ||
    normalized.ecoFrom ||
    normalized.ecoTo ||
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

  if (normalized.ecoFrom && !ECO_CODE_PATTERN.test(normalized.ecoFrom)) {
    return {
      query: "",
      error: "ECO from must use a code like C50.",
    };
  }

  if (normalized.ecoTo && !ECO_CODE_PATTERN.test(normalized.ecoTo)) {
    return {
      query: "",
      error: "ECO to must use a code like C50.",
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

  if (normalized.ecoFrom && normalized.ecoTo && normalized.ecoFrom > normalized.ecoTo) {
    return {
      query: "",
      error: "ECO from cannot be greater than ECO to.",
    };
  }

  const params = new URLSearchParams();

  Object.entries(normalized).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  params.set("page", String(Math.max(1, Number(page) || 1)));

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

export function formatOtbMoveCount(game) {
  if (Number.isInteger(game?.moveCount) && game.moveCount > 0) {
    return `${game.moveCount} ${game.moveCount === 1 ? "move" : "moves"}`;
  }

  if (Number.isInteger(game?.plyCount) && game.plyCount > 0) {
    const moveCount = Math.ceil(game.plyCount / 2);
    return `${moveCount} ${moveCount === 1 ? "move" : "moves"}`;
  }

  return "Move count unavailable";
}

export function getOtbPageWindow(currentPage, totalPages) {
  const safeTotalPages = Number.isInteger(totalPages) && totalPages > 0 ? totalPages : 1;
  const safeCurrentPage =
    Number.isInteger(currentPage) && currentPage > 0
      ? Math.min(currentPage, safeTotalPages)
      : 1;

  if (safeTotalPages <= 7) {
    return Array.from({ length: safeTotalPages }, (_, index) => index + 1);
  }

  let start = Math.max(2, safeCurrentPage - 2);
  let end = Math.min(safeTotalPages - 1, safeCurrentPage + 2);

  while (end - start + 1 < 5) {
    if (start > 2) {
      start -= 1;
    } else if (end < safeTotalPages - 1) {
      end += 1;
    } else {
      break;
    }
  }

  const items = [1];

  if (start > 2) {
    items.push("ellipsis-left");
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < safeTotalPages - 1) {
    items.push("ellipsis-right");
  }

  items.push(safeTotalPages);

  return items;
}
