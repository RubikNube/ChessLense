import { Chess } from "chess.js";
import {
  getIssueThreshold,
  normalizeGameAnalysisBestMove,
} from "./gameAnalysis.js";
import {
  buildReplayAttempt,
  getGuessAttemptArrowColor,
  REPLAY_RESULT_BETTER,
  REPLAY_RESULT_EQUAL,
  REPLAY_RESULT_MATCH,
  REPLAY_RESULT_WORSE,
} from "./training.js";

export const GAME_ANALYSIS_RETRY_FEEDBACK_BEST = "best";
export const GAME_ANALYSIS_RETRY_FEEDBACK_GOOD = "good";
export const GAME_ANALYSIS_RETRY_FEEDBACK_BAD = "bad";
export const GAME_ANALYSIS_RETRY_STATUS_PREPARING = "preparing";
export const GAME_ANALYSIS_RETRY_STATUS_READY = "ready";
export const GAME_ANALYSIS_RETRY_STATUS_EVALUATING = "evaluating";
export const GAME_ANALYSIS_RETRY_STATUS_FEEDBACK = "feedback";

function parseUciMove(uciMove) {
  const normalizedMove = normalizeGameAnalysisBestMove(uciMove);

  if (!normalizedMove) {
    return null;
  }

  return {
    from: normalizedMove.slice(0, 2),
    to: normalizedMove.slice(2, 4),
    ...(normalizedMove.length === 5
      ? { promotion: normalizedMove.slice(4) }
      : {}),
  };
}

function movesMatch(left, right) {
  return (
    left?.from === right?.from &&
    left?.to === right?.to &&
    (left?.promotion ?? null) === (right?.promotion ?? null)
  );
}

export function setGameAnalysisRetryBestMove(target, rawBestMove) {
  const bestMove = parseUciMove(rawBestMove);

  if (!target?.sourceFen || !bestMove) {
    return null;
  }

  try {
    const game = new Chess(target.sourceFen);
    const appliedMove = game.move(bestMove);

    if (!appliedMove) {
      return null;
    }

    return {
      ...target,
      bestMove,
      bestMoveUci: normalizeGameAnalysisBestMove(rawBestMove),
      bestMoveSan: appliedMove.san,
      bestMoveFen: game.fen(),
    };
  } catch {
    return null;
  }
}

export function getGameAnalysisRetryTarget(
  positions,
  mainlineEntries,
  issueNodeId,
) {
  if (!Array.isArray(positions) || !Array.isArray(mainlineEntries)) {
    return null;
  }

  const issueIndex = positions.findIndex(
    (position) => position?.nodeId === issueNodeId && position?.severity,
  );

  if (issueIndex <= 0) {
    return null;
  }

  const issuePosition = positions[issueIndex];
  const sourcePosition = positions[issueIndex - 1];
  const issueEntry = mainlineEntries[issueIndex];
  const sourceEntry = mainlineEntries[issueIndex - 1];

  if (
    issuePosition?.nodeId !== issueEntry?.nodeId ||
    issuePosition?.fen !== issueEntry?.fen ||
    sourcePosition?.nodeId !== sourceEntry?.nodeId ||
    sourcePosition?.fen !== sourceEntry?.fen ||
    !issueEntry?.move
  ) {
    return null;
  }

  const target = {
    issueNodeId: issuePosition.nodeId,
    issueFen: issuePosition.fen,
    issuePly: issuePosition.ply,
    issueSan: issuePosition.san,
    issueSide: issuePosition.side,
    severity: issuePosition.severity,
    sourceNodeId: sourcePosition.nodeId,
    sourceFen: sourcePosition.fen,
    originalMove: { ...issueEntry.move },
    bestMove: null,
    bestMoveUci: null,
    bestMoveSan: null,
    bestMoveFen: null,
  };

  return sourcePosition.bestMove
    ? setGameAnalysisRetryBestMove(target, sourcePosition.bestMove)
    : target;
}

export function getNextGameAnalysisRetryTarget(
  positions,
  mainlineEntries,
  currentIssuePly,
  issueFilter,
) {
  const threshold = getIssueThreshold(issueFilter);
  const nextIssue = positions?.find(
    (position) =>
      position?.ply > currentIssuePly &&
      Number.isFinite(position.lossCp) &&
      position.lossCp >= threshold,
  );

  return nextIssue
    ? getGameAnalysisRetryTarget(positions, mainlineEntries, nextIssue.nodeId)
    : null;
}

export function buildGameAnalysisRetryAttempt({
  target,
  userMove,
  userSan,
  comparison = null,
}) {
  if (!target?.bestMove || !target.bestMoveSan || !target.bestMoveFen) {
    return null;
  }

  return buildReplayAttempt({
    expectedMove: {
      ply: target.issuePly,
      moveNumber: Math.ceil(target.issuePly / 2),
      side: target.issueSide,
      san: target.bestMoveSan,
      move: target.bestMove,
      fenBefore: target.sourceFen,
      fenAfter: target.bestMoveFen,
    },
    userMove,
    userSan,
    referenceEvaluation: comparison?.referenceEvaluation ?? null,
    userEvaluation: comparison?.userEvaluation ?? null,
  });
}

export function getGameAnalysisRetryFeedback(attempt) {
  if (attempt?.outcome === REPLAY_RESULT_MATCH) {
    return GAME_ANALYSIS_RETRY_FEEDBACK_BEST;
  }

  if (
    attempt?.classification === REPLAY_RESULT_EQUAL ||
    attempt?.classification === REPLAY_RESULT_BETTER
  ) {
    return GAME_ANALYSIS_RETRY_FEEDBACK_GOOD;
  }

  if (attempt?.classification === REPLAY_RESULT_WORSE) {
    return GAME_ANALYSIS_RETRY_FEEDBACK_BAD;
  }

  return null;
}

export function buildGameAnalysisRetryArrows(target, attempt) {
  if (!target?.bestMove || !attempt?.userMove) {
    return [];
  }

  const feedback = getGameAnalysisRetryFeedback(attempt);
  const arrows = [
    {
      startSquare: target.bestMove.from,
      endSquare: target.bestMove.to,
      color: "#2563eb",
    },
  ];

  if (!movesMatch(target.bestMove, attempt.userMove)) {
    arrows.push({
      startSquare: attempt.userMove.from,
      endSquare: attempt.userMove.to,
      color:
        feedback === GAME_ANALYSIS_RETRY_FEEDBACK_GOOD
          ? "#4caf50"
          : getGuessAttemptArrowColor(attempt),
    });
  }

  return arrows;
}
