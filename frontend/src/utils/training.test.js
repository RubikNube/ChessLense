import { describe, expect, it } from "vitest";
import {
  buildReplayAttempt,
  classifyReplayDelta,
  createComputerPlayTrainingState,
  createEmptyTrainingState,
  createGuessHistoryEntryPayload,
  createGuessTheMoveTrainingState,
  createReplayTrainingState,
  getCurrentGuessTheMove,
  getGuessTheMovePoints,
  getCurrentReplayMove,
  isCriticalReplayDelta,
  normalizeGuessHistoryEntries,
  normalizeTrainingState,
  summarizeGuessTheMoveAttempts,
  summarizeReplayAttempts,
  GUESS_THE_MOVE_POINTS_BETTER,
  GUESS_THE_MOVE_POINTS_CRITICAL_WORSE,
  GUESS_THE_MOVE_POINTS_EQUAL,
  GUESS_THE_MOVE_POINTS_MATCH,
  GUESS_THE_MOVE_POINTS_WORSE,
  TRAINING_COMPUTER_PLAY_SOURCE_CURRENT,
  TRAINING_COMPUTER_PLAY_SOURCE_INITIAL,
  TRAINING_COMPLETION_REVEALED,
  TRAINING_MODE_GUESS_THE_MOVE,
  TRAINING_MODE_PLAY_COMPUTER,
  TRAINING_SIDE_BLACK,
  TRAINING_SIDE_WHITE,
  TRAINING_MODE_REPLAY_GAME,
  TRAINING_MODE_OFF,
  TRAINING_PLAY_STATUS_ACTIVE,
  TRAINING_STATUS_ACTIVE,
  TRAINING_STATUS_COMPLETED,
  TRAINING_STATUS_ENDED,
  TRAINING_STATUS_IDLE,
  REPLAY_RESULT_BETTER,
  REPLAY_RESULT_EQUAL,
  REPLAY_RESULT_MATCH,
  REPLAY_RESULT_WORSE,
} from "./training.js";
import { createEmptyVariantTree } from "./variantTree.js";

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
      computerPlay: null,
      playSession: null,
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

  it("builds a standalone computer-play session from a starting tree", () => {
    const startVariantTree = createEmptyVariantTree();
    const { trainingState, variantTree, error } = createComputerPlayTrainingState(
      startVariantTree,
      TRAINING_SIDE_BLACK,
      TRAINING_COMPUTER_PLAY_SOURCE_INITIAL,
    );

    expect(error).toBeNull();
    expect(variantTree).toEqual(startVariantTree);
    expect(trainingState).toEqual(
      expect.objectContaining({
        mode: TRAINING_MODE_PLAY_COMPUTER,
        status: TRAINING_STATUS_ACTIVE,
        playerSide: TRAINING_SIDE_BLACK,
        computerPlay: {
          startFrom: TRAINING_COMPUTER_PLAY_SOURCE_INITIAL,
          startVariantTree,
        },
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

  it("keeps an explicitly ended replay session ended before the final move", () => {
    const trainingState = normalizeTrainingState({
      mode: TRAINING_MODE_REPLAY_GAME,
      status: TRAINING_STATUS_ENDED,
      playerSide: TRAINING_SIDE_WHITE,
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
      attempts: [
        {
          ply: 1,
          moveNumber: 1,
          side: "white",
          expectedSan: "e4",
          userSan: "e4",
          expectedMove: { from: "e2", to: "e4" },
          userMove: { from: "e2", to: "e4" },
          outcome: REPLAY_RESULT_MATCH,
        },
      ],
    });

    expect(trainingState.status).toBe(TRAINING_STATUS_ENDED);
    expect(getCurrentReplayMove(trainingState)).toBeNull();
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
        fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
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
        resultingFen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
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
        fenBefore: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        fenAfter: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
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
        resultingFen: "rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2",
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
        fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      },
      {
        ply: 2,
        moveNumber: 1,
        side: "black",
        san: "e5",
        move: { from: "e7", to: "e5" },
        fenBefore: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        fenAfter: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
      },
      {
        ply: 3,
        moveNumber: 2,
        side: "white",
        san: "Nf3",
        move: { from: "g1", to: "f3" },
        fenBefore: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        fenAfter: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
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
        moveHistory: [
          {
            ply: 1,
            moveNumber: 1,
            side: "white",
            expectedSan: "e4",
            expectedResultingFen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
            attempts: [
              expect.objectContaining({
                index: 1,
                userSan: "e4",
                outcome: REPLAY_RESULT_MATCH,
                classification: null,
                resultingFen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
              }),
            ],
          },
          {
            ply: 3,
            moveNumber: 2,
            side: "white",
            expectedSan: "Nf3",
            expectedResultingFen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
            attempts: [
              expect.objectContaining({
                index: 1,
                userSan: "Bc4",
                outcome: "mismatch",
                classification: REPLAY_RESULT_EQUAL,
                resultingFen: "rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2",
              }),
            ],
          },
        ],
      }),
    );
    expect(
      summarizeReplayAttempts(referenceMoves, attempts, TRAINING_SIDE_WHITE).criticalMistakes,
    ).toHaveLength(1);
  });

  it("keeps grouped replay history attempts in move order", () => {
    const referenceMoves = [
      {
        ply: 1,
        moveNumber: 1,
        side: "white",
        san: "e4",
        move: { from: "e2", to: "e4" },
        fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      },
      {
        ply: 3,
        moveNumber: 2,
        side: "white",
        san: "Nf3",
        move: { from: "g1", to: "f3" },
        fenBefore: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        fenAfter: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
      },
    ];
    const attempts = [
      buildReplayAttempt({
        expectedMove: referenceMoves[1],
        userMove: { from: "f1", to: "c4" },
        userSan: "Bc4",
        referenceEvaluation: { type: "cp", value: 25 },
        userEvaluation: { type: "cp", value: 35 },
      }),
      buildReplayAttempt({
        expectedMove: referenceMoves[1],
        userMove: { from: "b1", to: "c3" },
        userSan: "Nc3",
        referenceEvaluation: { type: "cp", value: 25 },
        userEvaluation: { type: "cp", value: -120 },
      }),
      buildReplayAttempt({
        expectedMove: referenceMoves[0],
        userMove: { from: "e2", to: "e4" },
        userSan: "e4",
      }),
    ];

    expect(summarizeReplayAttempts(referenceMoves, attempts, TRAINING_SIDE_WHITE)).toEqual(
      expect.objectContaining({
        moveHistory: expect.arrayContaining([
          expect.objectContaining({
            ply: 1,
            expectedResultingFen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
            attempts: expect.arrayContaining([
              expect.objectContaining({
                userSan: "e4",
                resultingFen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
              }),
            ]),
          }),
          expect.objectContaining({
            ply: 3,
            expectedResultingFen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
            attempts: expect.arrayContaining([
              expect.objectContaining({
                index: 1,
                userSan: "Bc4",
                resultingFen: "rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2",
              }),
              expect.objectContaining({
                index: 2,
                userSan: "Nc3",
                resultingFen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2",
              }),
            ]),
          }),
        ]),
      }),
    );
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
          fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
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
          resultingFen: "invalid fen",
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
          resultingFen: "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq - 0 1",
        },
      ],
      lastCompletedExpectedMove: {
        ply: 1,
        moveNumber: 1,
        side: "white",
        san: "e4",
        move: { from: "e2", to: "e4" },
        fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      },
      lastCompletionMode: TRAINING_COMPLETION_REVEALED,
    });

    expect(normalizedState.pendingAttempts).toHaveLength(1);
    expect(normalizedState.lastCompletedAttempts).toHaveLength(1);
    expect(normalizedState.pendingAttempts[0].resultingFen).toBeNull();
    expect(normalizedState.lastCompletedAttempts[0].resultingFen).toBe(
      "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq - 0 1",
    );
    expect(normalizedState.lastCompletedExpectedMove).toEqual(
      expect.objectContaining({ san: "e4" }),
    );
    expect(normalizedState.lastCompletionMode).toBe(TRAINING_COMPLETION_REVEALED);
    expect(normalizedState.playSession).toBeNull();
  });

  it("normalizes persisted play-session snapshots for temporary engine play", () => {
    const referenceMove = {
      ply: 1,
      moveNumber: 1,
      side: "white",
      san: "e4",
      move: { from: "e2", to: "e4" },
      fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    };
    const wrongAttempt = {
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
      resultingFen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1",
    };

    const normalizedState = normalizeTrainingState({
      mode: TRAINING_MODE_REPLAY_GAME,
      status: TRAINING_STATUS_ACTIVE,
      playerSide: TRAINING_SIDE_WHITE,
      progressPly: 0,
      referenceMoves: [referenceMove],
      attempts: [],
      pendingAttempts: [wrongAttempt],
      playSession: {
        status: TRAINING_PLAY_STATUS_ACTIVE,
        sourceAttempt: wrongAttempt,
        startingFen: wrongAttempt.resultingFen,
        resumeTrainingState: {
          mode: TRAINING_MODE_REPLAY_GAME,
          status: TRAINING_STATUS_ACTIVE,
          playerSide: TRAINING_SIDE_WHITE,
          progressPly: 0,
          referenceMoves: [referenceMove],
          attempts: [],
          pendingAttempts: [wrongAttempt],
        },
        resumeVariantTree: createEmptyVariantTree(referenceMove.fenBefore),
      },
    });

    expect(normalizedState.playSession).toEqual(
      expect.objectContaining({
        status: TRAINING_PLAY_STATUS_ACTIVE,
        startingFen: wrongAttempt.resultingFen,
        sourceAttempt: expect.objectContaining({
          userSan: "d4",
          resultingFen: wrongAttempt.resultingFen,
        }),
        resumeVariantTree: createEmptyVariantTree(referenceMove.fenBefore),
      }),
    );
    expect(normalizedState.playSession.resumeTrainingState).toEqual(
      expect.objectContaining({
        mode: TRAINING_MODE_REPLAY_GAME,
        pendingAttempts: [
          expect.objectContaining({
            userSan: "d4",
            resultingFen: wrongAttempt.resultingFen,
          }),
        ],
      }),
    );
  });

  it("normalizes persisted guess-mode play-session snapshots for temporary engine play", () => {
    const referenceMove = {
      ply: 1,
      moveNumber: 1,
      side: "white",
      san: "e4",
      move: { from: "e2", to: "e4" },
      fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    };
    const betterAttempt = {
      ply: 1,
      moveNumber: 1,
      side: "white",
      expectedSan: "e4",
      userSan: "d4",
      expectedMove: { from: "e2", to: "e4" },
      userMove: { from: "d2", to: "d4" },
      outcome: "mismatch",
      classification: "better",
      deltaCp: 120,
      resultingFen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1",
    };

    const normalizedState = normalizeTrainingState({
      mode: TRAINING_MODE_GUESS_THE_MOVE,
      status: TRAINING_STATUS_ENDED,
      playerSide: TRAINING_SIDE_WHITE,
      progressPly: 1,
      referenceMoves: [referenceMove],
      attempts: [betterAttempt],
      playSession: {
        status: TRAINING_PLAY_STATUS_ACTIVE,
        sourceAttempt: betterAttempt,
        startingFen: betterAttempt.resultingFen,
        resumeTrainingState: {
          mode: TRAINING_MODE_GUESS_THE_MOVE,
          status: TRAINING_STATUS_ENDED,
          playerSide: TRAINING_SIDE_WHITE,
          progressPly: 1,
          referenceMoves: [referenceMove],
          attempts: [betterAttempt],
          pendingAttempts: [],
        },
        resumeVariantTree: createEmptyVariantTree(referenceMove.fenAfter),
      },
    });

    expect(normalizedState.playSession).toEqual(
      expect.objectContaining({
        status: TRAINING_PLAY_STATUS_ACTIVE,
        startingFen: betterAttempt.resultingFen,
        sourceAttempt: expect.objectContaining({
          userSan: "d4",
          classification: REPLAY_RESULT_BETTER,
          resultingFen: betterAttempt.resultingFen,
        }),
        resumeTrainingState: expect.objectContaining({
          mode: TRAINING_MODE_GUESS_THE_MOVE,
          status: TRAINING_STATUS_ENDED,
        }),
        resumeVariantTree: createEmptyVariantTree(referenceMove.fenAfter),
      }),
    );
  });

  it("normalizes persisted standalone computer-play sessions", () => {
    const startVariantTree = createEmptyVariantTree(
      "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    );

    const normalizedState = normalizeTrainingState({
      mode: TRAINING_MODE_PLAY_COMPUTER,
      status: TRAINING_STATUS_ACTIVE,
      playerSide: TRAINING_SIDE_WHITE,
      progressPly: 99,
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
      computerPlay: {
        startFrom: TRAINING_COMPUTER_PLAY_SOURCE_CURRENT,
        startVariantTree,
      },
    });

    expect(normalizedState).toEqual(
      expect.objectContaining({
        mode: TRAINING_MODE_PLAY_COMPUTER,
        status: TRAINING_STATUS_ACTIVE,
        playerSide: TRAINING_SIDE_WHITE,
        progressPly: 0,
        referenceMoves: [],
        attempts: [],
        pendingAttempts: [],
        lastCompletedAttempts: [],
        lastCompletedExpectedMove: null,
        lastCompletionMode: null,
        computerPlay: {
          startFrom: TRAINING_COMPUTER_PLAY_SOURCE_CURRENT,
          startVariantTree,
        },
        playSession: null,
      }),
    );
  });

  it("builds a guess the move session from the imported main line", () => {
    const { trainingState, variantTree, error } = createGuessTheMoveTrainingState(
      "1. e4 e5 2. Nf3 Nc6",
    );

    expect(error).toBeNull();
    expect(variantTree.currentNodeId).toBe(variantTree.rootId);
    expect(trainingState).toEqual(
      expect.objectContaining({
        mode: TRAINING_MODE_GUESS_THE_MOVE,
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
  });

  it("returns the current guess-the-move target move", () => {
    const trainingState = normalizeTrainingState({
      mode: TRAINING_MODE_GUESS_THE_MOVE,
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

    expect(getCurrentGuessTheMove(trainingState)).toEqual(
      expect.objectContaining({
        ply: 2,
        san: "e5",
      }),
    );
  });

  it("scores guess-the-move attempts from replay classifications", () => {
    const matchingAttempt = buildReplayAttempt({
      expectedMove: {
        ply: 1,
        moveNumber: 1,
        side: "white",
        san: "e4",
        move: { from: "e2", to: "e4" },
        fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      },
      userMove: { from: "e2", to: "e4" },
      userSan: "e4",
    });
    const betterAttempt = buildReplayAttempt({
      expectedMove: {
        ply: 3,
        moveNumber: 2,
        side: "white",
        san: "Nf3",
        move: { from: "g1", to: "f3" },
        fenBefore: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        fenAfter: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
      },
      userMove: { from: "f1", to: "c4" },
      userSan: "Bc4",
      referenceEvaluation: { type: "cp", value: 25 },
      userEvaluation: { type: "cp", value: 180 },
    });
    const equalAttempt = buildReplayAttempt({
      expectedMove: {
        ply: 5,
        moveNumber: 3,
        side: "white",
        san: "Bb5",
        move: { from: "f1", to: "b5" },
        fenBefore: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 3 3",
        fenAfter: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
      },
      userMove: { from: "d2", to: "d3" },
      userSan: "d3",
      referenceEvaluation: { type: "cp", value: 30 },
      userEvaluation: { type: "cp", value: 25 },
    });
    const worseAttempt = buildReplayAttempt({
      expectedMove: {
        ply: 7,
        moveNumber: 4,
        side: "white",
        san: "c3",
        move: { from: "c2", to: "c3" },
        fenBefore: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 3 4",
        fenAfter: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/2P2N2/PP1P1PPP/RNBQK2R b KQkq - 0 4",
      },
      userMove: { from: "h2", to: "h3" },
      userSan: "h3",
      referenceEvaluation: { type: "cp", value: 40 },
      userEvaluation: { type: "cp", value: -45 },
    });
    const criticalAttempt = buildReplayAttempt({
      expectedMove: {
        ply: 9,
        moveNumber: 5,
        side: "white",
        san: "d4",
        move: { from: "d2", to: "d4" },
        fenBefore: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 0 5",
        fenAfter: "r1bqkbnr/pppp1ppp/2n5/1B2p3/3PP3/2P2N2/PP3PPP/RNBQK2R b KQkq - 0 5",
      },
      userMove: { from: "g2", to: "g4" },
      userSan: "g4",
      referenceEvaluation: { type: "cp", value: 35 },
      userEvaluation: { type: "cp", value: -200 },
    });

    expect(getGuessTheMovePoints(matchingAttempt)).toBe(GUESS_THE_MOVE_POINTS_MATCH);
    expect(getGuessTheMovePoints(betterAttempt)).toBe(GUESS_THE_MOVE_POINTS_BETTER);
    expect(getGuessTheMovePoints(equalAttempt)).toBe(GUESS_THE_MOVE_POINTS_EQUAL);
    expect(getGuessTheMovePoints(worseAttempt)).toBe(GUESS_THE_MOVE_POINTS_WORSE);
    expect(getGuessTheMovePoints(criticalAttempt)).toBe(
      GUESS_THE_MOVE_POINTS_CRITICAL_WORSE,
    );
  });

  it("summarizes guess-the-move scores and evaluation", () => {
    const referenceMoves = [
      {
        ply: 1,
        moveNumber: 1,
        side: "white",
        san: "e4",
        move: { from: "e2", to: "e4" },
        fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      },
      {
        ply: 2,
        moveNumber: 1,
        side: "black",
        san: "e5",
        move: { from: "e7", to: "e5" },
        fenBefore: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        fenAfter: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
      },
      {
        ply: 3,
        moveNumber: 2,
        side: "white",
        san: "Nf3",
        move: { from: "g1", to: "f3" },
        fenBefore: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        fenAfter: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
      },
      {
        ply: 4,
        moveNumber: 2,
        side: "black",
        san: "Nc6",
        move: { from: "b8", to: "c6" },
        fenBefore: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
        fenAfter: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
      },
    ];
    const attempts = [
      buildReplayAttempt({
        expectedMove: referenceMoves[0],
        userMove: { from: "e2", to: "e4" },
        userSan: "e4",
      }),
      buildReplayAttempt({
        expectedMove: referenceMoves[2],
        userMove: { from: "f1", to: "c4" },
        userSan: "Bc4",
        referenceEvaluation: { type: "cp", value: 25 },
        userEvaluation: { type: "cp", value: -90 },
      }),
    ];

    expect(
      summarizeGuessTheMoveAttempts(referenceMoves, attempts, TRAINING_SIDE_WHITE),
    ).toEqual(
      expect.objectContaining({
        totalMoves: 2,
        attemptedMoves: 2,
        remainingMoves: 0,
        parScore: 6,
        completedParScore: 6,
        totalScore: 2,
        matchedMoves: 1,
        betterMoves: 0,
        equalMoves: 0,
        worseMoves: 1,
        criticalWorseMoves: 0,
        evaluation: expect.objectContaining({
          label: "Needs work",
          basedOnCompletedMoves: true,
        }),
        moveHistory: [
          expect.objectContaining({
            expectedSan: "e4",
            userSan: "e4",
            points: 3,
            sourceAttempt: expect.objectContaining({
              userSan: "e4",
              outcome: REPLAY_RESULT_MATCH,
            }),
          }),
          expect.objectContaining({
            expectedSan: "Nf3",
            userSan: "Bc4",
            points: -1,
            sourceAttempt: expect.objectContaining({
              userSan: "Bc4",
              classification: REPLAY_RESULT_WORSE,
            }),
          }),
        ],
      }),
    );
  });

  it("normalizes saved guess history entries and derives summaries", () => {
    const entries = normalizeGuessHistoryEntries([
      {
        id: "entry-1",
        completedAt: "2026-05-02T12:00:00.000Z",
        playerSide: TRAINING_SIDE_WHITE,
        status: TRAINING_STATUS_COMPLETED,
        referenceMoves: [
          {
            ply: 1,
            moveNumber: 1,
            side: "white",
            san: "e4",
            move: { from: "e2", to: "e4" },
            fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
          },
        ],
        attempts: [
          {
            ply: 1,
            moveNumber: 1,
            side: "white",
            expectedSan: "e4",
            userSan: "e4",
            expectedMove: { from: "e2", to: "e4" },
            userMove: { from: "e2", to: "e4" },
            outcome: REPLAY_RESULT_MATCH,
            classification: null,
            deltaCp: null,
            isCritical: false,
            resultingFen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
          },
        ],
      },
    ]);

    expect(entries).toEqual([
      expect.objectContaining({
        id: "entry-1",
        completedAt: "2026-05-02T12:00:00.000Z",
        summary: expect.objectContaining({
          totalScore: GUESS_THE_MOVE_POINTS_MATCH,
          parScore: 3,
          evaluation: expect.objectContaining({
            label: "Outstanding",
          }),
        }),
      }),
    ]);
  });

  it("creates a guess history payload from a finished guess session", () => {
    const payload = createGuessHistoryEntryPayload(
      {
        mode: TRAINING_MODE_GUESS_THE_MOVE,
        status: TRAINING_STATUS_ENDED,
        playerSide: TRAINING_SIDE_WHITE,
        progressPly: 1,
        referenceMoves: [
          {
            ply: 1,
            moveNumber: 1,
            side: "white",
            san: "e4",
            move: { from: "e2", to: "e4" },
            fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
          },
        ],
        attempts: [
          {
            ply: 1,
            moveNumber: 1,
            side: "white",
            expectedSan: "e4",
            userSan: "e4",
            expectedMove: { from: "e2", to: "e4" },
            userMove: { from: "e2", to: "e4" },
            outcome: REPLAY_RESULT_MATCH,
            classification: null,
            deltaCp: null,
            isCritical: false,
            resultingFen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
          },
        ],
      },
      "2026-05-02T12:00:00.000Z",
    );

    expect(payload).toEqual({
      completedAt: "2026-05-02T12:00:00.000Z",
      playerSide: TRAINING_SIDE_WHITE,
      status: TRAINING_STATUS_ENDED,
      referenceMoves: [
        expect.objectContaining({
          san: "e4",
        }),
      ],
      attempts: [
        expect.objectContaining({
          userSan: "e4",
        }),
      ],
    });
  });
});
