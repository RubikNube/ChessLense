import { describe, expect, it } from "vitest";
import {
  buildBoardHighlightSquareStyles,
  DEFAULT_BOARD_ARROW_COLOR,
  getBoardAnnotationColor,
  mergeBoardArrowCollections,
  normalizeNodeBoardAnnotations,
  SECONDARY_BOARD_ARROW_COLOR,
  TERTIARY_BOARD_ARROW_COLOR,
  toggleBoardArrowInAnnotations,
  toggleBoardHighlightInAnnotations,
} from "./boardAnnotations.js";

describe("boardAnnotations", () => {
  it("normalizes and deduplicates node annotations", () => {
    expect(
      normalizeNodeBoardAnnotations({
        arrows: [
          { startSquare: "E2", endSquare: "E4", color: "#FFAA00" },
          { startSquare: "e2", endSquare: "e4", color: "#ffaa00" },
          { startSquare: "e2", endSquare: "e2", color: "#ffaa00" },
        ],
        highlights: [
          { square: "D4", color: "#4CAF50" },
          { square: "d4", color: "#4caf50" },
          { square: "z9", color: "#4caf50" },
        ],
      }),
    ).toEqual({
      arrows: [{ startSquare: "e2", endSquare: "e4", color: "#ffaa00" }],
      highlights: [{ square: "d4", color: "#4caf50" }],
    });
  });

  it("toggles arrows by path and updates their color", () => {
    const added = toggleBoardArrowInAnnotations(
      {},
      { startSquare: "e2", endSquare: "e4", color: DEFAULT_BOARD_ARROW_COLOR },
    );
    const recolored = toggleBoardArrowInAnnotations(added, {
      startSquare: "e2",
      endSquare: "e4",
      color: SECONDARY_BOARD_ARROW_COLOR,
    });
    const removed = toggleBoardArrowInAnnotations(recolored, {
      startSquare: "e2",
      endSquare: "e4",
      color: SECONDARY_BOARD_ARROW_COLOR,
    });

    expect(added.arrows).toEqual([
      { startSquare: "e2", endSquare: "e4", color: DEFAULT_BOARD_ARROW_COLOR },
    ]);
    expect(recolored.arrows).toEqual([
      { startSquare: "e2", endSquare: "e4", color: SECONDARY_BOARD_ARROW_COLOR },
    ]);
    expect(removed.arrows).toEqual([]);
  });

  it("toggles same-square highlights by square and updates their color", () => {
    const added = toggleBoardHighlightInAnnotations(
      {},
      { square: "e4", color: DEFAULT_BOARD_ARROW_COLOR },
    );
    const recolored = toggleBoardHighlightInAnnotations(added, {
      square: "e4",
      color: TERTIARY_BOARD_ARROW_COLOR,
    });
    const removed = toggleBoardHighlightInAnnotations(recolored, {
      square: "e4",
      color: TERTIARY_BOARD_ARROW_COLOR,
    });

    expect(added.highlights).toEqual([
      { square: "e4", color: DEFAULT_BOARD_ARROW_COLOR },
    ]);
    expect(recolored.highlights).toEqual([
      { square: "e4", color: TERTIARY_BOARD_ARROW_COLOR },
    ]);
    expect(removed.highlights).toEqual([]);
  });

  it("merges board arrows with later collections taking priority", () => {
    expect(
      mergeBoardArrowCollections(
        [{ startSquare: "g1", endSquare: "f3", color: "#2563eb" }],
        [{ startSquare: "g1", endSquare: "f3", color: DEFAULT_BOARD_ARROW_COLOR }],
        [{ startSquare: "b1", endSquare: "c3", color: SECONDARY_BOARD_ARROW_COLOR }],
      ),
    ).toEqual([
      { startSquare: "g1", endSquare: "f3", color: DEFAULT_BOARD_ARROW_COLOR },
      { startSquare: "b1", endSquare: "c3", color: SECONDARY_BOARD_ARROW_COLOR },
    ]);
  });

  it("builds square styles for persisted highlights", () => {
    expect(
      buildBoardHighlightSquareStyles([
        { square: "e4", color: DEFAULT_BOARD_ARROW_COLOR },
      ]),
    ).toEqual({
      e4: {
        backgroundColor: "rgba(255, 170, 0, 0.38)",
        boxShadow: "inset 0 0 0 2px rgba(255, 170, 0, 0.7)",
      },
    });
  });

  it("returns the correct annotation color for board modifiers", () => {
    expect(getBoardAnnotationColor({})).toBe(DEFAULT_BOARD_ARROW_COLOR);
    expect(getBoardAnnotationColor({ shiftKey: true })).toBe(SECONDARY_BOARD_ARROW_COLOR);
    expect(getBoardAnnotationColor({ ctrlKey: true })).toBe(TERTIARY_BOARD_ARROW_COLOR);
  });
});
