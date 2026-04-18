import { describe, expect, it } from "vitest";
import { buildOpeningTreeArrow, mergeBoardArrows, parseUciMove } from "./openingTree.js";

describe("openingTree", () => {
  it("parses UCI moves", () => {
    expect(parseUciMove("e2e4")).toEqual({ from: "e2", to: "e4" });
    expect(parseUciMove("a7a8Q")).toEqual({ from: "a7", to: "a8", promotion: "q" });
  });

  it("rejects invalid UCI moves", () => {
    expect(parseUciMove("")).toBeNull();
    expect(parseUciMove("e2-e4")).toBeNull();
    expect(parseUciMove("zzzz")).toBeNull();
  });

  it("builds a hover arrow from a move", () => {
    expect(buildOpeningTreeArrow({ from: "g1", to: "f3" })).toEqual({
      startSquare: "g1",
      endSquare: "f3",
      color: "#f59e0b",
    });
  });

  it("merges preview arrows ahead of base arrows without duplicates", () => {
    expect(
      mergeBoardArrows(
        [
          { startSquare: "g1", endSquare: "f3", color: "#2563eb" },
          { startSquare: "b1", endSquare: "c3", color: "#2563eb" },
        ],
        { startSquare: "g1", endSquare: "f3", color: "#f59e0b" },
      ),
    ).toEqual([
      { startSquare: "g1", endSquare: "f3", color: "#f59e0b" },
      { startSquare: "b1", endSquare: "c3", color: "#2563eb" },
    ]);
  });
});
