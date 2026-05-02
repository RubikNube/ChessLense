import { Chess, DEFAULT_POSITION } from "chess.js";
import { parseAnnotatedPgn } from "./annotatedPgn.js";
import { normalizeVariantTree } from "./variantTree.js";
import { goToStartInVariantTree } from "./variantTree.js";

export const TRAINING_MODE_OFF = "off";
export const TRAINING_MODE_REPLAY_GAME = "replay-game";
export const TRAINING_MODE_GUESS_THE_MOVE = "guess-the-move";
export const TRAINING_MODE_PLAY_COMPUTER = "play-computer";

export const TRAINING_STATUS_IDLE = "idle";
export const TRAINING_STATUS_ACTIVE = "active";
export const TRAINING_STATUS_COMPLETED = "completed";
export const TRAINING_STATUS_ENDED = "ended";
export const TRAINING_SIDE_WHITE = "white";
export const TRAINING_SIDE_BLACK = "black";
export const TRAINING_COMPLETION_MATCH = "match";
export const TRAINING_COMPLETION_REVEALED = "revealed";
export const TRAINING_PLAY_STATUS_ACTIVE = "active";
export const TRAINING_COMPUTER_PLAY_SOURCE_CURRENT = "current-position";
export const TRAINING_COMPUTER_PLAY_SOURCE_INITIAL = "initial-position";

export const REPLAY_RESULT_MATCH = "match";
export const REPLAY_RESULT_BETTER = "better";
export const REPLAY_RESULT_EQUAL = "equal";
export const REPLAY_RESULT_WORSE = "worse";

export const REPLAY_EQUAL_THRESHOLD_CP = 30;
export const REPLAY_CRITICAL_THRESHOLD_CP = 150;

export const GUESS_THE_MOVE_POINTS_MATCH = 3;
export const GUESS_THE_MOVE_POINTS_BETTER = 4;
export const GUESS_THE_MOVE_POINTS_EQUAL = 3;
export const GUESS_THE_MOVE_POINTS_WORSE = -1;
export const GUESS_THE_MOVE_POINTS_CRITICAL_WORSE = -3;

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

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
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

function normalizeFen(value) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  try {
    new Chess(normalized);
    return normalized;
  } catch {
    return null;
  }
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
    resultingFen: normalizeFen(entry.resultingFen),
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
    computerPlay: null,
    playSession: null,
  };
}

function normalizeComputerPlay(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const startFrom =
    entry.startFrom === TRAINING_COMPUTER_PLAY_SOURCE_INITIAL
      ? TRAINING_COMPUTER_PLAY_SOURCE_INITIAL
      : entry.startFrom === TRAINING_COMPUTER_PLAY_SOURCE_CURRENT
        ? TRAINING_COMPUTER_PLAY_SOURCE_CURRENT
        : null;
  const startVariantTree =
    entry.startVariantTree && typeof entry.startVariantTree === "object"
      ? normalizeVariantTree(entry.startVariantTree)
      : null;

  if (!startFrom || !startVariantTree) {
    return null;
  }

  return {
    startFrom,
    startVariantTree,
  };
}

function normalizeTrainingCheckpoint(entry, playerSide = TRAINING_SIDE_WHITE) {
  const fallbackState = createEmptyTrainingState(playerSide);

  if (!entry || typeof entry !== "object") {
    return {
      mode: fallbackState.mode,
      status: fallbackState.status,
      playerSide: fallbackState.playerSide,
      progressPly: fallbackState.progressPly,
      referenceMoves: fallbackState.referenceMoves,
      attempts: fallbackState.attempts,
      pendingAttempts: fallbackState.pendingAttempts,
      lastCompletedAttempts: fallbackState.lastCompletedAttempts,
      lastCompletedExpectedMove: fallbackState.lastCompletedExpectedMove,
      lastCompletionMode: fallbackState.lastCompletionMode,
      computerPlay: fallbackState.computerPlay,
    };
  }

  const mode =
    entry.mode === TRAINING_MODE_REPLAY_GAME
      ? TRAINING_MODE_REPLAY_GAME
      : entry.mode === TRAINING_MODE_GUESS_THE_MOVE
        ? TRAINING_MODE_GUESS_THE_MOVE
      : entry.mode === TRAINING_MODE_PLAY_COMPUTER
        ? TRAINING_MODE_PLAY_COMPUTER
        : TRAINING_MODE_OFF;
  const normalizedPlayerSide =
    entry.playerSide === TRAINING_SIDE_BLACK ? TRAINING_SIDE_BLACK : TRAINING_SIDE_WHITE;
  const status =
    entry.status === TRAINING_STATUS_ACTIVE ||
    entry.status === TRAINING_STATUS_COMPLETED ||
    entry.status === TRAINING_STATUS_ENDED
      ? entry.status
      : TRAINING_STATUS_IDLE;
  const referenceMoves = Array.isArray(entry.referenceMoves)
    ? entry.referenceMoves.map(normalizeReferenceMove).filter(Boolean)
    : [];
  const attempts = Array.isArray(entry.attempts)
    ? entry.attempts.map(normalizeAttempt).filter(Boolean)
    : [];
  const pendingAttempts = Array.isArray(entry.pendingAttempts)
    ? entry.pendingAttempts.map(normalizeAttempt).filter(Boolean)
    : [];
  const lastCompletedAttempts = Array.isArray(entry.lastCompletedAttempts)
    ? entry.lastCompletedAttempts.map(normalizeAttempt).filter(Boolean)
    : [];
  const boundedProgress = Number.isInteger(entry.progressPly) ? entry.progressPly : 0;
  const lastCompletedExpectedMove = normalizeReferenceMove(entry.lastCompletedExpectedMove);
  const lastCompletionMode =
    entry.lastCompletionMode === TRAINING_COMPLETION_MATCH ||
    entry.lastCompletionMode === TRAINING_COMPLETION_REVEALED
      ? entry.lastCompletionMode
      : null;
  const computerPlay = normalizeComputerPlay(entry.computerPlay);
  const normalizedMode =
    mode === TRAINING_MODE_PLAY_COMPUTER && !computerPlay ? TRAINING_MODE_OFF : mode;
  const supportsReferenceTrainingState =
    normalizedMode === TRAINING_MODE_REPLAY_GAME ||
    normalizedMode === TRAINING_MODE_GUESS_THE_MOVE;
  const supportsComputerPlay =
    normalizedMode === TRAINING_MODE_PLAY_COMPUTER && computerPlay;

  return {
    mode: normalizedMode,
    playerSide: normalizedPlayerSide,
    status:
      normalizedMode === TRAINING_MODE_OFF
        ? TRAINING_STATUS_IDLE
        : status === TRAINING_STATUS_COMPLETED && boundedProgress < referenceMoves.length
          ? TRAINING_STATUS_ACTIVE
          : status,
    progressPly: supportsReferenceTrainingState
      ? Math.max(0, Math.min(boundedProgress, referenceMoves.length))
      : 0,
    referenceMoves: supportsReferenceTrainingState ? referenceMoves : [],
    attempts: supportsReferenceTrainingState ? attempts : [],
    pendingAttempts: supportsReferenceTrainingState ? pendingAttempts : [],
    lastCompletedAttempts: supportsReferenceTrainingState ? lastCompletedAttempts : [],
    lastCompletedExpectedMove: supportsReferenceTrainingState ? lastCompletedExpectedMove : null,
    lastCompletionMode: supportsReferenceTrainingState ? lastCompletionMode : null,
    computerPlay: supportsComputerPlay ? computerPlay : null,
  };
}

function normalizeTrainingPlaySession(entry, playerSide = TRAINING_SIDE_WHITE) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const status =
    entry.status === TRAINING_PLAY_STATUS_ACTIVE ? TRAINING_PLAY_STATUS_ACTIVE : null;
  const sourceAttempt = normalizeAttempt(entry.sourceAttempt);
  const startingFen = normalizeFen(entry.startingFen);
  const resumeTrainingState = normalizeTrainingCheckpoint(entry.resumeTrainingState, playerSide);
  const resumeVariantTree =
    entry.resumeVariantTree && typeof entry.resumeVariantTree === "object"
      ? normalizeVariantTree(entry.resumeVariantTree)
      : null;

  if (
    !status ||
    !sourceAttempt ||
    !startingFen ||
    !resumeVariantTree ||
    (resumeTrainingState.mode !== TRAINING_MODE_REPLAY_GAME &&
      resumeTrainingState.mode !== TRAINING_MODE_GUESS_THE_MOVE)
  ) {
    return null;
  }

  return {
    status,
    sourceAttempt,
    startingFen,
    resumeTrainingState,
    resumeVariantTree,
  };
}

export function normalizeTrainingState(trainingState) {
  const normalizedCheckpoint = normalizeTrainingCheckpoint(trainingState);

  return {
    ...normalizedCheckpoint,
    playSession: normalizeTrainingPlaySession(
      trainingState?.playSession,
      normalizedCheckpoint.playerSide,
    ),
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

function createReferenceTrainingState(
  mode,
  rawPgn,
  playerSide = TRAINING_SIDE_WHITE,
  errorMessage,
) {
  const { initialFen, variantTree, referenceMoves, error } = getReplayReferenceMoves(rawPgn);

  if (error || !variantTree) {
    return {
      trainingState: createEmptyTrainingState(playerSide),
      variantTree: null,
      initialFen,
      error: error ?? errorMessage,
    };
  }

  return {
    trainingState: normalizeTrainingState({
      mode,
      status: referenceMoves.length ? TRAINING_STATUS_ACTIVE : TRAINING_STATUS_COMPLETED,
      playerSide,
      progressPly: 0,
      referenceMoves,
      attempts: [],
      pendingAttempts: [],
      lastCompletedAttempts: [],
      lastCompletedExpectedMove: null,
      lastCompletionMode: null,
      computerPlay: null,
      playSession: null,
    }),
    variantTree,
    initialFen,
    error: null,
  };
}

export function createReplayTrainingState(rawPgn, playerSide = TRAINING_SIDE_WHITE) {
  return createReferenceTrainingState(
    TRAINING_MODE_REPLAY_GAME,
    rawPgn,
    playerSide,
    "Unable to start replay training.",
  );
}

export function createGuessTheMoveTrainingState(rawPgn, playerSide = TRAINING_SIDE_WHITE) {
  return createReferenceTrainingState(
    TRAINING_MODE_GUESS_THE_MOVE,
    rawPgn,
    playerSide,
    "Unable to start guess the move training.",
  );
}

export function createComputerPlayTrainingState(
  startVariantTree,
  playerSide = TRAINING_SIDE_WHITE,
  startFrom = TRAINING_COMPUTER_PLAY_SOURCE_CURRENT,
) {
  const normalizedStartVariantTree =
    startVariantTree && typeof startVariantTree === "object"
      ? normalizeVariantTree(startVariantTree)
      : null;
  const normalizedStartFrom =
    startFrom === TRAINING_COMPUTER_PLAY_SOURCE_INITIAL
      ? TRAINING_COMPUTER_PLAY_SOURCE_INITIAL
      : startFrom === TRAINING_COMPUTER_PLAY_SOURCE_CURRENT
        ? TRAINING_COMPUTER_PLAY_SOURCE_CURRENT
        : null;

  if (!normalizedStartVariantTree || !normalizedStartFrom) {
    return {
      trainingState: createEmptyTrainingState(playerSide),
      variantTree: null,
      error: "Unable to start computer play.",
    };
  }

  return {
    trainingState: normalizeTrainingState({
      mode: TRAINING_MODE_PLAY_COMPUTER,
      status: TRAINING_STATUS_ACTIVE,
      playerSide,
      progressPly: 0,
      referenceMoves: [],
      attempts: [],
      pendingAttempts: [],
      lastCompletedAttempts: [],
      lastCompletedExpectedMove: null,
      lastCompletionMode: null,
      computerPlay: {
        startFrom: normalizedStartFrom,
        startVariantTree: normalizedStartVariantTree,
      },
      playSession: null,
    }),
    variantTree: normalizedStartVariantTree,
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

export function getCurrentGuessTheMove(trainingState) {
  const normalizedState = normalizeTrainingState(trainingState);

  if (
    normalizedState.mode !== TRAINING_MODE_GUESS_THE_MOVE ||
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

  const previewGame = new Chess(normalizedExpectedMove.fenBefore);
  const appliedUserMove = previewGame.move(normalizedUserMove);

  if (!appliedUserMove) {
    return null;
  }

  const resultingFen = previewGame.fen();

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
      resultingFen,
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
    resultingFen,
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
  const playerReferenceMoves = normalizedReferenceMoves.filter(
    (move) => move.side === playerSide,
  );
  const targetMoveCount = playerReferenceMoves.length;
  const criticalMistakes = normalizedAttempts.filter((attempt) => attempt.isCritical);
  const attemptsByPly = normalizedAttempts.reduce((result, attempt) => {
    if (!Number.isInteger(attempt.ply)) {
      return result;
    }

    const nextAttempts = result.get(attempt.ply) ?? [];
    nextAttempts.push(attempt);
    result.set(attempt.ply, nextAttempts);
    return result;
  }, new Map());
  const moveHistory = playerReferenceMoves
    .map((move) => {
      const moveAttempts = attemptsByPly.get(move.ply) ?? [];

      if (!moveAttempts.length) {
        return null;
      }

      return {
        ply: move.ply,
        moveNumber: move.moveNumber,
        side: move.side,
        expectedSan: move.san,
        expectedResultingFen: move.fenAfter,
        attempts: moveAttempts.map((attempt, index) => ({
          index: index + 1,
          userSan: attempt.userSan,
          outcome: attempt.outcome,
          classification: attempt.classification,
          deltaCp: attempt.deltaCp,
          isCritical: attempt.isCritical,
          resultingFen: attempt.resultingFen,
        })),
      };
    })
    .filter(Boolean);

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
    moveHistory,
  };
}

export function getGuessTheMovePoints(attempt) {
  const normalizedAttempt = normalizeAttempt(attempt);

  if (!normalizedAttempt) {
    return 0;
  }

  if (normalizedAttempt.outcome === REPLAY_RESULT_MATCH) {
    return GUESS_THE_MOVE_POINTS_MATCH;
  }

  if (normalizedAttempt.classification === REPLAY_RESULT_BETTER) {
    return GUESS_THE_MOVE_POINTS_BETTER;
  }

  if (normalizedAttempt.classification === REPLAY_RESULT_EQUAL) {
    return GUESS_THE_MOVE_POINTS_EQUAL;
  }

  if (normalizedAttempt.classification === REPLAY_RESULT_WORSE) {
    return normalizedAttempt.isCritical
      ? GUESS_THE_MOVE_POINTS_CRITICAL_WORSE
      : GUESS_THE_MOVE_POINTS_WORSE;
  }

  return 0;
}

function getGuessTheMoveEvaluationLabel(scoreRatio) {
  if (!Number.isFinite(scoreRatio)) {
    return "No score yet";
  }

  if (scoreRatio >= 1) {
    return "Outstanding";
  }

  if (scoreRatio >= 0.85) {
    return "Strong";
  }

  if (scoreRatio >= 0.65) {
    return "Solid";
  }

  if (scoreRatio >= 0.4) {
    return "Mixed";
  }

  return "Needs work";
}

export function summarizeGuessTheMoveAttempts(
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
  const playerReferenceMoves = normalizedReferenceMoves.filter(
    (move) => move.side === playerSide,
  );
  const parScore = playerReferenceMoves.length * GUESS_THE_MOVE_POINTS_MATCH;
  const attemptedMoves = normalizedAttempts.length;
  const completedParScore = attemptedMoves * GUESS_THE_MOVE_POINTS_MATCH;
  const totalScore = normalizedAttempts.reduce(
    (score, attempt) => score + getGuessTheMovePoints(attempt),
    0,
  );
  const evaluationBaseScore = completedParScore || parScore || 0;
  const scoreRatio =
    evaluationBaseScore > 0 ? totalScore / evaluationBaseScore : null;
  const moveHistory = playerReferenceMoves
    .map((move) => {
      const attempt = normalizedAttempts.find((entry) => entry.ply === move.ply);

      if (!attempt) {
        return null;
      }

      return {
        ply: move.ply,
        moveNumber: move.moveNumber,
        side: move.side,
        expectedSan: move.san,
        expectedResultingFen: move.fenAfter,
        userSan: attempt.userSan,
        outcome: attempt.outcome,
        classification: attempt.classification,
        deltaCp: attempt.deltaCp,
        isCritical: attempt.isCritical,
        resultingFen: attempt.resultingFen,
        points: getGuessTheMovePoints(attempt),
        sourceAttempt: attempt,
      };
    })
    .filter(Boolean);

  return {
    totalMoves: playerReferenceMoves.length,
    attemptedMoves,
    remainingMoves: Math.max(0, playerReferenceMoves.length - attemptedMoves),
    parScore,
    completedParScore,
    totalScore,
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
      (attempt) => attempt.classification === REPLAY_RESULT_WORSE && !attempt.isCritical,
    ).length,
    criticalWorseMoves: normalizedAttempts.filter((attempt) => attempt.isCritical).length,
    moveHistory,
    evaluation: {
      label: getGuessTheMoveEvaluationLabel(scoreRatio),
      scoreRatio,
      basedOnCompletedMoves: completedParScore > 0,
    },
  };
}
