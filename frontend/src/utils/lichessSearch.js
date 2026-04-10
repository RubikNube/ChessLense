export const DEFAULT_LICHESS_SEARCH_FILTERS = {
  player: "",
  opponent: "",
  year: "",
  color: "",
  perfType: "",
  max: "10",
};

export const LICHESS_PERF_TYPE_OPTIONS = [
  { value: "", label: "Any speed or variant" },
  { value: "ultraBullet", label: "UltraBullet" },
  { value: "bullet", label: "Bullet" },
  { value: "blitz", label: "Blitz" },
  { value: "rapid", label: "Rapid" },
  { value: "classical", label: "Classical" },
  { value: "correspondence", label: "Correspondence" },
  { value: "standard", label: "Standard" },
  { value: "chess960", label: "Chess960" },
  { value: "crazyhouse", label: "Crazyhouse" },
  { value: "antichess", label: "Antichess" },
  { value: "atomic", label: "Atomic" },
  { value: "horde", label: "Horde" },
  { value: "kingOfTheHill", label: "King of the Hill" },
  { value: "racingKings", label: "Racing Kings" },
  { value: "threeCheck", label: "Three-check" },
];

export const LICHESS_COLOR_OPTIONS = [
  { value: "", label: "Any color" },
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
];

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeLichessSearchFilters(filters) {
  return {
    player: normalizeString(filters?.player),
    opponent: normalizeString(filters?.opponent),
    year: normalizeString(filters?.year),
    color: normalizeString(filters?.color),
    perfType: normalizeString(filters?.perfType),
    max: normalizeString(filters?.max) || DEFAULT_LICHESS_SEARCH_FILTERS.max,
  };
}

export function buildLichessSearchQuery(filters) {
  const normalized = normalizeLichessSearchFilters(filters);

  if (!normalized.player) {
    return {
      query: "",
      error: "Enter at least one Lichess player to search.",
    };
  }

  if (normalized.year && !/^\d{4}$/.test(normalized.year)) {
    return {
      query: "",
      error: "Year must use four digits.",
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

export function formatLichessGameDate(timestamp) {
  if (!Number.isFinite(timestamp)) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

export function formatLichessResult(game) {
  if (!game?.winner) {
    return "1/2-1/2";
  }

  return game.winner === "white" ? "1-0" : "0-1";
}
