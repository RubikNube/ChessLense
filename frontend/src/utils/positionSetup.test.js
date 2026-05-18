import { describe, expect, it } from "vitest";
import {
  applyPositionSetupTool,
  buildPositionSetupFen,
  createPositionSetupDraft,
  DEFAULT_POSITION_SETUP_TOOL,
  POSITION_SETUP_CLEAR_TOOL,
  POSITION_SETUP_MOVE_TOOL,
  movePositionSetupPiece,
} from "./positionSetup.js";

describe("positionSetup", () => {
  it("creates a draft from the current FEN", () => {
    const draft = createPositionSetupDraft(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b Kq - 0 1",
    );

    expect(draft).toEqual({
      initialFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b Kq - 0 1",
      position: expect.objectContaining({
        a8: { pieceType: "bR" },
        e8: { pieceType: "bK" },
        a2: { pieceType: "wP" },
        e1: { pieceType: "wK" },
      }),
      activeColor: "black",
      castlingRights: {
        whiteKingside: true,
        whiteQueenside: false,
        blackKingside: false,
        blackQueenside: true,
      },
      selectedTool: DEFAULT_POSITION_SETUP_TOOL,
    });
  });

  it("places and clears pieces on the draft board", () => {
    const withPiece = applyPositionSetupTool({}, "d5", "wQ");
    const cleared = applyPositionSetupTool(
      withPiece,
      "d5",
      POSITION_SETUP_CLEAR_TOOL,
    );

    expect(withPiece).toEqual({
      d5: { pieceType: "wQ" },
    });
    expect(cleared).toEqual({});
    expect(
      applyPositionSetupTool(withPiece, "d5", POSITION_SETUP_MOVE_TOOL),
    ).toEqual(withPiece);
  });

  it("moves setup pieces without applying chess rules", () => {
    const moved = movePositionSetupPiece(
      {
        b1: { pieceType: "wN" },
        b8: { pieceType: "bR" },
      },
      "b1",
      "b8",
    );

    expect(moved).toEqual({
      b8: { pieceType: "wN" },
    });
  });

  it("builds a clean setup FEN with reset metadata", () => {
    const { fen, error } = buildPositionSetupFen(
      {
        e1: { pieceType: "wK" },
        d1: { pieceType: "wQ" },
        e8: { pieceType: "bK" },
        a7: { pieceType: "bP" },
      },
      "black",
      {
        whiteKingside: true,
        whiteQueenside: false,
        blackKingside: false,
        blackQueenside: true,
      },
    );

    expect(error).toBe("");
    expect(fen).toBe("4k3/p7/8/8/8/8/8/3QK3 b Kq - 0 1");
  });

  it("rejects setups without both kings", () => {
    const { fen, error } = buildPositionSetupFen(
      {
        e1: { pieceType: "wK" },
      },
      "white",
      {},
    );

    expect(fen).toBe("");
    expect(error).toBe("Cannot finish setup: missing black king.");
  });

  it("rejects pawns on the edge ranks", () => {
    const { fen, error } = buildPositionSetupFen(
      {
        a8: { pieceType: "wP" },
        e1: { pieceType: "wK" },
        e8: { pieceType: "bK" },
      },
      "white",
      {},
    );

    expect(fen).toBe("");
    expect(error).toBe("Cannot finish setup: some pawns are on the edge rows.");
  });
});
