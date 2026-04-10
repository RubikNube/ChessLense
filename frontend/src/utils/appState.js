import { Chess } from "chess.js";

export const SHORTCUT_ACTION_ORDER = [
  "openShortcutsPopup",
  "goToStart",
  "undoMove",
  "redoMove",
  "goToEnd",
  "flipBoard",
  "closeShortcutsPopup",
];

const SHORTCUT_DISPLAY_LABELS = {
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Escape: "Esc",
  " ": "Space",
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
  goToEnd: {
    label: "Go to end",
    keys: ["ArrowDown"],
  },
  flipBoard: {
    label: "Flip board",
    keys: ["ü"],
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
        ? candidateShortcut.keys
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
  return shortcutKeys.some((shortcutKey) => event.key === shortcutKey);
}

export function getShortcutDisplayLabel(shortcutKey) {
  return SHORTCUT_DISPLAY_LABELS[shortcutKey] || shortcutKey;
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

    return {
      gamePgn: typeof parsedState.gamePgn === "string" ? parsedState.gamePgn : "",
      redoStack,
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
  game,
  redoStack,
  boardOrientation,
  showMoveHistory,
  showEngineWindow,
  showEvaluationBar,
}) {
  return JSON.stringify({
    gamePgn: game.pgn(),
    redoStack: redoStack.map(serializeMove),
    boardOrientation,
    showMoveHistory,
    showEngineWindow,
    showEvaluationBar,
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
