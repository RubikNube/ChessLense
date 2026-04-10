import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  FRONTEND_STATE_STORAGE_KEY,
  cloneGame,
  createGameFromPgn,
  loadPersistedAppState,
  parseGameFromPgn,
  savePersistedAppState,
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
        importedPgnData: {
          rawPgn: "[Event \"Test\"] 1. e4",
          headers: [{ name: "Event", value: "Test" }, { foo: "bar" }],
          mainlineComments: [{ comment: "First note", ply: 1, moveNumber: 1 }],
          additionalComments: [{ text: "Variation note", inVariation: true }],
          variationSnippets: ["1... c5", 9],
        },
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
        importedPgnData: {
          rawPgn: "[Event \"Test\"] 1. e4",
          headers: [{ name: "Event", value: "Test" }],
          mainlineComments: [{ comment: "First note", ply: 1, moveNumber: 1 }],
          additionalComments: [{ text: "Variation note", inVariation: true }],
          variationSnippets: ["1... c5"],
        },
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
      importedPgnData: null,
    });
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
