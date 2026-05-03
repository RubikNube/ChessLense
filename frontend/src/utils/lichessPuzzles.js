export const DEFAULT_LICHESS_PUZZLE_FILTERS = {
  angle: "",
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

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeLichessPuzzleFilters(filters) {
  const difficulty = normalizeString(filters?.difficulty);
  const color = normalizeString(filters?.color);

  return {
    angle: normalizeString(filters?.angle),
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
