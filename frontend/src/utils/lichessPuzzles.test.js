import { describe, expect, it } from "vitest";

import {
  buildLichessPuzzleQuery,
  DEFAULT_LICHESS_PUZZLE_FILTERS,
  filterLichessPuzzleThemeOptions,
  getLichessPuzzleThemeOption,
  normalizeLichessPuzzleFilters,
} from "./lichessPuzzles.js";

describe("normalizeLichessPuzzleFilters", () => {
  it("keeps supported filters and trims the opening filter", () => {
    expect(
      normalizeLichessPuzzleFilters({
        theme: "fork",
        opening: " italianGame ",
        difficulty: "harder",
        color: "black",
      }),
    ).toEqual({
      theme: "fork",
      opening: "",
      difficulty: "harder",
      color: "black",
    });
  });

  it("migrates legacy theme angles into the theme filter", () => {
    expect(
      normalizeLichessPuzzleFilters({
        angle: " fork ",
        difficulty: "normal",
        color: "white",
      }),
    ).toEqual({
      theme: "fork",
      opening: "",
      difficulty: "normal",
      color: "white",
    });
  });

  it("migrates unknown legacy angles into the opening filter", () => {
    expect(
      normalizeLichessPuzzleFilters({
        angle: " italianGame ",
        difficulty: "legendary",
        color: "green",
      }),
    ).toEqual({
      theme: "",
      opening: "italianGame",
      difficulty: "",
      color: "",
    });
  });
});

describe("buildLichessPuzzleQuery", () => {
  it("serializes the selected theme into the existing angle parameter", () => {
    expect(
      buildLichessPuzzleQuery({
        theme: "fork",
        opening: "",
        difficulty: "harder",
        color: "black",
      }),
    ).toEqual({
      query: "angle=fork&difficulty=harder&color=black",
      error: "",
    });
  });

  it("serializes the opening when no theme is selected", () => {
    expect(
      buildLichessPuzzleQuery({
        theme: "",
        opening: "italianGame",
        difficulty: "normal",
        color: "",
      }),
    ).toEqual({
      query: "angle=italianGame&difficulty=normal",
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

describe("theme helpers", () => {
  it("looks up theme metadata by value", () => {
    expect(getLichessPuzzleThemeOption("mateIn2")).toEqual(
      expect.objectContaining({
        value: "mateIn2",
        label: "Mate in 2",
      }),
    );
  });

  it("filters theme options by label, value, and description text", () => {
    expect(filterLichessPuzzleThemeOptions("mate")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "mateIn1" }),
        expect.objectContaining({ value: "backRankMate" }),
      ]),
    );
    expect(filterLichessPuzzleThemeOptions("fried liver")).toEqual([
      expect.objectContaining({ value: "attackingF2F7" }),
    ]);
  });
});
