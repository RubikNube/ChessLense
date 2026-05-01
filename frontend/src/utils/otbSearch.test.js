import { describe, expect, it } from "vitest";
import {
  buildOtbSearchQuery,
  getOtbPageWindow,
  OTB_COLOR_OPTIONS,
  OTB_PAGE_SIZE_OPTIONS,
  formatOtbGameDate,
  formatOtbMoveCount,
  formatOtbResult,
  normalizeOtbSearchFilters,
} from "./otbSearch.js";

describe("normalizeOtbSearchFilters", () => {
  it("trims filters and applies the default page size", () => {
      expect(
        normalizeOtbSearchFilters({
          player: " Morphy ",
          opponent: " Anderssen ",
          color: " white ",
          event: " London ",
          yearFrom: " 1851 ",
          yearTo: "",
          result: " 1-0 ",
          ecoFrom: " c20 ",
          ecoTo: " c99 ",
          opening: " Italian ",
          pageSize: "",
        }),
      ).toEqual({
        player: "Morphy",
        opponent: "Anderssen",
        color: "white",
        event: "London",
        yearFrom: "1851",
        yearTo: "",
        result: "1-0",
        ecoFrom: "C20",
        ecoTo: "C99",
        opening: "Italian",
        pageSize: "25",
      });
  });
});

describe("buildOtbSearchQuery", () => {
  it("requires at least one real filter", () => {
    expect(buildOtbSearchQuery({ pageSize: "10" })).toEqual({
      query: "",
      error: "Enter at least one OTB search filter.",
    });
  });

  it("requires a player before filtering by color", () => {
    expect(buildOtbSearchQuery({ opponent: "Anderssen", color: "white" })).toEqual({
      query: "",
      error: "Choose a player before filtering by color.",
    });
  });

  it("rejects invalid year ranges", () => {
    expect(buildOtbSearchQuery({ player: "Morphy", yearFrom: "1852", yearTo: "1851" })).toEqual({
      query: "",
      error: "From year cannot be greater than to year.",
    });
  });

  it("rejects invalid ECO ranges", () => {
    expect(buildOtbSearchQuery({ ecoFrom: "C5" })).toEqual({
      query: "",
      error: "ECO from must use a code like C50.",
    });

    expect(buildOtbSearchQuery({ ecoFrom: "C50", ecoTo: "B99" })).toEqual({
      query: "",
      error: "ECO from cannot be greater than ECO to.",
    });
  });

  it("builds a query string from populated filters", () => {
    expect(
      buildOtbSearchQuery({
        player: "Morphy",
        opponent: "Anderssen",
        color: "black",
        event: "Paris",
        yearFrom: "1858",
        yearTo: "1858",
        result: "1-0",
        ecoFrom: "c20",
        ecoTo: "c99",
        pageSize: "50",
      }),
    ).toEqual({
      query:
        "player=Morphy&opponent=Anderssen&color=black&event=Paris&yearFrom=1858&yearTo=1858&result=1-0&ecoFrom=C20&ecoTo=C99&pageSize=50&page=1",
      error: "",
    });
  });
});

describe("OTB_PAGE_SIZE_OPTIONS", () => {
  it("offers the supported per-page choices", () => {
    expect(OTB_PAGE_SIZE_OPTIONS).toEqual([
      { value: "10", label: "10" },
      { value: "25", label: "25" },
      { value: "50", label: "50" },
      { value: "100", label: "100" },
    ]);
  });
});

describe("OTB_COLOR_OPTIONS", () => {
  it("defaults to ignoring player color", () => {
    expect(OTB_COLOR_OPTIONS).toEqual([
      { value: "", label: "Ignore player color" },
      { value: "white", label: "White" },
      { value: "black", label: "Black" },
    ]);
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

describe("formatOtbMoveCount", () => {
  it("formats move counts with a fallback", () => {
    expect(formatOtbMoveCount({ moveCount: 31 })).toBe("31 moves");
    expect(formatOtbMoveCount({ moveCount: 1 })).toBe("1 move");
    expect(formatOtbMoveCount({ plyCount: 93 })).toBe("47 moves");
    expect(formatOtbMoveCount({ moveCount: 0 })).toBe("Move count unavailable");
  });
});

describe("getOtbPageWindow", () => {
  it("shows all pages when the total is small", () => {
    expect(getOtbPageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("shows a left ellipsis when the current page is deep into the results", () => {
    expect(getOtbPageWindow(8, 20)).toEqual([
      1,
      "ellipsis-left",
      6,
      7,
      8,
      9,
      10,
      "ellipsis-right",
      20,
    ]);
  });

  it("shows a right ellipsis near the start", () => {
    expect(getOtbPageWindow(2, 20)).toEqual([1, 2, 3, 4, 5, 6, "ellipsis-right", 20]);
  });

  it("shows both ellipses in the middle", () => {
    expect(getOtbPageWindow(10, 20)).toEqual([
      1,
      "ellipsis-left",
      8,
      9,
      10,
      11,
      12,
      "ellipsis-right",
      20,
    ]);
  });
});
