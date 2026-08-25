import { describe, expect, it } from "vitest";
import {
  BLUNDER_THRESHOLD_CP,
  ISSUE_FILTER_ALL,
  ISSUE_FILTER_BLUNDERS,
  ISSUE_FILTER_MISTAKES,
  MOVE_SEVERITY_BLUNDER,
  MOVE_SEVERITY_INACCURACY,
  MOVE_SEVERITY_MISTAKE,
  addGameAnalysisToMoveHistoryEntries,
  appendGameAnalysisPosition,
  buildGameAnalysisIssueArrow,
  buildGameAnalysisRequest,
  classifyMoveLoss,
  createCompletedGameAnalysis,
  findAdjacentIssue,
  getComparableEvaluationCp,
  getGameAnalysisScaleMaxCp,
  getGameAnalysisIssueDescription,
  getMoveSeverityColor,
  getMoveSeveritySymbol,
  isGameAnalysisCurrent,
  normalizeGameAnalysisBestMove,
  normalizePersistedGameAnalysis,
} from "./gameAnalysis.js";
import {
  createVariantTreeFromMoves,
  getMainlinePositionEntries,
} from "./variantTree.js";

function buildAnalyzedLine() {
  const tree = createVariantTreeFromMoves([
    { from: "e2", to: "e4" },
    { from: "e7", to: "e5" },
    { from: "g1", to: "f3" },
  ]);
  const entries = getMainlinePositionEntries(tree);
  const rawEvaluations = [
    { type: "cp", value: 20 },
    { type: "cp", value: -80 },
    { type: "cp", value: 180 },
    { type: "cp", value: 120 },
  ];
  const bestMoves = ["e2e4", "e7e5", "g1f3", "b8c6"];
  let positions = [];

  entries.forEach((entry, index) => {
    positions = appendGameAnalysisPosition(
      positions,
      {
        type: "position",
        index,
        fen: entry.fen,
        evaluation: rawEvaluations[index],
        bestmove: bestMoves[index],
      },
      entries,
    );
  });

  return { entries, positions };
}

describe("whole-game analysis", () => {
  it("builds a request from the main-line initial position and moves", () => {
    const { entries } = buildAnalyzedLine();

    expect(buildGameAnalysisRequest(entries, 14)).toEqual({
      initialFen: entries[0].fen,
      moves: [
        { from: "e2", to: "e4" },
        { from: "e7", to: "e5" },
        { from: "g1", to: "f3" },
      ],
      depth: 14,
    });
  });

  it("normalizes side-to-move scores and classifies mover losses", () => {
    const { positions } = buildAnalyzedLine();

    expect(positions.map(({ scoreCp }) => scoreCp)).toEqual([
      20, 80, 180, -120,
    ]);
    expect(positions.map(({ lossCp }) => lossCp)).toEqual([null, 0, 100, 300]);
    expect(positions.map(({ severity }) => severity)).toEqual([
      null,
      null,
      MOVE_SEVERITY_MISTAKE,
      MOVE_SEVERITY_BLUNDER,
    ]);
  });

  it("uses the exact severity boundaries", () => {
    expect(classifyMoveLoss(49)).toBeNull();
    expect(classifyMoveLoss(50)).toBe(MOVE_SEVERITY_INACCURACY);
    expect(classifyMoveLoss(99)).toBe(MOVE_SEVERITY_INACCURACY);
    expect(classifyMoveLoss(100)).toBe(MOVE_SEVERITY_MISTAKE);
    expect(classifyMoveLoss(199)).toBe(MOVE_SEVERITY_MISTAKE);
    expect(classifyMoveLoss(BLUNDER_THRESHOLD_CP)).toBe(MOVE_SEVERITY_BLUNDER);
  });

  it("builds offending-move arrows with severity colors", () => {
    const position = {
      nodeId: "node-1",
      fen: "fen-1",
      severity: MOVE_SEVERITY_MISTAKE,
    };
    const mainlineEntry = {
      nodeId: "node-1",
      fen: "fen-1",
      move: { from: "e2", to: "e4" },
    };

    expect(getMoveSeverityColor(MOVE_SEVERITY_INACCURACY)).toBe("#facc15");
    expect(getMoveSeverityColor(MOVE_SEVERITY_MISTAKE)).toBe("#f97316");
    expect(getMoveSeverityColor(MOVE_SEVERITY_BLUNDER)).toBe("#dc2626");
    expect(buildGameAnalysisIssueArrow(position, mainlineEntry)).toEqual({
      startSquare: "e2",
      endSquare: "e4",
      color: "#f97316",
    });
    expect(
      buildGameAnalysisIssueArrow(
        { ...position, severity: null },
        mainlineEntry,
      ),
    ).toBeNull();
    expect(
      buildGameAnalysisIssueArrow(position, {
        ...mainlineEntry,
        nodeId: "node-2",
      }),
    ).toBeNull();
    expect(
      buildGameAnalysisIssueArrow(position, {
        ...mainlineEntry,
        move: { from: "e2", to: "e9" },
      }),
    ).toBeNull();
  });

  it("adds issue evaluations to matching move-history entries", () => {
    const entries = [
      { nodeId: "node-1", fen: "fen-1", san: "e4" },
      { nodeId: "node-2", fen: "fen-2", san: "e5" },
      { nodeId: "sideline", fen: "fen-3", san: "c5" },
    ];
    const enriched = addGameAnalysisToMoveHistoryEntries(entries, [
      {
        nodeId: "node-1",
        fen: "fen-1",
        severity: MOVE_SEVERITY_INACCURACY,
        lossCp: 62.4,
        evaluation: { type: "cp", value: 20 },
      },
      {
        nodeId: "node-2",
        fen: "different-fen",
        severity: MOVE_SEVERITY_BLUNDER,
        lossCp: 250,
        evaluation: { type: "cp", value: -180 },
      },
      {
        nodeId: "sideline",
        fen: "fen-3",
        severity: null,
        lossCp: 10,
        evaluation: { type: "cp", value: 15 },
      },
    ]);

    expect(enriched[0].gameAnalysisIssue).toEqual({
      severity: MOVE_SEVERITY_INACCURACY,
      lossCp: 62.4,
      evaluation: { type: "cp", value: 20 },
    });
    expect(enriched[1]).toBe(entries[1]);
    expect(enriched[2]).toBe(entries[2]);
    expect(addGameAnalysisToMoveHistoryEntries(entries, [])).toEqual(entries);
    expect(addGameAnalysisToMoveHistoryEntries(null, [])).toEqual([]);
    expect(getMoveSeveritySymbol(MOVE_SEVERITY_INACCURACY)).toBe("?!");
    expect(getMoveSeveritySymbol(MOVE_SEVERITY_MISTAKE)).toBe("?");
    expect(getMoveSeveritySymbol(MOVE_SEVERITY_BLUNDER)).toBe("??");
    expect(getGameAnalysisIssueDescription(enriched[0].gameAnalysisIssue)).toBe(
      "Inaccuracy, 62 cp loss, evaluation +0.2",
    );
  });

  it("maps mate evaluations beyond centipawn scores", () => {
    expect(getComparableEvaluationCp({ type: "mate", value: 3 })).toBe(99997);
    expect(getComparableEvaluationCp({ type: "mate", value: -2 })).toBe(-99998);
    expect(getComparableEvaluationCp(null)).toBeNull();
  });

  it("normalizes optional Stockfish best moves", () => {
    expect(normalizeGameAnalysisBestMove(" E7E8Q ")).toBe("e7e8q");
    expect(normalizeGameAnalysisBestMove("e2e9")).toBeNull();
    expect(normalizeGameAnalysisBestMove(null)).toBeNull();
    expect(
      buildAnalyzedLine().positions.map(({ bestMove }) => bestMove),
    ).toEqual(["e2e4", "e7e5", "g1f3", "b8c6"]);
  });

  it("rounds histogram ranges up to symmetric 1-2-5 pawn scales", () => {
    const cpPosition = (scoreCp) => ({
      evaluation: { type: "cp", value: scoreCp },
      scoreCp,
    });

    expect(getGameAnalysisScaleMaxCp([])).toBe(100);
    expect(getGameAnalysisScaleMaxCp([cpPosition(40)])).toBe(100);
    expect(getGameAnalysisScaleMaxCp([cpPosition(-140)])).toBe(200);
    expect(getGameAnalysisScaleMaxCp([cpPosition(320)])).toBe(500);
    expect(getGameAnalysisScaleMaxCp([cpPosition(-1200)])).toBe(2000);
    expect(
      getGameAnalysisScaleMaxCp([
        { evaluation: { type: "mate", value: 2 }, scoreCp: 99998 },
      ]),
    ).toBe(100);
  });

  it("finds previous and next issues using the selected filter", () => {
    const { positions } = buildAnalyzedLine();

    expect(findAdjacentIssue(positions, 1, ISSUE_FILTER_ALL, 1)?.ply).toBe(2);
    expect(
      findAdjacentIssue(positions, 3, ISSUE_FILTER_MISTAKES, -1)?.ply,
    ).toBe(2);
    expect(findAdjacentIssue(positions, 0, ISSUE_FILTER_BLUNDERS, 1)?.ply).toBe(
      3,
    );
    expect(findAdjacentIssue(positions, 3, ISSUE_FILTER_ALL, 1)).toBeNull();
  });

  it("round-trips completed analysis and rejects a changed main line", () => {
    const { entries, positions } = buildAnalyzedLine();
    const analysis = createCompletedGameAnalysis({
      depth: 12,
      positions,
      mainlineEntries: entries,
      completedAt: "2026-08-25T12:00:00.000Z",
    });
    const normalized = normalizePersistedGameAnalysis(analysis);

    expect(normalized).toEqual(analysis);
    expect(isGameAnalysisCurrent(normalized, entries)).toBe(true);
    expect(isGameAnalysisCurrent(normalized, entries.slice(0, -1))).toBe(false);

    const legacyAnalysis = structuredClone(analysis);
    legacyAnalysis.positions.forEach((position) => delete position.bestMove);
    expect(
      normalizePersistedGameAnalysis(legacyAnalysis).positions.every(
        (position) => position.bestMove === null,
      ),
    ).toBe(true);
  });
});
