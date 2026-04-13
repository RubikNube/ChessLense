import { describe, expect, it } from "vitest";
import {
  buildStudyTitle,
  createStudySavePayload,
  normalizeStudy,
  normalizeStudySummary,
} from "./studies.js";

describe("studies", () => {
  it("builds fallback title from PGN headers", () => {
    expect(
      buildStudyTitle({
        headers: [
          { name: "White", value: "Alice" },
          { name: "Black", value: "Bob" },
          { name: "Event", value: "Club Match" },
        ],
      }),
    ).toBe("Alice vs Bob - Club Match");
  });

  it("normalizes study summaries", () => {
    expect(
      normalizeStudySummary({
        id: "study-1",
        title: "  Study title ",
        createdAt: "2026-04-13T20:00:00.000Z",
        updatedAt: "2026-04-13T20:05:00.000Z",
        summary: {
          event: " Club Match ",
          white: "Alice",
          black: "Bob",
          commentCount: 2,
          nodeCount: 7,
          maxPly: 12,
          hasImportedPgn: true,
        },
      }),
    ).toEqual({
      id: "study-1",
      title: "Study title",
      createdAt: "2026-04-13T20:00:00.000Z",
      updatedAt: "2026-04-13T20:05:00.000Z",
      summary: {
        event: "Club Match",
        white: "Alice",
        black: "Bob",
        commentCount: 2,
        nodeCount: 7,
        maxPly: 12,
        hasImportedPgn: true,
      },
    });
  });

  it("normalizes full studies for loading", () => {
    const study = normalizeStudy({
      id: "study-1",
      title: "Notes",
      createdAt: "2026-04-13T20:00:00.000Z",
      updatedAt: "2026-04-13T20:05:00.000Z",
      summary: {
        event: "Club Match",
      },
      variantTree: {
        currentNodeId: "root",
      },
      importedPgnData: {
        rawPgn: '[Event "Club Match"] 1. e4 *',
        headers: [{ name: "Event", value: "Club Match" }],
      },
      positionComments: [{ id: "comment-1", comment: "Plan", fen: "fen-1" }],
    });

    expect(study).toEqual({
      id: "study-1",
      title: "Notes",
      createdAt: "2026-04-13T20:00:00.000Z",
      updatedAt: "2026-04-13T20:05:00.000Z",
      summary: {
        event: "Club Match",
        white: "",
        black: "",
        commentCount: 0,
        nodeCount: 0,
        maxPly: 0,
        hasImportedPgn: false,
      },
      variantTree: expect.objectContaining({
        currentNodeId: expect.any(String),
      }),
      importedPgnData: {
        rawPgn: '[Event "Club Match"] 1. e4 *',
        headers: [{ name: "Event", value: "Club Match" }],
        mainlineComments: [],
        additionalComments: [],
        variationSnippets: [],
      },
      positionComments: [
        {
          id: "comment-1",
          comment: "Plan",
          fen: "fen-1",
          ply: null,
          moveNumber: null,
          side: null,
          san: null,
          source: "user",
        },
      ],
    });
  });

  it("creates save payload from current workspace", () => {
    expect(
      createStudySavePayload({
        title: "",
        variantTree: {
          currentNodeId: "root",
        },
        importedPgnData: {
          headers: [
            { name: "White", value: "Alice" },
            { name: "Black", value: "Bob" },
          ],
        },
        positionComments: [{ id: "comment-1", comment: "Plan", fen: "fen-1" }],
      }),
    ).toEqual({
      title: "Alice vs Bob",
      variantTree: expect.objectContaining({
        currentNodeId: expect.any(String),
      }),
      importedPgnData: {
        rawPgn: "",
        headers: [
          { name: "White", value: "Alice" },
          { name: "Black", value: "Bob" },
        ],
        mainlineComments: [],
        additionalComments: [],
        variationSnippets: [],
      },
      positionComments: [
        {
          id: "comment-1",
          comment: "Plan",
          fen: "fen-1",
          ply: null,
          moveNumber: null,
          side: null,
          san: null,
          source: "user",
        },
      ],
    });
  });
});
