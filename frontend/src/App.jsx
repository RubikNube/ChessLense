import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import MoveHistory from "./components/MoveHistory.jsx";
import "./App.css";

const shortcutOverlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
  zIndex: 1000,
};

const shortcutModalStyle = {
  width: "min(100%, 28rem)",
  backgroundColor: "#ffffff",
  color: "#111827",
  borderRadius: "0.75rem",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.35)",
  padding: "1.5rem",
};

const shortcutListStyle = {
  listStyle: "none",
  padding: 0,
  margin: "1rem 0 0",
  display: "grid",
  gap: "0.75rem",
};

const shortcutItemStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
};

const shortcutKeyStyle = {
  fontFamily: "inherit",
  fontSize: "0.95rem",
  fontWeight: 700,
  padding: "0.35rem 0.6rem",
  borderRadius: "0.45rem",
  border: "1px solid #d1d5db",
  backgroundColor: "#f9fafb",
  minWidth: "4.5rem",
  textAlign: "center",
};

const shortcutCloseButtonStyle = {
  marginTop: "1.25rem",
  padding: "0.65rem 1rem",
  border: "1px solid #d1d5db",
  borderRadius: "0.5rem",
  backgroundColor: "#f3f4f6",
  color: "#111827",
  cursor: "pointer",
  fontWeight: 600,
};

const importPgnTextAreaStyle = {
  width: "100%",
  minHeight: "12rem",
  marginTop: "1rem",
  padding: "0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: "0.95rem",
  lineHeight: 1.5,
  resize: "vertical",
};

const modalActionRowStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "0.75rem",
  marginTop: "1rem",
  flexWrap: "wrap",
};

const modalButtonStyle = {
  padding: "0.65rem 1rem",
  border: "1px solid #d1d5db",
  borderRadius: "0.5rem",
  backgroundColor: "#f3f4f6",
  color: "#111827",
  cursor: "pointer",
  fontWeight: 600,
};

const modalPrimaryButtonStyle = {
  ...modalButtonStyle,
  borderColor: "#2563eb",
  backgroundColor: "#2563eb",
  color: "#ffffff",
};

const modalErrorStyle = {
  marginTop: "0.75rem",
  color: "#dc2626",
};

const SHORTCUT_ACTION_ORDER = [
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

const DEFAULT_SHORTCUT_CONFIG = {
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

const DEFAULT_SHORTCUT_CONFIG_SIGNATURE = JSON.stringify(
  DEFAULT_SHORTCUT_CONFIG,
);

const FRONTEND_STATE_STORAGE_KEY = "chesslense.frontend-state";

function normalizeShortcutConfig(config) {
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

function matchesShortcut(event, shortcutKeys) {
  return shortcutKeys.some((shortcutKey) => event.key === shortcutKey);
}

function getShortcutDisplayLabel(shortcutKey) {
  return SHORTCUT_DISPLAY_LABELS[shortcutKey] || shortcutKey;
}

function parseGameFromPgn(pgn, options = {}) {
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

function createGameFromPgn(pgn) {
  const { game } = parseGameFromPgn(pgn);
  return game ?? new Chess();
}

function loadPersistedAppState() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawState = window.localStorage.getItem(FRONTEND_STATE_STORAGE_KEY);

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
      gamePgn:
        typeof parsedState.gamePgn === "string" ? parsedState.gamePgn : "",
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
    };
  } catch {
    return null;
  }
}

function cloneGame(sourceGame) {
  const next = new Chess();

  if (sourceGame.history().length) {
    next.loadPgn(sourceGame.pgn());
  }

  return next;
}

function serializeMove(move) {
  return {
    from: move.from,
    to: move.to,
    ...(move.promotion ? { promotion: move.promotion } : {}),
  };
}

function App() {
  const persistedAppState = useMemo(() => loadPersistedAppState(), []);
  const [game, setGame] = useState(() =>
    createGameFromPgn(persistedAppState?.gamePgn),
  );
  const [engineResult, setEngineResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [showMoveHistory, setShowMoveHistory] = useState(
    () => persistedAppState?.showMoveHistory ?? true,
  );
  const [showEngineWindow, setShowEngineWindow] = useState(
    () => persistedAppState?.showEngineWindow ?? true,
  );
  const [showShortcutsPopup, setShowShortcutsPopup] = useState(false);
  const [showImportPgnPopup, setShowImportPgnPopup] = useState(false);
  const [boardOrientation, setBoardOrientation] = useState(
    () => persistedAppState?.boardOrientation ?? "white",
  );
  const [redoStack, setRedoStack] = useState(
    () => persistedAppState?.redoStack ?? [],
  );
  const [shortcutConfig, setShortcutConfig] = useState(DEFAULT_SHORTCUT_CONFIG);
  const [copyNotification, setCopyNotification] = useState("");
  const [importPgnValue, setImportPgnValue] = useState("");
  const [importPgnError, setImportPgnError] = useState("");
  const shortcutConfigSignatureRef = useRef(
    DEFAULT_SHORTCUT_CONFIG_SIGNATURE,
  );

  const fen = useMemo(() => game.fen(), [game]);
  const canUndo = game.history().length > 0;
  const canRedo = redoStack.length > 0;
  const shortcutEntries = useMemo(
    () =>
      SHORTCUT_ACTION_ORDER.map((actionName) => ({
        actionName,
        ...shortcutConfig[actionName],
      })),
    [shortcutConfig],
  );

  function safeGameMutate(modify) {
    const next = cloneGame(game);
    const result = modify(next);

    if (!result) {
      return null;
    }

    setGame(next);
    setRedoStack([]);
    setEngineResult(null);

    return result;
  }

  function handlePieceDrop(sourceSquareOrMove, maybeTargetSquare) {
    const sourceSquare =
      typeof sourceSquareOrMove === "string"
        ? sourceSquareOrMove
        : sourceSquareOrMove?.sourceSquare;
    const targetSquare =
      typeof maybeTargetSquare === "string"
        ? maybeTargetSquare
        : sourceSquareOrMove?.targetSquare;

    if (!sourceSquare || !targetSquare) {
      return false;
    }

    return !!safeGameMutate((next) =>
      next.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      }),
    );
  }

  const undoMove = useCallback(() => {
    const next = cloneGame(game);
    const undoneMove = next.undo();

    if (!undoneMove) {
      return;
    }

    setGame(next);
    setRedoStack((currentValue) => [serializeMove(undoneMove), ...currentValue]);
    setEngineResult(null);
  }, [game]);

  const redoMove = useCallback(() => {
    const moveToRedo = redoStack[0];

    if (!moveToRedo) {
      return;
    }

    const next = cloneGame(game);
    const redoneMove = next.move(moveToRedo);

    if (!redoneMove) {
      return;
    }

    setGame(next);
    setRedoStack((currentValue) => currentValue.slice(1));
    setEngineResult(null);
  }, [game, redoStack]);

  const goToStart = useCallback(() => {
    const next = cloneGame(game);
    const undoneMoves = [];
    let undoneMove = next.undo();

    while (undoneMove) {
      undoneMoves.unshift(serializeMove(undoneMove));
      undoneMove = next.undo();
    }

    if (!undoneMoves.length) {
      return;
    }

    setGame(next);
    setRedoStack([...undoneMoves, ...redoStack]);
    setEngineResult(null);
  }, [game, redoStack]);

  const goToEnd = useCallback(() => {
    if (!redoStack.length) {
      return;
    }

    const next = cloneGame(game);
    let appliedMoveCount = 0;

    for (const moveToRedo of redoStack) {
      const redoneMove = next.move(moveToRedo);

      if (!redoneMove) {
        break;
      }

      appliedMoveCount += 1;
    }

    if (!appliedMoveCount) {
      return;
    }

    setGame(next);
    setRedoStack(redoStack.slice(appliedMoveCount));
    setEngineResult(null);
  }, [game, redoStack]);

  function toggleMenu(menuName) {
    setOpenMenu((currentMenu) => (currentMenu === menuName ? null : menuName));
  }

  function handleMenuAction(action) {
    setOpenMenu(null);

    if (action) {
      action();
    }
  }

  const openShortcutsPopup = useCallback(() => {
    setShowShortcutsPopup(true);
  }, []);

  const closeShortcutsPopup = useCallback(() => {
    setShowShortcutsPopup(false);
  }, []);

  const openImportPgnPopup = useCallback(() => {
    setImportPgnValue(game.pgn());
    setImportPgnError("");
    setShowImportPgnPopup(true);
  }, [game]);

  const closeImportPgnPopup = useCallback(() => {
    setShowImportPgnPopup(false);
    setImportPgnValue("");
    setImportPgnError("");
  }, []);

  function importPgn() {
    const { game: importedGame, error } = parseGameFromPgn(importPgnValue, {
      allowEmpty: false,
    });

    if (error || !importedGame) {
      setImportPgnError(
        error ?? "Invalid PGN. Please check the notation and try again.",
      );
      return;
    }

    setGame(importedGame);
    setRedoStack([]);
    setEngineResult(null);
    closeImportPgnPopup();
  }

  async function copyFenToClipboard() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fen);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = fen;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();

        const copied = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!copied) {
          throw new Error("Copy command failed");
        }
      }

      setCopyNotification("FEN copied to clipboard.");
    } catch (error) {
      console.error("Failed to copy FEN to clipboard:", error);
    }
  }
  useEffect(() => {
    if (!copyNotification) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyNotification("");
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyNotification]);

  useEffect(() => {
    let ignore = false;

    async function loadShortcuts() {
      try {
        const response = await fetch(new URL("./shortcuts.json", import.meta.url), {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load shortcuts");
        }

        const data = await response.json();
        const normalizedConfig = normalizeShortcutConfig(data);
        const nextSignature = JSON.stringify(normalizedConfig);

        if (!ignore && nextSignature !== shortcutConfigSignatureRef.current) {
          shortcutConfigSignatureRef.current = nextSignature;
          setShortcutConfig(normalizedConfig);
        }
      } catch {
        if (
          !ignore &&
          DEFAULT_SHORTCUT_CONFIG_SIGNATURE !== shortcutConfigSignatureRef.current
        ) {
          shortcutConfigSignatureRef.current = DEFAULT_SHORTCUT_CONFIG_SIGNATURE;
          setShortcutConfig(DEFAULT_SHORTCUT_CONFIG);
        }
      }
    }

    loadShortcuts();

    const intervalId = window.setInterval(loadShortcuts, 2000);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      FRONTEND_STATE_STORAGE_KEY,
      JSON.stringify({
        gamePgn: game.pgn(),
        redoStack,
        boardOrientation,
        showMoveHistory,
        showEngineWindow,
      }),
    );
  }, [boardOrientation, game, redoStack, showEngineWindow, showMoveHistory]);

  async function analyzePosition() {
    setShowEngineWindow(true);
    setLoading(true);
    setEngineResult(null);

    try {
      const response = await fetch("http://localhost:3001/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fen,
          depth: 12,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Request failed");
      }

      setEngineResult(data);
    } catch (error) {
      setEngineResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  function resetGame() {
    setGame(new Chess());
    setRedoStack([]);
    setEngineResult(null);
  }

  function toggleMoveHistory() {
    setShowMoveHistory((currentValue) => !currentValue);
  }

  function toggleEngineWindow() {
    setShowEngineWindow((currentValue) => !currentValue);
  }

  const toggleBoardOrientation = useCallback(() => {
    setBoardOrientation((currentValue) =>
      currentValue === "white" ? "black" : "white",
    );
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.defaultPrevented) {
        return;
      }

      if (showImportPgnPopup) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeImportPgnPopup();
        }

        return;
      }

      if (showShortcutsPopup) {
        if (matchesShortcut(event, shortcutConfig.closeShortcutsPopup.keys)) {
          event.preventDefault();
          closeShortcutsPopup();
        }

        return;
      }

      const target = event.target;

      if (target instanceof HTMLElement) {
        const tagName = target.tagName;

        if (
          target.isContentEditable ||
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          tagName === "SELECT"
        ) {
          return;
        }
      }

      if (matchesShortcut(event, shortcutConfig.openShortcutsPopup.keys)) {
        event.preventDefault();
        setOpenMenu(null);
        openShortcutsPopup();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.goToStart.keys)) {
        event.preventDefault();
        goToStart();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.undoMove.keys)) {
        event.preventDefault();
        undoMove();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.redoMove.keys)) {
        event.preventDefault();
        redoMove();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.goToEnd.keys)) {
        event.preventDefault();
        goToEnd();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.flipBoard.keys)) {
        event.preventDefault();
        toggleBoardOrientation();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    closeImportPgnPopup,
    closeShortcutsPopup,
    goToEnd,
    goToStart,
    openShortcutsPopup,
    redoMove,
    shortcutConfig,
    showImportPgnPopup,
    showShortcutsPopup,
    toggleBoardOrientation,
    undoMove,
  ]);
  return (
    <div className="app">
      <nav className="top-menu" aria-label="Application menu">
        <div className="menu-group">
          <button
            type="button"
            className="menu-trigger"
            onClick={() => toggleMenu("engine")}
          >
            Engine
          </button>
          {openMenu === "engine" && (
            <div className="menu-dropdown">
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(analyzePosition)}
              >
                Analyze with Stockfish
              </button>
            </div>
          )}
        </div>

        <div className="menu-group">
          <button
            type="button"
            className="menu-trigger"
            onClick={() => toggleMenu("edit")}
          >
            Edit
          </button>
          {openMenu === "edit" && (
            <div className="menu-dropdown">
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(undoMove)}
                disabled={!canUndo}
              >
                Undo
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(redoMove)}
                disabled={!canRedo}
              >
                Redo
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(openImportPgnPopup)}
              >
                Import PGN
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(copyFenToClipboard)}
              >
                Copy FEN
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(resetGame)}
              >
                Reset
              </button>
            </div>
          )}
        </div>

        <div className="menu-group">
          <button
            type="button"
            className="menu-trigger"
            onClick={() => toggleMenu("view")}
          >
            View
          </button>
          {openMenu === "view" && (
            <div className="menu-dropdown">
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(toggleBoardOrientation)}
              >
                Flip Board
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(toggleMoveHistory)}
              >
                {showMoveHistory ? "Hide Move History" : "Show Move History"}
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(toggleEngineWindow)}
              >
                {showEngineWindow ? "Hide Engine Window" : "Show Engine Window"}
              </button>
            </div>
          )}
        </div>

        <div className="menu-group">
          <button
            type="button"
            className="menu-trigger"
            onClick={() => toggleMenu("help")}
          >
            Help
          </button>
          {openMenu === "help" && (
            <div className="menu-dropdown">
              <button
                type="button"
                className="menu-entry"
                onClick={() =>
                  handleMenuAction(() =>
                    window.open(
                      "https://github.com/RubikNube/ChessLense/tree/main",
                      "_blank",
                      "noopener,noreferrer",
                    ),
                  )
                }
              >
                About ChessLense
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(openShortcutsPopup)}
              >
                Keyboard Shortcuts
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="board-panel">
        <div className="chessboard-wrapper">
          <Chessboard
            position={fen}
            onPieceDrop={handlePieceDrop}
            boardOrientation={boardOrientation}
            options={{
              position: fen,
              onPieceDrop: handlePieceDrop,
              boardOrientation,
            }}
          />
        </div>
      </div>

      <div className="side-panel">
        {showEngineWindow && (
          <div className="card">
            <h2>Engine</h2>
            {engineResult?.error && <p className="error">{engineResult.error}</p>}
            {!engineResult && !loading && <p>No analysis yet.</p>}
            {engineResult?.bestmove && (
              <>
                <p>
                  <strong>Best move:</strong> {engineResult.bestmove}
                </p>
                <p>
                  <strong>Evaluation:</strong>{" "}
                  {engineResult.evaluation
                    ? `${engineResult.evaluation.type} ${engineResult.evaluation.value}`
                    : "n/a"}
                </p>
              </>
            )}
          </div>
        )}

        {showMoveHistory && (
          <MoveHistory
            game={game}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undoMove}
            onRedo={redoMove}
            onGoToStart={goToStart}
            onGoToEnd={goToEnd}
          />
        )}
      </div>

      {showImportPgnPopup && (
        <div
          style={shortcutOverlayStyle}
          onClick={closeImportPgnPopup}
          role="presentation"
        >
          <div
            style={shortcutModalStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-pgn-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="import-pgn-title">Import PGN</h2>
            <p>Paste a PGN game score to load it on the board.</p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                importPgn();
              }}
            >
              <textarea
                style={importPgnTextAreaStyle}
                value={importPgnValue}
                onChange={(event) => {
                  setImportPgnValue(event.target.value);
                  setImportPgnError("");
                }}
                aria-label="PGN text"
                placeholder={'[Event "Casual Game"]\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6'}
                autoFocus
                spellCheck={false}
              />
              {importPgnError && <p style={modalErrorStyle}>{importPgnError}</p>}
              <div style={modalActionRowStyle}>
                <button
                  type="button"
                  style={modalButtonStyle}
                  onClick={closeImportPgnPopup}
                >
                  Cancel
                </button>
                <button type="submit" style={modalPrimaryButtonStyle}>
                  Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showShortcutsPopup && (
        <div
          style={shortcutOverlayStyle}
          onClick={closeShortcutsPopup}
          role="presentation"
        >
          <div
            style={shortcutModalStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="keyboard-shortcuts-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="keyboard-shortcuts-title">Keyboard Shortcuts</h2>
            <ul style={shortcutListStyle}>
              {shortcutEntries.map(({ actionName, label, keys }) => (
                <li key={actionName} style={shortcutItemStyle}>
                  <span>{label}</span>
                  <kbd style={shortcutKeyStyle}>
                    {keys.map(getShortcutDisplayLabel).join(" / ")}
                  </kbd>
                </li>
              ))}
            </ul>
            <button
              type="button"
              style={shortcutCloseButtonStyle}
              onClick={closeShortcutsPopup}
            >
              Close
            </button>
          </div>

        </div>
      )}
      {copyNotification && (
        <div className="copy-notification" role="status" aria-live="polite">
          {copyNotification}
        </div>
      )}
    </div>
  );
}

export default App;
