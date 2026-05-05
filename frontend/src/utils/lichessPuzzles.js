import { LICHESS_PUZZLE_THEME_OPTIONS } from "./lichessPuzzleThemes.js";

export const DEFAULT_LICHESS_PUZZLE_FILTERS = {
  theme: "",
  opening: "",
  difficulty: "",
  color: "",
};

export const LICHESS_PUZZLE_DIFFICULTY_OPTIONS = [
  { value: "", label: "Default difficulty" },
  { value: "easiest", label: "Easiest" },
  { value: "easier", label: "Easier" },
  { value: "normal", label: "Normal" },
  { value: "harder", label: "Harder" },
  { value: "hardest", label: "Hardest" },
];

export const LICHESS_PUZZLE_COLOR_OPTIONS = [
  { value: "", label: "Either color" },
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
];

const LICHESS_PUZZLE_THEME_OPTION_MAP = new Map(
  LICHESS_PUZZLE_THEME_OPTIONS.map((option) => [option.value, option]),
);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function getLichessPuzzleThemeOption(value) {
  const normalizedValue = normalizeString(value);
  return LICHESS_PUZZLE_THEME_OPTION_MAP.get(normalizedValue) ?? null;
}

export function filterLichessPuzzleThemeOptions(searchValue) {
  const normalizedSearchValue = normalizeString(searchValue).toLowerCase();

  if (!normalizedSearchValue) {
    return LICHESS_PUZZLE_THEME_OPTIONS;
  }

  const searchTerms = normalizedSearchValue.split(/\s+/).filter(Boolean);

  return LICHESS_PUZZLE_THEME_OPTIONS.filter((option) => {
    const haystack = `${option.value} ${option.label} ${option.description}`.toLowerCase();
    return searchTerms.every((term) => haystack.includes(term));
  });
}

export function normalizeLichessPuzzleFilters(filters) {
  const difficulty = normalizeString(filters?.difficulty);
  const color = normalizeString(filters?.color);
  const normalizedTheme = normalizeString(filters?.theme);
  const normalizedOpening = normalizeString(filters?.opening);
  const legacyAngle = normalizeString(filters?.angle);
  const theme = getLichessPuzzleThemeOption(normalizedTheme)
    ? normalizedTheme
    : getLichessPuzzleThemeOption(legacyAngle)
      ? legacyAngle
      : "";
  const opening = theme
    ? ""
    : getLichessPuzzleThemeOption(legacyAngle)
      ? ""
      : normalizedOpening || legacyAngle;

  return {
    theme,
    opening,
    difficulty:
      LICHESS_PUZZLE_DIFFICULTY_OPTIONS.some((option) => option.value === difficulty)
        ? difficulty
        : "",
    color:
      LICHESS_PUZZLE_COLOR_OPTIONS.some((option) => option.value === color)
        ? color
        : "",
  };
}

export function buildLichessPuzzleQuery(filters) {
  const normalized = normalizeLichessPuzzleFilters(filters);
  const params = new URLSearchParams();
  const angle = normalized.theme || normalized.opening;

  if (angle) {
    params.set("angle", angle);
  }

  ["difficulty", "color"].forEach((key) => {
    if (normalized[key]) {
      params.set(key, normalized[key]);
    }
  });

  return {
    query: params.toString(),
    error: "",
  };
}
