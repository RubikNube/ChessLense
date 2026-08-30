import {
  getEvaluationDisplayValue,
  normalizeEvaluationForWhite,
} from "./evaluation.js";

export const GAME_ANALYSIS_VERSION = 1;
export const GAME_ANALYSIS_STATUS_RUNNING = "running";
export const GAME_ANALYSIS_STATUS_COMPLETE = "complete";
export const GAME_ANALYSIS_STATUS_CANCELLED = "cancelled";
export const GAME_ANALYSIS_STATUS_ERROR = "error";

export const ISSUE_FILTER_ALL = "all";
export const ISSUE_FILTER_MISTAKES = "mistakes";
export const ISSUE_FILTER_BLUNDERS = "blunders";
export const ISSUE_SIDE_BOTH = "both";
export const ISSUE_SIDE_WHITE = "white";
export const ISSUE_SIDE_BLACK = "black";

export const GAME_ANALYSIS_SCALE_AUTO = "auto";
export const GAME_ANALYSIS_FIXED_SCALE_MAX_CP = Object.freeze([
  100, 200, 500, 1000,
]);

export const MOVE_SEVERITY_INACCURACY = "inaccuracy";
export const MOVE_SEVERITY_MISTAKE = "mistake";
export const MOVE_SEVERITY_BLUNDER = "blunder";

export const MOVE_SEVERITY_COLORS = Object.freeze({
  [MOVE_SEVERITY_INACCURACY]: "#facc15",
  [MOVE_SEVERITY_MISTAKE]: "#f97316",
  [MOVE_SEVERITY_BLUNDER]: "#dc2626",
});

const MOVE_SEVERITY_SYMBOLS = Object.freeze({
  [MOVE_SEVERITY_INACCURACY]: "?!",
  [MOVE_SEVERITY_MISTAKE]: "?",
  [MOVE_SEVERITY_BLUNDER]: "??",
});

const MOVE_SEVERITY_LABELS = Object.freeze({
  [MOVE_SEVERITY_INACCURACY]: "Inaccuracy",
  [MOVE_SEVERITY_MISTAKE]: "Mistake",
  [MOVE_SEVERITY_BLUNDER]: "Blunder",
});

export const INACCURACY_THRESHOLD_CP = 50;
export const MISTAKE_THRESHOLD_CP = 100;
export const BLUNDER_THRESHOLD_CP = 200;

const BOARD_SQUARE_PATTERN = /^[a-h][1-8]$/;
const UCI_MOVE_PATTERN = /^[a-h][1-8][a-h][1-8][nbrq]?$/;

function normalizeEvaluation(evaluation) {
  if (
    !evaluation ||
    typeof evaluation !== "object" ||
    (evaluation.type !== "cp" && evaluation.type !== "mate") ||
    !Number.isFinite(evaluation.value)
  ) {
    return null;
  }

  return { type: evaluation.type, value: evaluation.value };
}

export function normalizeGameAnalysisBestMove(bestMove) {
  if (typeof bestMove !== "string") {
    return null;
  }

  const normalizedBestMove = bestMove.trim().toLowerCase();
  return UCI_MOVE_PATTERN.test(normalizedBestMove) ? normalizedBestMove : null;
}

export function getComparableEvaluationCp(evaluation) {
  const normalizedEvaluation = normalizeEvaluation(evaluation);

  if (!normalizedEvaluation) {
    return null;
  }

  if (normalizedEvaluation.type === "cp") {
    return normalizedEvaluation.value;
  }

  const mateDistance = Math.max(0, Math.abs(normalizedEvaluation.value));
  const mateScore = 100000 - mateDistance;
  return normalizedEvaluation.value >= 0 ? mateScore : -mateScore;
}

export function classifyMoveLoss(lossCp) {
  if (!Number.isFinite(lossCp) || lossCp < INACCURACY_THRESHOLD_CP) {
    return null;
  }

  if (lossCp >= BLUNDER_THRESHOLD_CP) {
    return MOVE_SEVERITY_BLUNDER;
  }

  if (lossCp >= MISTAKE_THRESHOLD_CP) {
    return MOVE_SEVERITY_MISTAKE;
  }

  return MOVE_SEVERITY_INACCURACY;
}

export function getMoveSeverityColor(severity) {
  return MOVE_SEVERITY_COLORS[severity] ?? null;
}

export function getMoveSeveritySymbol(severity) {
  return MOVE_SEVERITY_SYMBOLS[severity] ?? null;
}

export function getGameAnalysisIssueDescription(issue) {
  const label = MOVE_SEVERITY_LABELS[issue?.severity];

  if (!label) {
    return "";
  }

  const parts = [label];

  if (Number.isFinite(issue.lossCp)) {
    parts.push(`${Math.round(issue.lossCp)} cp loss`);
  }

  parts.push(`evaluation ${getEvaluationDisplayValue(issue.evaluation)}`);
  return parts.join(", ");
}

export function addGameAnalysisToMoveHistoryEntries(
  moveHistoryEntries,
  positions,
) {
  if (!Array.isArray(moveHistoryEntries)) {
    return [];
  }

  const issuesByNodeId = new Map(
    (Array.isArray(positions) ? positions : [])
      .filter(
        (position) =>
          typeof position?.nodeId === "string" &&
          getMoveSeveritySymbol(position.severity),
      )
      .map((position) => [position.nodeId, position]),
  );

  return moveHistoryEntries.map((moveEntry) => {
    const position = issuesByNodeId.get(moveEntry?.nodeId);

    if (!position || position.fen !== moveEntry?.fen) {
      return moveEntry;
    }

    return {
      ...moveEntry,
      gameAnalysisIssue: {
        severity: position.severity,
        lossCp: Number.isFinite(position.lossCp) ? position.lossCp : null,
        evaluation: normalizeEvaluation(position.evaluation),
      },
    };
  });
}

export function buildGameAnalysisIssueArrow(position, mainlineEntry) {
  const color = getMoveSeverityColor(position?.severity);
  const move = mainlineEntry?.move;

  if (
    !color ||
    position?.nodeId !== mainlineEntry?.nodeId ||
    position?.fen !== mainlineEntry?.fen ||
    typeof move?.from !== "string" ||
    typeof move?.to !== "string" ||
    !BOARD_SQUARE_PATTERN.test(move.from) ||
    !BOARD_SQUARE_PATTERN.test(move.to) ||
    move.from === move.to
  ) {
    return null;
  }

  return {
    startSquare: move.from,
    endSquare: move.to,
    color,
  };
}

function getTurnFromFen(fen) {
  return typeof fen === "string" && fen.split(/\s+/)[1] === "b" ? "b" : "w";
}

export function createMainlineSignature(mainlineEntries) {
  if (!Array.isArray(mainlineEntries)) {
    return "";
  }

  return JSON.stringify(
    mainlineEntries.map((entry) => [entry?.nodeId ?? "", entry?.fen ?? ""]),
  );
}

export function buildGameAnalysisRequest(mainlineEntries, depth) {
  const entries = Array.isArray(mainlineEntries) ? mainlineEntries : [];

  return {
    initialFen: entries[0]?.fen ?? "",
    moves: entries
      .slice(1)
      .map((entry) => entry?.move)
      .filter(Boolean)
      .map((move) => ({ ...move })),
    depth,
  };
}

export function appendGameAnalysisPosition(positions, event, mainlineEntries) {
  const entry = mainlineEntries?.[event?.index];

  if (!entry || event?.fen !== entry.fen) {
    throw new Error(
      "Engine returned a position that does not match the main line.",
    );
  }

  const rawEvaluation = normalizeEvaluation(event.evaluation);
  const evaluation = rawEvaluation
    ? normalizeEvaluationForWhite(rawEvaluation, getTurnFromFen(entry.fen))
    : null;
  const scoreCp = getComparableEvaluationCp(evaluation);
  const previousScoreCp = positions.at(-1)?.scoreCp;
  let lossCp = null;

  if (
    entry.side &&
    Number.isFinite(scoreCp) &&
    Number.isFinite(previousScoreCp)
  ) {
    const rawLoss =
      entry.side === "white"
        ? previousScoreCp - scoreCp
        : scoreCp - previousScoreCp;
    lossCp = Math.max(0, rawLoss);
  }

  return [
    ...positions,
    {
      nodeId: entry.nodeId,
      fen: entry.fen,
      ply: entry.ply,
      moveNumber: entry.moveNumber,
      side: entry.side,
      san: entry.san,
      evaluation,
      bestMove: normalizeGameAnalysisBestMove(event.bestmove),
      scoreCp,
      lossCp,
      severity: classifyMoveLoss(lossCp),
    },
  ];
}

export function createCompletedGameAnalysis({
  depth,
  positions,
  mainlineEntries,
  completedAt = new Date().toISOString(),
}) {
  return {
    version: GAME_ANALYSIS_VERSION,
    status: GAME_ANALYSIS_STATUS_COMPLETE,
    depth,
    completedAt,
    total: mainlineEntries.length,
    mainlineSignature: createMainlineSignature(mainlineEntries),
    positions,
  };
}

export function normalizePersistedGameAnalysis(value) {
  if (
    !value ||
    typeof value !== "object" ||
    value.version !== GAME_ANALYSIS_VERSION ||
    value.status !== GAME_ANALYSIS_STATUS_COMPLETE ||
    !Number.isInteger(value.depth) ||
    value.depth < 1 ||
    value.depth > 30 ||
    typeof value.completedAt !== "string" ||
    typeof value.mainlineSignature !== "string" ||
    !Array.isArray(value.positions)
  ) {
    return null;
  }

  const positions = [];

  for (const rawPosition of value.positions) {
    if (
      !rawPosition ||
      typeof rawPosition !== "object" ||
      typeof rawPosition.nodeId !== "string" ||
      typeof rawPosition.fen !== "string" ||
      !Number.isInteger(rawPosition.ply)
    ) {
      return null;
    }

    const evaluation = normalizeEvaluation(rawPosition.evaluation);
    const scoreCp = getComparableEvaluationCp(evaluation);
    const previousScoreCp = positions.at(-1)?.scoreCp;
    const side =
      rawPosition.side === "white" || rawPosition.side === "black"
        ? rawPosition.side
        : null;
    let lossCp = null;

    if (side && Number.isFinite(scoreCp) && Number.isFinite(previousScoreCp)) {
      const rawLoss =
        side === "white"
          ? previousScoreCp - scoreCp
          : scoreCp - previousScoreCp;
      lossCp = Math.max(0, rawLoss);
    }

    positions.push({
      nodeId: rawPosition.nodeId,
      fen: rawPosition.fen,
      ply: rawPosition.ply,
      moveNumber:
        Number.isInteger(rawPosition.moveNumber) && rawPosition.moveNumber >= 0
          ? rawPosition.moveNumber
          : 0,
      side,
      san: typeof rawPosition.san === "string" ? rawPosition.san : null,
      evaluation,
      bestMove: normalizeGameAnalysisBestMove(rawPosition.bestMove),
      scoreCp,
      lossCp,
      severity: classifyMoveLoss(lossCp),
    });
  }

  if (positions.length !== value.total || positions.length === 0) {
    return null;
  }

  return {
    version: GAME_ANALYSIS_VERSION,
    status: GAME_ANALYSIS_STATUS_COMPLETE,
    depth: value.depth,
    completedAt: value.completedAt,
    total: positions.length,
    mainlineSignature: value.mainlineSignature,
    positions,
  };
}

export function isGameAnalysisCurrent(analysis, mainlineEntries) {
  return (
    !!analysis &&
    analysis.mainlineSignature === createMainlineSignature(mainlineEntries)
  );
}

export function getIssueThreshold(filter) {
  if (filter === ISSUE_FILTER_BLUNDERS) {
    return BLUNDER_THRESHOLD_CP;
  }

  if (filter === ISSUE_FILTER_MISTAKES) {
    return MISTAKE_THRESHOLD_CP;
  }

  return INACCURACY_THRESHOLD_CP;
}

export function findAdjacentIssue(
  positions,
  currentPly,
  filter,
  direction,
  side = ISSUE_SIDE_BOTH,
) {
  const threshold = getIssueThreshold(filter);
  const issues = (Array.isArray(positions) ? positions : []).filter(
    (position) =>
      Number.isFinite(position.lossCp) &&
      position.lossCp >= threshold &&
      (side === ISSUE_SIDE_BOTH || position.side === side),
  );

  if (direction < 0) {
    return (
      [...issues].reverse().find((position) => position.ply < currentPly) ??
      null
    );
  }

  return issues.find((position) => position.ply > currentPly) ?? null;
}

export function normalizeGameAnalysisScale(value) {
  if (value === GAME_ANALYSIS_SCALE_AUTO) {
    return GAME_ANALYSIS_SCALE_AUTO;
  }

  const parsedValue = Number(value);

  return GAME_ANALYSIS_FIXED_SCALE_MAX_CP.includes(parsedValue)
    ? parsedValue
    : GAME_ANALYSIS_SCALE_AUTO;
}

export function getGameAnalysisScaleMaxCp(
  positions,
  scale = GAME_ANALYSIS_SCALE_AUTO,
) {
  const normalizedScale = normalizeGameAnalysisScale(scale);

  if (normalizedScale !== GAME_ANALYSIS_SCALE_AUTO) {
    return normalizedScale;
  }

  const maxAbsoluteCp = (Array.isArray(positions) ? positions : []).reduce(
    (currentMax, position) => {
      if (
        position?.evaluation?.type !== "cp" ||
        !Number.isFinite(position.scoreCp)
      ) {
        return currentMax;
      }

      return Math.max(currentMax, Math.abs(position.scoreCp));
    },
    0,
  );
  const maxPawns = Math.max(1, maxAbsoluteCp / 100);
  const magnitude = 10 ** Math.floor(Math.log10(maxPawns));
  const normalizedMax = maxPawns / magnitude;
  const niceMultiplier =
    normalizedMax <= 1
      ? 1
      : normalizedMax <= 2
        ? 2
        : normalizedMax <= 5
          ? 5
          : 10;

  return niceMultiplier * magnitude * 100;
}
