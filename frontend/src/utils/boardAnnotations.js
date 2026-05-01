export const DEFAULT_BOARD_ARROW_COLOR = "#ffaa00";
export const SECONDARY_BOARD_ARROW_COLOR = "#4caf50";
export const TERTIARY_BOARD_ARROW_COLOR = "#f44336";

const VALID_SQUARE_PATTERN = /^[a-h][1-8]$/;

function normalizeSquare(square) {
  if (typeof square !== "string" || !VALID_SQUARE_PATTERN.test(square.trim().toLowerCase())) {
    return null;
  }

  return square.trim().toLowerCase();
}

function normalizeColor(color) {
  if (typeof color !== "string" || !color.trim()) {
    return null;
  }

  return color.trim().toLowerCase();
}

function hexToRgba(color, alpha) {
  const normalizedColor = normalizeColor(color);

  if (!normalizedColor?.startsWith("#")) {
    return color;
  }

  let hex = normalizedColor.slice(1);

  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((token) => `${token}${token}`)
      .join("");
  }

  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    return color;
  }

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function dedupeEntries(entries, keyBuilder) {
  const dedupedEntries = new Map();

  for (const entry of entries) {
    const entryKey = keyBuilder(entry);

    dedupedEntries.delete(entryKey);
    dedupedEntries.set(entryKey, entry);
  }

  return [...dedupedEntries.values()];
}

export function getBoardAnnotationColor(modifiers = {}) {
  if (modifiers.shiftKey) {
    return SECONDARY_BOARD_ARROW_COLOR;
  }

  if (modifiers.ctrlKey) {
    return TERTIARY_BOARD_ARROW_COLOR;
  }

  return DEFAULT_BOARD_ARROW_COLOR;
}

export function normalizeBoardArrow(arrow) {
  if (!arrow || typeof arrow !== "object") {
    return null;
  }

  const startSquare = normalizeSquare(arrow.startSquare);
  const endSquare = normalizeSquare(arrow.endSquare);
  const color = normalizeColor(arrow.color);

  if (!startSquare || !endSquare || !color || startSquare === endSquare) {
    return null;
  }

  return {
    startSquare,
    endSquare,
    color,
  };
}

export function normalizeBoardHighlight(highlight) {
  if (!highlight || typeof highlight !== "object") {
    return null;
  }

  const square = normalizeSquare(highlight.square);
  const color = normalizeColor(highlight.color);

  if (!square || !color) {
    return null;
  }

  return {
    square,
    color,
  };
}

export function createEmptyBoardAnnotations() {
  return {
    arrows: [],
    highlights: [],
  };
}

export function normalizeNodeBoardAnnotations(boardAnnotations) {
  if (!boardAnnotations || typeof boardAnnotations !== "object") {
    return createEmptyBoardAnnotations();
  }

  const arrows = dedupeEntries(
    (Array.isArray(boardAnnotations.arrows) ? boardAnnotations.arrows : [])
      .map(normalizeBoardArrow)
      .filter(Boolean),
    ({ startSquare, endSquare }) => `${startSquare}:${endSquare}`,
  );
  const highlights = dedupeEntries(
    (Array.isArray(boardAnnotations.highlights) ? boardAnnotations.highlights : [])
      .map(normalizeBoardHighlight)
      .filter(Boolean),
    ({ square }) => square,
  );

  return {
    arrows,
    highlights,
  };
}

export function areNodeBoardAnnotationsEqual(left, right) {
  const normalizedLeft = normalizeNodeBoardAnnotations(left);
  const normalizedRight = normalizeNodeBoardAnnotations(right);

  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
}

export function toggleBoardArrowInAnnotations(boardAnnotations, arrow) {
  const normalizedBoardAnnotations = normalizeNodeBoardAnnotations(boardAnnotations);
  const normalizedArrow = normalizeBoardArrow(arrow);

  if (!normalizedArrow) {
    return normalizedBoardAnnotations;
  }

  const existingIndex = normalizedBoardAnnotations.arrows.findIndex(
    (entry) =>
      entry.startSquare === normalizedArrow.startSquare &&
      entry.endSquare === normalizedArrow.endSquare,
  );

  if (existingIndex === -1) {
    return {
      ...normalizedBoardAnnotations,
      arrows: [...normalizedBoardAnnotations.arrows, normalizedArrow],
    };
  }

  const existingArrow = normalizedBoardAnnotations.arrows[existingIndex];

  if (existingArrow.color === normalizedArrow.color) {
    return {
      ...normalizedBoardAnnotations,
      arrows: normalizedBoardAnnotations.arrows.filter((_, index) => index !== existingIndex),
    };
  }

  return {
    ...normalizedBoardAnnotations,
    arrows: normalizedBoardAnnotations.arrows.map((entry, index) =>
      index === existingIndex ? normalizedArrow : entry,
    ),
  };
}

export function toggleBoardHighlightInAnnotations(boardAnnotations, highlight) {
  const normalizedBoardAnnotations = normalizeNodeBoardAnnotations(boardAnnotations);
  const normalizedHighlight = normalizeBoardHighlight(highlight);

  if (!normalizedHighlight) {
    return normalizedBoardAnnotations;
  }

  const existingIndex = normalizedBoardAnnotations.highlights.findIndex(
    (entry) => entry.square === normalizedHighlight.square,
  );

  if (existingIndex === -1) {
    return {
      ...normalizedBoardAnnotations,
      highlights: [...normalizedBoardAnnotations.highlights, normalizedHighlight],
    };
  }

  const existingHighlight = normalizedBoardAnnotations.highlights[existingIndex];

  if (existingHighlight.color === normalizedHighlight.color) {
    return {
      ...normalizedBoardAnnotations,
      highlights: normalizedBoardAnnotations.highlights.filter(
        (_, index) => index !== existingIndex,
      ),
    };
  }

  return {
    ...normalizedBoardAnnotations,
    highlights: normalizedBoardAnnotations.highlights.map((entry, index) =>
      index === existingIndex ? normalizedHighlight : entry,
    ),
  };
}

export function mergeBoardArrowCollections(...collections) {
  return dedupeEntries(
    collections.flatMap((collection) =>
      (Array.isArray(collection) ? collection : []).map(normalizeBoardArrow).filter(Boolean),
    ),
    ({ startSquare, endSquare }) => `${startSquare}:${endSquare}`,
  );
}

export function buildBoardHighlightSquareStyles(highlights) {
  return Object.fromEntries(
    normalizeNodeBoardAnnotations({ highlights }).highlights.map(({ square, color }) => [
      square,
      {
        backgroundColor: hexToRgba(color, 0.38),
        boxShadow: `inset 0 0 0 2px ${hexToRgba(color, 0.7)}`,
      },
    ]),
  );
}
