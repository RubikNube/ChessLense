import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import {
  applyMoveToVariantTree,
  buildGameToNode,
  canRedoInVariantTree,
  createEmptyVariantTree,
  createVariantTreeFromGameAndRedo,
  createVariantTreeFromParsedPgn,
  createVariantTreeFromMoves,
  demoteVariantLine,
  getAlternativeVariantFirstMoves,
  getMoveHistoryForNode,
  getRelevantVariantLines,
  getVariantLines,
  goToEndInVariantTree,
  goToStartInVariantTree,
  promoteVariantLine,
  redoInVariantTree,
  selectVariantLine,
  undoInVariantTree,
} from "./variantTree.js";
import { parse } from "chess.js/src/pgn.js";

describe("variantTree", () => {
  it("creates a new sideline instead of deleting redo history", () => {
    let tree = createEmptyVariantTree();

    tree = applyMoveToVariantTree(tree, { from: "e2", to: "e4" });
    tree = applyMoveToVariantTree(tree, { from: "e7", to: "e5" });
    tree = applyMoveToVariantTree(tree, { from: "g1", to: "f3" });
    tree = undoInVariantTree(tree);
    tree = applyMoveToVariantTree(tree, { from: "f1", to: "c4" });

    expect(getMoveHistoryForNode(tree)).toEqual(["e4", "e5", "Bc4"]);
    expect(tree.nodes[tree.rootId].children).toHaveLength(1);
    expect(tree.nodes[tree.currentNodeId].parentId).not.toBeNull();

    const e5NodeId = tree.nodes[tree.currentNodeId].parentId;
    expect(tree.nodes[e5NodeId].children).toHaveLength(2);

    const variantLines = getVariantLines(tree);
    expect(variantLines.map((line) => line.moves)).toEqual([
      ["e4", "e5", "Nf3"],
      ["e4", "e5", "Bc4"],
    ]);
  });

  it("replays redo within the selected variant line", () => {
    let tree = createEmptyVariantTree();

    tree = applyMoveToVariantTree(tree, { from: "e2", to: "e4" });
    tree = applyMoveToVariantTree(tree, { from: "e7", to: "e5" });
    tree = applyMoveToVariantTree(tree, { from: "g1", to: "f3" });
    tree = undoInVariantTree(tree);
    tree = applyMoveToVariantTree(tree, { from: "f1", to: "c4" });

    const selectedLineId = tree.activeLineLeafId;
    tree = goToStartInVariantTree(selectVariantLine(tree, selectedLineId));

    expect(canRedoInVariantTree(tree)).toBe(true);

    tree = redoInVariantTree(tree);
    tree = redoInVariantTree(tree);
    tree = redoInVariantTree(tree);

    expect(getMoveHistoryForNode(tree)).toEqual(["e4", "e5", "Bc4"]);
  });

  it("promotes and demotes a variant by reordering siblings", () => {
    let tree = createEmptyVariantTree();

    tree = applyMoveToVariantTree(tree, { from: "e2", to: "e4" });
    tree = applyMoveToVariantTree(tree, { from: "e7", to: "e5" });
    tree = applyMoveToVariantTree(tree, { from: "g1", to: "f3" });
    tree = undoInVariantTree(tree);
    tree = applyMoveToVariantTree(tree, { from: "f1", to: "c4" });

    const bC4LineId = tree.activeLineLeafId;
    tree = promoteVariantLine(tree, bC4LineId);

    expect(getVariantLines(tree)[0].moves).toEqual(["e4", "e5", "Bc4"]);

    tree = demoteVariantLine(tree, bC4LineId);

    expect(getVariantLines(tree)[0].moves).toEqual(["e4", "e5", "Nf3"]);
  });

  it("creates variant state from a linear game plus redo moves", () => {
    const game = new Chess();
    game.move("e4");
    game.move("e5");

    const tree = createVariantTreeFromGameAndRedo(game, [
      { from: "g1", to: "f3" },
      { from: "b8", to: "c6" },
    ]);

    expect(getMoveHistoryForNode(tree)).toEqual(["e4", "e5"]);
    expect(tree.activeLineLeafId).not.toBe(tree.currentNodeId);

    const endTree = redoInVariantTree(redoInVariantTree(tree));
    expect(getMoveHistoryForNode(endTree)).toEqual(["e4", "e5", "Nf3", "Nc6"]);
  });

  it("parses imported PGN variations into real branches", () => {
    const parsedPgn = parse("1. e4 e5 (1... c5 2. Nf3) 2. Nf3 *");
    const tree = createVariantTreeFromParsedPgn(parsedPgn);
    const variantLines = getVariantLines(tree);

    expect(variantLines.map((line) => line.moves)).toEqual([
      ["e4", "e5", "Nf3"],
      ["e4", "c5", "Nf3"],
    ]);

    const c5Line = variantLines[1];
    const selectedTree = selectVariantLine(tree, c5Line.id);
    const game = buildGameToNode(selectedTree);

    expect(game.history()).toEqual(["e4", "c5"]);
  });

  it("builds a tree from a move sequence", () => {
    const tree = createVariantTreeFromMoves([
      { from: "e2", to: "e4" },
      { from: "e7", to: "e5" },
      { from: "g1", to: "f3" },
    ]);

    expect(getMoveHistoryForNode(tree)).toEqual(["e4", "e5", "Nf3"]);
  });

  it("filters variants to the current move context", () => {
    let tree = createEmptyVariantTree();

    tree = applyMoveToVariantTree(tree, { from: "e2", to: "e4" });
    tree = applyMoveToVariantTree(tree, { from: "e7", to: "e5" });
    tree = applyMoveToVariantTree(tree, { from: "g1", to: "f3" });
    tree = undoInVariantTree(tree);
    tree = applyMoveToVariantTree(tree, { from: "f1", to: "c4" });

    expect(getRelevantVariantLines(tree)).toEqual([]);

    tree = undoInVariantTree(tree);

    expect(getRelevantVariantLines(tree).map((line) => line.moves)).toEqual([
      ["e4", "e5", "Nf3"],
      ["e4", "e5", "Bc4"],
    ]);

    tree = undoInVariantTree(tree);

    expect(getRelevantVariantLines(tree)).toEqual([]);
  });

  it("derives first moves for non-selected alternative branches", () => {
    let tree = createEmptyVariantTree();

    tree = applyMoveToVariantTree(tree, { from: "e2", to: "e4" });
    tree = applyMoveToVariantTree(tree, { from: "e7", to: "e5" });
    tree = applyMoveToVariantTree(tree, { from: "g1", to: "f3" });
    tree = undoInVariantTree(tree);
    tree = applyMoveToVariantTree(tree, { from: "f1", to: "c4" });

    expect(getAlternativeVariantFirstMoves(tree)).toEqual([]);

    tree = undoInVariantTree(tree);

    expect(getAlternativeVariantFirstMoves(tree)).toEqual([
      { from: "g1", to: "f3" },
    ]);

    tree = promoteVariantLine(tree, tree.activeLineLeafId);

    expect(getAlternativeVariantFirstMoves(tree)).toEqual([
      { from: "g1", to: "f3" },
    ]);
  });

  it("restores the mainline cursor when switching back from a sideline", () => {
    let tree = createEmptyVariantTree();

    tree = applyMoveToVariantTree(tree, { from: "e2", to: "e4" });
    tree = applyMoveToVariantTree(tree, { from: "e7", to: "e5" });
    tree = applyMoveToVariantTree(tree, { from: "g1", to: "f3" });
    tree = applyMoveToVariantTree(tree, { from: "b8", to: "c6" });
    tree = undoInVariantTree(tree);
    tree = applyMoveToVariantTree(tree, { from: "g8", to: "f6" });
    tree = applyMoveToVariantTree(tree, { from: "g2", to: "g3" });

    const mainlineId = getVariantLines(tree).find((line) => line.isMainLine)?.id;
    tree = selectVariantLine(tree, mainlineId);

    expect(getMoveHistoryForNode(tree)).toEqual(["e4", "e5", "Nf3"]);
    expect(tree.rememberedMainlineNodeId).toBe(tree.currentNodeId);
  });

  it("opens a sideline at the start of the variation instead of the leaf", () => {
    let tree = createEmptyVariantTree();

    tree = applyMoveToVariantTree(tree, { from: "e2", to: "e4" });
    tree = applyMoveToVariantTree(tree, { from: "e7", to: "e5" });
    tree = applyMoveToVariantTree(tree, { from: "g1", to: "f3" });
    tree = applyMoveToVariantTree(tree, { from: "b8", to: "c6" });
    tree = undoInVariantTree(tree);
    tree = applyMoveToVariantTree(tree, { from: "g8", to: "f6" });
    tree = applyMoveToVariantTree(tree, { from: "g2", to: "g3" });

    const mainlineId = getVariantLines(tree).find((line) => line.isMainLine)?.id;
    const sidelineId = tree.activeLineLeafId;

    tree = selectVariantLine(tree, mainlineId);
    tree = selectVariantLine(tree, sidelineId);

    expect(getMoveHistoryForNode(tree)).toEqual(["e4", "e5", "Nf3", "Nf6"]);
    expect(canRedoInVariantTree(tree)).toBe(true);

    tree = redoInVariantTree(tree);

    expect(getMoveHistoryForNode(tree)).toEqual(["e4", "e5", "Nf3", "Nf6", "g3"]);
  });

  it("reopens sidelines at their start on every reselection", () => {
    let tree = createEmptyVariantTree();

    tree = applyMoveToVariantTree(tree, { from: "e2", to: "e4" });
    tree = applyMoveToVariantTree(tree, { from: "e7", to: "e5" });
    tree = applyMoveToVariantTree(tree, { from: "g1", to: "f3" });
    tree = applyMoveToVariantTree(tree, { from: "b8", to: "c6" });
    tree = undoInVariantTree(tree);
    tree = applyMoveToVariantTree(tree, { from: "g8", to: "f6" });
    tree = applyMoveToVariantTree(tree, { from: "g2", to: "g3" });

    const mainlineId = getVariantLines(tree).find((line) => line.isMainLine)?.id;
    const sidelineId = tree.activeLineLeafId;

    tree = selectVariantLine(tree, sidelineId);
    tree = redoInVariantTree(tree);
    tree = selectVariantLine(tree, mainlineId);
    tree = selectVariantLine(tree, sidelineId);

    expect(getMoveHistoryForNode(tree)).toEqual(["e4", "e5", "Nf3", "Nf6"]);
  });

  it("keeps the remembered mainline cursor aligned when a sideline is promoted", () => {
    let tree = createEmptyVariantTree();

    tree = applyMoveToVariantTree(tree, { from: "e2", to: "e4" });
    tree = applyMoveToVariantTree(tree, { from: "e7", to: "e5" });
    tree = applyMoveToVariantTree(tree, { from: "g1", to: "f3" });
    tree = applyMoveToVariantTree(tree, { from: "b8", to: "c6" });
    tree = undoInVariantTree(tree);
    tree = applyMoveToVariantTree(tree, { from: "c7", to: "c5" });

    const promotedLineId = tree.activeLineLeafId;
    const mainlineId = getVariantLines(tree).find((line) => line.isMainLine)?.id;

    tree = selectVariantLine(tree, mainlineId);
    tree = goToEndInVariantTree(tree);
    tree = promoteVariantLine(tree, promotedLineId);
    tree = selectVariantLine(tree, promotedLineId);

    expect(getMoveHistoryForNode(tree)).toEqual(["e4", "e5", "Nf3", "c5"]);
    expect(tree.rememberedMainlineNodeId).toBe(tree.currentNodeId);
  });
});
