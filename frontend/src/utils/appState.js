import { Chess } from "chess.js";
import { normalizeImportedPgnData } from "./annotatedPgn.js";
import {
  DEFAULT_LICHESS_SEARCH_FILTERS,
  normalizeLichessSearchFilters,
} from "./lichessSearch.js";
import {
  DEFAULT_OTB_SEARCH_FILTERS,
  normalizeOtbSearchFilters,
} from "./otbSearch.js";
import { normalizeTrainingState } from "./training.js";
import {
  createEmptyVariantTree,
  createVariantTreeFromGameAndRedo,
  normalizeVariantTree,
} from "./variantTree.js";

export const SHORTCUT_ACTION_ORDER = [
  "openShortcutsPopup",
  "goToStart",
  "undoMove",
  "redoMove",
  "jumpToMainVariant",
  "jumpBackToSideline",
  "goToEnd",
  "flipBoard",
  "toggleMoveHistory",
  "toggleOpeningTreePanel",
  "toggleReplayTrainingPanel",
  "toggleGuessTrainingPanel",
  "togglePlayComputerPanel",
  "toggleEngineWindow",
  "toggleComments",
  "toggleImportedPgn",
  "toggleVariants",
  "closeShortcutsPopup",
];

const VIEW_TOGGLE_SHORTCUT_ACTIONS = new Set([
  "toggleMoveHistory",
  "toggleOpeningTreePanel",
  "toggleReplayTrainingPanel",
  "toggleGuessTrainingPanel",
  "togglePlayComputerPanel",
  "toggleEngineWindow",
  "toggleComments",
  "toggleImportedPgn",
  "toggleVariants",
]);

const RESERVED_BROWSER_SHORTCUTS = new Set([
  "ctrl+l",
  "ctrl+w",
  "ctrl+t",
  "ctrl+r",
  "ctrl+f",
  "ctrl+n",
  "ctrl+tab",
  "ctrl+shift+tab",
]);

const SHORTCUT_DISPLAY_LABELS = {
  arrowleft: "←",
  arrowright: "→",
  arrowup: "↑",
  arrowdown: "↓",
  escape: "Esc",
  " ": "Space",
  ctrl: "Ctrl",
  alt: "Alt",
  shift: "Shift",
  meta: "Meta",
};

export const DEFAULT_SHORTCUT_CONFIG = {
  openShortcutsPopup: {
    label: "Open shortcuts popup",
    keys: ["?"],
  },
  goToStart: {
    label: "Go to start",
    keys: ["ArrowUp"],
  },
  undoMove: {
    label: "Undo move",
    keys: ["ArrowLeft"],
  },
  redoMove: {
    label: "Redo move",
    keys: ["ArrowRight"],
  },
  jumpToMainVariant: {
    label: "Jump to main variant",
    keys: ["Ctrl+M"],
  },
  jumpBackToSideline: {
    label: "Jump back to sideline",
    keys: ["Ctrl+,"],
  },
  goToEnd: {
    label: "Go to end",
    keys: ["ArrowDown"],
  },
  flipBoard: {
    label: "Flip board",
    keys: ["ü"],
  },
  toggleMoveHistory: {
    label: "Toggle move history",
    keys: ["Ctrl+Shift+F2"],
  },
  toggleOpeningTreePanel: {
    label: "Toggle opening tree panel",
    keys: ["Ctrl+Shift+F9"],
  },
  toggleReplayTrainingPanel: {
    label: "Toggle replay training panel",
    keys: ["Ctrl+Shift+F5"],
  },
  toggleGuessTrainingPanel: {
    label: "Toggle guess the move training panel",
    keys: ["Ctrl+Shift+F10"],
  },
  togglePlayComputerPanel: {
    label: "Toggle play vs computer panel",
    keys: ["Ctrl+Shift+F6"],
  },
  toggleEngineWindow: {
    label: "Toggle engine",
    keys: ["Ctrl+Shift+F3"],
  },
  toggleComments: {
    label: "Toggle comments",
    keys: ["Ctrl+Shift+F4"],
  },
  toggleImportedPgn: {
    label: "Toggle imported PGN",
    keys: ["Ctrl+Shift+F7"],
  },
  toggleVariants: {
    label: "Toggle variants",
    keys: ["Ctrl+Shift+F8"],
  },
  closeShortcutsPopup: {
    label: "Close popup",
    keys: ["Escape"],
  },
};

export const DEFAULT_SHORTCUT_CONFIG_SIGNATURE = JSON.stringify(
  DEFAULT_SHORTCUT_CONFIG,
);

export const FRONTEND_STATE_STORAGE_KEY = "chesslense.frontend-state";
export const DEFAULT_ENGINE_SEARCH_DEPTH = 12;
export const MIN_ENGINE_SEARCH_DEPTH = 1;
export const MAX_ENGINE_SEARCH_DEPTH = 30;
export const DEFAULT_BOARD_SOUNDS_ENABLED = true;
const POSITION_COMMENT_SOURCE_IMPORTED = "imported-mainline";
const POSITION_COMMENT_SOURCE_USER = "user";

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function normalizeShortcutKey(shortcutKey) {
  return shortcutKey
    .split("+")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
    .join("+");
}

function createPositionCommentId() {
  return `comment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeEngineSearchDepth(value) {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue)) {
    return DEFAULT_ENGINE_SEARCH_DEPTH;
  }

  return Math.min(
    MAX_ENGINE_SEARCH_DEPTH,
    Math.max(MIN_ENGINE_SEARCH_DEPTH, parsedValue),
  );
}

function normalizePositionComment(entry, index = 0) {
  if (
    !entry ||
    typeof entry !== "object" ||
    typeof entry.comment !== "string" ||
    !entry.comment.trim()
  ) {
    return null;
  }

  const fen = typeof entry.fen === "string" && entry.fen.trim() ? entry.fen : null;
  const ply =
    Number.isInteger(entry.ply) && entry.ply >= 0 ? entry.ply : null;
  const moveNumber =
    Number.isInteger(entry.moveNumber) && entry.moveNumber >= 0
      ? entry.moveNumber
      : null;
  const side =
    entry.side === "white" || entry.side === "black" ? entry.side : null;
  const san = typeof entry.san === "string" && entry.san.trim() ? entry.san : null;
  const source =
    entry.source === POSITION_COMMENT_SOURCE_IMPORTED
      ? POSITION_COMMENT_SOURCE_IMPORTED
      : POSITION_COMMENT_SOURCE_USER;
  const id =
    typeof entry.id === "string" && entry.id.trim()
      ? entry.id.trim()
      : `comment-${index}`;

  return {
    id,
    comment: entry.comment.trim(),
    fen,
    ply,
    moveNumber,
    side,
    san,
    source,
  };
}

export function normalizePositionComments(comments) {
  if (!Array.isArray(comments)) {
    return [];
  }

  return comments
    .map((entry, index) => normalizePositionComment(entry, index))
    .filter(Boolean);
}

export function seedPositionCommentsFromImportedPgnData(importedPgnData) {
  if (!importedPgnData?.mainlineComments?.length) {
    return [];
  }

  return importedPgnData.mainlineComments
    .map((commentEntry, index) =>
      normalizePositionComment(
        {
          ...commentEntry,
          id: `imported-mainline-${index}`,
          source: POSITION_COMMENT_SOURCE_IMPORTED,
        },
        index,
      ),
    )
    .filter(Boolean);
}

export function getPositionCommentsForFen(positionComments, fen) {
  if (typeof fen !== "string" || !fen.trim()) {
    return [];
  }

  return normalizePositionComments(positionComments).filter(
    (commentEntry) => commentEntry.fen === fen,
  );
}

export function savePositionCommentEntry(positionComments, entry) {
  const normalizedEntry = normalizePositionComment(entry);

  if (!normalizedEntry) {
    return normalizePositionComments(positionComments);
  }

  const normalizedComments = normalizePositionComments(positionComments);
  const existingIndex = normalizedComments.findIndex(
    (commentEntry) => commentEntry.id === normalizedEntry.id,
  );

  if (existingIndex === -1) {
    return [...normalizedComments, normalizedEntry];
  }

  return normalizedComments.map((commentEntry, index) =>
    index === existingIndex ? normalizedEntry : commentEntry,
  );
}

export function removePositionCommentEntry(positionComments, commentId) {
  if (typeof commentId !== "string" || !commentId.trim()) {
    return normalizePositionComments(positionComments);
  }

  return normalizePositionComments(positionComments).filter(
    (commentEntry) => commentEntry.id !== commentId,
  );
}

export function createUserPositionComment(entry) {
  return normalizePositionComment({
    ...entry,
    id: entry?.id ?? createPositionCommentId(),
    source: entry?.source ?? POSITION_COMMENT_SOURCE_USER,
  });
}

function isUnsafeViewToggleShortcut(shortcutKey) {
  const tokens = shortcutKey
    .split("+")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  if (!tokens.length) {
    return true;
  }

  const key = tokens[tokens.length - 1];
  const modifiers = tokens.slice(0, -1);

  if (!modifiers.length && /^[a-z]$/.test(key)) {
    return true;
  }

  if (modifiers.includes("alt") || modifiers.includes("meta")) {
    return true;
  }

  if (modifiers.includes("ctrl") && /^[1-9]$/.test(key)) {
    return true;
  }

  return RESERVED_BROWSER_SHORTCUTS.has(normalizeShortcutKey(shortcutKey));
}

function sanitizeShortcutKeys(actionName, shortcutKeys) {
  if (!VIEW_TOGGLE_SHORTCUT_ACTIONS.has(actionName)) {
    return shortcutKeys;
  }

  return shortcutKeys.filter((shortcutKey) => !isUnsafeViewToggleShortcut(shortcutKey));
}

function resolvePersistedPanelVisibility(parsedState, panelKey, legacyKey, fallbackValue = true) {
  if (typeof parsedState?.[panelKey] === "boolean") {
    return parsedState[panelKey];
  }

  if (typeof parsedState?.[legacyKey] === "boolean") {
    return parsedState[legacyKey];
  }

  return fallbackValue;
}

export function normalizeShortcutConfig(config) {
  if (!config || typeof config !== "object") {
    return DEFAULT_SHORTCUT_CONFIG;
  }

  return SHORTCUT_ACTION_ORDER.reduce((normalizedConfig, actionName) => {
    const defaultShortcut = DEFAULT_SHORTCUT_CONFIG[actionName];
    const candidateShortcut = config[actionName];
    const shortcutKeys =
      Array.isArray(candidateShortcut?.keys) &&
      candidateShortcut.keys.every(
        (shortcutKey) =>
          typeof shortcutKey === "string" && shortcutKey.trim().length > 0,
      )
        ? sanitizeShortcutKeys(
            actionName,
            candidateShortcut.keys.map((shortcutKey) => shortcutKey.trim()),
          )
        : defaultShortcut.keys;

    normalizedConfig[actionName] = {
      label:
        typeof candidateShortcut?.label === "string" &&
          candidateShortcut.label.trim().length > 0
          ? candidateShortcut.label
          : defaultShortcut.label,
      keys: shortcutKeys,
    };

    return normalizedConfig;
  }, {});
}

export function matchesShortcut(event, shortcutKeys) {
  return shortcutKeys.some((shortcutKey) => {
    const tokens = shortcutKey
      .split("+")
      .map((token) => token.trim())
      .filter(Boolean);

    if (!tokens.length) {
      return false;
    }

    const normalizedTokens = tokens.map((token) => token.toLowerCase());
    const requiredKey = normalizedTokens[normalizedTokens.length - 1];
    const requiredModifiers = new Set(normalizedTokens.slice(0, -1));

    if (requiredModifiers.has("ctrl") && !event.ctrlKey) {
      return false;
    }

    if (requiredModifiers.has("alt") && !event.altKey) {
      return false;
    }

    if (requiredModifiers.has("shift") && !event.shiftKey) {
      return false;
    }

    if (requiredModifiers.has("meta") && !event.metaKey) {
      return false;
    }

    return String(event.key).toLowerCase() === requiredKey;
  });
}

export function getShortcutDisplayLabel(shortcutKey) {
  return shortcutKey
    .split("+")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const normalizedToken = token.toLowerCase();
      const label = SHORTCUT_DISPLAY_LABELS[normalizedToken];

      if (label) {
        return label;
      }

      return token.length === 1 ? token.toUpperCase() : token;
    })
    .join("+");
}

export function parseGameFromPgn(pgn, options = {}) {
  const { allowEmpty = true } = options;

  if (typeof pgn !== "string" || !pgn.trim()) {
    return allowEmpty
      ? { game: new Chess(), error: null }
      : { game: null, error: "Paste a PGN to import." };
  }

  const next = new Chess();

  try {
    const didLoad = next.loadPgn(pgn.trim());

    if (didLoad === false) {
      return {
        game: null,
        error: "Invalid PGN. Please check the notation and try again.",
      };
    }

    return { game: next, error: null };
  } catch {
    return {
      game: null,
      error: "Invalid PGN. Please check the notation and try again.",
    };
  }
}

export function createGameFromPgn(pgn) {
  const { game } = parseGameFromPgn(pgn);
  return game ?? new Chess();
}

export function loadPersistedAppState(storage = getBrowserStorage()) {
  if (!storage) {
    return null;
  }

  try {
    const rawState = storage.getItem(FRONTEND_STATE_STORAGE_KEY);

    if (!rawState) {
      return null;
    }

    const parsedState = JSON.parse(rawState);

    if (!parsedState || typeof parsedState !== "object") {
      return null;
    }

    const redoStack = Array.isArray(parsedState.redoStack)
      ? parsedState.redoStack.reduce((moves, move) => {
        if (
          !move ||
          typeof move !== "object" ||
          typeof move.from !== "string" ||
          typeof move.to !== "string"
        ) {
          return moves;
        }

        moves.push({
          from: move.from,
          to: move.to,
          ...(typeof move.promotion === "string"
            ? { promotion: move.promotion }
            : {}),
        });

        return moves;
      }, [])
      : [];

    const gamePgn = typeof parsedState.gamePgn === "string" ? parsedState.gamePgn : "";
    const game = createGameFromPgn(gamePgn);
    const variantTree =
      parsedState.variantTree && typeof parsedState.variantTree === "object"
        ? normalizeVariantTree(parsedState.variantTree)
        : createVariantTreeFromGameAndRedo(game, redoStack);
    const importedPgnData = normalizeImportedPgnData(parsedState.importedPgnData);
    const lichessSearchFilters = parsedState.lichessSearchFilters
      ? normalizeLichessSearchFilters(parsedState.lichessSearchFilters)
      : DEFAULT_LICHESS_SEARCH_FILTERS;
    const otbSearchFilters = parsedState.otbSearchFilters
      ? normalizeOtbSearchFilters(parsedState.otbSearchFilters)
      : DEFAULT_OTB_SEARCH_FILTERS;
    const positionComments = Array.isArray(parsedState.positionComments)
      ? normalizePositionComments(parsedState.positionComments)
      : seedPositionCommentsFromImportedPgnData(importedPgnData);

    return {
      variantTree,
      engineSearchDepth: normalizeEngineSearchDepth(parsedState.engineSearchDepth),
      lichessApiToken:
        typeof parsedState.lichessApiToken === "string"
          ? parsedState.lichessApiToken
          : "",
      boardOrientation:
        parsedState.boardOrientation === "black" ? "black" : "white",
      showMoveHistory:
        typeof parsedState.showMoveHistory === "boolean"
          ? parsedState.showMoveHistory
          : true,
      showOpeningTreePanel:
        typeof parsedState.showOpeningTreePanel === "boolean"
          ? parsedState.showOpeningTreePanel
          : true,
      showReplayTrainingPanel: resolvePersistedPanelVisibility(
        parsedState,
        "showReplayTrainingPanel",
        "showTrainingWindow",
      ),
      showGuessTrainingPanel: resolvePersistedPanelVisibility(
        parsedState,
        "showGuessTrainingPanel",
        "showTrainingWindow",
      ),
      showPlayComputerPanel: resolvePersistedPanelVisibility(
        parsedState,
        "showPlayComputerPanel",
        "showTrainingWindow",
      ),
      showEngineWindow:
        typeof parsedState.showEngineWindow === "boolean"
          ? parsedState.showEngineWindow
          : true,
      showEvaluationBar:
        typeof parsedState.showEvaluationBar === "boolean"
          ? parsedState.showEvaluationBar
          : true,
      boardSoundsEnabled:
        typeof parsedState.boardSoundsEnabled === "boolean"
          ? parsedState.boardSoundsEnabled
          : DEFAULT_BOARD_SOUNDS_ENABLED,
      showComments:
        typeof parsedState.showComments === "boolean"
          ? parsedState.showComments
          : true,
      showImportedPgn:
        typeof parsedState.showImportedPgn === "boolean"
          ? parsedState.showImportedPgn
          : true,
      showVariants:
        typeof parsedState.showVariants === "boolean"
          ? parsedState.showVariants
          : true,
      showVariantArrows:
        typeof parsedState.showVariantArrows === "boolean"
          ? parsedState.showVariantArrows
          : false,
      lichessSearchFilters,
      otbSearchFilters,
      importedPgnData,
      positionComments,
      trainingState: normalizeTrainingState(parsedState.trainingState),
    };
  } catch {
    return null;
  }
}

export function cloneGame(sourceGame) {
  const next = new Chess();

  if (sourceGame.history().length) {
    next.loadPgn(sourceGame.pgn());
  }

  return next;
}

export function serializeMove(move) {
  return {
    from: move.from,
    to: move.to,
    ...(move.promotion ? { promotion: move.promotion } : {}),
  };
}

export function serializePersistedAppState({
  variantTree,
  engineSearchDepth,
  lichessApiToken,
  boardOrientation,
  showMoveHistory,
  showOpeningTreePanel,
  showReplayTrainingPanel,
  showGuessTrainingPanel,
  showPlayComputerPanel,
  showEngineWindow,
  showEvaluationBar,
  boardSoundsEnabled,
  showComments,
  showImportedPgn,
  showVariants,
  showVariantArrows,
  lichessSearchFilters,
  otbSearchFilters,
  importedPgnData,
  positionComments,
  trainingState,
}) {
  return JSON.stringify({
    variantTree: normalizeVariantTree(variantTree ?? createEmptyVariantTree()),
    engineSearchDepth: normalizeEngineSearchDepth(engineSearchDepth),
    lichessApiToken: typeof lichessApiToken === "string" ? lichessApiToken : "",
    boardOrientation,
    showMoveHistory,
    showOpeningTreePanel,
    showReplayTrainingPanel,
    showGuessTrainingPanel,
    showPlayComputerPanel,
    showEngineWindow,
    showEvaluationBar,
    boardSoundsEnabled,
    showComments,
    showImportedPgn,
    showVariants,
    showVariantArrows,
    lichessSearchFilters: normalizeLichessSearchFilters(
      lichessSearchFilters ?? DEFAULT_LICHESS_SEARCH_FILTERS,
    ),
    otbSearchFilters: normalizeOtbSearchFilters(
      otbSearchFilters ?? DEFAULT_OTB_SEARCH_FILTERS,
    ),
    importedPgnData: normalizeImportedPgnData(importedPgnData),
    positionComments: normalizePositionComments(positionComments),
    trainingState: normalizeTrainingState(trainingState),
  });
}

export function savePersistedAppState(state, storage = getBrowserStorage()) {
  if (!storage) {
    return false;
  }

  storage.setItem(
    FRONTEND_STATE_STORAGE_KEY,
    serializePersistedAppState(state),
  );

  return true;
}
