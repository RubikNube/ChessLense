import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
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
  buildLichessSearchQuery,
  DEFAULT_LICHESS_SEARCH_FILTERS,
  formatLichessGameDate,
  formatLichessResult,
  LICHESS_COLOR_OPTIONS,
  LICHESS_PERF_TYPE_OPTIONS,
} from "./utils/lichessSearch.js";
import {
  buildOtbSearchQuery,
  DEFAULT_OTB_SEARCH_FILTERS,
  formatOtbGameDate,
  formatOtbMoveCount,
  formatOtbResult,
  OTB_COLOR_OPTIONS,
  OTB_RESULT_OPTIONS,
} from "./utils/otbSearch.js";
import {
  applyMoveToVariantTree,
  buildGameToNode,
  canJumpBackToSidelineInTree,
  canJumpToMainVariantInTree,
  canRedoInVariantTree,
  canUndoInVariantTree,
  createEmptyVariantTree,
  demoteVariantLine,
  getAlternativeVariantFirstMoves,
  getMoveHistoryForNode,
  getRelevantVariantLines,
  goToEndInVariantTree,
  goToStartInVariantTree,
  importMoveSequenceToVariantTree,
  jumpBackToSidelineInTree,
  jumpToMainVariantInTree,
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

const wideModalStyle = {
  ...shortcutModalStyle,
  width: "min(100%, 48rem)",
  maxHeight: "90vh",
  overflowY: "auto",
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

const engineVariantListStyle = {
  listStyle: "none",
  padding: 0,
  margin: "1rem 0 0",
  display: "grid",
  gap: "0.75rem",
};

const engineVariantButtonStyle = {
  width: "100%",
  padding: "0.85rem 0.9rem",
  border: "1px solid #d1d5db",
  borderRadius: "0.6rem",
  backgroundColor: "#f9fafb",
  color: "#111827",
  textAlign: "left",
  cursor: "pointer",
};

const selectedEngineVariantButtonStyle = {
  borderColor: "#2563eb",
  backgroundColor: "#eff6ff",
  boxShadow: "0 0 0 1px #2563eb inset",
};

const engineVariantHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
};

const engineVariantMovesStyle = {
  margin: "0.5rem 0 0",
  color: "#374151",
  lineHeight: 1.5,
  fontSize: "0.95rem",
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

async function fetchJson(path, options = {}) {
  let response;

  try {
    response = await fetch(path, options);
  } catch {
    throw new Error(
      "Backend unavailable. Start the server on port 3001 or run ./dev.sh from the project root.",
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.details || data.error || "Request failed");
  }

  return data;
}

function parseUciMove(uciMove) {
  if (typeof uciMove !== "string") {
    return null;
  }

  const match = uciMove.trim().match(/^([a-h][1-8])([a-h][1-8])([nbrq])?$/i);

  if (!match) {
    return null;
  }

  return {
    from: match[1].toLowerCase(),
    to: match[2].toLowerCase(),
    ...(match[3] ? { promotion: match[3].toLowerCase() } : {}),
  };
}

function buildEngineVariantPreview(fen, uciMoves) {
  const previewGame = new Chess(fen);
  const moveObjects = [];
  const sanMoves = [];

  for (const uciMove of Array.isArray(uciMoves) ? uciMoves : []) {
    const parsedMove = parseUciMove(uciMove);

    if (!parsedMove) {
      break;
    }

    const appliedMove = previewGame.move(parsedMove);

    if (!appliedMove) {
      break;
    }

    moveObjects.push(parsedMove);
    sanMoves.push(appliedMove.san);
  }

  return {
    moveObjects,
    sanMoves,
  };
}

function formatEngineEvaluation(evaluation) {
  if (!evaluation) {
    return "n/a";
  }

  return `${evaluation.type} ${evaluation.value}`;
}

function formatPlayerLabel(player) {
  const prefix = player?.title ? `${player.title} ` : "";
  const rating = Number.isFinite(player?.rating) ? ` (${player.rating})` : "";

  return `${prefix}${player?.name ?? "Anonymous"}${rating}`;
}

function App() {
  const persistedAppState = useMemo(() => loadPersistedAppState(), []);
  const [variantTree, setVariantTree] = useState(
    () => persistedAppState?.variantTree ?? createEmptyVariantTree(),
  );
  const [engineResult, setEngineResult] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedEngineVariantIndex, setSelectedEngineVariantIndex] = useState(0);
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
  const [showVariantArrows, setShowVariantArrows] = useState(
    () => persistedAppState?.showVariantArrows ?? false,
  );
  const [showShortcutsPopup, setShowShortcutsPopup] = useState(false);
  const [showImportPgnPopup, setShowImportPgnPopup] = useState(false);
  const [showLichessSearchPopup, setShowLichessSearchPopup] = useState(false);
  const [showOtbSearchPopup, setShowOtbSearchPopup] = useState(false);
  const [boardOrientation, setBoardOrientation] = useState(
    () => persistedAppState?.boardOrientation ?? "white",
  );
  const [shortcutConfig, setShortcutConfig] = useState(DEFAULT_SHORTCUT_CONFIG);
  const [copyNotification, setCopyNotification] = useState("");
  const [importPgnValue, setImportPgnValue] = useState("");
  const [importPgnError, setImportPgnError] = useState("");
  const [lichessSearchFilters, setLichessSearchFilters] = useState(
    DEFAULT_LICHESS_SEARCH_FILTERS,
  );
  const [lichessSearchResults, setLichessSearchResults] = useState([]);
  const [lichessSearchError, setLichessSearchError] = useState("");
  const [lichessImportError, setLichessImportError] = useState("");
  const [lichessSearchLoading, setLichessSearchLoading] = useState(false);
  const [lichessImportingGameId, setLichessImportingGameId] = useState("");
  const [hasSearchedLichess, setHasSearchedLichess] = useState(false);
  const [otbSearchFilters, setOtbSearchFilters] = useState(
    DEFAULT_OTB_SEARCH_FILTERS,
  );
  const [otbSearchResults, setOtbSearchResults] = useState([]);
  const [otbSearchError, setOtbSearchError] = useState("");
  const [otbImportError, setOtbImportError] = useState("");
  const [otbSearchLoading, setOtbSearchLoading] = useState(false);
  const [otbImportingGameId, setOtbImportingGameId] = useState("");
  const [hasSearchedOtb, setHasSearchedOtb] = useState(false);
  const [boardPanelHeight, setBoardPanelHeight] = useState(0);
  const [importedPgnData, setImportedPgnData] = useState(
    () => persistedAppState?.importedPgnData ?? null,
  );
  const shortcutConfigSignatureRef = useRef(
    DEFAULT_SHORTCUT_CONFIG_SIGNATURE,
  );
  const boardPanelRef = useRef(null);

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
  const canJumpToMainVariant = useMemo(
    () => canJumpToMainVariantInTree(variantTree),
    [variantTree],
  );
  const canJumpBackToSideline = useMemo(
    () => canJumpBackToSidelineInTree(variantTree),
    [variantTree],
  );
  const variantArrows = useMemo(
    () =>
      getAlternativeVariantFirstMoves(variantTree).map(({ from, to }) => ({
        startSquare: from,
        endSquare: to,
        color: "#2563eb",
      })),
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
  const engineVariants = useMemo(
    () =>
      (engineResult?.principalVariations ?? []).map((variation, index) => {
        const { moveObjects, sanMoves } = buildEngineVariantPreview(fen, variation.moves);

        return {
          ...variation,
          index,
          moveObjects,
          sanMoves,
          displayText: sanMoves.join(" "),
        };
      }),
    [engineResult, fen],
  );
  const selectedEngineVariant = useMemo(
    () => engineVariants[selectedEngineVariantIndex] ?? engineVariants[0] ?? null,
    [engineVariants, selectedEngineVariantIndex],
  );

  function applyImportedPgn(rawPgn) {
    const {
      variantTree: importedVariantTree,
      importedPgnData: nextImportedPgnData,
      error,
    } = parseAnnotatedPgn(rawPgn, {
      allowEmpty: false,
    });

    if (error || !importedVariantTree) {
      return error ?? "Invalid PGN. Please check the notation and try again.";
    }

    setVariantTree(importedVariantTree);
    setEngineResult(null);
    setEvaluationResult(null);
    setImportedPgnData(nextImportedPgnData);
    return "";
  }
  const currentMoveIndex = moveHistory.length - 1;

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

  const jumpToMainVariant = useCallback(() => {
    if (!canJumpToMainVariant) {
      return;
    }

    setVariantTree((currentValue) => jumpToMainVariantInTree(currentValue));
    setEngineResult(null);
    setEvaluationResult(null);
  }, [canJumpToMainVariant]);

  const jumpBackToSideline = useCallback(() => {
    if (!canJumpBackToSideline) {
      return;
    }

    setVariantTree((currentValue) => jumpBackToSidelineInTree(currentValue));
    setEngineResult(null);
    setEvaluationResult(null);
  }, [canJumpBackToSideline]);

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

  const openLichessSearchPopup = useCallback(() => {
    setShowLichessSearchPopup(true);
    setLichessSearchError("");
    setLichessImportError("");
  }, []);

  const closeLichessSearchPopup = useCallback(() => {
    setShowLichessSearchPopup(false);
    setLichessSearchError("");
    setLichessImportError("");
    setLichessImportingGameId("");
  }, []);

  const openOtbSearchPopup = useCallback(() => {
    setShowOtbSearchPopup(true);
    setOtbSearchError("");
    setOtbImportError("");
  }, []);

  const closeOtbSearchPopup = useCallback(() => {
    setShowOtbSearchPopup(false);
    setOtbSearchError("");
    setOtbImportError("");
    setOtbImportingGameId("");
  }, []);

  function importPgn() {
    const nextError = applyImportedPgn(importPgnValue);

    if (nextError) {
      setImportPgnError(nextError);
      return;
    }

    closeImportPgnPopup();
  }

  async function searchLichessGames() {
    const { query, error } = buildLichessSearchQuery(lichessSearchFilters);

    if (error) {
      setLichessSearchError(error);
      setLichessImportError("");
      setLichessSearchResults([]);
      setHasSearchedLichess(false);
      return;
    }

    setLichessSearchLoading(true);
    setLichessSearchError("");
    setLichessImportError("");
    setHasSearchedLichess(true);

    try {
      const data = await fetchJson(`/api/lichess/games?${query}`);
      setLichessSearchResults(Array.isArray(data.games) ? data.games : []);
    } catch (error) {
      setLichessSearchResults([]);
      setLichessSearchError(error.message);
    } finally {
      setLichessSearchLoading(false);
    }
  }

  async function importLichessGame(gameId) {
    setLichessImportError("");
    setLichessImportingGameId(gameId);

    try {
      const data = await fetchJson(`/api/lichess/games/${gameId}`);
      const nextError = applyImportedPgn(data.pgn);

      if (nextError) {
        setLichessImportError(nextError);
        return;
      }

      setShowImportedPgn(true);
      setShowComments(true);
      closeLichessSearchPopup();
    } catch (error) {
      setLichessImportError(error.message);
    } finally {
      setLichessImportingGameId("");
    }
  }

  async function searchOtbGames() {
    const { query, error } = buildOtbSearchQuery(otbSearchFilters);

    if (error) {
      setOtbSearchError(error);
      setOtbImportError("");
      setOtbSearchResults([]);
      setHasSearchedOtb(false);
      return;
    }

    setOtbSearchLoading(true);
    setOtbSearchError("");
    setOtbImportError("");
    setHasSearchedOtb(true);

    try {
      const data = await fetchJson(`/api/otb/games?${query}`);
      setOtbSearchResults(Array.isArray(data.games) ? data.games : []);
    } catch (error) {
      setOtbSearchResults([]);
      setOtbSearchError(error.message);
    } finally {
      setOtbSearchLoading(false);
    }
  }

  async function importOtbGame(gameId) {
    setOtbImportError("");
    setOtbImportingGameId(gameId);

    try {
      const data = await fetchJson(`/api/otb/games/${gameId}`);
      const nextError = applyImportedPgn(data.pgn);

      if (nextError) {
        setOtbImportError(nextError);
        return;
      }

      setShowImportedPgn(true);
      setShowComments(true);
      closeOtbSearchPopup();
    } catch (error) {
      setOtbImportError(error.message);
    } finally {
      setOtbImportingGameId("");
    }
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
        showVariantArrows,
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
    showVariantArrows,
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
    const boardPanelElement = boardPanelRef.current;

    if (!boardPanelElement) {
      return undefined;
    }

    function updateBoardPanelHeight() {
      setBoardPanelHeight(boardPanelElement.getBoundingClientRect().height);
    }

    updateBoardPanelHeight();

    if (typeof ResizeObserver !== "function") {
      window.addEventListener("resize", updateBoardPanelHeight);

      return () => {
        window.removeEventListener("resize", updateBoardPanelHeight);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      updateBoardPanelHeight();
    });
    resizeObserver.observe(boardPanelElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [showEvaluationBar]);

  useEffect(() => {
    let ignore = false;
    setEvaluationResult(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        const data = await fetchJson("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fen,
            depth: 10,
            multipv: 1,
          }),
        });

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
    setSelectedEngineVariantIndex(0);

    try {
      const data = await fetchJson("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fen,
          depth: 12,
          multipv: 3,
        }),
      });

      setEngineResult(data);
    } catch (error) {
      setEngineResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  const addSelectedEngineVariantToTree = useCallback(() => {
    if (!selectedEngineVariant?.moveObjects?.length) {
      return;
    }

    const nextVariantTree = importMoveSequenceToVariantTree(
      variantTree,
      selectedEngineVariant.moveObjects,
    );

    if (!nextVariantTree) {
      setEngineResult((currentValue) =>
        currentValue
          ? {
              ...currentValue,
              error: "Unable to add the selected engine line to the variant tree.",
            }
          : { error: "Unable to add the selected engine line to the variant tree." },
      );
      return;
    }

    setVariantTree(nextVariantTree);
    setShowMoveHistory(true);
    setShowVariants(true);
    setEngineResult(null);
    setEvaluationResult(null);
  }, [selectedEngineVariant, variantTree]);

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

  function toggleVariantArrows() {
    setShowVariantArrows((currentValue) => !currentValue);
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

      if (showLichessSearchPopup) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeLichessSearchPopup();
        }

        return;
      }

      if (showOtbSearchPopup) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeOtbSearchPopup();
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

      if (matchesShortcut(event, shortcutConfig.jumpToMainVariant.keys)) {
        event.preventDefault();
        jumpToMainVariant();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.jumpBackToSideline.keys)) {
        event.preventDefault();
        jumpBackToSideline();
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
    closeLichessSearchPopup,
    closeOtbSearchPopup,
    closeShortcutsPopup,
    jumpBackToSideline,
    jumpToMainVariant,
    goToEnd,
    goToStart,
    openShortcutsPopup,
    redoMove,
    shortcutConfig,
    showLichessSearchPopup,
    showOtbSearchPopup,
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
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(toggleVariantArrows)}
              >
                {showVariantArrows ? "Hide Variant Arrows" : "Show Variant Arrows"}
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
            onClick={() => toggleMenu("search")}
          >
            Search
          </button>
          {openMenu === "search" && (
            <div className="menu-dropdown">
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(openLichessSearchPopup)}
              >
                Search Lichess
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(openOtbSearchPopup)}
              >
                Search OTB Master Games
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
        <div className="board-panel" ref={boardPanelRef}>
          <div className="board-and-evaluation">
            <div className="chessboard-wrapper">
              <Chessboard
                position={fen}
                onPieceDrop={handlePieceDrop}
                boardOrientation={boardOrientation}
                arrows={showVariantArrows ? variantArrows : []}
                options={{
                  position: fen,
                  onPieceDrop: handlePieceDrop,
                  boardOrientation,
                  arrows: showVariantArrows ? variantArrows : [],
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
              currentMoveIndex={currentMoveIndex}
              boardPanelHeight={boardPanelHeight}
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
                    {formatEngineEvaluation(engineResult.evaluation)}
                  </p>
                  {!engineVariants.length && (
                    <p className="annotation-empty">
                      This backend is still returning the legacy single-variant response.
                      Restart the server once so the engine view can load the top three
                      variants.
                    </p>
                  )}
                  {!!engineVariants.length && (
                    <>
                      <ul style={engineVariantListStyle}>
                        {engineVariants.map((variant, index) => (
                          <li key={variant.multipv}>
                            <button
                              type="button"
                              onClick={() => setSelectedEngineVariantIndex(index)}
                              style={{
                                ...engineVariantButtonStyle,
                                ...(selectedEngineVariant?.index === index
                                  ? selectedEngineVariantButtonStyle
                                  : {}),
                              }}
                            >
                              <div style={engineVariantHeaderStyle}>
                                <strong>Variant {variant.multipv}</strong>
                                <span>{formatEngineEvaluation(variant.evaluation)}</span>
                              </div>
                              <p style={engineVariantMovesStyle}>
                                {variant.displayText || (variant.moves ?? []).join(" ")}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                      <div style={modalActionRowStyle}>
                        <button
                          type="button"
                          style={modalPrimaryButtonStyle}
                          onClick={addSelectedEngineVariantToTree}
                          disabled={!selectedEngineVariant?.moveObjects?.length}
                        >
                          Add to variants
                        </button>
                      </div>
                    </>
                  )}
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
              canJumpToMainVariant={canJumpToMainVariant}
              onSelectLine={selectVariant}
              onPromoteLine={promoteVariant}
              onDemoteLine={demoteVariant}
              onUndo={undoMove}
              onRedo={redoMove}
              onGoToStart={goToStart}
              onGoToEnd={goToEnd}
              onJumpToMainVariant={jumpToMainVariant}
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

      {showLichessSearchPopup && (
        <div
          style={shortcutOverlayStyle}
          onClick={closeLichessSearchPopup}
          role="presentation"
        >
          <div
            style={wideModalStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lichess-search-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="lichess-search-title">Search Lichess</h2>
            <p>
              Search public Lichess games by player, then narrow results with
              filters like opponent, year, color, and speed.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                searchLichessGames();
              }}
            >
              <div className="modal-form-grid">
                <label className="modal-field">
                  <span>Player</span>
                  <input
                    className="modal-input"
                    type="text"
                    value={lichessSearchFilters.player}
                    onChange={(event) => {
                      setLichessSearchFilters((currentValue) => ({
                        ...currentValue,
                        player: event.target.value,
                      }));
                      setLichessSearchError("");
                    }}
                    placeholder="MagnusCarlsen"
                    autoFocus
                  />
                </label>
                <label className="modal-field">
                  <span>Opponent</span>
                  <input
                    className="modal-input"
                    type="text"
                    value={lichessSearchFilters.opponent}
                    onChange={(event) => {
                      setLichessSearchFilters((currentValue) => ({
                        ...currentValue,
                        opponent: event.target.value,
                      }));
                    }}
                    placeholder="Optional"
                  />
                </label>
                <label className="modal-field">
                  <span>Year</span>
                  <input
                    className="modal-input"
                    type="number"
                    min="2013"
                    max={new Date().getFullYear()}
                    value={lichessSearchFilters.year}
                    onChange={(event) => {
                      setLichessSearchFilters((currentValue) => ({
                        ...currentValue,
                        year: event.target.value,
                      }));
                      setLichessSearchError("");
                    }}
                    placeholder="2024"
                  />
                </label>
                <label className="modal-field">
                  <span>Color</span>
                  <select
                    className="modal-input"
                    value={lichessSearchFilters.color}
                    onChange={(event) => {
                      setLichessSearchFilters((currentValue) => ({
                        ...currentValue,
                        color: event.target.value,
                      }));
                    }}
                  >
                    {LICHESS_COLOR_OPTIONS.map(({ value, label }) => (
                      <option key={value || "any"} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="modal-field">
                  <span>Speed / Variant</span>
                  <select
                    className="modal-input"
                    value={lichessSearchFilters.perfType}
                    onChange={(event) => {
                      setLichessSearchFilters((currentValue) => ({
                        ...currentValue,
                        perfType: event.target.value,
                      }));
                    }}
                  >
                    {LICHESS_PERF_TYPE_OPTIONS.map(({ value, label }) => (
                      <option key={value || "any"} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="modal-field">
                  <span>Max results</span>
                  <input
                    className="modal-input"
                    type="number"
                    min="1"
                    max="50"
                    value={lichessSearchFilters.max}
                    onChange={(event) => {
                      setLichessSearchFilters((currentValue) => ({
                        ...currentValue,
                        max: event.target.value,
                      }));
                    }}
                  />
                </label>
              </div>
              {lichessSearchError && <p style={modalErrorStyle}>{lichessSearchError}</p>}
              {lichessImportError && <p style={modalErrorStyle}>{lichessImportError}</p>}
              <div style={modalActionRowStyle}>
                <button
                  type="button"
                  style={modalButtonStyle}
                  onClick={closeLichessSearchPopup}
                >
                  Close
                </button>
                <button
                  type="submit"
                  style={modalPrimaryButtonStyle}
                  disabled={lichessSearchLoading}
                >
                  {lichessSearchLoading ? "Searching..." : "Search"}
                </button>
              </div>
            </form>

            <div className="search-results-section">
              <h3>Lichess results</h3>
              {lichessSearchLoading && <p>Loading games...</p>}
              {!lichessSearchLoading && !hasSearchedLichess && (
                <p>Run a search to browse matching games.</p>
              )}
              {!lichessSearchLoading &&
                hasSearchedLichess &&
                !lichessSearchError &&
                lichessSearchResults.length === 0 && (
                  <p>No games matched those filters.</p>
                )}
              {!!lichessSearchResults.length && (
                <ul className="search-results-list">
                  {lichessSearchResults.map((gameResult) => (
                    <li key={gameResult.id} className="search-result-card">
                      <div className="search-result-header">
                        <strong>
                          {formatPlayerLabel(gameResult.players.white)} vs{" "}
                          {formatPlayerLabel(gameResult.players.black)}
                        </strong>
                        <span className="search-result-score">
                          {formatLichessResult(gameResult)}
                        </span>
                      </div>
                      <p className="search-result-meta">
                        {formatLichessGameDate(gameResult.createdAt)} ·{" "}
                        {gameResult.perf ?? gameResult.variant ?? "Unknown"} ·{" "}
                        {gameResult.rated ? "Rated" : "Casual"}
                        {gameResult.opening ? ` · ${gameResult.opening}` : ""}
                      </p>
                      <div className="search-result-actions">
                        <a
                          className="pgn-link"
                          href={gameResult.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open on Lichess
                        </a>
                        <button
                          type="button"
                          style={modalPrimaryButtonStyle}
                          onClick={() => importLichessGame(gameResult.id)}
                          disabled={lichessImportingGameId === gameResult.id}
                        >
                          {lichessImportingGameId === gameResult.id
                            ? "Importing..."
                            : "Import PGN"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {showOtbSearchPopup && (
        <div
          style={shortcutOverlayStyle}
          onClick={closeOtbSearchPopup}
          role="presentation"
        >
          <div
            style={wideModalStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="otb-search-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="otb-search-title">Search OTB Master Games</h2>
            <p>
              Search a local archive of historical master-game PGNs by player,
              opponent, player color, event, year range, result, ECO, or
              opening. Leave player color on{" "}
              <strong>Ignore player color</strong> to match both player/opponent
              orderings. Configure the archive with <code>OTB_PGN_DIR</code> or
              by adding PGN files under{" "}
              <code>server/data/otb</code>.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                searchOtbGames();
              }}
            >
              <div className="modal-form-grid">
                <label className="modal-field">
                  <span>Player</span>
                  <input
                    className="modal-input"
                    type="text"
                    value={otbSearchFilters.player}
                    onChange={(event) => {
                      setOtbSearchFilters((currentValue) => ({
                        ...currentValue,
                        player: event.target.value,
                      }));
                      setOtbSearchError("");
                    }}
                    placeholder="Morphy"
                    autoFocus
                  />
                </label>
                <label className="modal-field">
                  <span>Opponent</span>
                  <input
                    className="modal-input"
                    type="text"
                    value={otbSearchFilters.opponent}
                    onChange={(event) => {
                      setOtbSearchFilters((currentValue) => ({
                        ...currentValue,
                        opponent: event.target.value,
                      }));
                      setOtbSearchError("");
                    }}
                    placeholder="Anderssen"
                  />
                </label>
                <label className="modal-field">
                  <span>Player color</span>
                  <select
                    className="modal-input"
                    value={otbSearchFilters.color}
                    onChange={(event) => {
                      setOtbSearchFilters((currentValue) => ({
                        ...currentValue,
                        color: event.target.value,
                      }));
                      setOtbSearchError("");
                    }}
                  >
                    {OTB_COLOR_OPTIONS.map(({ value, label }) => (
                      <option key={value || "any"} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="modal-field">
                  <span>Event</span>
                  <input
                    className="modal-input"
                    type="text"
                    value={otbSearchFilters.event}
                    onChange={(event) => {
                      setOtbSearchFilters((currentValue) => ({
                        ...currentValue,
                        event: event.target.value,
                      }));
                    }}
                    placeholder="London"
                  />
                </label>
                <label className="modal-field">
                  <span>From year</span>
                  <input
                    className="modal-input"
                    type="number"
                    min="1000"
                    max={new Date().getFullYear()}
                    value={otbSearchFilters.yearFrom}
                    onChange={(event) => {
                      setOtbSearchFilters((currentValue) => ({
                        ...currentValue,
                        yearFrom: event.target.value,
                      }));
                      setOtbSearchError("");
                    }}
                    placeholder="1851"
                  />
                </label>
                <label className="modal-field">
                  <span>To year</span>
                  <input
                    className="modal-input"
                    type="number"
                    min="1000"
                    max={new Date().getFullYear()}
                    value={otbSearchFilters.yearTo}
                    onChange={(event) => {
                      setOtbSearchFilters((currentValue) => ({
                        ...currentValue,
                        yearTo: event.target.value,
                      }));
                      setOtbSearchError("");
                    }}
                    placeholder="1900"
                  />
                </label>
                <label className="modal-field">
                  <span>Result</span>
                  <select
                    className="modal-input"
                    value={otbSearchFilters.result}
                    onChange={(event) => {
                      setOtbSearchFilters((currentValue) => ({
                        ...currentValue,
                        result: event.target.value,
                      }));
                    }}
                  >
                    {OTB_RESULT_OPTIONS.map(({ value, label }) => (
                      <option key={value || "any"} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="modal-field">
                  <span>ECO</span>
                  <input
                    className="modal-input"
                    type="text"
                    value={otbSearchFilters.eco}
                    onChange={(event) => {
                      setOtbSearchFilters((currentValue) => ({
                        ...currentValue,
                        eco: event.target.value,
                      }));
                    }}
                    placeholder="C50"
                  />
                </label>
                <label className="modal-field">
                  <span>Opening</span>
                  <input
                    className="modal-input"
                    type="text"
                    value={otbSearchFilters.opening}
                    onChange={(event) => {
                      setOtbSearchFilters((currentValue) => ({
                        ...currentValue,
                        opening: event.target.value,
                      }));
                    }}
                    placeholder="Italian"
                  />
                </label>
                <label className="modal-field">
                  <span>Max results</span>
                  <input
                    className="modal-input"
                    type="number"
                    min="1"
                    max="100"
                    value={otbSearchFilters.max}
                    onChange={(event) => {
                      setOtbSearchFilters((currentValue) => ({
                        ...currentValue,
                        max: event.target.value,
                      }));
                    }}
                  />
                </label>
              </div>
              {otbSearchError && <p style={modalErrorStyle}>{otbSearchError}</p>}
              {otbImportError && <p style={modalErrorStyle}>{otbImportError}</p>}
              <div style={modalActionRowStyle}>
                <button
                  type="button"
                  style={modalButtonStyle}
                  onClick={closeOtbSearchPopup}
                >
                  Close
                </button>
                <button
                  type="submit"
                  style={modalPrimaryButtonStyle}
                  disabled={otbSearchLoading}
                >
                  {otbSearchLoading ? "Searching..." : "Search"}
                </button>
              </div>
            </form>

            <div className="search-results-section">
              <h3>OTB results</h3>
              {otbSearchLoading && <p>Loading games...</p>}
              {!otbSearchLoading && !hasSearchedOtb && (
                <p>Run a search to browse matching historical games.</p>
              )}
              {!otbSearchLoading &&
                hasSearchedOtb &&
                !otbSearchError &&
                otbSearchResults.length === 0 && (
                  <p>No games matched those filters.</p>
                )}
              {!!otbSearchResults.length && (
                <ul className="search-results-list">
                  {otbSearchResults.map((gameResult) => (
                    <li key={gameResult.id} className="search-result-card">
                      <div className="search-result-header">
                        <strong>
                          {formatPlayerLabel(gameResult.players.white)} vs{" "}
                          {formatPlayerLabel(gameResult.players.black)}
                        </strong>
                        <span className="search-result-score">
                          {formatOtbResult(gameResult)}
                        </span>
                      </div>
                      <p className="search-result-meta">
                        {formatOtbGameDate(gameResult)}
                        {gameResult.event ? ` · ${gameResult.event}` : ""}
                        {gameResult.site ? ` · ${gameResult.site}` : ""}
                      </p>
                      <p className="search-result-meta">
                        {gameResult.round ? `Round ${gameResult.round} · ` : ""}
                        {formatOtbMoveCount(gameResult)}
                      </p>
                      <p className="search-result-meta">
                        {gameResult.opening || gameResult.eco
                          ? `${gameResult.opening ?? "Opening unknown"}${
                              gameResult.eco ? ` (${gameResult.eco})` : ""
                            }`
                          : "Opening unknown"}
                        {gameResult.sourceFile ? ` · ${gameResult.sourceFile}` : ""}
                      </p>
                      <div className="search-result-actions">
                        <span className="search-result-source">
                          Local PGN archive
                        </span>
                        <button
                          type="button"
                          style={modalPrimaryButtonStyle}
                          onClick={() => importOtbGame(gameResult.id)}
                          disabled={otbImportingGameId === gameResult.id}
                        >
                          {otbImportingGameId === gameResult.id
                            ? "Importing..."
                            : "Import PGN"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
