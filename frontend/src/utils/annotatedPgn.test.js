import { describe, expect, it } from "vitest";
import {
  normalizeImportedPgnData,
  parseAnnotatedPgn,
} from "./annotatedPgn.js";
import { getVariantLines } from "./variantTree.js";

describe("parseAnnotatedPgn", () => {
  it("preserves headers, comments, and variations from annotated PGN", () => {
    const annotatedPgn = `
[Event "FIDE Candidates Tournament 2026"]
[Site "lichess.org"]
[White "Caruana, Fabiano"]
[Black "Nakamura, Hikaru"]
[ChapterURL "https://lichess.org/study/Y1yXP80U/oxgS1aRW"]

{ Annotated by GM Axel Bachmann }
1. Nf3!? { Already a surprise from Fabi. } { [%clk 1:59:55] }
1... d5 { [%clk 1:59:43] }
2. c4 (2. e4 { A possible transposition. }) 2... e6 *
`.trim();

    const { game, importedPgnData, variantTree, error } = parseAnnotatedPgn(annotatedPgn, {
      allowEmpty: false,
    });

    expect(error).toBeNull();
    expect(game.history()).toEqual(["Nf3", "d5", "c4", "e6"]);
    expect(importedPgnData.headers).toEqual([
      { name: "Event", value: "FIDE Candidates Tournament 2026" },
      { name: "Site", value: "lichess.org" },
      { name: "White", value: "Caruana, Fabiano" },
      { name: "Black", value: "Nakamura, Hikaru" },
      {
        name: "ChapterURL",
        value: "https://lichess.org/study/Y1yXP80U/oxgS1aRW",
      },
    ]);
    expect(importedPgnData.mainlineComments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          comment: "Annotated by GM Axel Bachmann",
          ply: 0,
          moveNumber: 0,
          side: null,
          san: null,
        }),
        expect.objectContaining({
          comment: expect.stringContaining("Already a surprise from Fabi."),
          ply: 1,
          moveNumber: 1,
          side: "white",
          san: "Nf3",
        }),
        expect.objectContaining({
          comment: "[%clk 1:59:43]",
          ply: 2,
          moveNumber: 1,
          side: "black",
          san: "d5",
        }),
      ]),
    );
    expect(importedPgnData.additionalComments).toEqual([
      {
        text: "A possible transposition.",
        inVariation: true,
      },
    ]);
    expect(importedPgnData.variationSnippets).toEqual([
      "2. e4 { A possible transposition. }",
    ]);
    expect(importedPgnData.rawPgn).toBe(annotatedPgn);
    expect(getVariantLines(variantTree).map((line) => line.moves)).toEqual([
      ["Nf3", "d5", "c4", "e6"],
      ["Nf3", "d5", "e4"],
    ]);
  });

  it("rejects invalid annotated PGN", () => {
    const result = parseAnnotatedPgn("[Event \"Broken\"] 1. NotAMove", {
      allowEmpty: false,
    });

    expect(result.game).toBeNull();
    expect(result.importedPgnData).toBeNull();
    expect(result.variantTree).toBeNull();
    expect(result.error).toBe("Invalid PGN. Please check the notation and try again.");
  });
});

describe("normalizeImportedPgnData", () => {
  it("filters malformed persisted annotation data", () => {
    expect(
      normalizeImportedPgnData({
        rawPgn: "[Event \"Test\"] 1. e4",
        headers: [{ name: "Event", value: "Test" }, { foo: "bar" }],
        mainlineComments: [
          { comment: "First", ply: 1, moveNumber: 1, side: "white", san: "e4" },
          { comment: "" },
        ],
        additionalComments: [
          { text: "Variation note", inVariation: true },
          { text: "" },
        ],
        variationSnippets: ["1... c5", 7, ""],
      }),
    ).toEqual({
      rawPgn: "[Event \"Test\"] 1. e4",
      headers: [{ name: "Event", value: "Test" }],
      mainlineComments: [
        {
          comment: "First",
          fen: null,
          ply: 1,
          moveNumber: 1,
          side: "white",
          san: "e4",
        },
      ],
      additionalComments: [{ text: "Variation note", inVariation: true }],
      variationSnippets: ["1... c5"],
    });
  });
});
