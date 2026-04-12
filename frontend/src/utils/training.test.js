import { describe, expect, it } from "vitest";
import {
  buildReplayAttempt,
  classifyReplayDelta,
  createEmptyTrainingState,
  createReplayTrainingState,
  getCurrentReplayMove,
  isCriticalReplayDelta,
  normalizeTrainingState,
  summarizeReplayAttempts,
  TRAINING_COMPLETION_REVEALED,
  TRAINING_SIDE_BLACK,
  TRAINING_SIDE_WHITE,
  TRAINING_MODE_REPLAY_GAME,
  TRAINING_MODE_OFF,
  TRAINING_STATUS_ACTIVE,
  TRAINING_STATUS_IDLE,
  REPLAY_RESULT_BETTER,
  REPLAY_RESULT_EQUAL,
  REPLAY_RESULT_MATCH,
  REPLAY_RESULT_WORSE,
} from "./training.js";

describe("training helpers", () => {
  it("creates an empty training state by default", () => {
    expect(createEmptyTrainingState()).toEqual({
      mode: TRAINING_MODE_OFF,
      status: TRAINING_STATUS_IDLE,
      playerSide: TRAINING_SIDE_WHITE,
      progressPly: 0,
      referenceMoves: [],
      attempts: [],
      pendingAttempts: [],
      lastCompletedAttempts: [],
      lastCompletedExpectedMove: null,
      lastCompletionMode: null,
    });
  });

  it("normalizes invalid persisted training state", () => {
    expect(
      normalizeTrainingState({
        mode: "weird",
        status: "broken",
        progressPly: 99,
        referenceMoves: [{ san: "" }],
        attempts: [{ expectedSan: "e4" }],
      }),
    ).toEqual(createEmptyTrainingState());
  });

  it("builds a replay session from the imported main line", () => {
    const { trainingState, variantTree, error } = createReplayTrainingState(
      "1. e4 e5 2. Nf3 Nc6",
    );

    expect(error).toBeNull();
    expect(variantTree.currentNodeId).toBe(variantTree.rootId);
    expect(trainingState).toEqual(
      expect.objectContaining({
        mode: TRAINING_MODE_REPLAY_GAME,
        status: TRAINING_STATUS_ACTIVE,
        playerSide: TRAINING_SIDE_WHITE,
        progressPly: 0,
      }),
    );
    expect(trainingState.referenceMoves.map((move) => move.san)).toEqual([
      "e4",
      "e5",
      "Nf3",
      "Nc6",
    ]);
    expect(trainingState.referenceMoves[0]).toEqual(
      expect.objectContaining({
        ply: 1,
        moveNumber: 1,
        side: "white",
        san: "e4",
      }),
    );
  });

  it("returns the current replay target move", () => {
    const trainingState = normalizeTrainingState({
      mode: TRAINING_MODE_REPLAY_GAME,
      status: TRAINING_STATUS_ACTIVE,
      playerSide: TRAINING_SIDE_BLACK,
      progressPly: 1,
      referenceMoves: [
        {
          ply: 1,
          moveNumber: 1,
          side: "white",
          san: "e4",
          move: { from: "e2", to: "e4" },
          fenBefore: "before-1",
          fenAfter: "after-1",
        },
        {
          ply: 2,
          moveNumber: 1,
          side: "black",
          san: "e5",
          move: { from: "e7", to: "e5" },
          fenBefore: "before-2",
          fenAfter: "after-2",
        },
      ],
      attempts: [],
    });

    expect(getCurrentReplayMove(trainingState)).toEqual(
      expect.objectContaining({
        ply: 2,
        san: "e5",
      }),
    );
  });

  it("classifies evaluation deltas with the configured thresholds", () => {
    expect(classifyReplayDelta(30)).toBe(REPLAY_RESULT_EQUAL);
    expect(classifyReplayDelta(-30)).toBe(REPLAY_RESULT_EQUAL);
    expect(classifyReplayDelta(31)).toBe(REPLAY_RESULT_BETTER);
    expect(classifyReplayDelta(-31)).toBe(REPLAY_RESULT_WORSE);
    expect(isCriticalReplayDelta(-150)).toBe(true);
    expect(isCriticalReplayDelta(-149)).toBe(false);
  });

  it("records an exact match without engine comparison data", () => {
    const attempt = buildReplayAttempt({
      expectedMove: {
        ply: 1,
        moveNumber: 1,
        side: "white",
        san: "e4",
        move: { from: "e2", to: "e4" },
        fenBefore: "before-1",
        fenAfter: "after-1",
      },
      userMove: { from: "e2", to: "e4" },
      userSan: "e4",
    });

    expect(attempt).toEqual(
      expect.objectContaining({
        outcome: REPLAY_RESULT_MATCH,
        classification: null,
        deltaCp: null,
        isCritical: false,
      }),
    );
  });

  it("records a worse mismatch from engine comparison data", () => {
    const attempt = buildReplayAttempt({
      expectedMove: {
        ply: 3,
        moveNumber: 2,
        side: "white",
        san: "Nf3",
        move: { from: "g1", to: "f3" },
        fenBefore: "before-3",
        fenAfter: "after-3",
      },
      userMove: { from: "f1", to: "c4" },
      userSan: "Bc4",
      referenceEvaluation: { type: "cp", value: 85 },
      userEvaluation: { type: "cp", value: -90 },
    });

    expect(attempt).toEqual(
      expect.objectContaining({
        outcome: "mismatch",
        classification: REPLAY_RESULT_WORSE,
        deltaCp: -175,
        isCritical: true,
      }),
    );
  });

  it("summarizes replay results for the end-of-game report", () => {
    const referenceMoves = [
      {
        ply: 1,
        moveNumber: 1,
        side: "white",
        san: "e4",
        move: { from: "e2", to: "e4" },
        fenBefore: "before-1",
        fenAfter: "after-1",
      },
      {
        ply: 2,
        moveNumber: 1,
        side: "black",
        san: "e5",
        move: { from: "e7", to: "e5" },
        fenBefore: "before-2",
        fenAfter: "after-2",
      },
      {
        ply: 3,
        moveNumber: 2,
        side: "white",
        san: "Nf3",
        move: { from: "g1", to: "f3" },
        fenBefore: "before-3",
        fenAfter: "after-3",
      },
    ];
    const attempts = [
      buildReplayAttempt({
        expectedMove: referenceMoves[0],
        userMove: { from: "e2", to: "e4" },
        userSan: "e4",
      }),
      buildReplayAttempt({
        expectedMove: referenceMoves[1],
        userMove: { from: "c7", to: "c5" },
        userSan: "c5",
        referenceEvaluation: { type: "cp", value: 10 },
        userEvaluation: { type: "cp", value: -180 },
      }),
      buildReplayAttempt({
        expectedMove: referenceMoves[2],
        userMove: { from: "f1", to: "c4" },
        userSan: "Bc4",
        referenceEvaluation: { type: "cp", value: 25 },
        userEvaluation: { type: "cp", value: 35 },
      }),
    ];

    expect(summarizeReplayAttempts(referenceMoves, attempts, TRAINING_SIDE_WHITE)).toEqual(
      expect.objectContaining({
        totalMoves: 2,
        attemptedMoves: 3,
        matchedMoves: 1,
        betterMoves: 0,
        equalMoves: 1,
        worseMoves: 1,
      }),
    );
    expect(
      summarizeReplayAttempts(referenceMoves, attempts, TRAINING_SIDE_WHITE).criticalMistakes,
    ).toHaveLength(1);
  });

  it("stores the selected player side when starting replay mode", () => {
    const { trainingState } = createReplayTrainingState(
      "1. e4 e5 2. Nf3 Nc6",
      TRAINING_SIDE_BLACK,
    );

    expect(trainingState.playerSide).toBe(TRAINING_SIDE_BLACK);
  });

  it("normalizes pending and revealed replay attempt groups", () => {
    const normalizedState = normalizeTrainingState({
      mode: TRAINING_MODE_REPLAY_GAME,
      status: TRAINING_STATUS_ACTIVE,
      playerSide: TRAINING_SIDE_WHITE,
      progressPly: 0,
      referenceMoves: [
        {
          ply: 1,
          moveNumber: 1,
          side: "white",
          san: "e4",
          move: { from: "e2", to: "e4" },
          fenBefore: "before-1",
          fenAfter: "after-1",
        },
      ],
      attempts: [],
      pendingAttempts: [
        {
          ply: 1,
          moveNumber: 1,
          side: "white",
          expectedSan: "e4",
          userSan: "d4",
          expectedMove: { from: "e2", to: "e4" },
          userMove: { from: "d2", to: "d4" },
          outcome: "mismatch",
          classification: "equal",
          deltaCp: -5,
        },
      ],
      lastCompletedAttempts: [
        {
          ply: 1,
          moveNumber: 1,
          side: "white",
          expectedSan: "e4",
          userSan: "c4",
          expectedMove: { from: "e2", to: "e4" },
          userMove: { from: "c2", to: "c4" },
          outcome: "mismatch",
          classification: "worse",
          deltaCp: -60,
        },
      ],
      lastCompletedExpectedMove: {
        ply: 1,
        moveNumber: 1,
        side: "white",
        san: "e4",
        move: { from: "e2", to: "e4" },
        fenBefore: "before-1",
        fenAfter: "after-1",
      },
      lastCompletionMode: TRAINING_COMPLETION_REVEALED,
    });

    expect(normalizedState.pendingAttempts).toHaveLength(1);
    expect(normalizedState.lastCompletedAttempts).toHaveLength(1);
    expect(normalizedState.lastCompletedExpectedMove).toEqual(
      expect.objectContaining({ san: "e4" }),
    );
    expect(normalizedState.lastCompletionMode).toBe(TRAINING_COMPLETION_REVEALED);
  });
});
