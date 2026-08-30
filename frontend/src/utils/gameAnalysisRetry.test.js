import { describe, expect, it } from "vitest";
import {
  GAME_ANALYSIS_RETRY_FEEDBACK_BAD,
  GAME_ANALYSIS_RETRY_FEEDBACK_BEST,
  GAME_ANALYSIS_RETRY_FEEDBACK_GOOD,
  buildGameAnalysisRetryArrows,
  buildGameAnalysisRetryAttempt,
  getGameAnalysisRetryFeedback,
  getGameAnalysisRetryTarget,
  getNextGameAnalysisRetryTarget,
  setGameAnalysisRetryBestMove,
} from "./gameAnalysisRetry.js";

const sourceFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const issueFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

function buildTargetFixture() {
  const positions = [
    {
      nodeId: "root",
      fen: sourceFen,
      ply: 0,
      bestMove: "d2d4",
    },
    {
      nodeId: "issue-1",
      fen: issueFen,
      ply: 1,
      san: "e4",
      side: "white",
      severity: "mistake",
      lossCp: 140,
    },
    {
      nodeId: "issue-2",
      fen: "fen-2",
      ply: 2,
      san: "e5",
      side: "black",
      severity: "blunder",
      lossCp: 250,
    },
  ];
  const entries = [
    { nodeId: "root", fen: sourceFen, move: null },
    {
      nodeId: "issue-1",
      fen: issueFen,
      move: { from: "e2", to: "e4" },
    },
    {
      nodeId: "issue-2",
      fen: "fen-2",
      move: { from: "e7", to: "e5" },
    },
  ];

  return { positions, entries };
}

describe("game analysis retry", () => {
  it("resolves an issue to its preceding position and stored best move", () => {
    const { positions, entries } = buildTargetFixture();
    const target = getGameAnalysisRetryTarget(positions, entries, "issue-1");

    expect(target).toEqual(
      expect.objectContaining({
        issueNodeId: "issue-1",
        sourceNodeId: "root",
        sourceFen,
        bestMove: { from: "d2", to: "d4" },
        bestMoveSan: "d4",
      }),
    );
    expect(getGameAnalysisRetryTarget(positions, entries, "root")).toBeNull();
    expect(
      getGameAnalysisRetryTarget(positions, entries.slice(0, 1), "issue-1"),
    ).toBeNull();
  });

  it("hydrates legacy targets and rejects illegal engine moves", () => {
    const { positions, entries } = buildTargetFixture();
    positions[0].bestMove = null;
    const target = getGameAnalysisRetryTarget(positions, entries, "issue-1");

    expect(target.bestMove).toBeNull();
    expect(setGameAnalysisRetryBestMove(target, "g1f3").bestMoveSan).toBe(
      "Nf3",
    );
    expect(setGameAnalysisRetryBestMove(target, "e7e5")).toBeNull();
    expect(
      setGameAnalysisRetryBestMove(
        { ...target, sourceFen: "k7/4P3/8/8/8/8/8/4K3 w - - 0 1" },
        "e7e8q",
      ),
    ).toEqual(
      expect.objectContaining({
        bestMove: { from: "e7", to: "e8", promotion: "q" },
        bestMoveUci: "e7e8q",
      }),
    );
  });

  it("classifies best, good, and bad retry attempts", () => {
    const { positions, entries } = buildTargetFixture();
    const target = getGameAnalysisRetryTarget(positions, entries, "issue-1");
    const bestAttempt = buildGameAnalysisRetryAttempt({
      target,
      userMove: { from: "d2", to: "d4" },
      userSan: "d4",
    });
    const goodAttempt = buildGameAnalysisRetryAttempt({
      target,
      userMove: { from: "g1", to: "f3" },
      userSan: "Nf3",
      comparison: {
        referenceEvaluation: { type: "cp", value: 25 },
        userEvaluation: { type: "cp", value: 5 },
      },
    });
    const badAttempt = buildGameAnalysisRetryAttempt({
      target,
      userMove: { from: "f2", to: "f3" },
      userSan: "f3",
      comparison: {
        referenceEvaluation: { type: "cp", value: 25 },
        userEvaluation: { type: "cp", value: -100 },
      },
    });

    expect(getGameAnalysisRetryFeedback(bestAttempt)).toBe(
      GAME_ANALYSIS_RETRY_FEEDBACK_BEST,
    );
    expect(getGameAnalysisRetryFeedback(goodAttempt)).toBe(
      GAME_ANALYSIS_RETRY_FEEDBACK_GOOD,
    );
    expect(getGameAnalysisRetryFeedback(badAttempt)).toBe(
      GAME_ANALYSIS_RETRY_FEEDBACK_BAD,
    );
    expect(buildGameAnalysisRetryArrows(target, badAttempt)).toEqual([
      { startSquare: "d2", endSquare: "d4", color: "#2563eb" },
      { startSquare: "f2", endSquare: "f3", color: "#f44336" },
    ]);

    const mateAttempt = buildGameAnalysisRetryAttempt({
      target,
      userMove: { from: "g1", to: "f3" },
      userSan: "Nf3",
      comparison: {
        referenceEvaluation: { type: "mate", value: 2 },
        userEvaluation: { type: "mate", value: 3 },
      },
    });
    expect(getGameAnalysisRetryFeedback(mateAttempt)).toBe(
      GAME_ANALYSIS_RETRY_FEEDBACK_GOOD,
    );
  });

  it("finds the next issue using the active threshold", () => {
    const { positions, entries } = buildTargetFixture();

    expect(
      getNextGameAnalysisRetryTarget(positions, entries, 1, "mistakes")
        ?.issueNodeId,
    ).toBe("issue-2");
    expect(
      getNextGameAnalysisRetryTarget(positions, entries, 2, "all"),
    ).toBeNull();
    expect(
      getNextGameAnalysisRetryTarget(
        positions,
        entries,
        1,
        "mistakes",
        "white",
      ),
    ).toBeNull();
    expect(
      getNextGameAnalysisRetryTarget(positions, entries, 1, "mistakes", "black")
        ?.issueNodeId,
    ).toBe("issue-2");
  });
});
