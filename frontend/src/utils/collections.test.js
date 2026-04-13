import { describe, expect, it } from "vitest";
import {
  createCollectionPayload,
  filterStudiesByCollection,
  getCollectionsForStudy,
  normalizeCollection,
} from "./collections.js";

describe("collections", () => {
  it("normalizes collection payloads", () => {
    expect(
      normalizeCollection({
        id: "collection-1",
        title: " Prep ",
        createdAt: "2026-04-13T20:00:00.000Z",
        updatedAt: "2026-04-13T20:01:00.000Z",
        studyIds: ["study-1", "study-1", "", "study-2"],
      }),
    ).toEqual({
      id: "collection-1",
      title: "Prep",
      createdAt: "2026-04-13T20:00:00.000Z",
      updatedAt: "2026-04-13T20:01:00.000Z",
      studyIds: ["study-1", "study-2"],
      studyCount: 2,
    });
  });

  it("creates collection create payloads", () => {
    expect(createCollectionPayload("  Endgames  ")).toEqual({
      title: "Endgames",
    });
  });

  it("looks up collections for one study", () => {
    expect(
      getCollectionsForStudy(
        [
          { id: "collection-1", title: "Prep", studyIds: ["study-1"] },
          { id: "collection-2", title: "Endgames", studyIds: ["study-2", "study-1"] },
        ],
        "study-1",
      ),
    ).toEqual([
      {
        id: "collection-1",
        title: "Prep",
        createdAt: "",
        updatedAt: "",
        studyIds: ["study-1"],
        studyCount: 1,
      },
      {
        id: "collection-2",
        title: "Endgames",
        createdAt: "",
        updatedAt: "",
        studyIds: ["study-2", "study-1"],
        studyCount: 2,
      },
    ]);
  });

  it("filters studies by selected collection", () => {
    expect(
      filterStudiesByCollection(
        [
          { id: "study-1", title: "A" },
          { id: "study-2", title: "B" },
          { id: "study-3", title: "C" },
        ],
        "collection-1",
        [{ id: "collection-1", title: "Prep", studyIds: ["study-2", "study-3"] }],
      ),
    ).toEqual([
      { id: "study-2", title: "B" },
      { id: "study-3", title: "C" },
    ]);
  });
});
