import { describe, expect, it } from "vitest";
import {
  buildOtbSearchQuery,
  formatOtbGameDate,
  formatOtbResult,
  normalizeOtbSearchFilters,
} from "./otbSearch.js";

describe("normalizeOtbSearchFilters", () => {
  it("trims filters and applies the default max", () => {
    expect(
      normalizeOtbSearchFilters({
        player: " Morphy ",
        white: " Anderssen ",
        black: " ",
        event: " London ",
        yearFrom: " 1851 ",
        yearTo: "",
        result: " 1-0 ",
        eco: " C50 ",
        opening: " Italian ",
        max: "",
      }),
    ).toEqual({
      player: "Morphy",
      white: "Anderssen",
      black: "",
      event: "London",
      yearFrom: "1851",
      yearTo: "",
      result: "1-0",
      eco: "C50",
      opening: "Italian",
      max: "25",
    });
  });
});

describe("buildOtbSearchQuery", () => {
  it("requires at least one real filter", () => {
    expect(buildOtbSearchQuery({ max: "10" })).toEqual({
      query: "",
      error: "Enter at least one OTB search filter.",
    });
  });

  it("rejects invalid year ranges", () => {
    expect(buildOtbSearchQuery({ player: "Morphy", yearFrom: "1852", yearTo: "1851" })).toEqual({
      query: "",
      error: "From year cannot be greater than to year.",
    });
  });

  it("builds a query string from populated filters", () => {
    expect(
      buildOtbSearchQuery({
        player: "Morphy",
        event: "Paris",
        yearFrom: "1858",
        yearTo: "1858",
        result: "1-0",
        max: "5",
      }),
    ).toEqual({
      query: "player=Morphy&event=Paris&yearFrom=1858&yearTo=1858&result=1-0&max=5",
      error: "",
    });
  });
});

describe("formatOtbGameDate", () => {
  it("prefers the PGN date label", () => {
    expect(formatOtbGameDate({ dateLabel: "1858.??.??", createdAt: Date.UTC(1858, 0, 1) })).toBe(
      "1858.??.??",
    );
  });
});

describe("formatOtbResult", () => {
  it("shows the PGN result or a fallback", () => {
    expect(formatOtbResult({ result: "1-0" })).toBe("1-0");
    expect(formatOtbResult({ result: "" })).toBe("Unknown result");
  });
});
