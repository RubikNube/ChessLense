import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { createPortal } from "react-dom";
import { Chessboard } from "react-chessboard";
import EvaluationBar from "./components/EvaluationBar.jsx";
import MoveHistory from "./components/MoveHistory.jsx";
import PositionPreviewBoard from "./components/PositionPreviewBoard.jsx";
import VariantsView from "./components/VariantsView.jsx";
import {
  createUserPositionComment,
  DEFAULT_SHORTCUT_CONFIG,
  DEFAULT_SHORTCUT_CONFIG_SIGNATURE,
  SHORTCUT_ACTION_ORDER,
  getPositionCommentsForFen,
  getShortcutDisplayLabel,
  loadPersistedAppState,
  matchesShortcut,
  normalizeShortcutConfig,
  removePositionCommentEntry,
  savePositionCommentEntry,
  savePersistedAppState,
  seedPositionCommentsFromImportedPgnData,
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
  createCollectionPayload,
  filterStudiesByCollection,
  getCollectionsForStudy,
  normalizeCollection,
} from "./utils/collections.js";
import {
  buildStudyTitle,
  createStudySavePayload,
  normalizeStudy,
  normalizeStudySummary,
} from "./utils/studies.js";
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
  getMoveHistoryEntries,
  getMoveHistoryForNode,
  getRelevantVariantLines,
  goToNodeInVariantTree,
  goToEndInVariantTree,
  goToStartInVariantTree,
  importMoveSequenceToVariantTree,
  jumpBackToSidelineInTree,
  jumpToMainVariantInTree,
  normalizeVariantTree,
  promoteVariantLine,
  redoInVariantTree,
  removeVariantLine,
  selectVariantLine,
  undoInVariantTree,
} from "./utils/variantTree.js";
import {
  buildReplayAttempt,
  createEmptyTrainingState,
  createReplayTrainingState,
  getCurrentReplayMove,
  normalizeTrainingState,
  REPLAY_RESULT_MATCH,
  summarizeReplayAttempts,
  TRAINING_COMPLETION_MATCH,
  TRAINING_COMPLETION_REVEALED,
  TRAINING_MODE_REPLAY_GAME,
  TRAINING_PLAY_STATUS_ACTIVE,
  TRAINING_SIDE_BLACK,
  TRAINING_SIDE_WHITE,
  TRAINING_STATUS_ACTIVE,
  TRAINING_STATUS_COMPLETED,
} from "./utils/training.js";
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

const modalDangerButtonStyle = {
  ...modalButtonStyle,
  borderColor: "#dc2626",
  backgroundColor: "#fef2f2",
  color: "#b91c1c",
};

const modalErrorStyle = {
  marginTop: "0.75rem",
  color: "#dc2626",
};

const modalFieldLabelStyle = {
  display: "block",
  marginTop: "1rem",
  fontWeight: 600,
  color: "#111827",
};

const modalInputStyle = {
  width: "100%",
  marginTop: "0.5rem",
  padding: "0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  fontSize: "0.95rem",
  lineHeight: 1.4,
};

const studyListStyle = {
  listStyle: "none",
  padding: 0,
  margin: "1rem 0 0",
  display: "grid",
  gap: "0.75rem",
};

const studyListItemStyle = {
  border: "1px solid #d1d5db",
  borderRadius: "0.65rem",
  padding: "0.9rem",
  backgroundColor: "#f9fafb",
};

const studyHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "0.75rem",
};

const studyMetaStyle = {
  marginTop: "0.45rem",
  color: "#4b5563",
  fontSize: "0.92rem",
  lineHeight: 1.5,
};

const collectionListStyle = {
  listStyle: "none",
  padding: 0,
  margin: "1rem 0 0",
  display: "grid",
  gap: "0.65rem",
};

const collectionRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
  padding: "0.75rem 0.9rem",
  borderRadius: "0.65rem",
  border: "1px solid #d1d5db",
  backgroundColor: "#f9fafb",
};

const collectionSelectButtonStyle = {
  ...modalButtonStyle,
  flex: 1,
  textAlign: "left",
};

const collectionTagListStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
  marginTop: "0.6rem",
};

const collectionTagStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "0.25rem 0.55rem",
  borderRadius: "999px",
  backgroundColor: "#e5e7eb",
  color: "#374151",
  fontSize: "0.82rem",
  fontWeight: 600,
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

const TRAINING_PREVIEW_TOOLTIP_WIDTH_PX = 176;
const TRAINING_PREVIEW_TOOLTIP_HEIGHT_PX = 220;
const TRAINING_PREVIEW_TOOLTIP_GAP_PX = 12;
const TRAINING_PREVIEW_TOOLTIP_MARGIN_PX = 16;

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

function getPgnHeaderValue(importedPgnData, headerName) {
  if (!importedPgnData?.headers?.length || typeof headerName !== "string") {
    return "";
  }

  const matchingHeader = importedPgnData.headers.find(
    ({ name }) => typeof name === "string" && name.toLowerCase() === headerName.toLowerCase(),
  );

  return typeof matchingHeader?.value === "string" ? matchingHeader.value.trim() : "";
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

function formatStudyTimestamp(timestamp) {
  const parsedTimestamp = new Date(timestamp);

  if (Number.isNaN(parsedTimestamp.getTime())) {
    return "Unknown";
  }

  return parsedTimestamp.toLocaleString();
}

function getStudySummaryText(study) {
  if (!study || typeof study !== "object") {
    return "";
  }

  const summary = study.summary ?? {};
  const parts = [];

  if (summary.white || summary.black) {
    parts.push(
      summary.white && summary.black
        ? `${summary.white} vs ${summary.black}`
        : summary.white || summary.black,
    );
  }

  if (summary.event) {
    parts.push(summary.event);
  }

  parts.push(`${summary.commentCount ?? 0} comments`);
  parts.push(`${summary.maxPly ?? 0} plies`);

  return parts.join(" · ");
}

function buildPositionCommentContext(fen, moveHistory) {
  const normalizedMoveHistory = Array.isArray(moveHistory) ? moveHistory : [];
  const ply = normalizedMoveHistory.length;

  if (ply === 0) {
    return {
      fen,
      ply: 0,
      moveNumber: 0,
      side: null,
      san: null,
    };
  }

  return {
    fen,
    ply,
    moveNumber: Math.floor((ply - 1) / 2) + 1,
    side: ply % 2 === 0 ? "black" : "white",
    san: normalizedMoveHistory[ply - 1] ?? null,
  };
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

function formatMoveAsUci(move) {
  if (!move || typeof move !== "object") {
    return "";
  }

  return `${move.from ?? ""}${move.to ?? ""}${move.promotion ?? ""}`;
}

function buildEngineVariantPreview(fen, uciMoves) {
  const previewGame = new Chess(fen);
  const moveObjects = [];
  const sanMoves = [];
  const formattedMoves = [];
  let previousMoveSide = null;

  for (const uciMove of Array.isArray(uciMoves) ? uciMoves : []) {
    const parsedMove = parseUciMove(uciMove);

    if (!parsedMove) {
      break;
    }

    const moveNumber = previewGame.moveNumber();
    const movingSide = previewGame.turn();
    let appliedMove = null;

    try {
      appliedMove = previewGame.move(parsedMove);
    } catch {
      break;
    }

    if (!appliedMove) {
      break;
    }

    moveObjects.push(parsedMove);
    sanMoves.push(appliedMove.san);
    formattedMoves.push(
      movingSide === "w"
        ? `${moveNumber}. ${appliedMove.san}`
        : previousMoveSide === "w"
          ? appliedMove.san
          : `${moveNumber}... ${appliedMove.san}`,
    );
    previousMoveSide = movingSide;
  }

  return {
    moveObjects,
    sanMoves,
    displayText: formattedMoves.join(" "),
  };
}

function formatUciMoveAsSan(fen, uciMove) {
  return buildEngineVariantPreview(fen, [uciMove]).sanMoves[0] ?? uciMove ?? "n/a";
}

function formatEngineEvaluation(evaluation) {
  if (!evaluation) {
    return "n/a";
  }

  return `${evaluation.type} ${evaluation.value}`;
}

function formatReplayMoveLabel(move) {
  if (!move || typeof move !== "object") {
    return "Move";
  }

  if (
    typeof move.moveNumber === "number" &&
    move.moveNumber > 0 &&
    typeof move.san === "string" &&
    move.san
  ) {
    return move.side === "black"
      ? `${move.moveNumber}... ${move.san}`
      : `${move.moveNumber}. ${move.san}`;
  }

  return move.san ?? "Move";
}

function getTrainingSideForTurn(turn) {
  return turn === "b" ? TRAINING_SIDE_BLACK : TRAINING_SIDE_WHITE;
}

function formatReplayGuessPrompt(move, previousMoveLabel) {
  if (!move || typeof move !== "object") {
    return "Keep guessing.";
  }

  if (move.side === "white") {
    return previousMoveLabel && previousMoveLabel !== "Game introduction"
      ? `Keep guessing for White's move after ${previousMoveLabel}.`
      : "Keep guessing for White's first move.";
  }

  return previousMoveLabel && previousMoveLabel !== "Game introduction"
    ? `Keep guessing for Black's reply to ${previousMoveLabel}.`
    : "Keep guessing for Black's move.";
}

function formatReplayDelta(deltaCp) {
  if (!Number.isFinite(deltaCp)) {
    return "n/a";
  }

  const pawns = deltaCp / 100;
  return pawns > 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
}

function getTrainingPreviewPosition(targetRect) {
  const centeredTop = targetRect.top + targetRect.height / 2;
  const fitsRight =
    targetRect.right + TRAINING_PREVIEW_TOOLTIP_GAP_PX + TRAINING_PREVIEW_TOOLTIP_WIDTH_PX <=
    window.innerWidth - TRAINING_PREVIEW_TOOLTIP_MARGIN_PX;

  return {
    left: fitsRight
      ? targetRect.right + TRAINING_PREVIEW_TOOLTIP_GAP_PX
      : Math.max(
          TRAINING_PREVIEW_TOOLTIP_MARGIN_PX,
          targetRect.left -
            TRAINING_PREVIEW_TOOLTIP_GAP_PX -
            TRAINING_PREVIEW_TOOLTIP_WIDTH_PX,
        ),
    top: Math.min(
      window.innerHeight - TRAINING_PREVIEW_TOOLTIP_MARGIN_PX,
      Math.max(
        TRAINING_PREVIEW_TOOLTIP_MARGIN_PX + TRAINING_PREVIEW_TOOLTIP_HEIGHT_PX / 2,
        centeredTop,
      ),
    ),
  };
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
  const [showTrainingWindow, setShowTrainingWindow] = useState(
    () => persistedAppState?.showTrainingWindow ?? true,
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
  const [showSaveStudyPopup, setShowSaveStudyPopup] = useState(false);
  const [showStudiesPopup, setShowStudiesPopup] = useState(false);
  const [showCreateCollectionPopup, setShowCreateCollectionPopup] = useState(false);
  const [showManageCollectionsPopup, setShowManageCollectionsPopup] = useState(false);
  const [showLichessSearchPopup, setShowLichessSearchPopup] = useState(false);
  const [showOtbSearchPopup, setShowOtbSearchPopup] = useState(false);
  const [boardOrientation, setBoardOrientation] = useState(
    () => persistedAppState?.boardOrientation ?? "white",
  );
  const [shortcutConfig, setShortcutConfig] = useState(DEFAULT_SHORTCUT_CONFIG);
  const [copyNotification, setCopyNotification] = useState("");
  const [importPgnValue, setImportPgnValue] = useState("");
  const [importPgnError, setImportPgnError] = useState("");
  const [saveStudyTitle, setSaveStudyTitle] = useState("");
  const [saveStudyError, setSaveStudyError] = useState("");
  const [savingStudy, setSavingStudy] = useState(false);
  const [studies, setStudies] = useState([]);
  const [studiesError, setStudiesError] = useState("");
  const [studiesLoading, setStudiesLoading] = useState(false);
  const [loadingStudyId, setLoadingStudyId] = useState("");
  const [deletingStudyId, setDeletingStudyId] = useState("");
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [createCollectionTitle, setCreateCollectionTitle] = useState("");
  const [createCollectionError, setCreateCollectionError] = useState("");
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [managingStudy, setManagingStudy] = useState(null);
  const [updatingCollectionId, setUpdatingCollectionId] = useState("");
  const [deletingCollectionId, setDeletingCollectionId] = useState("");
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
  const [positionComments, setPositionComments] = useState(
    () =>
      persistedAppState?.positionComments ??
      seedPositionCommentsFromImportedPgnData(persistedAppState?.importedPgnData),
  );
  const [trainingState, setTrainingState] = useState(
    () => persistedAppState?.trainingState ?? createEmptyTrainingState(),
  );
  const [trainingPreview, setTrainingPreview] = useState(null);
  const [trainingError, setTrainingError] = useState("");
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [trainingPlayAutoReplyPaused, setTrainingPlayAutoReplyPaused] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");
  const shortcutConfigSignatureRef = useRef(
    DEFAULT_SHORTCUT_CONFIG_SIGNATURE,
  );
  const boardPanelRef = useRef(null);
  const trainingRequestIdRef = useRef(0);
  const trainingFocusRestoreRef = useRef(null);

  const game = useMemo(() => buildGameToNode(variantTree), [variantTree]);
  const fen = useMemo(() => game.fen(), [game]);
  const currentMoveHistory = useMemo(
    () => getMoveHistoryForNode(variantTree),
    [variantTree],
  );
  const moveHistoryEntries = useMemo(
    () => getMoveHistoryEntries(variantTree),
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
    () => getPositionCommentsForFen(positionComments, fen),
    [fen, positionComments],
  );
  const editedComment = useMemo(
    () =>
      currentPositionComments.find(
        (commentEntry) => commentEntry.id === editingCommentId,
      ) ?? null,
    [currentPositionComments, editingCommentId],
  );
  const importedMainlineComments = useMemo(
    () =>
      positionComments.filter(
        (commentEntry) => commentEntry.source === "imported-mainline",
      ),
    [positionComments],
  );
  const hasImportedPgnDetails = useMemo(
    () =>
      !!(
        importedPgnData &&
        (
          importedPgnData.headers.length ||
          importedMainlineComments.length ||
          importedPgnData.additionalComments.length ||
          importedPgnData.variationSnippets.length
        )
      ),
    [importedMainlineComments, importedPgnData],
  );
  const currentMoveLabel = useMemo(
    () => getCurrentMoveLabel(currentMoveHistory),
    [currentMoveHistory],
  );
  const whiteTrainingLabel = useMemo(() => {
    const playerName = getPgnHeaderValue(importedPgnData, "White");
    return playerName ? `White (${playerName})` : "White";
  }, [importedPgnData]);
  const blackTrainingLabel = useMemo(() => {
    const playerName = getPgnHeaderValue(importedPgnData, "Black");
    return playerName ? `Black (${playerName})` : "Black";
  }, [importedPgnData]);
  const engineAnalysisFen = engineResult?.fen ?? fen;
  const engineVariants = useMemo(
    () =>
      (engineResult?.principalVariations ?? []).map((variation, index) => {
        const { moveObjects, sanMoves, displayText } = buildEngineVariantPreview(
          engineAnalysisFen,
          variation.moves,
        );

        return {
          ...variation,
          index,
          moveObjects,
          sanMoves,
          displayText,
          bestMoveSan: sanMoves[0] ?? null,
        };
      }),
    [engineAnalysisFen, engineResult],
  );
  const selectedEngineVariant = useMemo(
    () => engineVariants[selectedEngineVariantIndex] ?? engineVariants[0] ?? null,
    [engineVariants, selectedEngineVariantIndex],
  );
  const formattedBestMove = useMemo(
    () =>
      engineVariants[0]?.bestMoveSan ??
      formatUciMoveAsSan(engineAnalysisFen, engineResult?.bestmove),
    [engineAnalysisFen, engineResult?.bestmove, engineVariants],
  );
  const hasReplaySource = useMemo(
    () =>
      typeof importedPgnData?.rawPgn === "string" && importedPgnData.rawPgn.trim().length > 0,
    [importedPgnData],
  );
  const normalizedTrainingState = useMemo(
    () => normalizeTrainingState(trainingState),
    [trainingState],
  );
  const selectedCollection = useMemo(
    () =>
      collections.find((collection) => collection.id === selectedCollectionId) ?? null,
    [collections, selectedCollectionId],
  );
  const visibleStudies = useMemo(
    () => filterStudiesByCollection(studies, selectedCollectionId, collections),
    [collections, selectedCollectionId, studies],
  );
  const isReplayTrainingActive =
    normalizedTrainingState.mode === TRAINING_MODE_REPLAY_GAME &&
    normalizedTrainingState.status === TRAINING_STATUS_ACTIVE;
  const isTrainingFocusMode =
    showTrainingWindow && normalizedTrainingState.mode === TRAINING_MODE_REPLAY_GAME;
  const currentReplayMove = useMemo(
    () => getCurrentReplayMove(normalizedTrainingState),
    [normalizedTrainingState],
  );
  const replayNavigationCheckpoints = useMemo(() => {
    if (normalizedTrainingState.mode !== TRAINING_MODE_REPLAY_GAME) {
      return [];
    }

    const checkpoints = normalizedTrainingState.referenceMoves.reduce((result, move, index) => {
      if (move.side === normalizedTrainingState.playerSide) {
        result.push(index);
      }

      return result;
    }, []);

    checkpoints.push(normalizedTrainingState.referenceMoves.length);

    return [...new Set(checkpoints)];
  }, [normalizedTrainingState.mode, normalizedTrainingState.playerSide, normalizedTrainingState.referenceMoves]);
  const pendingTrainingAttempts = normalizedTrainingState.pendingAttempts;
  const lastCompletedTrainingAttempts = normalizedTrainingState.lastCompletedAttempts;
  const lastCompletedIncorrectTrainingAttempts = useMemo(
    () =>
      lastCompletedTrainingAttempts.filter(
        (attempt) => attempt.outcome !== REPLAY_RESULT_MATCH,
      ),
    [lastCompletedTrainingAttempts],
  );
  const lastCompletedExpectedMove = normalizedTrainingState.lastCompletedExpectedMove;
  const activeTrainingPlaySession = normalizedTrainingState.playSession;
  const isTrainingPlayActive = !!activeTrainingPlaySession;
  const isTrainingPlayUserTurn =
    isTrainingPlayActive &&
    getTrainingSideForTurn(game.turn()) === normalizedTrainingState.playerSide;
  const replaySummary = useMemo(
    () =>
      summarizeReplayAttempts(
        normalizedTrainingState.referenceMoves,
        normalizedTrainingState.attempts,
        normalizedTrainingState.playerSide,
      ),
    [normalizedTrainingState],
  );
  const currentReplayMoveNumber = useMemo(
    () =>
      currentReplayMove
        ? normalizedTrainingState.referenceMoves
            .slice(0, normalizedTrainingState.progressPly + 1)
            .filter((move) => move.side === normalizedTrainingState.playerSide).length
        : replaySummary.totalMoves,
    [currentReplayMove, normalizedTrainingState, replaySummary.totalMoves],
  );

  const resetTrainingSession = useCallback(() => {
    trainingRequestIdRef.current += 1;
    setTrainingState(createEmptyTrainingState(normalizedTrainingState.playerSide));
    setTrainingPreview(null);
    setTrainingError("");
    setTrainingLoading(false);
    setTrainingPlayAutoReplyPaused(false);
  }, [normalizedTrainingState.playerSide]);

  const buildReplayVariantTreeForProgress = useCallback((referenceMoves, progressPly) => {
    let nextVariantTree = createEmptyVariantTree(referenceMoves[0]?.fenBefore);

    for (const referenceMove of referenceMoves) {
      const updatedTree = applyMoveToVariantTree(nextVariantTree, referenceMove.move);

      if (!updatedTree) {
        return null;
      }

      nextVariantTree = updatedTree;
    }

    nextVariantTree = goToStartInVariantTree(nextVariantTree);

    for (let index = 0; index < progressPly; index += 1) {
      nextVariantTree = redoInVariantTree(nextVariantTree);
    }

    return nextVariantTree;
  }, []);

  const hideTrainingPreview = useCallback(() => {
    setTrainingPreview(null);
  }, []);

  const showTrainingPreview = useCallback((attempt, target) => {
    if (!attempt?.resultingFen || !(target instanceof HTMLElement)) {
      return;
    }

    const position = getTrainingPreviewPosition(target.getBoundingClientRect());
    setTrainingPreview({
      fen: attempt.resultingFen,
      top: position.top,
      left: position.left,
    });
  }, []);

  const exitTrainingPlayMode = useCallback(() => {
    if (!activeTrainingPlaySession) {
      return;
    }

    trainingRequestIdRef.current += 1;
    setTrainingState(activeTrainingPlaySession.resumeTrainingState);
    setVariantTree(activeTrainingPlaySession.resumeVariantTree);
    setTrainingPreview(null);
    setTrainingError("");
    setTrainingLoading(false);
    setTrainingPlayAutoReplyPaused(false);
    setEngineResult(null);
    setEvaluationResult(null);
  }, [activeTrainingPlaySession]);

  const requestTrainingPlayEngineMove = useCallback(async () => {
    if (
      !isTrainingPlayActive ||
      trainingPlayAutoReplyPaused ||
      trainingError ||
      trainingLoading ||
      game.isGameOver() ||
      getTrainingSideForTurn(game.turn()) === normalizedTrainingState.playerSide
    ) {
      return;
    }

    const requestId = ++trainingRequestIdRef.current;
    setTrainingLoading(true);
    setTrainingError("");

    try {
      const data = await fetchJson("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fen,
          depth: 12,
        }),
      });

      if (requestId !== trainingRequestIdRef.current) {
        return;
      }

      const bestMove = parseUciMove(data.bestmove);

      if (!bestMove) {
        throw new Error("Engine did not return a playable move.");
      }

      const nextVariantTree = applyMoveToVariantTree(variantTree, bestMove);

      if (!nextVariantTree) {
        throw new Error("Unable to apply the engine move.");
      }

      setVariantTree(nextVariantTree);
      setEngineResult(data);
      setEvaluationResult(data.evaluation ?? null);
    } catch (error) {
      if (requestId !== trainingRequestIdRef.current) {
        return;
      }

      setTrainingError(error.message);
    } finally {
      if (requestId === trainingRequestIdRef.current) {
        setTrainingLoading(false);
      }
    }
  }, [
    fen,
    game,
    isTrainingPlayActive,
    normalizedTrainingState.playerSide,
    trainingPlayAutoReplyPaused,
    trainingError,
    trainingLoading,
    variantTree,
  ]);

  const startTrainingPlayMode = useCallback((attempt) => {
    if (!attempt?.resultingFen || isTrainingPlayActive) {
      return;
    }

    trainingRequestIdRef.current += 1;

    setTrainingState({
      ...normalizedTrainingState,
      playSession: {
        status: TRAINING_PLAY_STATUS_ACTIVE,
        sourceAttempt: attempt,
        startingFen: attempt.resultingFen,
        resumeTrainingState: {
          ...normalizedTrainingState,
          playSession: null,
        },
        resumeVariantTree: normalizeVariantTree(variantTree),
      },
    });
    setVariantTree(createEmptyVariantTree(attempt.resultingFen));
    setTrainingPreview(null);
    setTrainingError("");
    setTrainingLoading(false);
    setTrainingPlayAutoReplyPaused(false);
    setEngineResult(null);
    setEvaluationResult(null);
  }, [isTrainingPlayActive, normalizedTrainingState, variantTree]);

  const navigateReplayTrainingToProgress = useCallback((targetProgressPly) => {
    const currentTrainingValue = normalizeTrainingState(normalizedTrainingState);
    const boundedProgressPly = Math.max(
      0,
      Math.min(targetProgressPly, currentTrainingValue.referenceMoves.length),
    );
    const nextVariantTree = buildReplayVariantTreeForProgress(
      currentTrainingValue.referenceMoves,
      boundedProgressPly,
    );

    if (!nextVariantTree) {
      setTrainingError("Unable to navigate within replay training.");
      return;
    }

    trainingRequestIdRef.current += 1;
    setVariantTree(nextVariantTree);
    setTrainingState(
      normalizeTrainingState({
        ...currentTrainingValue,
        progressPly: boundedProgressPly,
        status:
          boundedProgressPly >= currentTrainingValue.referenceMoves.length
            ? TRAINING_STATUS_COMPLETED
            : TRAINING_STATUS_ACTIVE,
        attempts: currentTrainingValue.attempts.filter(
          (attempt) => Number.isInteger(attempt.ply) && attempt.ply <= boundedProgressPly,
        ),
        pendingAttempts: [],
        lastCompletedAttempts: [],
        lastCompletedExpectedMove: null,
        lastCompletionMode: null,
        playSession: null,
      }),
    );
    setTrainingPreview(null);
    setTrainingError("");
    setTrainingLoading(false);
    setTrainingPlayAutoReplyPaused(false);
    setEngineResult(null);
    setEvaluationResult(null);
  }, [buildReplayVariantTreeForProgress, normalizedTrainingState]);

  useEffect(() => {
    if (!trainingPreview) {
      return undefined;
    }

    window.addEventListener("resize", hideTrainingPreview);
    window.addEventListener("scroll", hideTrainingPreview, true);

    return () => {
      window.removeEventListener("resize", hideTrainingPreview);
      window.removeEventListener("scroll", hideTrainingPreview, true);
    };
  }, [hideTrainingPreview, trainingPreview]);

  useEffect(() => {
    setTrainingPreview(null);
  }, [showTrainingWindow, trainingState]);

  useEffect(() => {
    requestTrainingPlayEngineMove();
  }, [requestTrainingPlayEngineMove]);

  useEffect(() => {
    if (isTrainingFocusMode) {
      if (!trainingFocusRestoreRef.current) {
        trainingFocusRestoreRef.current = {
          showMoveHistory,
          showEngineWindow,
          showComments,
          showImportedPgn,
          showVariants,
        };
      }

      if (showMoveHistory) {
        setShowMoveHistory(false);
      }

      if (showEngineWindow) {
        setShowEngineWindow(false);
      }

      if (showComments) {
        setShowComments(false);
      }

      if (showImportedPgn) {
        setShowImportedPgn(false);
      }

      if (showVariants) {
        setShowVariants(false);
      }

      return;
    }

    if (!trainingFocusRestoreRef.current) {
      return;
    }

    const restoreState = trainingFocusRestoreRef.current;
    trainingFocusRestoreRef.current = null;
    setShowMoveHistory(restoreState.showMoveHistory);
    setShowEngineWindow(restoreState.showEngineWindow);
    setShowComments(restoreState.showComments);
    setShowImportedPgn(restoreState.showImportedPgn);
    setShowVariants(restoreState.showVariants);
  }, [
    isTrainingFocusMode,
    showComments,
    showEngineWindow,
    showImportedPgn,
    showMoveHistory,
    showVariants,
  ]);

  const setTrainingPlayerSide = useCallback((playerSide) => {
    if (playerSide !== TRAINING_SIDE_WHITE && playerSide !== TRAINING_SIDE_BLACK) {
      return;
    }

    setTrainingState((currentValue) => {
      const currentTrainingState = normalizeTrainingState(currentValue);

      if (
        currentTrainingState.mode === TRAINING_MODE_REPLAY_GAME &&
        currentTrainingState.status === TRAINING_STATUS_ACTIVE
      ) {
        return currentTrainingState;
      }

      return normalizeTrainingState({
        ...currentTrainingState,
        playerSide,
        pendingAttempts: [],
        lastCompletedAttempts: [],
        lastCompletedExpectedMove: null,
        lastCompletionMode: null,
      });
    });
  }, []);

  const advanceReplayToPlayerTurn = useCallback((trainingStateValue, variantTreeValue) => {
    const currentTrainingState = normalizeTrainingState(trainingStateValue);
    let nextVariantTree = variantTreeValue;
    let nextProgressPly = currentTrainingState.progressPly;

    while (nextProgressPly < currentTrainingState.referenceMoves.length) {
      const nextReferenceMove = currentTrainingState.referenceMoves[nextProgressPly];

      if (!nextReferenceMove || nextReferenceMove.side === currentTrainingState.playerSide) {
        break;
      }

      const updatedTree = applyMoveToVariantTree(nextVariantTree, nextReferenceMove.move);

      if (!updatedTree) {
        return {
          trainingState: currentTrainingState,
          variantTree: variantTreeValue,
          error: "Unable to auto-play the reference move.",
        };
      }

      nextVariantTree = updatedTree;
      nextProgressPly += 1;
    }

    return {
      trainingState: normalizeTrainingState({
        ...currentTrainingState,
        progressPly: nextProgressPly,
        status:
          nextProgressPly >= currentTrainingState.referenceMoves.length
            ? TRAINING_STATUS_COMPLETED
            : TRAINING_STATUS_ACTIVE,
      }),
      variantTree: nextVariantTree,
      error: null,
    };
  }, []);

  const buildResolvedReplayAttempt = useCallback((expectedMove, userMove, userSan, comparison = null) => {
    return buildReplayAttempt({
      expectedMove,
      userMove,
      userSan,
      referenceEvaluation: comparison?.referenceEvaluation ?? null,
      userEvaluation: comparison?.userEvaluation ?? null,
    });
  }, []);

  const completeReplayMove = useCallback((expectedMove, completionMode, finalAttempt = null) => {
    const currentTrainingState = normalizeTrainingState(normalizedTrainingState);
    const advancedReplayTree = applyMoveToVariantTree(variantTree, expectedMove.move);

    if (!advancedReplayTree) {
      setTrainingError("Unable to advance the replay game.");
      return;
    }

    const { trainingState: nextTrainingState, variantTree: nextVariantTree, error } =
      advanceReplayToPlayerTurn(
        normalizeTrainingState({
          ...currentTrainingState,
          attempts: [
            ...currentTrainingState.attempts,
            ...currentTrainingState.pendingAttempts,
            ...(finalAttempt ? [finalAttempt] : []),
          ],
          pendingAttempts: [],
          lastCompletedAttempts: [
            ...currentTrainingState.pendingAttempts,
            ...(finalAttempt ? [finalAttempt] : []),
          ],
          lastCompletedExpectedMove: expectedMove,
          lastCompletionMode: completionMode,
          progressPly: currentTrainingState.progressPly + 1,
          status: TRAINING_STATUS_ACTIVE,
        }),
        advancedReplayTree,
      );

    if (error) {
      setTrainingError(error);
      return;
    }

    setVariantTree(nextVariantTree);
    setTrainingState(nextTrainingState);
    setEngineResult(null);
    setEvaluationResult(null);
  }, [advanceReplayToPlayerTurn, normalizedTrainingState, variantTree]);

  const addPendingReplayAttempt = useCallback((nextAttempt) => {
    if (!nextAttempt) {
      setTrainingError("Unable to record the replay attempt.");
      return;
    }

    setTrainingState((currentValue) => {
      const currentTrainingState = normalizeTrainingState(currentValue);

      return normalizeTrainingState({
        ...currentTrainingState,
        pendingAttempts: [...currentTrainingState.pendingAttempts, nextAttempt],
        lastCompletedAttempts: [],
        lastCompletedExpectedMove: null,
        lastCompletionMode: null,
      });
    });
  }, []);

  const startReplayTraining = useCallback(() => {
    if (!hasReplaySource) {
      setTrainingError("Import a game before starting replay training.");
      return;
    }

    const { trainingState: nextTrainingState, variantTree: replayTree, error } =
      createReplayTrainingState(importedPgnData.rawPgn, normalizedTrainingState.playerSide);

    if (error || !replayTree) {
      setTrainingError(error ?? "Unable to start replay training.");
      return;
    }

    const {
      trainingState: preparedTrainingState,
      variantTree: preparedReplayTree,
      error: autoAdvanceError,
    } = advanceReplayToPlayerTurn(nextTrainingState, replayTree);

    if (autoAdvanceError) {
      setTrainingError(autoAdvanceError);
      return;
    }

    trainingRequestIdRef.current += 1;
    setVariantTree(preparedReplayTree);
    setEngineResult(null);
    setEvaluationResult(null);
    setTrainingState(preparedTrainingState);
    setTrainingError("");
    setTrainingLoading(false);
  }, [advanceReplayToPlayerTurn, hasReplaySource, importedPgnData, normalizedTrainingState.playerSide]);

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
    resetTrainingSession();
    setImportedPgnData(nextImportedPgnData);
    setPositionComments(seedPositionCommentsFromImportedPgnData(nextImportedPgnData));
    setEditingCommentId(null);
    setCommentDraft("");
    return "";
  }
  const currentMoveIndex = useMemo(
    () => moveHistoryEntries.findIndex((entry) => entry.isSelected),
    [moveHistoryEntries],
  );
  const moveHistoryCommentFens = useMemo(
    () =>
      new Set(
        positionComments
          .map((commentEntry) => commentEntry.fen)
          .filter(Boolean),
      ),
    [positionComments],
  );
  const moveHistoryItems = useMemo(
    () =>
      moveHistoryEntries.map((entry) => ({
        ...entry,
        hasComments: moveHistoryCommentFens.has(entry.fen),
      })),
    [moveHistoryCommentFens, moveHistoryEntries],
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

    if (trainingLoading) {
      return false;
    }

    const attemptedMove = {
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    };
    const previewGame = new Chess(fen);
    const appliedUserMove = previewGame.move(attemptedMove);

    if (!appliedUserMove) {
      return false;
    }

    const normalizedAttemptedMove = {
      from: appliedUserMove.from,
      to: appliedUserMove.to,
      ...(appliedUserMove.promotion ? { promotion: appliedUserMove.promotion } : {}),
    };

    if (isTrainingPlayActive) {
      if (!isTrainingPlayUserTurn) {
        return false;
      }

      const nextVariantTree = applyMoveToVariantTree(variantTree, normalizedAttemptedMove);

      if (!nextVariantTree) {
        return false;
      }

      setTrainingError("");
      setTrainingPlayAutoReplyPaused(false);
      setVariantTree(nextVariantTree);
      setEngineResult(null);
      setEvaluationResult(null);
      return true;
    }

    if (isReplayTrainingActive && currentReplayMove) {
      setTrainingError("");

      const didMatchExpectedMove =
        currentReplayMove.move.from === normalizedAttemptedMove.from &&
        currentReplayMove.move.to === normalizedAttemptedMove.to &&
        currentReplayMove.move.promotion === normalizedAttemptedMove.promotion;
      if (didMatchExpectedMove) {
        const matchingAttempt = buildResolvedReplayAttempt(
          currentReplayMove,
          normalizedAttemptedMove,
          appliedUserMove.san,
        );

        if (!matchingAttempt) {
          setTrainingError("Unable to record the replay attempt.");
          return false;
        }

        completeReplayMove(
          currentReplayMove,
          TRAINING_COMPLETION_MATCH,
          matchingAttempt,
        );
        return true;
      }

      const requestId = ++trainingRequestIdRef.current;
      setTrainingLoading(true);
      fetchJson("/api/analyze/compare-moves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fen,
          referenceMove: formatMoveAsUci(currentReplayMove.move),
          userMove: formatMoveAsUci(normalizedAttemptedMove),
          depth: 12,
        }),
      })
        .then((comparison) => {
          if (requestId !== trainingRequestIdRef.current) {
            return;
          }

          const pendingAttempt = buildResolvedReplayAttempt(
            currentReplayMove,
            normalizedAttemptedMove,
            appliedUserMove.san,
            comparison,
          );

          addPendingReplayAttempt(pendingAttempt);
        })
        .catch((error) => {
          if (requestId !== trainingRequestIdRef.current) {
            return;
          }

          setTrainingError(error.message);
        })
        .finally(() => {
          if (requestId === trainingRequestIdRef.current) {
            setTrainingLoading(false);
          }
        });

      return true;
    }

    const nextVariantTree = applyMoveToVariantTree(variantTree, normalizedAttemptedMove);

    if (!nextVariantTree) {
      return false;
    }

    resetTrainingSession();
    setVariantTree(nextVariantTree);
    setEngineResult(null);
    setEvaluationResult(null);

    return true;
  }

  const undoMove = useCallback(() => {
    if (!canUndo) {
      return;
    }

    if (isTrainingPlayActive) {
      trainingRequestIdRef.current += 1;
      setTrainingPreview(null);
      setTrainingError("");
      setTrainingLoading(false);
      setTrainingPlayAutoReplyPaused(true);
      setVariantTree((currentValue) => undoInVariantTree(currentValue));
      setEngineResult(null);
      setEvaluationResult(null);
      return;
    }

    if (normalizedTrainingState.mode === TRAINING_MODE_REPLAY_GAME) {
      const currentCheckpointIndex = replayNavigationCheckpoints.indexOf(
        normalizedTrainingState.progressPly,
      );
      const previousCheckpoint =
        currentCheckpointIndex > 0
          ? replayNavigationCheckpoints[currentCheckpointIndex - 1]
          : null;

      if (previousCheckpoint === null || previousCheckpoint === undefined) {
        return;
      }

      navigateReplayTrainingToProgress(previousCheckpoint);
      return;
    }

    resetTrainingSession();
    setVariantTree((currentValue) => undoInVariantTree(currentValue));
    setEngineResult(null);
    setEvaluationResult(null);
  }, [
    canUndo,
    isTrainingPlayActive,
    navigateReplayTrainingToProgress,
    normalizedTrainingState.mode,
    normalizedTrainingState.progressPly,
    replayNavigationCheckpoints,
    resetTrainingSession,
  ]);

  const redoMove = useCallback(() => {
    if (!canRedo) {
      return;
    }

    if (isTrainingPlayActive) {
      trainingRequestIdRef.current += 1;
      setTrainingPreview(null);
      setTrainingError("");
      setTrainingLoading(false);
      setTrainingPlayAutoReplyPaused(true);
      setVariantTree((currentValue) => redoInVariantTree(currentValue));
      setEngineResult(null);
      setEvaluationResult(null);
      return;
    }

    if (normalizedTrainingState.mode === TRAINING_MODE_REPLAY_GAME) {
      const currentCheckpointIndex = replayNavigationCheckpoints.indexOf(
        normalizedTrainingState.progressPly,
      );
      const nextCheckpoint =
        currentCheckpointIndex >= 0 &&
        currentCheckpointIndex < replayNavigationCheckpoints.length - 1
          ? replayNavigationCheckpoints[currentCheckpointIndex + 1]
          : null;

      if (nextCheckpoint === null || nextCheckpoint === undefined) {
        return;
      }

      navigateReplayTrainingToProgress(nextCheckpoint);
      return;
    }

    resetTrainingSession();
    setVariantTree((currentValue) => redoInVariantTree(currentValue));
    setEngineResult(null);
    setEvaluationResult(null);
  }, [
    canRedo,
    isTrainingPlayActive,
    navigateReplayTrainingToProgress,
    normalizedTrainingState.mode,
    normalizedTrainingState.progressPly,
    replayNavigationCheckpoints,
    resetTrainingSession,
  ]);

  const goToStart = useCallback(() => {
    if (!canUndo) {
      return;
    }

    if (isTrainingPlayActive) {
      trainingRequestIdRef.current += 1;
      setTrainingPreview(null);
      setTrainingError("");
      setTrainingLoading(false);
      setTrainingPlayAutoReplyPaused(true);
      setVariantTree((currentValue) => goToStartInVariantTree(currentValue));
      setEngineResult(null);
      setEvaluationResult(null);
      return;
    }

    if (normalizedTrainingState.mode === TRAINING_MODE_REPLAY_GAME) {
      navigateReplayTrainingToProgress(replayNavigationCheckpoints[0] ?? 0);
      return;
    }

    resetTrainingSession();
    setVariantTree((currentValue) => goToStartInVariantTree(currentValue));
    setEngineResult(null);
    setEvaluationResult(null);
  }, [
    canUndo,
    isTrainingPlayActive,
    navigateReplayTrainingToProgress,
    normalizedTrainingState.mode,
    replayNavigationCheckpoints,
    resetTrainingSession,
  ]);

  const goToEnd = useCallback(() => {
    if (!canRedo) {
      return;
    }

    if (isTrainingPlayActive) {
      trainingRequestIdRef.current += 1;
      setTrainingPreview(null);
      setTrainingError("");
      setTrainingLoading(false);
      setTrainingPlayAutoReplyPaused(true);
      setVariantTree((currentValue) => goToEndInVariantTree(currentValue));
      setEngineResult(null);
      setEvaluationResult(null);
      return;
    }

    if (normalizedTrainingState.mode === TRAINING_MODE_REPLAY_GAME) {
      navigateReplayTrainingToProgress(
        replayNavigationCheckpoints[replayNavigationCheckpoints.length - 1] ?? 0,
      );
      return;
    }

    resetTrainingSession();
    setVariantTree((currentValue) => goToEndInVariantTree(currentValue));
    setEngineResult(null);
    setEvaluationResult(null);
  }, [
    canRedo,
    isTrainingPlayActive,
    navigateReplayTrainingToProgress,
    normalizedTrainingState.mode,
    replayNavigationCheckpoints,
    resetTrainingSession,
  ]);

  const jumpToMainVariant = useCallback(() => {
    if (!canJumpToMainVariant) {
      return;
    }

    resetTrainingSession();
    setVariantTree((currentValue) => jumpToMainVariantInTree(currentValue));
    setEngineResult(null);
    setEvaluationResult(null);
  }, [canJumpToMainVariant, resetTrainingSession]);

  const jumpBackToSideline = useCallback(() => {
    if (!canJumpBackToSideline) {
      return;
    }

    resetTrainingSession();
    setVariantTree((currentValue) => jumpBackToSidelineInTree(currentValue));
    setEngineResult(null);
    setEvaluationResult(null);
  }, [canJumpBackToSideline, resetTrainingSession]);

  const goToMoveHistoryNode = useCallback((nodeId) => {
    resetTrainingSession();
    setVariantTree((currentValue) => goToNodeInVariantTree(currentValue, nodeId));
    setEngineResult(null);
    setEvaluationResult(null);
  }, [resetTrainingSession]);

  const selectVariant = useCallback((lineId) => {
    resetTrainingSession();
    setVariantTree((currentValue) => selectVariantLine(currentValue, lineId));
    setEngineResult(null);
    setEvaluationResult(null);
  }, [resetTrainingSession]);

  const promoteVariant = useCallback((lineId) => {
    resetTrainingSession();
    setVariantTree((currentValue) => promoteVariantLine(currentValue, lineId));
  }, [resetTrainingSession]);

  const demoteVariant = useCallback((lineId) => {
    resetTrainingSession();
    setVariantTree((currentValue) => demoteVariantLine(currentValue, lineId));
  }, [resetTrainingSession]);

  const removeVariant = useCallback((lineId) => {
    resetTrainingSession();
    setVariantTree((currentValue) => removeVariantLine(currentValue, lineId));
    setEngineResult(null);
    setEvaluationResult(null);
  }, [resetTrainingSession]);

  const retryReplayMove = useCallback(() => {
    setTrainingError("");
  }, []);

  const revealReplayMove = useCallback(() => {
    if (!currentReplayMove || pendingTrainingAttempts.length === 0) {
      return;
    }

    completeReplayMove(currentReplayMove, TRAINING_COMPLETION_REVEALED);
  }, [completeReplayMove, currentReplayMove, pendingTrainingAttempts.length]);

  const startAddingComment = useCallback(() => {
    setEditingCommentId(null);
    setCommentDraft("");
    setShowComments(true);
  }, []);

  const startEditingComment = useCallback((commentEntry) => {
    setEditingCommentId(commentEntry.id);
    setCommentDraft(commentEntry.comment);
    setShowComments(true);
  }, []);

  const cancelCommentEdit = useCallback(() => {
    setEditingCommentId(null);
    setCommentDraft("");
  }, []);

  const removeComment = useCallback((commentId) => {
    const isRemovingEditedComment = editingCommentId === commentId;

    setPositionComments((currentValue) =>
      removePositionCommentEntry(currentValue, commentId),
    );
    if (isRemovingEditedComment) {
      setEditingCommentId(null);
      setCommentDraft("");
    }
  }, [editingCommentId]);

  const saveComment = useCallback(() => {
    const trimmedDraft = commentDraft.trim();

    if (!trimmedDraft) {
      return;
    }

    const existingComment =
      currentPositionComments.find((commentEntry) => commentEntry.id === editingCommentId) ??
      null;
    const commentContext = buildPositionCommentContext(fen, currentMoveHistory);
    const nextComment = createUserPositionComment({
      ...commentContext,
      id: existingComment?.id,
      comment: trimmedDraft,
      ply: existingComment?.ply ?? commentContext.ply,
      moveNumber: existingComment?.moveNumber ?? commentContext.moveNumber,
      side: existingComment?.side ?? commentContext.side,
      san: existingComment?.san ?? commentContext.san,
      source: existingComment?.source ?? "user",
    });

    if (!nextComment) {
      return;
    }

    setPositionComments((currentValue) =>
      savePositionCommentEntry(currentValue, nextComment),
    );
    setEditingCommentId(null);
    setCommentDraft("");
  }, [commentDraft, currentMoveHistory, currentPositionComments, editingCommentId, fen]);

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

  const openSaveStudyPopup = useCallback(() => {
    setSaveStudyTitle(buildStudyTitle(importedPgnData));
    setSaveStudyError("");
    setShowSaveStudyPopup(true);
  }, [importedPgnData]);

  const closeSaveStudyPopup = useCallback(() => {
    setShowSaveStudyPopup(false);
    setSaveStudyTitle("");
    setSaveStudyError("");
  }, []);

  const openCreateCollectionPopup = useCallback(() => {
    setCreateCollectionTitle("");
    setCreateCollectionError("");
    setShowCreateCollectionPopup(true);
  }, []);

  const closeCreateCollectionPopup = useCallback(() => {
    setShowCreateCollectionPopup(false);
    setCreateCollectionTitle("");
    setCreateCollectionError("");
  }, []);

  const openManageCollectionsPopup = useCallback((study) => {
    setManagingStudy(study);
    setStudiesError("");
    setShowManageCollectionsPopup(true);
  }, []);

  const closeManageCollectionsPopup = useCallback(() => {
    setManagingStudy(null);
    setUpdatingCollectionId("");
    setShowManageCollectionsPopup(false);
  }, []);

  const closeStudiesPopup = useCallback(() => {
    setShowStudiesPopup(false);
    setStudiesError("");
    setLoadingStudyId("");
    setDeletingStudyId("");
    setSelectedCollectionId("");
    closeManageCollectionsPopup();
  }, [closeManageCollectionsPopup]);

  const loadCollections = useCallback(async () => {
    setCollectionsLoading(true);
    setStudiesError("");

    try {
      const data = await fetchJson("/api/collections");
      setCollections(
        (Array.isArray(data.collections) ? data.collections : [])
          .map((collection) => normalizeCollection(collection))
          .filter(Boolean),
      );
    } catch (error) {
      setCollections([]);
      setStudiesError(error.message);
    } finally {
      setCollectionsLoading(false);
    }
  }, []);

  const loadStudies = useCallback(async () => {
    setStudiesLoading(true);
    setStudiesError("");

    try {
      const data = await fetchJson("/api/studies");
      setStudies(
        (Array.isArray(data.studies) ? data.studies : [])
          .map((study) => normalizeStudySummary(study))
          .filter(Boolean),
      );
    } catch (error) {
      setStudies([]);
      setStudiesError(error.message);
    } finally {
      setStudiesLoading(false);
    }
  }, []);

  const openStudiesPopup = useCallback(() => {
    setShowStudiesPopup(true);
    void loadStudies();
    void loadCollections();
  }, [loadCollections, loadStudies]);

  const applyStudyToWorkspace = useCallback((studyValue) => {
    const study = normalizeStudy(studyValue);

    if (!study) {
      return "Saved study is invalid.";
    }

    resetTrainingSession();
    setVariantTree(study.variantTree);
    setEngineResult(null);
    setEvaluationResult(null);
    setImportedPgnData(study.importedPgnData);
    setPositionComments(study.positionComments);
    setEditingCommentId(null);
    setCommentDraft("");
    setShowMoveHistory(true);
    setShowComments(true);
    setShowVariants(true);
    setShowImportedPgn(!!study.importedPgnData);
    return "";
  }, [resetTrainingSession]);

  const saveCurrentStudy = useCallback(async () => {
    setSavingStudy(true);
    setSaveStudyError("");

    try {
      const savedStudy = await fetchJson("/api/studies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          createStudySavePayload({
            title: saveStudyTitle,
            variantTree,
            importedPgnData,
            positionComments,
          }),
        ),
      });
      setCopyNotification(`Saved study "${savedStudy.title}".`);
      closeSaveStudyPopup();

      if (showStudiesPopup) {
        await loadStudies();
      }
    } catch (error) {
      setSaveStudyError(error.message);
    } finally {
      setSavingStudy(false);
    }
  }, [
    closeSaveStudyPopup,
    importedPgnData,
    loadStudies,
    positionComments,
    saveStudyTitle,
    showStudiesPopup,
    variantTree,
  ]);

  const loadStudy = useCallback(async (studyId) => {
    setLoadingStudyId(studyId);
    setStudiesError("");

    try {
      const study = await fetchJson(`/api/studies/${studyId}`);
      const error = applyStudyToWorkspace(study);

      if (error) {
        setStudiesError(error);
        return;
      }

      setCopyNotification(`Loaded study "${study.title}".`);
      closeStudiesPopup();
    } catch (error) {
      setStudiesError(error.message);
    } finally {
      setLoadingStudyId("");
    }
  }, [applyStudyToWorkspace, closeStudiesPopup]);

  const removeStudy = useCallback(async (study) => {
    if (!study?.id) {
      return;
    }

    const studyTitle = study.title ?? "Untitled study";

    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete study "${studyTitle}"? This cannot be undone.`)
    ) {
      return;
    }

    setDeletingStudyId(study.id);
    setStudiesError("");

    try {
      await fetchJson(`/api/studies/${study.id}`, {
        method: "DELETE",
      });
      setStudies((currentStudies) =>
        currentStudies.filter((currentStudy) => currentStudy.id !== study.id),
      );
      setCollections((currentCollections) =>
        currentCollections.map((collection) =>
          normalizeCollection({
            ...collection,
            studyIds: collection.studyIds.filter(
              (currentStudyId) => currentStudyId !== study.id,
            ),
          }),
        ),
      );
      if (managingStudy?.id === study.id) {
        closeManageCollectionsPopup();
      }
      setCopyNotification(`Deleted study "${studyTitle}".`);
    } catch (error) {
      setStudiesError(error.message);
    } finally {
      setDeletingStudyId("");
    }
  }, [closeManageCollectionsPopup, managingStudy]);

  const createCollection = useCallback(async () => {
    setCreatingCollection(true);
    setCreateCollectionError("");

    try {
      const createdCollection = normalizeCollection(
        await fetchJson("/api/collections", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createCollectionPayload(createCollectionTitle)),
        }),
      );

      if (!createdCollection) {
        throw new Error("Created collection is invalid.");
      }

      setCollections((currentCollections) =>
        [createdCollection, ...currentCollections].sort((leftCollection, rightCollection) =>
          rightCollection.updatedAt.localeCompare(leftCollection.updatedAt),
        ),
      );
      setSelectedCollectionId(createdCollection.id);
      closeCreateCollectionPopup();
    } catch (error) {
      setCreateCollectionError(error.message);
    } finally {
      setCreatingCollection(false);
    }
  }, [closeCreateCollectionPopup, createCollectionTitle]);

  const removeCollection = useCallback(async (collection) => {
    if (!collection?.id) {
      return;
    }

    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete collection "${collection.title}"?`)
    ) {
      return;
    }

    setDeletingCollectionId(collection.id);
    setStudiesError("");

    try {
      await fetchJson(`/api/collections/${collection.id}`, {
        method: "DELETE",
      });
      setCollections((currentCollections) =>
        currentCollections.filter(
          (currentCollection) => currentCollection.id !== collection.id,
        ),
      );
      setSelectedCollectionId((currentCollectionId) =>
        currentCollectionId === collection.id ? "" : currentCollectionId,
      );
      setCopyNotification(`Deleted collection "${collection.title}".`);
    } catch (error) {
      setStudiesError(error.message);
    } finally {
      setDeletingCollectionId("");
    }
  }, []);

  const toggleStudyCollection = useCallback(async (collection, study) => {
    if (!collection?.id || !study?.id) {
      return;
    }

    const isMember = collection.studyIds.includes(study.id);
    setUpdatingCollectionId(collection.id);
    setStudiesError("");

    try {
      const updatedCollection = normalizeCollection(
        await fetchJson(
          isMember
            ? `/api/collections/${collection.id}/studies/${study.id}`
            : `/api/collections/${collection.id}/studies`,
          isMember
            ? {
                method: "DELETE",
              }
            : {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  studyId: study.id,
                }),
              },
        ),
      );

      if (!updatedCollection) {
        throw new Error("Updated collection is invalid.");
      }

      setCollections((currentCollections) =>
        currentCollections
          .map((currentCollection) =>
            currentCollection.id === updatedCollection.id
              ? updatedCollection
              : currentCollection,
          )
          .sort((leftCollection, rightCollection) =>
            rightCollection.updatedAt.localeCompare(leftCollection.updatedAt),
          ),
      );
    } catch (error) {
      setStudiesError(error.message);
    } finally {
      setUpdatingCollectionId("");
    }
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
    setEditingCommentId(null);
    setCommentDraft("");
  }, [fen]);

  useEffect(() => {
    const persistedRightSideViews =
      isTrainingFocusMode && trainingFocusRestoreRef.current
        ? trainingFocusRestoreRef.current
        : {
            showMoveHistory,
            showEngineWindow,
            showComments,
            showImportedPgn,
            showVariants,
          };

    try {
      savePersistedAppState({
        variantTree,
        boardOrientation,
        showMoveHistory: persistedRightSideViews.showMoveHistory,
        showTrainingWindow,
        showEngineWindow: persistedRightSideViews.showEngineWindow,
        showEvaluationBar,
        showComments: persistedRightSideViews.showComments,
        showImportedPgn: persistedRightSideViews.showImportedPgn,
        showVariants: persistedRightSideViews.showVariants,
        showVariantArrows,
        importedPgnData,
        positionComments,
        trainingState,
      });
    } catch (error) {
      console.error("Failed to persist app state:", error);
    }
  }, [
    boardOrientation,
    importedPgnData,
    isTrainingFocusMode,
    positionComments,
    showEngineWindow,
    showEvaluationBar,
    showComments,
    showImportedPgn,
    showMoveHistory,
    showTrainingWindow,
    showVariants,
    showVariantArrows,
    trainingState,
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

    resetTrainingSession();
    setVariantTree(nextVariantTree);
    setShowMoveHistory(true);
    setShowVariants(true);
    setEngineResult(null);
    setEvaluationResult(null);
  }, [resetTrainingSession, selectedEngineVariant, variantTree]);

  function resetGame() {
    resetTrainingSession();
    setVariantTree(createEmptyVariantTree());
    setEngineResult(null);
    setEvaluationResult(null);
    setImportedPgnData(null);
    setPositionComments([]);
    setEditingCommentId(null);
    setCommentDraft("");
  }

  const toggleMoveHistory = useCallback(() => {
    setShowMoveHistory((currentValue) => !currentValue);
  }, []);

  const closeMoveHistory = useCallback(() => {
    setShowMoveHistory(false);
  }, []);

  const toggleTrainingWindow = useCallback(() => {
    setShowTrainingWindow((currentValue) => !currentValue);
  }, []);

  const closeTrainingWindow = useCallback(() => {
    setShowTrainingWindow(false);
  }, []);

  const toggleEngineWindow = useCallback(() => {
    setShowEngineWindow((currentValue) => !currentValue);
  }, []);

  const closeEngineWindow = useCallback(() => {
    setShowEngineWindow(false);
  }, []);

  function toggleEvaluationBar() {
    setShowEvaluationBar((currentValue) => !currentValue);
  }

  const toggleComments = useCallback(() => {
    setShowComments((currentValue) => !currentValue);
  }, []);

  const closeComments = useCallback(() => {
    setShowComments(false);
    setEditingCommentId(null);
    setCommentDraft("");
  }, []);

  const toggleImportedPgn = useCallback(() => {
    setShowImportedPgn((currentValue) => !currentValue);
  }, []);

  const closeImportedPgn = useCallback(() => {
    setShowImportedPgn(false);
  }, []);

  const toggleVariants = useCallback(() => {
    setShowVariants((currentValue) => !currentValue);
  }, []);

  const closeVariants = useCallback(() => {
    setShowVariants(false);
  }, []);

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

      if (showSaveStudyPopup) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeSaveStudyPopup();
        }

        return;
      }

      if (showCreateCollectionPopup) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeCreateCollectionPopup();
        }

        return;
      }

      if (showManageCollectionsPopup) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeManageCollectionsPopup();
        }

        return;
      }

      if (showStudiesPopup) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeStudiesPopup();
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
        return;
      }

      if (matchesShortcut(event, shortcutConfig.toggleMoveHistory.keys)) {
        event.preventDefault();
        toggleMoveHistory();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.toggleTrainingWindow.keys)) {
        event.preventDefault();
        toggleTrainingWindow();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.toggleEngineWindow.keys)) {
        event.preventDefault();
        toggleEngineWindow();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.toggleComments.keys)) {
        event.preventDefault();
        toggleComments();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.toggleImportedPgn.keys)) {
        event.preventDefault();
        toggleImportedPgn();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.toggleVariants.keys)) {
        event.preventDefault();
        toggleVariants();
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
    closeCreateCollectionPopup,
    closeManageCollectionsPopup,
    closeSaveStudyPopup,
    closeShortcutsPopup,
    closeStudiesPopup,
    jumpBackToSideline,
    jumpToMainVariant,
    goToEnd,
    goToStart,
    openShortcutsPopup,
    redoMove,
    shortcutConfig,
    showLichessSearchPopup,
    showOtbSearchPopup,
    showCreateCollectionPopup,
    showImportPgnPopup,
    showManageCollectionsPopup,
    showSaveStudyPopup,
    showShortcutsPopup,
    showStudiesPopup,
    toggleBoardOrientation,
    toggleComments,
    toggleEngineWindow,
    toggleImportedPgn,
    toggleMoveHistory,
    toggleTrainingWindow,
    toggleVariants,
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
            onClick={() => toggleMenu("studies")}
          >
            Studies
          </button>
          {openMenu === "studies" && (
            <div className="menu-dropdown">
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(openSaveStudyPopup)}
              >
                Save Current Study
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(openStudiesPopup)}
              >
                Browse Studies
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
                onClick={() => handleMenuAction(toggleTrainingWindow)}
              >
                {showTrainingWindow ? "Hide Training" : "Show Training"}
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

      <div className={`workspace${isTrainingFocusMode ? " workspace-training-focus" : ""}`}>
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

        {!isTrainingFocusMode && (
          <div className="info-column info-column-navigation">
            {showMoveHistory && (
              <MoveHistory
                moveHistoryItems={moveHistoryItems}
                currentMoveIndex={currentMoveIndex}
                boardPanelHeight={boardPanelHeight}
                canUndo={canUndo}
                canRedo={canRedo}
                onClose={closeMoveHistory}
                onSelectMove={goToMoveHistoryNode}
                onUndo={undoMove}
                onRedo={redoMove}
                onGoToStart={goToStart}
                onGoToEnd={goToEnd}
              />
            )}
          </div>
        )}

        <div
          className={`info-column info-column-reference${
            isTrainingFocusMode ? " info-column-training-focus" : ""
          }`}
        >
          {showTrainingWindow && (
            <div
              className="card training-card"
              style={boardPanelHeight ? { height: `${boardPanelHeight}px` } : undefined}
            >
              <div className="card-header">
                <h2>Training</h2>
                <button
                  type="button"
                  className="card-close-button"
                  onClick={closeTrainingWindow}
                  aria-label="Close Training"
                  title="Close Training"
                >
                  ×
                </button>
              </div>
              <div className="training-card-body">
              {!hasReplaySource && (
                <p className="annotation-empty">
                  Import a game to enable replay training.
                </p>
              )}
              {hasReplaySource && (
                <>
                  <div className="training-side-selector">
                    <span className="annotation-label">Play as</span>
                    <div className="training-side-options">
                      <button
                        type="button"
                        className={
                          normalizedTrainingState.playerSide === TRAINING_SIDE_WHITE
                            ? "annotation-primary-button"
                            : "annotation-secondary-button"
                        }
                        onClick={() => setTrainingPlayerSide(TRAINING_SIDE_WHITE)}
                        disabled={isReplayTrainingActive || isTrainingPlayActive || trainingLoading}
                      >
                        {whiteTrainingLabel}
                      </button>
                      <button
                        type="button"
                        className={
                          normalizedTrainingState.playerSide === TRAINING_SIDE_BLACK
                            ? "annotation-primary-button"
                            : "annotation-secondary-button"
                        }
                        onClick={() => setTrainingPlayerSide(TRAINING_SIDE_BLACK)}
                        disabled={isReplayTrainingActive || isTrainingPlayActive || trainingLoading}
                      >
                        {blackTrainingLabel}
                      </button>
                    </div>
                  </div>
                  <p className="current-move-label">
                    {isTrainingPlayActive
                      ? "Exploring a wrong try against the computer"
                      : normalizedTrainingState.status === TRAINING_STATUS_COMPLETED
                      ? "Replay complete"
                      : isReplayTrainingActive
                        ? `Replay move ${Math.min(currentReplayMoveNumber, replaySummary.totalMoves)} of ${replaySummary.totalMoves}`
                        : "Replay game mode is ready."}
                  </p>
                  {normalizedTrainingState.mode !== TRAINING_MODE_REPLAY_GAME && (
                    <p className="annotation-empty">
                      Start replay mode to test your moves against the imported game.
                    </p>
                  )}
                  {isTrainingPlayActive && activeTrainingPlaySession && (
                    <div className="annotation-item training-feedback">
                      <div className="annotation-item-header">
                        <span className="annotation-label">Play vs computer</span>
                        <span className="training-feedback-result">
                          {isTrainingPlayUserTurn ? "Your move" : "Computer move"}
                        </span>
                      </div>
                      <p>
                        Exploring the position after{" "}
                        <strong>{activeTrainingPlaySession.sourceAttempt.userSan}</strong>.
                        Return to training to resume the replay exactly where you left it.
                      </p>
                      <div className="annotation-item-actions">
                        <button
                          type="button"
                          className="annotation-secondary-button"
                          onClick={exitTrainingPlayMode}
                          disabled={trainingLoading}
                        >
                          Return to training
                        </button>
                      </div>
                    </div>
                  )}
                  {!isTrainingPlayActive && isReplayTrainingActive && currentReplayMove && (
                    <p className="annotation-empty">
                      Play the next move on the board. If you miss it, you can retry or
                      reveal the next game move when you are ready.
                    </p>
                  )}
                  {trainingLoading && (
                    <p className="annotation-empty">
                      {isTrainingPlayActive
                        ? "Computer is thinking..."
                        : "Comparing your move with the game move..."}
                    </p>
                  )}
                  {trainingError && <p className="error">{trainingError}</p>}
                  {!isTrainingPlayActive &&
                    pendingTrainingAttempts.length > 0 &&
                    currentReplayMove && (
                    <div className="annotation-item training-feedback">
                      <div className="annotation-item-header">
                        <span className="annotation-label">Move not matched</span>
                        <span className="training-feedback-result">
                          {pendingTrainingAttempts.length} tries saved
                        </span>
                      </div>
                      <p>
                        {formatReplayGuessPrompt(currentReplayMove, currentMoveLabel)} Or reveal
                        the next move from the game.
                      </p>
                      <ul className="annotation-list training-attempt-list">
                        {pendingTrainingAttempts.map((attempt, index) => (
                          <li
                            key={`${attempt.ply}-${attempt.userSan}-${index}`}
                            className={`annotation-item${
                              attempt.isCritical ? " training-feedback-critical" : ""
                            }${attempt.resultingFen ? " training-preview-trigger" : ""}`}
                            tabIndex={attempt.resultingFen ? 0 : undefined}
                            onMouseEnter={(event) =>
                              showTrainingPreview(attempt, event.currentTarget)
                            }
                            onMouseLeave={hideTrainingPreview}
                            onFocus={(event) =>
                              showTrainingPreview(attempt, event.currentTarget)
                            }
                            onBlur={hideTrainingPreview}
                          >
                            <div className="annotation-item-header">
                              <span className="annotation-label">Try {index + 1}</span>
                              <span className="training-feedback-result">
                                {attempt.classification === "better"
                                  ? "Better"
                                  : attempt.classification === "equal"
                                    ? "Equal"
                                    : attempt.classification === "worse"
                                      ? "Worse"
                                      : "n/a"}
                              </span>
                            </div>
                            <p>
                              Played {attempt.userSan}.
                            </p>
                            <p className="training-feedback-detail">
                              <strong>Delta:</strong> {formatReplayDelta(attempt.deltaCp)} pawns
                              {" "}vs the game move
                              {attempt.isCritical ? " - critical mistake" : ""}.
                            </p>
                            <div className="annotation-item-actions">
                              <button
                                type="button"
                                className="annotation-secondary-button"
                                onClick={() => startTrainingPlayMode(attempt)}
                                disabled={isTrainingPlayActive || trainingLoading}
                              >
                                Play vs computer
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="annotation-item-actions">
                        <button
                          type="button"
                          className="annotation-secondary-button"
                          onClick={retryReplayMove}
                        >
                          Retry
                        </button>
                        <button
                          type="button"
                          className="annotation-primary-button"
                          onClick={revealReplayMove}
                        >
                          Next move
                        </button>
                      </div>
                    </div>
                  )}
                  {!isTrainingPlayActive &&
                    !pendingTrainingAttempts.length &&
                    lastCompletedTrainingAttempts.length > 0 &&
                    lastCompletedExpectedMove && (
                      <div className="annotation-item training-feedback">
                        <div className="annotation-item-header">
                          <span className="annotation-label">Last resolved move</span>
                          <span className="training-feedback-result">
                            {normalizedTrainingState.lastCompletionMode ===
                            TRAINING_COMPLETION_REVEALED
                              ? "Revealed"
                              : "Matched"}
                          </span>
                        </div>
                        <p>
                          <strong>{formatReplayMoveLabel(lastCompletedExpectedMove)}</strong>
                          {normalizedTrainingState.lastCompletionMode ===
                          TRAINING_COMPLETION_REVEALED
                            ? " was revealed from the game after your tries."
                            : lastCompletedIncorrectTrainingAttempts.length > 0
                              ? ` matched after ${lastCompletedIncorrectTrainingAttempts.length} earlier ${
                                  lastCompletedIncorrectTrainingAttempts.length === 1
                                    ? "try"
                                    : "tries"
                                 }.`
                              : " matched the game move."}
                        </p>
                        {lastCompletedIncorrectTrainingAttempts.length > 0 && (
                          <ul className="annotation-list training-attempt-list">
                            {lastCompletedIncorrectTrainingAttempts.map((attempt, index) => (
                              <li
                                key={`${attempt.ply}-${attempt.userSan}-${index}`}
                                className={`annotation-item${
                                  attempt.isCritical ? " training-feedback-critical" : ""
                                }${attempt.resultingFen ? " training-preview-trigger" : ""}`}
                                tabIndex={attempt.resultingFen ? 0 : undefined}
                                onMouseEnter={(event) =>
                                  showTrainingPreview(attempt, event.currentTarget)
                                }
                                onMouseLeave={hideTrainingPreview}
                                onFocus={(event) =>
                                  showTrainingPreview(attempt, event.currentTarget)
                                }
                                onBlur={hideTrainingPreview}
                              >
                                <div className="annotation-item-header">
                                  <span className="annotation-label">Try {index + 1}</span>
                                  <span className="training-feedback-result">
                                    {attempt.classification === "better"
                                      ? "Better"
                                      : attempt.classification === "equal"
                                        ? "Equal"
                                        : attempt.classification === "worse"
                                          ? "Worse"
                                          : "n/a"}
                                  </span>
                                </div>
                                <p>
                                  Played {attempt.userSan} instead of{" "}
                                  {lastCompletedExpectedMove.san}.
                                </p>
                                <p className="training-feedback-detail">
                                  <strong>Delta:</strong> {formatReplayDelta(attempt.deltaCp)} pawns
                                  {" "}vs the game move
                                  {attempt.isCritical ? " - critical mistake" : ""}.
                                </p>
                                <div className="annotation-item-actions">
                                  <button
                                    type="button"
                                    className="annotation-secondary-button"
                                    onClick={() => startTrainingPlayMode(attempt)}
                                    disabled={isTrainingPlayActive || trainingLoading}
                                  >
                                    Play vs computer
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  {!isTrainingPlayActive &&
                    normalizedTrainingState.status === TRAINING_STATUS_COMPLETED && (
                    <>
                      <div className="training-summary-grid">
                        <div className="training-summary-card">
                          <span className="annotation-label">Moves</span>
                          <strong>{replaySummary.totalMoves}</strong>
                        </div>
                        <div className="training-summary-card">
                          <span className="annotation-label">Matches</span>
                          <strong>{replaySummary.matchedMoves}</strong>
                        </div>
                        <div className="training-summary-card">
                          <span className="annotation-label">Better</span>
                          <strong>{replaySummary.betterMoves}</strong>
                        </div>
                        <div className="training-summary-card">
                          <span className="annotation-label">Equal</span>
                          <strong>{replaySummary.equalMoves}</strong>
                        </div>
                        <div className="training-summary-card">
                          <span className="annotation-label">Worse</span>
                          <strong>{replaySummary.worseMoves}</strong>
                        </div>
                        <div className="training-summary-card">
                          <span className="annotation-label">Critical</span>
                          <strong>{replaySummary.criticalMistakes.length}</strong>
                        </div>
                      </div>
                      <div className="annotation-section">
                        <h3>Critical mistakes</h3>
                        {replaySummary.criticalMistakes.length > 0 ? (
                          <ul className="annotation-list training-critical-list">
                            {replaySummary.criticalMistakes.map((attempt) => (
                              <li
                                key={`${attempt.ply}-${attempt.userSan}-${attempt.expectedSan}`}
                                className={`annotation-item${
                                  attempt.resultingFen ? " training-preview-trigger" : ""
                                }`}
                                tabIndex={attempt.resultingFen ? 0 : undefined}
                                onMouseEnter={(event) =>
                                  showTrainingPreview(attempt, event.currentTarget)
                                }
                                onMouseLeave={hideTrainingPreview}
                                onFocus={(event) =>
                                  showTrainingPreview(attempt, event.currentTarget)
                                }
                                onBlur={hideTrainingPreview}
                              >
                                <div className="annotation-item-header">
                                  <span className="annotation-label">
                                    {formatReplayMoveLabel({
                                      moveNumber: attempt.moveNumber,
                                      side: attempt.side,
                                      san: attempt.expectedSan,
                                    })}
                                  </span>
                                  <span className="training-feedback-result">Critical</span>
                                </div>
                                <p>
                                  Played {attempt.userSan} instead of {attempt.expectedSan}.
                                </p>
                                <p className="training-feedback-detail">
                                  <strong>Delta:</strong> {formatReplayDelta(attempt.deltaCp)} pawns
                                  {" "}vs the game move.
                                </p>
                                <div className="annotation-item-actions">
                                  <button
                                    type="button"
                                    className="annotation-secondary-button"
                                    onClick={() => startTrainingPlayMode(attempt)}
                                    disabled={isTrainingPlayActive || trainingLoading}
                                  >
                                    Play vs computer
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="annotation-empty">
                            No critical mistakes in this replay.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                  <div className="annotation-editor-actions">
                    <button
                      type="button"
                      className="annotation-primary-button"
                      onClick={startReplayTraining}
                      disabled={trainingLoading}
                    >
                      {normalizedTrainingState.mode === TRAINING_MODE_REPLAY_GAME
                        ? normalizedTrainingState.status === TRAINING_STATUS_COMPLETED
                          ? "Replay again"
                          : "Restart replay"
                        : "Start replay game"}
                    </button>
                    {normalizedTrainingState.mode === TRAINING_MODE_REPLAY_GAME && (
                      <button
                        type="button"
                        className="annotation-secondary-button"
                        onClick={resetTrainingSession}
                        disabled={trainingLoading}
                      >
                        Exit training
                      </button>
                    )}
                  </div>
                </>
              )}
              </div>
            </div>
          )}

          {!isTrainingFocusMode && showEngineWindow && (
            <div className="card">
              <div className="card-header">
                <h2>Engine</h2>
                <button
                  type="button"
                  className="card-close-button"
                  onClick={closeEngineWindow}
                  aria-label="Close Engine"
                  title="Close Engine"
                >
                  ×
                </button>
              </div>
              {loading && <p>Evaluating position...</p>}
              {engineResult?.error && <p className="error">{engineResult.error}</p>}
              {!engineResult && !loading && <p>No analysis yet.</p>}
              {engineResult?.bestmove && (
                <>
                  <p>
                    <strong>Best move:</strong> {formattedBestMove}
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
                    </>
                  )}
                </>
              )}
              <div style={modalActionRowStyle}>
                <button
                  type="button"
                  style={modalButtonStyle}
                  onClick={analyzePosition}
                  disabled={loading}
                >
                  {loading ? "Evaluating..." : "Evaluate position"}
                </button>
                {!!engineVariants.length && (
                  <button
                    type="button"
                    style={modalPrimaryButtonStyle}
                    onClick={addSelectedEngineVariantToTree}
                    disabled={!selectedEngineVariant?.moveObjects?.length}
                  >
                    Add to variants
                  </button>
                )}
              </div>
            </div>
          )}

          {!isTrainingFocusMode && showComments && (
            <div className="card">
              <div className="card-header">
                <h2>Comments</h2>
                <button
                  type="button"
                  className="card-close-button"
                  onClick={closeComments}
                  aria-label="Close Comments"
                  title="Close Comments"
                >
                  ×
                </button>
              </div>
              <p className="current-move-label">{currentMoveLabel}</p>
              {currentPositionComments.length > 0 ? (
                <ul className="annotation-list">
                  {currentPositionComments.map((commentEntry, index) => (
                    <li
                      key={commentEntry.id ?? `${commentEntry.fen ?? "current"}-${index}`}
                      className="annotation-item"
                    >
                      <div className="annotation-item-header">
                        <span className="annotation-label">
                          {formatPgnCommentLabel(commentEntry)}
                        </span>
                        <div className="annotation-item-actions">
                          <button
                            type="button"
                            className="annotation-action-button"
                            onClick={() => startEditingComment(commentEntry)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="annotation-danger-button"
                            onClick={() => removeComment(commentEntry.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <p>{commentEntry.comment}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="annotation-empty">
                  No comments are attached to the current position yet.
                </p>
              )}
              <div className="annotation-editor">
                <div className="annotation-editor-header">
                  <h3>{editedComment ? "Edit comment" : "Add comment"}</h3>
                  {!editedComment && (
                    <button
                      type="button"
                      className="annotation-action-button"
                      onClick={startAddingComment}
                    >
                      New comment
                    </button>
                  )}
                </div>
                <textarea
                  className="annotation-editor-input"
                  value={commentDraft}
                  onChange={(event) => {
                    setCommentDraft(event.target.value);
                  }}
                  placeholder="Write a comment for this position..."
                />
                <div className="annotation-editor-actions">
                  <button
                    type="button"
                    className="annotation-primary-button"
                    onClick={saveComment}
                    disabled={!commentDraft.trim()}
                  >
                    {editedComment ? "Save changes" : "Add comment"}
                  </button>
                  <button
                    type="button"
                    className="annotation-secondary-button"
                    onClick={cancelCommentEdit}
                    disabled={!commentDraft && !editedComment}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isTrainingFocusMode && showVariants && (
            <VariantsView
              variantLines={variantLines}
              canUndo={canUndo}
              canRedo={canRedo}
              canJumpToMainVariant={canJumpToMainVariant}
              onClose={closeVariants}
              onRemoveLine={removeVariant}
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

          {!isTrainingFocusMode && showImportedPgn && hasImportedPgnDetails && (
            <div className="card">
              <div className="card-header">
                <h2>Imported PGN</h2>
                <button
                  type="button"
                  className="card-close-button"
                  onClick={closeImportedPgn}
                  aria-label="Close Imported PGN"
                  title="Close Imported PGN"
                >
                  ×
                </button>
              </div>
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

              {!!importedMainlineComments.length && (
                <div className="annotation-section">
                  <h3>All Main Line Notes</h3>
                  <ul className="annotation-list">
                    {importedMainlineComments.map((commentEntry, index) => (
                      <li
                        key={commentEntry.id ?? `${commentEntry.fen ?? "mainline"}-${index}`}
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

      {showSaveStudyPopup && (
        <div
          style={shortcutOverlayStyle}
          onClick={closeSaveStudyPopup}
          role="presentation"
        >
          <div
            style={shortcutModalStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-study-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="save-study-title">Save to Studies</h2>
            <p>Store current game, variants, and comments on server.</p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void saveCurrentStudy();
              }}
            >
              <label style={modalFieldLabelStyle}>
                Study title
                <input
                  type="text"
                  value={saveStudyTitle}
                  onChange={(event) => setSaveStudyTitle(event.target.value)}
                  style={modalInputStyle}
                  placeholder={buildStudyTitle(importedPgnData)}
                />
              </label>
              {!!saveStudyError && <p style={modalErrorStyle}>{saveStudyError}</p>}
              <div style={modalActionRowStyle}>
                <button
                  type="button"
                  style={modalButtonStyle}
                  onClick={closeSaveStudyPopup}
                  disabled={savingStudy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={modalPrimaryButtonStyle}
                  disabled={savingStudy}
                >
                  {savingStudy ? "Saving..." : "Save study"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStudiesPopup && (
        <div
          style={shortcutOverlayStyle}
          onClick={closeStudiesPopup}
          role="presentation"
        >
          <div
            style={wideModalStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="studies-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="studies-title">Studies</h2>
            <p>Browse saved studies and load one into current board.</p>
            {!!studiesError && <p style={modalErrorStyle}>{studiesError}</p>}
            <div style={modalActionRowStyle}>
              <button
                type="button"
                style={modalPrimaryButtonStyle}
                onClick={openCreateCollectionPopup}
                disabled={collectionsLoading || studiesLoading}
              >
                New collection
              </button>
            </div>
            <h3>Collections</h3>
            {collectionsLoading && <p>Loading collections...</p>}
            {!collectionsLoading && !collections.length && (
              <p>No collections yet. Create one to group studies.</p>
            )}
            {!!collections.length && (
              <ul style={collectionListStyle}>
                <li style={collectionRowStyle}>
                  <button
                    type="button"
                    style={{
                      ...collectionSelectButtonStyle,
                      ...(!selectedCollectionId ? modalPrimaryButtonStyle : {}),
                    }}
                    onClick={() => setSelectedCollectionId("")}
                  >
                    All studies ({studies.length})
                  </button>
                </li>
                {collections.map((collection) => (
                  <li key={collection.id} style={collectionRowStyle}>
                    <button
                      type="button"
                      style={{
                        ...collectionSelectButtonStyle,
                        ...(selectedCollectionId === collection.id
                          ? modalPrimaryButtonStyle
                          : {}),
                      }}
                      onClick={() => setSelectedCollectionId(collection.id)}
                      disabled={deletingCollectionId === collection.id}
                    >
                      {collection.title} ({collection.studyCount})
                    </button>
                    <button
                      type="button"
                      style={modalDangerButtonStyle}
                      onClick={() => {
                        void removeCollection(collection);
                      }}
                      disabled={deletingCollectionId === collection.id}
                    >
                      {deletingCollectionId === collection.id ? "Removing..." : "Remove"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <h3 style={{ marginTop: "1.25rem" }}>
              {selectedCollection
                ? `Studies in ${selectedCollection.title}`
                : "All studies"}
            </h3>
            {studiesLoading && <p>Loading studies...</p>}
            {!studiesLoading && !visibleStudies.length && !studiesError && (
              <p>No studies saved yet.</p>
            )}
            {!!visibleStudies.length && (
              <ul style={studyListStyle}>
                {visibleStudies.map((study) => {
                  const studyCollections = getCollectionsForStudy(collections, study.id);

                  return (
                  <li key={study.id} style={studyListItemStyle}>
                    <div style={studyHeaderStyle}>
                      <div>
                        <strong>{study.title}</strong>
                        <p style={studyMetaStyle}>{getStudySummaryText(study)}</p>
                        <p style={studyMetaStyle}>
                          Updated {formatStudyTimestamp(study.updatedAt)}
                        </p>
                        <div style={collectionTagListStyle}>
                          {studyCollections.length ? (
                            studyCollections.map((collection) => (
                              <span key={`${study.id}-${collection.id}`} style={collectionTagStyle}>
                                {collection.title}
                              </span>
                            ))
                          ) : (
                            <span style={collectionTagStyle}>No collections</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "grid", gap: "0.5rem" }}>
                        <button
                          type="button"
                          style={modalButtonStyle}
                          onClick={() => openManageCollectionsPopup(study)}
                          disabled={deletingStudyId === study.id || loadingStudyId === study.id}
                        >
                          Collections
                        </button>
                        <button
                          type="button"
                          style={modalPrimaryButtonStyle}
                          onClick={() => {
                            void loadStudy(study.id);
                          }}
                          disabled={loadingStudyId === study.id || deletingStudyId === study.id}
                        >
                          {loadingStudyId === study.id ? "Loading..." : "Load"}
                        </button>
                        <button
                          type="button"
                          style={modalDangerButtonStyle}
                          onClick={() => {
                            void removeStudy(study);
                          }}
                          disabled={loadingStudyId === study.id || deletingStudyId === study.id}
                        >
                          {deletingStudyId === study.id ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
            <div style={modalActionRowStyle}>
              <button
                type="button"
                style={modalButtonStyle}
                onClick={() => {
                  void loadStudies();
                  void loadCollections();
                }}
                disabled={studiesLoading || collectionsLoading}
              >
                Refresh
              </button>
              <button
                type="button"
                style={modalButtonStyle}
                onClick={closeStudiesPopup}
                disabled={
                  studiesLoading ||
                  collectionsLoading ||
                  !!loadingStudyId ||
                  !!deletingStudyId ||
                  !!deletingCollectionId ||
                  !!updatingCollectionId
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateCollectionPopup && (
        <div
          style={shortcutOverlayStyle}
          onClick={closeCreateCollectionPopup}
          role="presentation"
        >
          <div
            style={shortcutModalStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-collection-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="create-collection-title">New collection</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void createCollection();
              }}
            >
              <label style={modalFieldLabelStyle}>
                Collection title
                <input
                  type="text"
                  value={createCollectionTitle}
                  onChange={(event) => setCreateCollectionTitle(event.target.value)}
                  style={modalInputStyle}
                  placeholder="Opening prep"
                />
              </label>
              {!!createCollectionError && <p style={modalErrorStyle}>{createCollectionError}</p>}
              <div style={modalActionRowStyle}>
                <button
                  type="button"
                  style={modalButtonStyle}
                  onClick={closeCreateCollectionPopup}
                  disabled={creatingCollection}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={modalPrimaryButtonStyle}
                  disabled={creatingCollection}
                >
                  {creatingCollection ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showManageCollectionsPopup && managingStudy && (
        <div
          style={shortcutOverlayStyle}
          onClick={closeManageCollectionsPopup}
          role="presentation"
        >
          <div
            style={shortcutModalStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-study-collections-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="manage-study-collections-title">Study collections</h2>
            <p>{managingStudy.title}</p>
            {!collections.length && <p>No collections yet. Create one first.</p>}
            {!!collections.length && (
              <ul style={collectionListStyle}>
                {collections.map((collection) => {
                  const isMember = collection.studyIds.includes(managingStudy.id);

                  return (
                    <li key={`${managingStudy.id}-${collection.id}`} style={collectionRowStyle}>
                      <div>
                        <strong>{collection.title}</strong>
                        <p style={studyMetaStyle}>{collection.studyCount} studies</p>
                      </div>
                      <button
                        type="button"
                        style={isMember ? modalDangerButtonStyle : modalPrimaryButtonStyle}
                        onClick={() => {
                          void toggleStudyCollection(collection, managingStudy);
                        }}
                        disabled={updatingCollectionId === collection.id}
                      >
                        {updatingCollectionId === collection.id
                          ? "Saving..."
                          : isMember
                            ? "Remove"
                            : "Add"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div style={modalActionRowStyle}>
              <button
                type="button"
                style={modalButtonStyle}
                onClick={closeManageCollectionsPopup}
                disabled={!!updatingCollectionId}
              >
                Close
              </button>
            </div>
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
              opponent, player color, event, year range, result, ECO range, or
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
                  <span>ECO from</span>
                  <input
                    className="modal-input"
                    type="text"
                    value={otbSearchFilters.ecoFrom}
                    onChange={(event) => {
                      setOtbSearchFilters((currentValue) => ({
                        ...currentValue,
                        ecoFrom: event.target.value,
                      }));
                    }}
                    placeholder="C20"
                  />
                </label>
                <label className="modal-field">
                  <span>ECO to</span>
                  <input
                    className="modal-input"
                    type="text"
                    value={otbSearchFilters.ecoTo}
                    onChange={(event) => {
                      setOtbSearchFilters((currentValue) => ({
                        ...currentValue,
                        ecoTo: event.target.value,
                      }));
                    }}
                    placeholder="C99"
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
                    {keys.length
                      ? keys.map(getShortcutDisplayLabel).join(" / ")
                      : "Unassigned"}
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
      {trainingPreview &&
        createPortal(
          <div
            className="training-preview-tooltip"
            role="tooltip"
            style={{
              top: `${trainingPreview.top}px`,
              left: `${trainingPreview.left}px`,
              transform: "translateY(-50%)",
            }}
          >
            <span className="annotation-label">Resulting position</span>
            <PositionPreviewBoard
              fen={trainingPreview.fen}
              orientation={boardOrientation}
            />
          </div>,
          document.body,
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
