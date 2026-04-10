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
  it("normalizes persisted fields and filters invalid redo moves", () => {
    const storage = createStorage(
      JSON.stringify({
        gamePgn: "1. e4 e5",
        redoStack: [
          { from: "e2", to: "e4" },
          { from: "a7" },
          { from: "g7", to: "g8", promotion: "q" },
        ],
        boardOrientation: "black",
        showMoveHistory: false,
        showEngineWindow: "yes",
        showEvaluationBar: true,
      }),
    );

    expect(loadPersistedAppState(storage)).toEqual({
      gamePgn: "1. e4 e5",
      redoStack: [
        { from: "e2", to: "e4" },
        { from: "g7", to: "g8", promotion: "q" },
      ],
      boardOrientation: "black",
      showMoveHistory: false,
      showEngineWindow: true,
      showEvaluationBar: true,
    });
  });

  it("returns null for malformed JSON", () => {
    const storage = createStorage("{");

    expect(loadPersistedAppState(storage)).toBeNull();
  });

  it("serializes and saves the durable UI state", () => {
    const storage = createStorage();
    const game = new Chess();
    game.move("e4");

    const didSave = savePersistedAppState(
      {
        game,
        redoStack: [{ from: "e7", to: "e5", promotion: "q", color: "b" }],
        boardOrientation: "black",
        showMoveHistory: false,
        showEngineWindow: true,
        showEvaluationBar: false,
      },
      storage,
    );

    expect(didSave).toBe(true);
    expect(JSON.parse(storage.storedValue)).toEqual({
      gamePgn: game.pgn(),
      redoStack: [{ from: "e7", to: "e5", promotion: "q" }],
      boardOrientation: "black",
      showMoveHistory: false,
      showEngineWindow: true,
      showEvaluationBar: false,
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
