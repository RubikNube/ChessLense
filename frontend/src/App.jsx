import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import EvaluationBar from "./components/EvaluationBar.jsx";
import MoveHistory from "./components/MoveHistory.jsx";
import VariantsView from "./components/VariantsView.jsx";
import {
  DEFAULT_SHORTCUT_CONFIG,
  DEFAULT_SHORTCUT_CONFIG_SIGNATURE,
  SHORTCUT_ACTION_ORDER,
  getShortcutDisplayLabel,
  loadPersistedAppState,
  matchesShortcut,
  normalizeShortcutConfig,
  savePersistedAppState,
} from "./utils/appState.js";
import { parseAnnotatedPgn } from "./utils/annotatedPgn.js";
import {
  applyMoveToVariantTree,
  buildGameToNode,
  canRedoInVariantTree,
  canUndoInVariantTree,
  createEmptyVariantTree,
  demoteVariantLine,
  getMoveHistoryForNode,
  getRelevantVariantLines,
  goToEndInVariantTree,
  goToStartInVariantTree,
  promoteVariantLine,
  redoInVariantTree,
  selectVariantLine,
  undoInVariantTree,
} from "./utils/variantTree.js";
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

function formatPgnCommentLabel(comment) {
  if (!comment || typeof comment !== "object") {
    return "Annotation";
  }

  if (comment.ply === 0) {
    return "Game introduction";
  }

  if (
    typeof comment.moveNumber === "number" &&
    comment.moveNumber > 0 &&
    typeof comment.san === "string" &&
    comment.san
  ) {
    return comment.side === "black"
      ? `${comment.moveNumber}... ${comment.san}`
      : `${comment.moveNumber}. ${comment.san}`;
  }

  return "Annotation";
}

function isLinkValue(value) {
  return /^https?:\/\//i.test(value);
}

function getCurrentMoveLabel(moveHistory) {
  if (!Array.isArray(moveHistory) || moveHistory.length === 0) {
    return "Game introduction";
  }

  const lastMove = moveHistory[moveHistory.length - 1];
  const moveNumber = Math.floor((moveHistory.length - 1) / 2) + 1;
  const isBlackMove = moveHistory.length % 2 === 0;

  return isBlackMove
    ? `${moveNumber}... ${lastMove}`
    : `${moveNumber}. ${lastMove}`;
}

function App() {
  const persistedAppState = useMemo(() => loadPersistedAppState(), []);
  const [variantTree, setVariantTree] = useState(
    () => persistedAppState?.variantTree ?? createEmptyVariantTree(),
  );
  const [engineResult, setEngineResult] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [showMoveHistory, setShowMoveHistory] = useState(
    () => persistedAppState?.showMoveHistory ?? true,
  );
  const [showEngineWindow, setShowEngineWindow] = useState(
    () => persistedAppState?.showEngineWindow ?? true,
  );
  const [showEvaluationBar, setShowEvaluationBar] = useState(
    () => persistedAppState?.showEvaluationBar ?? true,
  );
  const [showComments, setShowComments] = useState(
    () => persistedAppState?.showComments ?? true,
  );
  const [showImportedPgn, setShowImportedPgn] = useState(
    () => persistedAppState?.showImportedPgn ?? true,
  );
  const [showVariants, setShowVariants] = useState(
    () => persistedAppState?.showVariants ?? true,
  );
  const [showShortcutsPopup, setShowShortcutsPopup] = useState(false);
  const [showImportPgnPopup, setShowImportPgnPopup] = useState(false);
  const [boardOrientation, setBoardOrientation] = useState(
    () => persistedAppState?.boardOrientation ?? "white",
  );
  const [shortcutConfig, setShortcutConfig] = useState(DEFAULT_SHORTCUT_CONFIG);
  const [copyNotification, setCopyNotification] = useState("");
  const [importPgnValue, setImportPgnValue] = useState("");
  const [importPgnError, setImportPgnError] = useState("");
  const [importedPgnData, setImportedPgnData] = useState(
    () => persistedAppState?.importedPgnData ?? null,
  );
  const shortcutConfigSignatureRef = useRef(
    DEFAULT_SHORTCUT_CONFIG_SIGNATURE,
  );

  const game = useMemo(() => buildGameToNode(variantTree), [variantTree]);
  const fen = useMemo(() => game.fen(), [game]);
  const moveHistory = useMemo(
    () => getMoveHistoryForNode(variantTree),
    [variantTree],
  );
  const variantLines = useMemo(
    () => getRelevantVariantLines(variantTree),
    [variantTree],
  );
  const canUndo = useMemo(
    () => canUndoInVariantTree(variantTree),
    [variantTree],
  );
  const canRedo = useMemo(
    () => canRedoInVariantTree(variantTree),
    [variantTree],
  );
  const shortcutEntries = useMemo(
    () =>
      SHORTCUT_ACTION_ORDER.map((actionName) => ({
        actionName,
        ...shortcutConfig[actionName],
      })),
    [shortcutConfig],
  );
  const currentPositionComments = useMemo(
    () =>
      importedPgnData?.mainlineComments?.filter(
        (commentEntry) => commentEntry.fen === fen,
      ) ?? [],
    [fen, importedPgnData],
  );
  const hasImportedPgnDetails = useMemo(
    () =>
      !!(
        importedPgnData &&
        (
          importedPgnData.headers.length ||
          importedPgnData.mainlineComments.length ||
          importedPgnData.additionalComments.length ||
          importedPgnData.variationSnippets.length
        )
      ),
    [importedPgnData],
  );
  const currentMoveLabel = useMemo(
    () => getCurrentMoveLabel(moveHistory),
    [moveHistory],
  );

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

    const nextVariantTree = applyMoveToVariantTree(variantTree, {
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });

    if (!nextVariantTree) {
      return false;
    }

    setVariantTree(nextVariantTree);
    setEngineResult(null);
    setEvaluationResult(null);

    return true;
  }

  const undoMove = useCallback(() => {
    if (!canUndo) {
      return;
    }

    setVariantTree((currentValue) => undoInVariantTree(currentValue));
    setEngineResult(null);
    setEvaluationResult(null);
  }, [canUndo]);

  const redoMove = useCallback(() => {
    if (!canRedo) {
      return;
    }

    setVariantTree((currentValue) => redoInVariantTree(currentValue));
    setEngineResult(null);
    setEvaluationResult(null);
  }, [canRedo]);

  const goToStart = useCallback(() => {
    if (!canUndo) {
      return;
    }

    setVariantTree((currentValue) => goToStartInVariantTree(currentValue));
    setEngineResult(null);
    setEvaluationResult(null);
  }, [canUndo]);

  const goToEnd = useCallback(() => {
    if (!canRedo) {
      return;
    }

    setVariantTree((currentValue) => goToEndInVariantTree(currentValue));
    setEngineResult(null);
    setEvaluationResult(null);
  }, [canRedo]);

  const selectVariant = useCallback((lineId) => {
    setVariantTree((currentValue) => selectVariantLine(currentValue, lineId));
    setEngineResult(null);
    setEvaluationResult(null);
  }, []);

  const promoteVariant = useCallback((lineId) => {
    setVariantTree((currentValue) => promoteVariantLine(currentValue, lineId));
  }, []);

  const demoteVariant = useCallback((lineId) => {
    setVariantTree((currentValue) => demoteVariantLine(currentValue, lineId));
  }, []);

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
    setImportPgnValue(importedPgnData?.rawPgn ?? game.pgn());
    setImportPgnError("");
    setShowImportPgnPopup(true);
  }, [game, importedPgnData]);

  const closeImportPgnPopup = useCallback(() => {
    setShowImportPgnPopup(false);
    setImportPgnValue("");
    setImportPgnError("");
  }, []);

  function importPgn() {
    const {
      variantTree: importedVariantTree,
      importedPgnData: nextImportedPgnData,
      error,
    } = parseAnnotatedPgn(importPgnValue, {
      allowEmpty: false,
    });

    if (error || !importedVariantTree) {
      setImportPgnError(
        error ?? "Invalid PGN. Please check the notation and try again.",
      );
      return;
    }

    setVariantTree(importedVariantTree);
    setEngineResult(null);
    setEvaluationResult(null);
    setImportedPgnData(nextImportedPgnData);
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
    try {
      savePersistedAppState({
        variantTree,
        boardOrientation,
        showMoveHistory,
        showEngineWindow,
        showEvaluationBar,
        showComments,
        showImportedPgn,
        showVariants,
        importedPgnData,
      });
    } catch (error) {
      console.error("Failed to persist app state:", error);
    }
  }, [
    boardOrientation,
    importedPgnData,
    showEngineWindow,
    showEvaluationBar,
    showComments,
    showImportedPgn,
    showMoveHistory,
    showVariants,
    variantTree,
  ]);

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
    let ignore = false;
    setEvaluationResult(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch("http://localhost:3001/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fen,
            depth: 10,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.details || data.error || "Request failed");
        }

        if (!ignore) {
          console.log("Position evaluation:", data);
          setEvaluationResult(data);
        }
      } catch {
        if (!ignore) {
          setEvaluationResult(null);
        }
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [fen]);

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
    setVariantTree(createEmptyVariantTree());
    setEngineResult(null);
    setEvaluationResult(null);
    setImportedPgnData(null);
  }

  function toggleMoveHistory() {
    setShowMoveHistory((currentValue) => !currentValue);
  }

  function toggleEngineWindow() {
    setShowEngineWindow((currentValue) => !currentValue);
  }

  function toggleEvaluationBar() {
    setShowEvaluationBar((currentValue) => !currentValue);
  }

  function toggleComments() {
    setShowComments((currentValue) => !currentValue);
  }

  function toggleImportedPgn() {
    setShowImportedPgn((currentValue) => !currentValue);
  }

  function toggleVariants() {
    setShowVariants((currentValue) => !currentValue);
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
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(toggleEvaluationBar)}
              >
                {showEvaluationBar ? "Hide Evaluation Bar" : "Show Evaluation Bar"}
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(toggleComments)}
              >
                {showComments ? "Hide Comments" : "Show Comments"}
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(toggleImportedPgn)}
              >
                {showImportedPgn ? "Hide Imported PGN" : "Show Imported PGN"}
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(toggleVariants)}
              >
                {showVariants ? "Hide Variants" : "Show Variants"}
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

      <div className="workspace">
        <div className="board-panel">
          <div className="board-and-evaluation">
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
            {showEvaluationBar && (
              <EvaluationBar
                evaluation={evaluationResult?.evaluation}
                boardOrientation={boardOrientation}
                turn={game.turn()}
              />
            )}
          </div>
        </div>

        <div className="info-column info-column-navigation">
          {showMoveHistory && (
            <MoveHistory
              moveHistory={moveHistory}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undoMove}
              onRedo={redoMove}
              onGoToStart={goToStart}
              onGoToEnd={goToEnd}
            />
          )}
        </div>

        <div className="info-column info-column-reference">
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

          {showComments && importedPgnData && (
            <div className="card">
              <h2>Comments</h2>
              <p className="current-move-label">{currentMoveLabel}</p>
              {currentPositionComments.length > 0 ? (
                <ul className="annotation-list">
                  {currentPositionComments.map((commentEntry, index) => (
                    <li
                      key={`${commentEntry.fen ?? "current"}-${index}`}
                      className="annotation-item"
                    >
                      <p>{commentEntry.comment}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="annotation-empty">
                  No annotation is available for the current move.
                </p>
              )}
            </div>
          )}

          {showVariants && (
            <VariantsView
              variantLines={variantLines}
              canUndo={canUndo}
              canRedo={canRedo}
              onSelectLine={selectVariant}
              onPromoteLine={promoteVariant}
              onDemoteLine={demoteVariant}
              onUndo={undoMove}
              onRedo={redoMove}
              onGoToStart={goToStart}
              onGoToEnd={goToEnd}
            />
          )}

          {showImportedPgn && hasImportedPgnDetails && (
            <div className="card">
              <h2>Imported PGN</h2>
              {!!importedPgnData.headers.length && (
                <dl className="pgn-metadata-list">
                  {importedPgnData.headers.map(({ name, value }) => (
                    <div key={`${name}-${value}`} className="pgn-metadata-row">
                      <dt>{name}</dt>
                      <dd>
                        {isLinkValue(value) ? (
                          <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pgn-link"
                          >
                            {value}
                          </a>
                        ) : (
                          value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {!!importedPgnData.mainlineComments.length && (
                <div className="annotation-section">
                  <h3>All Main Line Notes</h3>
                  <ul className="annotation-list">
                    {importedPgnData.mainlineComments.map((commentEntry, index) => (
                      <li
                        key={`${commentEntry.fen ?? "mainline"}-${index}`}
                        className="annotation-item"
                      >
                        <span className="annotation-label">
                          {formatPgnCommentLabel(commentEntry)}
                        </span>
                        <p>{commentEntry.comment}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!!importedPgnData.additionalComments.length && (
                <div className="annotation-section">
                  <h3>Additional Notes</h3>
                  <ul className="annotation-list">
                    {importedPgnData.additionalComments.map((commentEntry, index) => (
                      <li
                        key={`${commentEntry.text}-${index}`}
                        className="annotation-item"
                      >
                        <span className="annotation-label">
                          {commentEntry.inVariation ? "Variation note" : "General note"}
                        </span>
                        <p>{commentEntry.text}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!!importedPgnData.variationSnippets.length && (
                <details className="annotation-section">
                  <summary>
                    Variation snippets ({importedPgnData.variationSnippets.length})
                  </summary>
                  <ul className="variation-list">
                    {importedPgnData.variationSnippets.map((snippet, index) => (
                      <li key={`${snippet}-${index}`}>
                        <code>{snippet}</code>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <details className="annotation-section">
                <summary>Raw imported PGN</summary>
                <code>{importedPgnData.rawPgn}</code>
              </details>
            </div>
          )}
        </div>
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
