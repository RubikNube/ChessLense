export function parseUciMove(uci) {
  if (typeof uci !== "string") {
    return null;
  }

  const normalizedUci = uci.trim().toLowerCase();

  if (!/^[a-h][1-8][a-h][1-8][nbrq]?$/.test(normalizedUci)) {
    return null;
  }

  return {
    from: normalizedUci.slice(0, 2),
    to: normalizedUci.slice(2, 4),
    ...(normalizedUci.length === 5 ? { promotion: normalizedUci[4] } : {}),
  };
}

export function buildOpeningTreeArrow(move) {
  if (!move?.from || !move?.to) {
    return null;
  }

  return {
    startSquare: move.from,
    endSquare: move.to,
    color: "#f59e0b",
  };
}

export function mergeBoardArrows(baseArrows, previewArrow) {
  const normalizedBaseArrows = Array.isArray(baseArrows) ? baseArrows : [];

  if (!previewArrow) {
    return normalizedBaseArrows;
  }

  return [
    previewArrow,
    ...normalizedBaseArrows.filter(
      (arrow) =>
        arrow?.startSquare !== previewArrow.startSquare || arrow?.endSquare !== previewArrow.endSquare,
    ),
  ];
}
