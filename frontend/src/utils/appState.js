import { Chess } from "chess.js";
import { normalizeImportedPgnData } from "./annotatedPgn.js";
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
  "toggleEngineWindow",
  "toggleComments",
  "toggleImportedPgn",
  "toggleVariants",
  "closeShortcutsPopup",
];

const VIEW_TOGGLE_SHORTCUT_ACTIONS = new Set([
  "toggleMoveHistory",
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

    return {
      variantTree,
      boardOrientation:
        parsedState.boardOrientation === "black" ? "black" : "white",
      showMoveHistory:
        typeof parsedState.showMoveHistory === "boolean"
          ? parsedState.showMoveHistory
          : true,
      showEngineWindow:
        typeof parsedState.showEngineWindow === "boolean"
          ? parsedState.showEngineWindow
          : true,
      showEvaluationBar:
        typeof parsedState.showEvaluationBar === "boolean"
          ? parsedState.showEvaluationBar
          : true,
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
      importedPgnData: normalizeImportedPgnData(parsedState.importedPgnData),
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
  boardOrientation,
  showMoveHistory,
  showEngineWindow,
  showEvaluationBar,
  showComments,
  showImportedPgn,
  showVariants,
  showVariantArrows,
  importedPgnData,
}) {
  return JSON.stringify({
    variantTree: normalizeVariantTree(variantTree ?? createEmptyVariantTree()),
    boardOrientation,
    showMoveHistory,
    showEngineWindow,
    showEvaluationBar,
    showComments,
    showImportedPgn,
    showVariants,
    showVariantArrows,
    importedPgnData: normalizeImportedPgnData(importedPgnData),
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
