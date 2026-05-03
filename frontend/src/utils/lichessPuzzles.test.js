import { describe, expect, it } from "vitest";

import {
  buildLichessPuzzleQuery,
  DEFAULT_LICHESS_PUZZLE_FILTERS,
  normalizeLichessPuzzleFilters,
} from "./lichessPuzzles.js";

describe("normalizeLichessPuzzleFilters", () => {
  it("keeps supported filters and trims freeform values", () => {
    expect(
      normalizeLichessPuzzleFilters({
        angle: " fork ",
        difficulty: "harder",
        color: "black",
      }),
    ).toEqual({
      angle: "fork",
      difficulty: "harder",
      color: "black",
    });
  });

  it("falls back to defaults for unsupported options", () => {
    expect(
      normalizeLichessPuzzleFilters({
        angle: " matingAttack ",
        difficulty: "legendary",
        color: "green",
      }),
    ).toEqual({
      angle: "matingAttack",
      difficulty: "",
      color: "",
    });
  });
});

describe("buildLichessPuzzleQuery", () => {
  it("serializes active filters", () => {
    expect(
      buildLichessPuzzleQuery({
        angle: "fork",
        difficulty: "harder",
        color: "black",
      }),
    ).toEqual({
      query: "angle=fork&difficulty=harder&color=black",
      error: "",
    });
  });

  it("returns an empty query for defaults", () => {
    expect(buildLichessPuzzleQuery(DEFAULT_LICHESS_PUZZLE_FILTERS)).toEqual({
      query: "",
      error: "",
    });
  });
});
