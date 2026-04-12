import { Chess, DEFAULT_POSITION } from "chess.js";
import { parseAnnotatedPgn } from "./annotatedPgn.js";
import { goToStartInVariantTree } from "./variantTree.js";

export const TRAINING_MODE_OFF = "off";
export const TRAINING_MODE_REPLAY_GAME = "replay-game";

export const TRAINING_STATUS_IDLE = "idle";
export const TRAINING_STATUS_ACTIVE = "active";
export const TRAINING_STATUS_COMPLETED = "completed";
export const TRAINING_SIDE_WHITE = "white";
export const TRAINING_SIDE_BLACK = "black";
export const TRAINING_COMPLETION_MATCH = "match";
export const TRAINING_COMPLETION_REVEALED = "revealed";

export const REPLAY_RESULT_MATCH = "match";
export const REPLAY_RESULT_BETTER = "better";
export const REPLAY_RESULT_EQUAL = "equal";
export const REPLAY_RESULT_WORSE = "worse";

export const REPLAY_EQUAL_THRESHOLD_CP = 30;
export const REPLAY_CRITICAL_THRESHOLD_CP = 150;

function normalizeMove(move) {
  if (
    !move ||
    typeof move !== "object" ||
    typeof move.from !== "string" ||
    typeof move.to !== "string"
  ) {
    return null;
  }

  return {
    from: move.from,
    to: move.to,
    ...(typeof move.promotion === "string" && move.promotion
      ? { promotion: move.promotion.toLowerCase() }
      : {}),
  };
}

function normalizeEvaluation(evaluation) {
  if (!evaluation || typeof evaluation !== "object") {
    return null;
  }

  if (
    (evaluation.type === "cp" || evaluation.type === "mate") &&
    typeof evaluation.value === "number"
  ) {
    return {
      type: evaluation.type,
      value: evaluation.value,
    };
  }

  return null;
}

function normalizeReferenceMove(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const move = normalizeMove(entry.move);

  if (
    !move ||
    typeof entry.fenBefore !== "string" ||
    !entry.fenBefore.trim() ||
    typeof entry.fenAfter !== "string" ||
    !entry.fenAfter.trim() ||
    typeof entry.san !== "string" ||
    !entry.san.trim()
  ) {
    return null;
  }

  return {
    ply: Number.isInteger(entry.ply) && entry.ply > 0 ? entry.ply : null,
    moveNumber:
      Number.isInteger(entry.moveNumber) && entry.moveNumber > 0 ? entry.moveNumber : null,
    side: entry.side === "white" || entry.side === "black" ? entry.side : null,
    san: entry.san.trim(),
    move,
    fenBefore: entry.fenBefore,
    fenAfter: entry.fenAfter,
  };
}

function normalizeAttempt(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const expectedMove = normalizeMove(entry.expectedMove);
  const userMove = normalizeMove(entry.userMove);

  if (
    !expectedMove ||
    !userMove ||
    typeof entry.expectedSan !== "string" ||
    !entry.expectedSan.trim() ||
    typeof entry.userSan !== "string" ||
    !entry.userSan.trim()
  ) {
    return null;
  }

  const outcome =
    entry.outcome === REPLAY_RESULT_MATCH ? REPLAY_RESULT_MATCH : "mismatch";
  const classification =
    entry.classification === REPLAY_RESULT_BETTER ||
    entry.classification === REPLAY_RESULT_EQUAL ||
    entry.classification === REPLAY_RESULT_WORSE
      ? entry.classification
      : null;

  return {
    ply: Number.isInteger(entry.ply) && entry.ply > 0 ? entry.ply : null,
    moveNumber:
      Number.isInteger(entry.moveNumber) && entry.moveNumber > 0 ? entry.moveNumber : null,
    side: entry.side === "white" || entry.side === "black" ? entry.side : null,
    expectedSan: entry.expectedSan.trim(),
    userSan: entry.userSan.trim(),
    expectedMove,
    userMove,
    outcome,
    classification: outcome === REPLAY_RESULT_MATCH ? null : classification,
    deltaCp: Number.isFinite(entry.deltaCp) ? entry.deltaCp : null,
    isCritical: entry.isCritical === true,
    referenceEvaluation: normalizeEvaluation(entry.referenceEvaluation),
    userEvaluation: normalizeEvaluation(entry.userEvaluation),
  };
}

function getComparableScore(evaluation) {
  const normalizedEvaluation = normalizeEvaluation(evaluation);

  if (!normalizedEvaluation) {
    return null;
  }

  if (normalizedEvaluation.type === "cp") {
    return normalizedEvaluation.value;
  }

  if (normalizedEvaluation.type === "mate") {
    const distance = Math.max(0, Math.abs(normalizedEvaluation.value));
    const baseScore = 100000 - distance;
    return normalizedEvaluation.value >= 0 ? baseScore : -baseScore;
  }

  return null;
}

export function classifyReplayDelta(deltaCp) {
  if (!Number.isFinite(deltaCp)) {
    return null;
  }

  if (Math.abs(deltaCp) <= REPLAY_EQUAL_THRESHOLD_CP) {
    return REPLAY_RESULT_EQUAL;
  }

  return deltaCp > 0 ? REPLAY_RESULT_BETTER : REPLAY_RESULT_WORSE;
}

export function isCriticalReplayDelta(deltaCp) {
  return Number.isFinite(deltaCp) && deltaCp <= -REPLAY_CRITICAL_THRESHOLD_CP;
}

export function createEmptyTrainingState(playerSide = TRAINING_SIDE_WHITE) {
  return {
    mode: TRAINING_MODE_OFF,
    status: TRAINING_STATUS_IDLE,
    playerSide:
      playerSide === TRAINING_SIDE_BLACK ? TRAINING_SIDE_BLACK : TRAINING_SIDE_WHITE,
    progressPly: 0,
    referenceMoves: [],
    attempts: [],
    pendingAttempts: [],
    lastCompletedAttempts: [],
    lastCompletedExpectedMove: null,
    lastCompletionMode: null,
  };
}

export function normalizeTrainingState(trainingState) {
  if (!trainingState || typeof trainingState !== "object") {
    return createEmptyTrainingState();
  }

  const mode =
    trainingState.mode === TRAINING_MODE_REPLAY_GAME
      ? TRAINING_MODE_REPLAY_GAME
      : TRAINING_MODE_OFF;
  const playerSide =
    trainingState.playerSide === TRAINING_SIDE_BLACK
      ? TRAINING_SIDE_BLACK
      : TRAINING_SIDE_WHITE;
  const status =
    trainingState.status === TRAINING_STATUS_ACTIVE ||
    trainingState.status === TRAINING_STATUS_COMPLETED
      ? trainingState.status
      : TRAINING_STATUS_IDLE;
  const referenceMoves = Array.isArray(trainingState.referenceMoves)
    ? trainingState.referenceMoves.map(normalizeReferenceMove).filter(Boolean)
    : [];
  const attempts = Array.isArray(trainingState.attempts)
    ? trainingState.attempts.map(normalizeAttempt).filter(Boolean)
    : [];
  const pendingAttempts = Array.isArray(trainingState.pendingAttempts)
    ? trainingState.pendingAttempts.map(normalizeAttempt).filter(Boolean)
    : [];
  const lastCompletedAttempts = Array.isArray(trainingState.lastCompletedAttempts)
    ? trainingState.lastCompletedAttempts.map(normalizeAttempt).filter(Boolean)
    : [];
  const boundedProgress = Number.isInteger(trainingState.progressPly)
    ? trainingState.progressPly
    : 0;
  const lastCompletedExpectedMove = normalizeReferenceMove(
    trainingState.lastCompletedExpectedMove,
  );
  const lastCompletionMode =
    trainingState.lastCompletionMode === TRAINING_COMPLETION_MATCH ||
    trainingState.lastCompletionMode === TRAINING_COMPLETION_REVEALED
      ? trainingState.lastCompletionMode
      : null;

  return {
    mode,
    playerSide,
    status:
      mode === TRAINING_MODE_OFF
        ? TRAINING_STATUS_IDLE
        : status === TRAINING_STATUS_COMPLETED && boundedProgress < referenceMoves.length
          ? TRAINING_STATUS_ACTIVE
          : status,
    progressPly: Math.max(0, Math.min(boundedProgress, referenceMoves.length)),
    referenceMoves,
    attempts,
    pendingAttempts,
    lastCompletedAttempts,
    lastCompletedExpectedMove,
    lastCompletionMode,
  };
}

export function getReplayReferenceMoves(rawPgn) {
  const { game, variantTree, error } = parseAnnotatedPgn(rawPgn, { allowEmpty: false });

  if (error || !game || !variantTree) {
    return {
      initialFen: null,
      variantTree: null,
      referenceMoves: [],
      error: error ?? "Unable to load the replay game.",
    };
  }

  const initialFen = variantTree.initialFen ?? DEFAULT_POSITION;
  const replay = new Chess(initialFen);
  const referenceMoves = game.history({ verbose: true }).map((move, index) => {
    const fenBefore = replay.fen();
    replay.move(move);

    return {
      ply: index + 1,
      moveNumber: Math.floor(index / 2) + 1,
      side: index % 2 === 0 ? "white" : "black",
      san: move.san,
      move: normalizeMove(move),
      fenBefore,
      fenAfter: replay.fen(),
    };
  });

  return {
    initialFen,
    variantTree: goToStartInVariantTree(variantTree),
    referenceMoves,
    error: referenceMoves.length
      ? null
      : "Imported game has no main-line moves to replay.",
  };
}

export function createReplayTrainingState(rawPgn, playerSide = TRAINING_SIDE_WHITE) {
  const { initialFen, variantTree, referenceMoves, error } = getReplayReferenceMoves(rawPgn);

  if (error || !variantTree) {
    return {
      trainingState: createEmptyTrainingState(playerSide),
      variantTree: null,
      initialFen,
      error: error ?? "Unable to start replay training.",
    };
  }

  return {
    trainingState: normalizeTrainingState({
      mode: TRAINING_MODE_REPLAY_GAME,
      status: referenceMoves.length ? TRAINING_STATUS_ACTIVE : TRAINING_STATUS_COMPLETED,
      playerSide,
      progressPly: 0,
      referenceMoves,
      attempts: [],
      pendingAttempts: [],
      lastCompletedAttempts: [],
      lastCompletedExpectedMove: null,
      lastCompletionMode: null,
    }),
    variantTree,
    initialFen,
    error: null,
  };
}

export function getCurrentReplayMove(trainingState) {
  const normalizedState = normalizeTrainingState(trainingState);

  if (
    normalizedState.mode !== TRAINING_MODE_REPLAY_GAME ||
    normalizedState.status !== TRAINING_STATUS_ACTIVE
  ) {
    return null;
  }

  return normalizedState.referenceMoves[normalizedState.progressPly] ?? null;
}

export function buildReplayAttempt({
  expectedMove,
  userMove,
  userSan,
  referenceEvaluation = null,
  userEvaluation = null,
}) {
  const normalizedExpectedMove = normalizeReferenceMove(expectedMove);
  const normalizedUserMove = normalizeMove(userMove);

  if (!normalizedExpectedMove || !normalizedUserMove || typeof userSan !== "string") {
    return null;
  }

  const moveMatches =
    normalizedExpectedMove.move.from === normalizedUserMove.from &&
    normalizedExpectedMove.move.to === normalizedUserMove.to &&
    normalizedExpectedMove.move.promotion === normalizedUserMove.promotion;

  if (moveMatches) {
    return normalizeAttempt({
      ply: normalizedExpectedMove.ply,
      moveNumber: normalizedExpectedMove.moveNumber,
      side: normalizedExpectedMove.side,
      expectedSan: normalizedExpectedMove.san,
      userSan,
      expectedMove: normalizedExpectedMove.move,
      userMove: normalizedUserMove,
      outcome: REPLAY_RESULT_MATCH,
      classification: null,
      deltaCp: null,
      isCritical: false,
      referenceEvaluation: null,
      userEvaluation: null,
    });
  }

  const referenceScore = getComparableScore(referenceEvaluation);
  const userScore = getComparableScore(userEvaluation);
  const deltaCp =
    Number.isFinite(referenceScore) && Number.isFinite(userScore)
      ? userScore - referenceScore
      : null;
  const classification = classifyReplayDelta(deltaCp);

  return normalizeAttempt({
    ply: normalizedExpectedMove.ply,
    moveNumber: normalizedExpectedMove.moveNumber,
    side: normalizedExpectedMove.side,
    expectedSan: normalizedExpectedMove.san,
    userSan,
    expectedMove: normalizedExpectedMove.move,
    userMove: normalizedUserMove,
    outcome: "mismatch",
    classification,
    deltaCp,
    isCritical: isCriticalReplayDelta(deltaCp),
    referenceEvaluation,
    userEvaluation,
  });
}

export function summarizeReplayAttempts(
  referenceMoves,
  attempts,
  playerSide = TRAINING_SIDE_WHITE,
) {
  const normalizedReferenceMoves = Array.isArray(referenceMoves)
    ? referenceMoves.map(normalizeReferenceMove).filter(Boolean)
    : [];
  const normalizedAttempts = Array.isArray(attempts)
    ? attempts.map(normalizeAttempt).filter(Boolean)
    : [];
  const targetMoveCount = normalizedReferenceMoves.filter(
    (move) => move.side === playerSide,
  ).length;
  const criticalMistakes = normalizedAttempts.filter((attempt) => attempt.isCritical);

  return {
    totalMoves: targetMoveCount,
    attemptedMoves: normalizedAttempts.length,
    matchedMoves: normalizedAttempts.filter(
      (attempt) => attempt.outcome === REPLAY_RESULT_MATCH,
    ).length,
    betterMoves: normalizedAttempts.filter(
      (attempt) => attempt.classification === REPLAY_RESULT_BETTER,
    ).length,
    equalMoves: normalizedAttempts.filter(
      (attempt) => attempt.classification === REPLAY_RESULT_EQUAL,
    ).length,
    worseMoves: normalizedAttempts.filter(
      (attempt) => attempt.classification === REPLAY_RESULT_WORSE,
    ).length,
    criticalMistakes,
  };
}
