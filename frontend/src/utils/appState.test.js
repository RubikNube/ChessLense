import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { DEFAULT_LICHESS_PUZZLE_FILTERS } from "./lichessPuzzles.js";
import { DEFAULT_LICHESS_SEARCH_FILTERS } from "./lichessSearch.js";
import { DEFAULT_OTB_SEARCH_FILTERS } from "./otbSearch.js";
import {
  createUserPositionComment,
  DEFAULT_ENGINE_SEARCH_DEPTH,
  FRONTEND_STATE_STORAGE_KEY,
  cloneGame,
  createGameFromPgn,
  DEFAULT_BOARD_SOUNDS_ENABLED,
  getPositionCommentsForFen,
  loadPersistedAppState,
  MAX_ENGINE_SEARCH_DEPTH,
  MIN_ENGINE_SEARCH_DEPTH,
  normalizeEngineSearchDepth,
  parseGameFromPgn,
  removePositionCommentEntry,
  savePositionCommentEntry,
  savePersistedAppState,
  seedPositionCommentsFromImportedPgnData,
  serializeMove,
} from "./appState.js";
import {
  createComputerPlayTrainingState,
  createEmptyTrainingState,
  TRAINING_COMPUTER_PLAY_SOURCE_CURRENT,
  TRAINING_MODE_GUESS_THE_MOVE,
  TRAINING_SIDE_WHITE,
  TRAINING_MODE_PLAY_COMPUTER,
  TRAINING_MODE_REPLAY_GAME,
  TRAINING_STATUS_ACTIVE,
} from "./training.js";
import {
  buildGameToNode,
  createEmptyVariantTree,
  createVariantTreeFromMoves,
  getMoveHistoryForNode,
  redoInVariantTree,
  toggleBoardArrowAnnotation,
  toggleBoardHighlightAnnotation,
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
  it("normalizes engine search depth values", () => {
    expect(normalizeEngineSearchDepth("16")).toBe(16);
    expect(normalizeEngineSearchDepth("0")).toBe(MIN_ENGINE_SEARCH_DEPTH);
    expect(normalizeEngineSearchDepth("999")).toBe(MAX_ENGINE_SEARCH_DEPTH);
    expect(normalizeEngineSearchDepth("abc")).toBe(DEFAULT_ENGINE_SEARCH_DEPTH);
  });

  it("migrates linear persisted history into the variant tree", () => {
    const storage = createStorage(
      JSON.stringify({
        gamePgn: "1. e4 e5",
        redoStack: [
          { from: "g1", to: "f3" },
          { from: "b8", to: "c6" },
          { from: "a7" },
        ],
        engineSearchDepth: "18",
        lichessApiToken: "saved-token",
        boardOrientation: "black",
        showMoveHistory: false,
        showTrainingWindow: false,
        showEngineWindow: "yes",
        showEvaluationBar: true,
        boardSoundsEnabled: false,
        showComments: false,
        showImportedPgn: false,
        showVariants: false,
        showVariantArrows: true,
        lichessSearchFilters: {
          player: "  MagnusCarlsen  ",
          opponent: " Hikaru ",
          year: " 2024 ",
          color: "white",
          perfType: " blitz ",
          max: "",
        },
        otbSearchFilters: {
          player: " Morphy ",
          opponent: " Anderssen ",
          color: "black",
          event: " London ",
          yearFrom: " 1851 ",
          yearTo: " 1858 ",
          result: "1-0",
          ecoFrom: " c20 ",
          ecoTo: " c99 ",
          opening: " Italian ",
          pageSize: "",
        },
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
        trainingState: {
          mode: TRAINING_MODE_REPLAY_GAME,
          status: TRAINING_STATUS_ACTIVE,
          playerSide: TRAINING_SIDE_WHITE,
          progressPly: 1,
          referenceMoves: [
            {
              ply: 1,
              moveNumber: 1,
              side: "white",
              san: "e4",
              move: { from: "e2", to: "e4" },
              fenBefore: "before-1",
              fenAfter: "after-1",
            },
          ],
          attempts: [
            {
              ply: 1,
              moveNumber: 1,
              side: "white",
              expectedSan: "e4",
              userSan: "e4",
              expectedMove: { from: "e2", to: "e4" },
              userMove: { from: "e2", to: "e4" },
              outcome: "match",
            },
          ],
          puzzle: null,
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
      engineSearchDepth: 18,
      lichessApiToken: "saved-token",
      boardOrientation: "black",
      showMoveHistory: false,
      showOpeningTreePanel: true,
      showPuzzleTrainingPanel: false,
      showReplayTrainingPanel: false,
      showGuessTrainingPanel: false,
      showPlayComputerPanel: false,
      showEngineWindow: true,
      showEvaluationBar: true,
      boardSoundsEnabled: false,
      showComments: false,
      showImportedPgn: false,
      showVariants: false,
      showVariantArrows: true,
      lichessPuzzleFilters: DEFAULT_LICHESS_PUZZLE_FILTERS,
      lichessSearchFilters: {
        player: "MagnusCarlsen",
        opponent: "Hikaru",
        year: "2024",
        color: "white",
        perfType: "blitz",
        max: DEFAULT_LICHESS_SEARCH_FILTERS.max,
      },
      otbSearchFilters: {
        player: "Morphy",
        opponent: "Anderssen",
        color: "black",
        event: "London",
        yearFrom: "1851",
        yearTo: "1858",
        result: "1-0",
        ecoFrom: "C20",
        ecoTo: "C99",
        opening: "Italian",
        pageSize: DEFAULT_OTB_SEARCH_FILTERS.pageSize,
      },
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
      trainingState: {
        mode: TRAINING_MODE_REPLAY_GAME,
        status: TRAINING_STATUS_ACTIVE,
        playerSide: TRAINING_SIDE_WHITE,
        progressPly: 1,
        referenceMoves: [
          {
            ply: 1,
            moveNumber: 1,
            side: "white",
            san: "e4",
            move: { from: "e2", to: "e4" },
            fenBefore: "before-1",
            fenAfter: "after-1",
          },
        ],
        attempts: [
          {
            ply: 1,
            moveNumber: 1,
            side: "white",
            expectedSan: "e4",
            userSan: "e4",
            expectedMove: { from: "e2", to: "e4" },
            userMove: { from: "e2", to: "e4" },
            outcome: "match",
            classification: null,
            deltaCp: null,
            isCritical: false,
            referenceEvaluation: null,
            userEvaluation: null,
            resultingFen: null,
          },
        ],
        pendingAttempts: [],
        lastCompletedAttempts: [],
        lastCompletedExpectedMove: null,
        lastCompletionMode: null,
        puzzle: null,
        computerPlay: null,
        playSession: null,
      },
    });
  });

  it("returns null for malformed JSON", () => {
    const storage = createStorage("{");

    expect(loadPersistedAppState(storage)).toBeNull();
  });

  it("loads persisted guess training panel visibility and mode", () => {
    const storage = createStorage(
      JSON.stringify({
        showGuessTrainingPanel: false,
        trainingState: {
          mode: TRAINING_MODE_GUESS_THE_MOVE,
          status: TRAINING_STATUS_ACTIVE,
          playerSide: TRAINING_SIDE_WHITE,
          progressPly: 0,
          referenceMoves: [
            {
              ply: 1,
              moveNumber: 1,
              side: "white",
              san: "e4",
              move: { from: "e2", to: "e4" },
              fenBefore: "before-1",
              fenAfter: "after-1",
            },
          ],
          attempts: [],
        },
      }),
    );

    expect(loadPersistedAppState(storage)).toEqual(
      expect.objectContaining({
        showGuessTrainingPanel: false,
        trainingState: expect.objectContaining({
          mode: TRAINING_MODE_GUESS_THE_MOVE,
          status: TRAINING_STATUS_ACTIVE,
        }),
      }),
    );
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
        engineSearchDepth: "20",
        lichessApiToken: "secret-token",
        boardOrientation: "black",
        showMoveHistory: false,
        showOpeningTreePanel: false,
        showPuzzleTrainingPanel: true,
        showReplayTrainingPanel: false,
        showGuessTrainingPanel: true,
        showPlayComputerPanel: true,
        showEngineWindow: true,
        showEvaluationBar: false,
        boardSoundsEnabled: false,
        showComments: true,
        showImportedPgn: false,
        showVariants: false,
        showVariantArrows: true,
        lichessSearchFilters: {
          player: " MagnusCarlsen ",
          opponent: " Hikaru ",
          year: "2024",
          color: "black",
          perfType: " rapid ",
          max: "",
        },
        otbSearchFilters: {
          player: " Morphy ",
          opponent: " Anderssen ",
          color: "white",
          event: " Paris ",
          yearFrom: "1850",
          yearTo: " 1858 ",
          result: "1/2-1/2",
          ecoFrom: " c20 ",
          ecoTo: " c99 ",
          opening: " Italian ",
          pageSize: "",
        },
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
      engineSearchDepth: 20,
      lichessApiToken: "secret-token",
      boardOrientation: "black",
      showMoveHistory: false,
      showOpeningTreePanel: false,
      showPuzzleTrainingPanel: true,
      showReplayTrainingPanel: false,
      showGuessTrainingPanel: true,
      showPlayComputerPanel: true,
      showEngineWindow: true,
      showEvaluationBar: false,
      boardSoundsEnabled: false,
      showComments: true,
      showImportedPgn: false,
      showVariants: false,
      showVariantArrows: true,
      lichessPuzzleFilters: DEFAULT_LICHESS_PUZZLE_FILTERS,
      lichessSearchFilters: {
        player: "MagnusCarlsen",
        opponent: "Hikaru",
        year: "2024",
        color: "black",
        perfType: "rapid",
        max: DEFAULT_LICHESS_SEARCH_FILTERS.max,
      },
      otbSearchFilters: {
        player: "Morphy",
        opponent: "Anderssen",
        color: "white",
        event: "Paris",
        yearFrom: "1850",
        yearTo: "1858",
        result: "1/2-1/2",
        ecoFrom: "C20",
        ecoTo: "C99",
        opening: "Italian",
        pageSize: DEFAULT_OTB_SEARCH_FILTERS.pageSize,
      },
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
      trainingState: createEmptyTrainingState(),
    });
  });

  it("preserves board annotations embedded in the variant tree", () => {
    const storage = createStorage();
    let variantTree = createVariantTreeFromMoves([{ from: "e2", to: "e4" }]);

    variantTree = toggleBoardArrowAnnotation(variantTree, variantTree.currentNodeId, {
      startSquare: "e2",
      endSquare: "e4",
      color: "#ffaa00",
    });
    variantTree = toggleBoardHighlightAnnotation(variantTree, variantTree.currentNodeId, {
      square: "e4",
      color: "#4caf50",
    });

    savePersistedAppState(
      {
        variantTree,
      },
      storage,
    );

    expect(
      loadPersistedAppState(storage)?.variantTree.nodes[variantTree.currentNodeId].boardAnnotations,
    ).toEqual({
      arrows: [{ startSquare: "e2", endSquare: "e4", color: "#ffaa00" }],
      highlights: [{ square: "e4", color: "#4caf50" }],
    });
  });

  it("loads persisted training play snapshots alongside the exploratory board state", () => {
    const resumeVariantTree = createVariantTreeFromMoves([{ from: "e2", to: "e4" }]);
    const playVariantTree = createEmptyVariantTree(
      "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1",
    );
    const storage = createStorage(
      JSON.stringify({
        variantTree: playVariantTree,
        trainingState: {
          mode: TRAINING_MODE_REPLAY_GAME,
          status: TRAINING_STATUS_ACTIVE,
          playerSide: TRAINING_SIDE_WHITE,
          progressPly: 0,
          referenceMoves: [
            {
              ply: 1,
              moveNumber: 1,
              side: "white",
              san: "e4",
              move: { from: "e2", to: "e4" },
              fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
              fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
            },
          ],
          attempts: [],
          pendingAttempts: [],
          lastCompletedAttempts: [],
          lastCompletedExpectedMove: null,
          lastCompletionMode: null,
          playSession: {
            status: "active",
            sourceAttempt: {
              ply: 1,
              moveNumber: 1,
              side: "white",
              expectedSan: "e4",
              userSan: "d4",
              expectedMove: { from: "e2", to: "e4" },
              userMove: { from: "d2", to: "d4" },
              outcome: "mismatch",
              classification: "equal",
              deltaCp: -5,
              resultingFen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1",
            },
            startingFen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1",
            resumeTrainingState: {
              mode: TRAINING_MODE_REPLAY_GAME,
              status: TRAINING_STATUS_ACTIVE,
              playerSide: TRAINING_SIDE_WHITE,
              progressPly: 0,
              referenceMoves: [
                {
                  ply: 1,
                  moveNumber: 1,
                  side: "white",
                  san: "e4",
                  move: { from: "e2", to: "e4" },
                  fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                  fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
                },
              ],
              attempts: [],
              pendingAttempts: [],
              lastCompletedAttempts: [],
              lastCompletedExpectedMove: null,
              lastCompletionMode: null,
            },
            resumeVariantTree,
          },
        },
      }),
    );

    expect(loadPersistedAppState(storage)?.trainingState.playSession).toEqual(
      expect.objectContaining({
        status: "active",
        startingFen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1",
        resumeVariantTree,
      }),
    );
  });

  it("persists standalone computer-play sessions with their start snapshot", () => {
    const storage = createStorage();
    const startVariantTree = createVariantTreeFromMoves([{ from: "e2", to: "e4" }]);
    const { trainingState } = createComputerPlayTrainingState(
      startVariantTree,
      TRAINING_SIDE_WHITE,
      TRAINING_COMPUTER_PLAY_SOURCE_CURRENT,
    );

    savePersistedAppState(
      {
        variantTree: startVariantTree,
        trainingState,
      },
      storage,
    );

    expect(loadPersistedAppState(storage)?.trainingState).toEqual(
      expect.objectContaining({
        mode: TRAINING_MODE_PLAY_COMPUTER,
        status: TRAINING_STATUS_ACTIVE,
        playerSide: TRAINING_SIDE_WHITE,
        computerPlay: {
          startFrom: TRAINING_COMPUTER_PLAY_SOURCE_CURRENT,
          startVariantTree,
        },
      }),
    );
  });

  it("falls back to an empty tree when the persisted variant tree is invalid", () => {
    const storage = createStorage(
      JSON.stringify({
        variantTree: { initialFen: "bad fen" },
      }),
    );

    expect(loadPersistedAppState(storage)).toEqual({
      variantTree: createEmptyVariantTree(),
      engineSearchDepth: DEFAULT_ENGINE_SEARCH_DEPTH,
      lichessApiToken: "",
      boardOrientation: "white",
      showMoveHistory: true,
      showOpeningTreePanel: true,
      showPuzzleTrainingPanel: true,
      showReplayTrainingPanel: true,
      showGuessTrainingPanel: true,
      showPlayComputerPanel: true,
      showEngineWindow: true,
      showEvaluationBar: true,
      boardSoundsEnabled: DEFAULT_BOARD_SOUNDS_ENABLED,
      showComments: true,
      showImportedPgn: true,
      showVariants: true,
      showVariantArrows: false,
      lichessPuzzleFilters: DEFAULT_LICHESS_PUZZLE_FILTERS,
      lichessSearchFilters: DEFAULT_LICHESS_SEARCH_FILTERS,
      otbSearchFilters: DEFAULT_OTB_SEARCH_FILTERS,
      importedPgnData: null,
      positionComments: [],
      trainingState: createEmptyTrainingState(),
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
