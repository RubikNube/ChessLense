import { describe, expect, it } from "vitest";
import {
  buildOtbOpeningTreeExportQuery,
  buildOtbOpeningTreeQuery,
  normalizeOtbTreeScope,
} from "./otbOpeningTree.js";

describe("OTB player opening tree queries", () => {
  it("retains applied filters while the repertoire color overrides search color", () => {
    const { query, error } = buildOtbOpeningTreeQuery(
      {
        player: " Morphy ",
        opponent: " Anderssen ",
        color: "black",
        event: " Paris ",
        yearFrom: "1850",
        pageSize: "100",
      },
      "white",
      "start-fen",
    );
    const params = new URLSearchParams(query);

    expect(error).toBe("");
    expect(params.get("player")).toBe("Morphy");
    expect(params.get("opponent")).toBe("Anderssen");
    expect(params.get("color")).toBe("white");
    expect(params.get("event")).toBe("Paris");
    expect(params.get("yearFrom")).toBe("1850");
    expect(params.has("pageSize")).toBe(false);
  });

  it("requires a player and a board position", () => {
    expect(buildOtbOpeningTreeQuery({}, "white", "fen").error).toMatch(
      /player/i,
    );
    expect(
      buildOtbOpeningTreeQuery({ player: "Morphy" }, "white", "").error,
    ).toMatch(/position/i);
  });

  it("validates and serializes export limits", () => {
    const invalid = buildOtbOpeningTreeExportQuery(
      { player: "Morphy" },
      { maxDepth: "61", minGames: "1", maxBranches: "5" },
    );
    const valid = buildOtbOpeningTreeExportQuery(
      { player: "Morphy", opening: "Italian" },
      { maxDepth: "20", minGames: "2", maxBranches: "5" },
    );
    const params = new URLSearchParams(valid.query);

    expect(invalid.error).toMatch(/60/);
    expect(valid.error).toBe("");
    expect(params.get("opening")).toBe("Italian");
    expect(params.get("maxDepth")).toBe("20");
    expect(params.get("minGames")).toBe("2");
    expect(params.get("maxBranches")).toBe("5");
  });

  it("normalizes a scope without pagination or search color", () => {
    expect(
      normalizeOtbTreeScope({
        player: " Morphy ",
        color: "white",
        pageSize: "10",
      }),
    ).toEqual({
      player: "Morphy",
      opponent: "",
      event: "",
      yearFrom: "",
      yearTo: "",
      result: "",
      ecoFrom: "",
      ecoTo: "",
      opening: "",
      moveCountMin: "",
      moveCountMax: "",
    });
  });
});
