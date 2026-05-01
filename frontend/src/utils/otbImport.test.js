import { describe, expect, it } from "vitest";
import { formatOtbImportSummary, validateOtbImportFile } from "./otbImport.js";

describe("validateOtbImportFile", () => {
  it("requires a selected file", () => {
    expect(validateOtbImportFile(null)).toBe("Choose a .pgn file to import.");
  });

  it("requires the .pgn extension", () => {
    expect(validateOtbImportFile({ name: "games.txt" })).toBe(
      "Select a file with the .pgn extension.",
    );
  });

  it("accepts .pgn files case-insensitively", () => {
    expect(validateOtbImportFile({ name: "Masters.PGN" })).toBe("");
  });
});

describe("formatOtbImportSummary", () => {
  it("formats the server import counts for display", () => {
    expect(
      formatOtbImportSummary({
        fileName: "masters.pgn",
        totalGames: 12,
        importedGames: 10,
        skippedGames: 2,
      }),
    ).toBe("Processed 12 games from masters.pgn: 10 imported, 2 duplicates skipped.");
  });
});
