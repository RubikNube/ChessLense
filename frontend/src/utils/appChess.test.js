import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  buildEngineVariantPreview,
  buildPositionCommentContext,
  formatMoveAsUci,
  getComputerPlayOutcomeText,
  getCurrentMoveLabel,
  getPgnHeaderValue,
  parseUciMove,
} from "./appChess.js";

describe("app chess helpers", () => {
  it("formats move labels and comment context", () => {
    expect(getCurrentMoveLabel([])).toBe("Game introduction");
    expect(getCurrentMoveLabel(["e4", "e5"])).toBe("1... e5");
    expect(buildPositionCommentContext("fen", ["e4"])).toEqual({
      fen: "fen",
      ply: 1,
      moveNumber: 1,
      side: "white",
      san: "e4",
    });
  });

  it("normalizes UCI moves and builds SAN previews", () => {
    expect(parseUciMove("E7E8Q")).toEqual({
      from: "e7",
      to: "e8",
      promotion: "q",
    });
    expect(formatMoveAsUci({ from: "e7", to: "e8", promotion: "q" })).toBe(
      "e7e8q",
    );
    expect(
      buildEngineVariantPreview(new Chess().fen(), ["e2e4", "e7e5"])
        .displayText,
    ).toBe("1. e4 e5");
  });

  it("reads headers and reports terminal outcomes", () => {
    expect(
      getPgnHeaderValue(
        { headers: [{ name: "White", value: " Alice " }] },
        "white",
      ),
    ).toBe("Alice");
    const game = new Chess();
    game.loadPgn("1. f3 e5 2. g4 Qh4#");
    expect(getComputerPlayOutcomeText(game, "black")).toBe(
      "You won by checkmate.",
    );
  });
});
