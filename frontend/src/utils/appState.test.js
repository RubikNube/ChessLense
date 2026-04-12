import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  createUserPositionComment,
  FRONTEND_STATE_STORAGE_KEY,
  cloneGame,
  createGameFromPgn,
  getPositionCommentsForFen,
  loadPersistedAppState,
  parseGameFromPgn,
  removePositionCommentEntry,
  savePositionCommentEntry,
  savePersistedAppState,
  seedPositionCommentsFromImportedPgnData,
  serializeMove,
} from "./appState.js";
import {
  buildGameToNode,
  createEmptyVariantTree,
  createVariantTreeFromMoves,
  getMoveHistoryForNode,
  redoInVariantTree,
} from "./variantTree.js";

function createStorage(value) {
  return {
    storedValue: value ?? null,
    getItem(key) {
      return key === FRONTEND_STATE_STORAGE_KEY ? this.storedValue : null;
    },
    setItem(key, nextValue) {
      if (key === FRONTEND_STATE_STORAGE_KEY) {
        this.storedValue = nextValue;
      }
    },
  };
}

describe("parseGameFromPgn", () => {
  it("creates an empty game for blank input when empty PGN is allowed", () => {
    const { game, error } = parseGameFromPgn("");

    expect(error).toBeNull();
    expect(game).toBeInstanceOf(Chess);
    expect(game.history()).toEqual([]);
  });

  it("rejects blank input when empty PGN is not allowed", () => {
    const { game, error } = parseGameFromPgn("", { allowEmpty: false });

    expect(game).toBeNull();
    expect(error).toBe("Paste a PGN to import.");
  });

  it("loads a valid PGN into a Chess instance", () => {
    const { game, error } = parseGameFromPgn("1. e4 e5 2. Nf3 Nc6");

    expect(error).toBeNull();
    expect(game.history()).toEqual(["e4", "e5", "Nf3", "Nc6"]);
  });

  it("falls back to a fresh game when creating from invalid PGN", () => {
    const game = createGameFromPgn("not a valid pgn");

    expect(game).toBeInstanceOf(Chess);
    expect(game.history()).toEqual([]);
  });
});

describe("persisted app state", () => {
  it("migrates linear persisted history into the variant tree", () => {
    const storage = createStorage(
      JSON.stringify({
        gamePgn: "1. e4 e5",
        redoStack: [
          { from: "g1", to: "f3" },
          { from: "b8", to: "c6" },
          { from: "a7" },
        ],
        boardOrientation: "black",
        showMoveHistory: false,
        showEngineWindow: "yes",
        showEvaluationBar: true,
        showComments: false,
        showImportedPgn: false,
        showVariants: false,
        showVariantArrows: true,
        importedPgnData: {
          rawPgn: "[Event \"Test\"] 1. e4",
          headers: [{ name: "Event", value: "Test" }, { foo: "bar" }],
          mainlineComments: [{ comment: "First note", ply: 1, moveNumber: 1 }],
          additionalComments: [{ text: "Variation note", inVariation: true }],
          variationSnippets: ["1... c5", 9],
        },
        positionComments: [
          { id: "saved-1", fen: "fen-1", comment: " Keep me ", source: "user" },
          { comment: "" },
        ],
      }),
    );

    const loadedState = loadPersistedAppState(storage);

    expect(getMoveHistoryForNode(loadedState.variantTree)).toEqual(["e4", "e5"]);
    expect(
      buildGameToNode(redoInVariantTree(redoInVariantTree(loadedState.variantTree))).history(),
    ).toEqual(["e4", "e5", "Nf3", "Nc6"]);
    expect(loadedState).toEqual({
      variantTree: expect.objectContaining({
        currentNodeId: expect.any(String),
        activeLineLeafId: expect.any(String),
      }),
      boardOrientation: "black",
      showMoveHistory: false,
      showEngineWindow: true,
      showEvaluationBar: true,
      showComments: false,
      showImportedPgn: false,
      showVariants: false,
      showVariantArrows: true,
      importedPgnData: {
        rawPgn: "[Event \"Test\"] 1. e4",
        headers: [{ name: "Event", value: "Test" }],
        mainlineComments: [
          {
            comment: "First note",
            fen: null,
            ply: 1,
            moveNumber: 1,
            side: null,
            san: null,
          },
        ],
        additionalComments: [{ text: "Variation note", inVariation: true }],
        variationSnippets: ["1... c5"],
      },
      positionComments: [
        {
          id: "saved-1",
          comment: "Keep me",
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

  it("returns null for malformed JSON", () => {
    const storage = createStorage("{");

    expect(loadPersistedAppState(storage)).toBeNull();
  });

  it("serializes and saves the durable UI state", () => {
    const storage = createStorage();
    const variantTree = createVariantTreeFromMoves([
      { from: "e2", to: "e4" },
      { from: "e7", to: "e5" },
    ]);

    const didSave = savePersistedAppState(
      {
        variantTree,
        boardOrientation: "black",
        showMoveHistory: false,
        showEngineWindow: true,
        showEvaluationBar: false,
        showComments: true,
        showImportedPgn: false,
        showVariants: false,
        showVariantArrows: true,
        importedPgnData: {
          rawPgn: "[Event \"Test\"] 1. e4",
          headers: [{ name: "Event", value: "Test" }],
          mainlineComments: [{ comment: "First note", ply: 1, moveNumber: 1 }],
          additionalComments: [{ text: "Variation note", inVariation: true }],
          variationSnippets: ["1... c5"],
        },
        positionComments: [
          {
            id: "comment-1",
            comment: "Editable note",
            fen: "fen-1",
            moveNumber: 1,
            side: "white",
            san: "e4",
            source: "user",
          },
        ],
      },
      storage,
    );

    expect(didSave).toBe(true);
    expect(JSON.parse(storage.storedValue)).toEqual({
      variantTree,
      boardOrientation: "black",
      showMoveHistory: false,
      showEngineWindow: true,
      showEvaluationBar: false,
      showComments: true,
      showImportedPgn: false,
      showVariants: false,
      showVariantArrows: true,
      importedPgnData: {
        rawPgn: "[Event \"Test\"] 1. e4",
        headers: [{ name: "Event", value: "Test" }],
        mainlineComments: [
          {
            comment: "First note",
            fen: null,
            ply: 1,
            moveNumber: 1,
            side: null,
            san: null,
          },
        ],
        additionalComments: [{ text: "Variation note", inVariation: true }],
        variationSnippets: ["1... c5"],
      },
      positionComments: [
        {
          id: "comment-1",
          comment: "Editable note",
          fen: "fen-1",
          ply: null,
          moveNumber: 1,
          side: "white",
          san: "e4",
          source: "user",
        },
      ],
    });
  });

  it("falls back to an empty tree when the persisted variant tree is invalid", () => {
    const storage = createStorage(
      JSON.stringify({
        variantTree: { initialFen: "bad fen" },
      }),
    );

    expect(loadPersistedAppState(storage)).toEqual({
      variantTree: createEmptyVariantTree(),
      boardOrientation: "white",
      showMoveHistory: true,
      showEngineWindow: true,
      showEvaluationBar: true,
      showComments: true,
      showImportedPgn: true,
      showVariants: true,
      showVariantArrows: false,
      importedPgnData: null,
      positionComments: [],
    });
  });

  it("seeds editable comments from imported main-line comments when no position comments exist", () => {
    const storage = createStorage(
      JSON.stringify({
        importedPgnData: {
          rawPgn: "[Event \"Seed\"] 1. e4 {First note}",
          headers: [{ name: "Event", value: "Seed" }],
          mainlineComments: [
            {
              fen: "fen-1",
              comment: "First note",
              ply: 1,
              moveNumber: 1,
              side: "white",
              san: "e4",
            },
          ],
          additionalComments: [],
          variationSnippets: [],
        },
      }),
    );

    const loadedState = loadPersistedAppState(storage);

    expect(loadedState.positionComments).toEqual([
      {
        id: "imported-mainline-0",
        comment: "First note",
        fen: "fen-1",
        ply: 1,
        moveNumber: 1,
        side: "white",
        san: "e4",
        source: "imported-mainline",
      },
    ]);
  });
});

describe("move helpers", () => {
  it("serializes only the move fields needed for redo", () => {
    expect(
      serializeMove({ from: "e7", to: "e8", promotion: "q", color: "b" }),
    ).toEqual({
      from: "e7",
      to: "e8",
      promotion: "q",
    });
  });

  it("clones the current game without sharing instance state", () => {
    const game = new Chess();
    game.move("e4");

    const clone = cloneGame(game);
    clone.move("e5");

    expect(game.history()).toEqual(["e4"]);
    expect(clone.history()).toEqual(["e4", "e5"]);
  });
});

describe("position comments", () => {
  it("creates editable user comments with generated ids", () => {
    expect(
      createUserPositionComment({
        fen: "fen-1",
        comment: "Fresh note",
        ply: 1,
        moveNumber: 1,
        side: "white",
        san: "e4",
      }),
    ).toEqual({
      id: expect.any(String),
      comment: "Fresh note",
      fen: "fen-1",
      ply: 1,
      moveNumber: 1,
      side: "white",
      san: "e4",
      source: "user",
    });
  });

  it("updates an existing comment without changing its identity or order", () => {
    expect(
      savePositionCommentEntry(
        [
          {
            id: "comment-1",
            comment: "Old note",
            fen: "fen-1",
            ply: 1,
            moveNumber: 1,
            side: "white",
            san: "e4",
            source: "user",
          },
          {
            id: "comment-2",
            comment: "Second note",
            fen: "fen-2",
            ply: 2,
            moveNumber: 1,
            side: "black",
            san: "e5",
            source: "user",
          },
        ],
        {
          id: "comment-1",
          comment: "Updated note",
          fen: "fen-1",
          ply: 1,
          moveNumber: 1,
          side: "white",
          san: "e4",
          source: "user",
        },
      ),
    ).toEqual([
      {
        id: "comment-1",
        comment: "Updated note",
        fen: "fen-1",
        ply: 1,
        moveNumber: 1,
        side: "white",
        san: "e4",
        source: "user",
      },
      {
        id: "comment-2",
        comment: "Second note",
        fen: "fen-2",
        ply: 2,
        moveNumber: 1,
        side: "black",
        san: "e5",
        source: "user",
      },
    ]);
  });

  it("looks up only comments matching the current fen", () => {
    expect(
      getPositionCommentsForFen(
        [
          {
            id: "comment-1",
            comment: "Current",
            fen: "fen-1",
            source: "user",
          },
          {
            id: "comment-2",
            comment: "Other",
            fen: "fen-2",
            source: "user",
          },
        ],
        "fen-1",
      ),
    ).toEqual([
      {
        id: "comment-1",
        comment: "Current",
        fen: "fen-1",
        ply: null,
        moveNumber: null,
        side: null,
        san: null,
        source: "user",
      },
    ]);
  });

  it("removes a comment by id without disturbing other comments", () => {
    expect(
      removePositionCommentEntry(
        [
          {
            id: "comment-1",
            comment: "Current",
            fen: "fen-1",
            source: "user",
          },
          {
            id: "comment-2",
            comment: "Other",
            fen: "fen-2",
            source: "user",
          },
        ],
        "comment-1",
      ),
    ).toEqual([
      {
        id: "comment-2",
        comment: "Other",
        fen: "fen-2",
        ply: null,
        moveNumber: null,
        side: null,
        san: null,
        source: "user",
      },
    ]);
  });

  it("seeds imported main-line comments into editable comments", () => {
    expect(
      seedPositionCommentsFromImportedPgnData({
        mainlineComments: [
          {
            fen: "fen-1",
            comment: "Imported",
            ply: 1,
            moveNumber: 1,
            side: "white",
            san: "e4",
          },
        ],
      }),
    ).toEqual([
      {
        id: "imported-mainline-0",
        comment: "Imported",
        fen: "fen-1",
        ply: 1,
        moveNumber: 1,
        side: "white",
        san: "e4",
        source: "imported-mainline",
      },
    ]);
  });
});
