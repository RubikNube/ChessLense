import { describe, expect, it } from "vitest";
import {
  buildLichessSearchQuery,
  formatLichessGameDate,
  formatLichessResult,
  normalizeLichessSearchFilters,
} from "./lichessSearch.js";

describe("normalizeLichessSearchFilters", () => {
  it("trims string filters and applies the default max", () => {
    expect(
      normalizeLichessSearchFilters({
        player: " MagnusCarlsen ",
        opponent: " Hikaru ",
        year: " 2024 ",
        color: " white ",
        perfType: " blitz ",
        max: "",
      }),
    ).toEqual({
      player: "MagnusCarlsen",
      opponent: "Hikaru",
      year: "2024",
      color: "white",
      perfType: "blitz",
      max: "10",
    });
  });
});

describe("buildLichessSearchQuery", () => {
  it("requires a player name", () => {
    expect(buildLichessSearchQuery({ player: "" })).toEqual({
      query: "",
      error: "Enter at least one Lichess player to search.",
    });
  });

  it("rejects non-numeric years", () => {
    expect(buildLichessSearchQuery({ player: "MagnusCarlsen", year: "20A4" })).toEqual({
      query: "",
      error: "Year must use four digits.",
    });
  });

  it("builds a query string from populated filters", () => {
    expect(
      buildLichessSearchQuery({
        player: "MagnusCarlsen",
        opponent: "Hikaru",
        year: "2024",
        color: "white",
        perfType: "blitz",
        max: "5",
      }),
    ).toEqual({
      query:
        "player=MagnusCarlsen&opponent=Hikaru&year=2024&color=white&perfType=blitz&max=5",
      error: "",
    });
  });
});

describe("formatLichessGameDate", () => {
  it("formats timestamps for display", () => {
    expect(formatLichessGameDate(Date.UTC(2024, 0, 5))).toBe("Jan 5, 2024");
  });
});

describe("formatLichessResult", () => {
  it("formats decisive and drawn results", () => {
    expect(formatLichessResult({ winner: "white" })).toBe("1-0");
    expect(formatLichessResult({ winner: "black" })).toBe("0-1");
    expect(formatLichessResult({ winner: null })).toBe("1/2-1/2");
  });
});
