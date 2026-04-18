import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { createPortal } from "react-dom";
import AppMenuBar from "./components/app/AppMenuBar.jsx";
import BoardWorkspace from "./components/board/BoardWorkspace.jsx";
import CommentsPanel from "./components/comments/CommentsPanel.jsx";
import EnginePanel from "./components/engine/EnginePanel.jsx";
import CreateCollectionModal from "./components/modals/CreateCollectionModal.jsx";
import ImportPgnModal from "./components/modals/ImportPgnModal.jsx";
import LichessSearchModal from "./components/modals/LichessSearchModal.jsx";
import LichessTokenModal from "./components/modals/LichessTokenModal.jsx";
import ManageCollectionsModal from "./components/modals/ManageCollectionsModal.jsx";
import OtbSearchModal from "./components/modals/OtbSearchModal.jsx";
import SaveStudyModal from "./components/modals/SaveStudyModal.jsx";
import ShortcutsModal from "./components/modals/ShortcutsModal.jsx";
import StudiesModal from "./components/modals/StudiesModal.jsx";
import PositionPreviewBoard from "./components/PositionPreviewBoard.jsx";
import OpeningTreePanel from "./components/opening/OpeningTreePanel.jsx";
import ImportedPgnPanel from "./components/pgn/ImportedPgnPanel.jsx";
import PlayComputerPanel from "./components/training/PlayComputerPanel.jsx";
import ReplayTrainingPanel from "./components/training/ReplayTrainingPanel.jsx";
import VariantsView from "./components/VariantsView.jsx";
import {
  createUserPositionComment,
  DEFAULT_ENGINE_SEARCH_DEPTH,
  MAX_ENGINE_SEARCH_DEPTH,
  MIN_ENGINE_SEARCH_DEPTH,
  DEFAULT_SHORTCUT_CONFIG,
  DEFAULT_SHORTCUT_CONFIG_SIGNATURE,
  SHORTCUT_ACTION_ORDER,
  getPositionCommentsForFen,
  loadPersistedAppState,
  normalizeEngineSearchDepth,
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
} from "./utils/lichessSearch.js";
import {
  buildOtbSearchQuery,
  DEFAULT_OTB_SEARCH_FILTERS,
} from "./utils/otbSearch.js";
import {
  createCollectionPayload,
  filterStudiesByCollection,
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
  createComputerPlayTrainingState,
  createEmptyTrainingState,
  createReplayTrainingState,
  getCurrentReplayMove,
  normalizeTrainingState,
  REPLAY_RESULT_MATCH,
  summarizeReplayAttempts,
  TRAINING_COMPUTER_PLAY_SOURCE_CURRENT,
  TRAINING_COMPUTER_PLAY_SOURCE_INITIAL,
  TRAINING_COMPLETION_MATCH,
  TRAINING_COMPLETION_REVEALED,
  TRAINING_MODE_PLAY_COMPUTER,
  TRAINING_MODE_REPLAY_GAME,
  TRAINING_PLAY_STATUS_ACTIVE,
  TRAINING_SIDE_BLACK,
  TRAINING_SIDE_WHITE,
  TRAINING_STATUS_ACTIVE,
  TRAINING_STATUS_COMPLETED,
} from "./utils/training.js";
import { fetchJson } from "./utils/api.js";
import useKeyboardShortcuts from "./hooks/useKeyboardShortcuts.js";
import useTrainingController from "./hooks/useTrainingController.js";
import "./App.css";

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

function getTrainingSideForTurn(turn) {
  return turn === "b" ? TRAINING_SIDE_BLACK : TRAINING_SIDE_WHITE;
}

function getComputerPlaySourceLabel(startFrom) {
  return startFrom === TRAINING_COMPUTER_PLAY_SOURCE_INITIAL
    ? "initial position"
    : "current position";
}

function getComputerPlayOutcomeText(game, playerSide) {
  if (!(game instanceof Chess) || !game.isGameOver()) {
    return "";
  }

  if (game.isCheckmate()) {
    const winnerSide = game.turn() === "w" ? TRAINING_SIDE_BLACK : TRAINING_SIDE_WHITE;
    return winnerSide === playerSide
      ? "You won by checkmate."
      : "Computer won by checkmate.";
  }

  if (game.isStalemate()) {
    return "Draw by stalemate.";
  }

  if (game.isThreefoldRepetition()) {
    return "Draw by repetition.";
  }

  if (game.isInsufficientMaterial()) {
    return "Draw by insufficient material.";
  }

  if (game.isDraw()) {
    return "Game drawn.";
  }

  return "Game over.";
}

function App() {
  const persistedAppState = useMemo(() => loadPersistedAppState(), []);
  const [variantTree, setVariantTree] = useState(
    () => persistedAppState?.variantTree ?? createEmptyVariantTree(),
  );
  const [engineSearchDepth, setEngineSearchDepth] = useState(
    () => persistedAppState?.engineSearchDepth ?? DEFAULT_ENGINE_SEARCH_DEPTH,
  );
  const [engineResult, setEngineResult] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedEngineVariantIndex, setSelectedEngineVariantIndex] = useState(0);
  const [openMenu, setOpenMenu] = useState(null);
  const [showMoveHistory, setShowMoveHistory] = useState(
    () => persistedAppState?.showMoveHistory ?? true,
  );
  const [showOpeningTreePanel, setShowOpeningTreePanel] = useState(
    () => persistedAppState?.showOpeningTreePanel ?? true,
  );
  const [showReplayTrainingPanel, setShowReplayTrainingPanel] = useState(
    () => persistedAppState?.showReplayTrainingPanel ?? true,
  );
  const [showPlayComputerPanel, setShowPlayComputerPanel] = useState(
    () => persistedAppState?.showPlayComputerPanel ?? true,
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
  const [showLichessTokenPopup, setShowLichessTokenPopup] = useState(false);
  const [showOtbSearchPopup, setShowOtbSearchPopup] = useState(false);
  const [lichessApiToken, setLichessApiToken] = useState(
    () => persistedAppState?.lichessApiToken ?? "",
  );
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
    () => persistedAppState?.lichessSearchFilters ?? DEFAULT_LICHESS_SEARCH_FILTERS,
  );
  const [lichessSearchResults, setLichessSearchResults] = useState([]);
  const [lichessSearchError, setLichessSearchError] = useState("");
  const [lichessImportError, setLichessImportError] = useState("");
  const [lichessSearchLoading, setLichessSearchLoading] = useState(false);
  const [lichessImportingGameId, setLichessImportingGameId] = useState("");
  const [hasSearchedLichess, setHasSearchedLichess] = useState(false);
  const [otbSearchFilters, setOtbSearchFilters] = useState(
    () => persistedAppState?.otbSearchFilters ?? DEFAULT_OTB_SEARCH_FILTERS,
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
  const [trainingError, setTrainingError] = useState("");
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [trainingPlayAutoReplyPaused, setTrainingPlayAutoReplyPaused] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");
  const shortcutConfigSignatureRef = useRef(
    DEFAULT_SHORTCUT_CONFIG_SIGNATURE,
  );
  const boardPanelRef = useRef(null);

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
    showReplayTrainingPanel && normalizedTrainingState.mode === TRAINING_MODE_REPLAY_GAME;
  const {
    trainingPreview,
    trainingRequestIdRef,
    hideTrainingPreview,
    showTrainingPreview,
    trainingFocusRestoreRef,
  } = useTrainingController({
    showReplayTrainingPanel,
    trainingState,
    isTrainingFocusMode,
    showMoveHistory,
    setShowMoveHistory,
    showOpeningTreePanel,
    setShowOpeningTreePanel,
    showEngineWindow,
    setShowEngineWindow,
    showComments,
    setShowComments,
    showImportedPgn,
    setShowImportedPgn,
    showVariants,
    setShowVariants,
  });
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
  const computerPlayConfig = normalizedTrainingState.computerPlay;
  const isStandaloneComputerPlay =
    normalizedTrainingState.mode === TRAINING_MODE_PLAY_COMPUTER;
  const isStandaloneComputerPlayActive =
    isStandaloneComputerPlay && normalizedTrainingState.status === TRAINING_STATUS_ACTIVE;
  const isStandaloneComputerPlayCompleted =
    isStandaloneComputerPlay && normalizedTrainingState.status === TRAINING_STATUS_COMPLETED;
  const activeTrainingPlaySession = normalizedTrainingState.playSession;
  const isTrainingPlayActive = !!activeTrainingPlaySession;
  const isEngineOpponentSessionActive =
    isTrainingPlayActive || isStandaloneComputerPlayActive;
  const isEngineOpponentUserTurn =
    isEngineOpponentSessionActive &&
    getTrainingSideForTurn(game.turn()) === normalizedTrainingState.playerSide;
  const computerPlaySourceLabel = useMemo(
    () => getComputerPlaySourceLabel(computerPlayConfig?.startFrom),
    [computerPlayConfig?.startFrom],
  );
  const computerPlayOutcomeText = useMemo(
    () =>
      isStandaloneComputerPlayCompleted
        ? getComputerPlayOutcomeText(game, normalizedTrainingState.playerSide)
        : "",
    [
      game,
      isStandaloneComputerPlayCompleted,
      normalizedTrainingState.playerSide,
    ],
  );
  const computerPlayStatusText = useMemo(() => {
    if (isTrainingPlayActive) {
      return "";
    }

    if (isStandaloneComputerPlayCompleted) {
      return `Computer game finished from the ${computerPlaySourceLabel}.`;
    }

    if (isStandaloneComputerPlayActive) {
      return isEngineOpponentUserTurn
        ? `Your move from the ${computerPlaySourceLabel}.`
        : `Computer thinking from the ${computerPlaySourceLabel}.`;
    }

    return "Start a game against Stockfish from the initial or current position.";
  }, [
    computerPlaySourceLabel,
    isEngineOpponentUserTurn,
    isStandaloneComputerPlayActive,
    isStandaloneComputerPlayCompleted,
    isTrainingPlayActive,
  ]);
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
    hideTrainingPreview();
    setTrainingError("");
    setTrainingLoading(false);
    setTrainingPlayAutoReplyPaused(false);
  }, [hideTrainingPreview, normalizedTrainingState.playerSide, trainingRequestIdRef]);

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

  const exitTrainingPlayMode = useCallback(() => {
    if (!activeTrainingPlaySession) {
      return;
    }

    trainingRequestIdRef.current += 1;
    setTrainingState(activeTrainingPlaySession.resumeTrainingState);
    setVariantTree(activeTrainingPlaySession.resumeVariantTree);
    hideTrainingPreview();
    setTrainingError("");
    setTrainingLoading(false);
    setTrainingPlayAutoReplyPaused(false);
    setEngineResult(null);
    setEvaluationResult(null);
  }, [activeTrainingPlaySession, hideTrainingPreview, trainingRequestIdRef]);

  const startStandaloneComputerPlay = useCallback((startFrom) => {
    const startVariantTree =
      startFrom === TRAINING_COMPUTER_PLAY_SOURCE_INITIAL
        ? createEmptyVariantTree()
        : normalizeVariantTree(variantTree);
    const { trainingState: nextTrainingState, variantTree: nextVariantTree, error } =
      createComputerPlayTrainingState(
        startVariantTree,
        normalizedTrainingState.playerSide,
        startFrom,
      );

    if (error || !nextVariantTree) {
      setTrainingError(error ?? "Unable to start computer play.");
      return;
    }

    trainingRequestIdRef.current += 1;
    setVariantTree(nextVariantTree);
    setTrainingState(nextTrainingState);
    hideTrainingPreview();
    setShowPlayComputerPanel(true);
    setTrainingError("");
    setTrainingLoading(false);
    setTrainingPlayAutoReplyPaused(false);
    setEngineResult(null);
    setEvaluationResult(null);
  }, [
    hideTrainingPreview,
    normalizedTrainingState.playerSide,
    trainingRequestIdRef,
    variantTree,
  ]);

  const restartStandaloneComputerPlay = useCallback(() => {
    if (!computerPlayConfig?.startVariantTree || !computerPlayConfig?.startFrom) {
      return;
    }

    const { trainingState: nextTrainingState, variantTree: nextVariantTree, error } =
      createComputerPlayTrainingState(
        computerPlayConfig.startVariantTree,
        normalizedTrainingState.playerSide,
        computerPlayConfig.startFrom,
      );

    if (error || !nextVariantTree) {
      setTrainingError(error ?? "Unable to restart computer play.");
      return;
    }

    trainingRequestIdRef.current += 1;
    setVariantTree(nextVariantTree);
    setTrainingState(nextTrainingState);
    hideTrainingPreview();
    setTrainingError("");
    setTrainingLoading(false);
    setTrainingPlayAutoReplyPaused(false);
    setEngineResult(null);
    setEvaluationResult(null);
  }, [
    computerPlayConfig,
    hideTrainingPreview,
    normalizedTrainingState.playerSide,
    trainingRequestIdRef,
  ]);

  const exitStandaloneComputerPlay = useCallback(() => {
    if (!isStandaloneComputerPlay) {
      return;
    }

    trainingRequestIdRef.current += 1;
    hideTrainingPreview();
    setTrainingState(createEmptyTrainingState(normalizedTrainingState.playerSide));
    setTrainingError("");
    setTrainingLoading(false);
    setTrainingPlayAutoReplyPaused(false);
    setEngineResult(null);
    setEvaluationResult(null);
  }, [
    hideTrainingPreview,
    isStandaloneComputerPlay,
    normalizedTrainingState.playerSide,
    trainingRequestIdRef,
  ]);

  const requestTrainingPlayEngineMove = useCallback(async () => {
    if (
      !isEngineOpponentSessionActive ||
      trainingPlayAutoReplyPaused ||
      trainingError ||
      trainingLoading ||
      game.isGameOver() ||
      isEngineOpponentUserTurn
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
          depth: engineSearchDepth,
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
    engineSearchDepth,
    fen,
    game,
    isEngineOpponentSessionActive,
    isEngineOpponentUserTurn,
    trainingPlayAutoReplyPaused,
    trainingError,
    trainingLoading,
    trainingRequestIdRef,
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
    hideTrainingPreview();
    setTrainingError("");
    setTrainingLoading(false);
    setTrainingPlayAutoReplyPaused(false);
    setEngineResult(null);
    setEvaluationResult(null);
  }, [
    hideTrainingPreview,
    isTrainingPlayActive,
    normalizedTrainingState,
    trainingRequestIdRef,
    variantTree,
  ]);

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
    hideTrainingPreview();
    setTrainingError("");
    setTrainingLoading(false);
    setTrainingPlayAutoReplyPaused(false);
    setEngineResult(null);
    setEvaluationResult(null);
  }, [
    buildReplayVariantTreeForProgress,
    hideTrainingPreview,
    normalizedTrainingState,
    trainingRequestIdRef,
  ]);

  useEffect(() => {
    requestTrainingPlayEngineMove();
  }, [requestTrainingPlayEngineMove]);

  useEffect(() => {
    if (!isStandaloneComputerPlayActive || !game.isGameOver()) {
      return;
    }

    setTrainingState((currentValue) => {
      const currentTrainingState = normalizeTrainingState(currentValue);

      if (
        currentTrainingState.mode !== TRAINING_MODE_PLAY_COMPUTER ||
        currentTrainingState.status === TRAINING_STATUS_COMPLETED
      ) {
        return currentTrainingState;
      }

      return normalizeTrainingState({
        ...currentTrainingState,
        status: TRAINING_STATUS_COMPLETED,
      });
    });
    setTrainingLoading(false);
    setTrainingPlayAutoReplyPaused(false);
  }, [game, isStandaloneComputerPlayActive]);

  const setTrainingPlayerSide = useCallback((playerSide) => {
    if (playerSide !== TRAINING_SIDE_WHITE && playerSide !== TRAINING_SIDE_BLACK) {
      return;
    }

    setTrainingState((currentValue) => {
      const currentTrainingState = normalizeTrainingState(currentValue);

      if (
        (currentTrainingState.mode === TRAINING_MODE_REPLAY_GAME &&
          currentTrainingState.status === TRAINING_STATUS_ACTIVE) ||
        (currentTrainingState.mode === TRAINING_MODE_PLAY_COMPUTER &&
          currentTrainingState.status === TRAINING_STATUS_ACTIVE
        )
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
    setShowReplayTrainingPanel(true);
    setEngineResult(null);
    setEvaluationResult(null);
    setTrainingState(preparedTrainingState);
    setTrainingError("");
    setTrainingLoading(false);
  }, [
    advanceReplayToPlayerTurn,
    hasReplaySource,
    importedPgnData,
    normalizedTrainingState.playerSide,
    trainingRequestIdRef,
  ]);

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

    if (isTrainingPlayActive || isStandaloneComputerPlayActive) {
      if (!isEngineOpponentUserTurn) {
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

    if (isStandaloneComputerPlayCompleted) {
      return false;
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
          depth: engineSearchDepth,
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
      hideTrainingPreview();
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
    hideTrainingPreview,
    isTrainingPlayActive,
    navigateReplayTrainingToProgress,
    normalizedTrainingState.mode,
    normalizedTrainingState.progressPly,
    replayNavigationCheckpoints,
    resetTrainingSession,
    trainingRequestIdRef,
  ]);

  const redoMove = useCallback(() => {
    if (!canRedo) {
      return;
    }

    if (isTrainingPlayActive) {
      trainingRequestIdRef.current += 1;
      hideTrainingPreview();
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
    hideTrainingPreview,
    isTrainingPlayActive,
    navigateReplayTrainingToProgress,
    normalizedTrainingState.mode,
    normalizedTrainingState.progressPly,
    replayNavigationCheckpoints,
    resetTrainingSession,
    trainingRequestIdRef,
  ]);

  const goToStart = useCallback(() => {
    if (!canUndo) {
      return;
    }

    if (isTrainingPlayActive) {
      trainingRequestIdRef.current += 1;
      hideTrainingPreview();
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
    hideTrainingPreview,
    isTrainingPlayActive,
    navigateReplayTrainingToProgress,
    normalizedTrainingState.mode,
    replayNavigationCheckpoints,
    resetTrainingSession,
    trainingRequestIdRef,
  ]);

  const goToEnd = useCallback(() => {
    if (!canRedo) {
      return;
    }

    if (isTrainingPlayActive) {
      trainingRequestIdRef.current += 1;
      hideTrainingPreview();
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
    hideTrainingPreview,
    isTrainingPlayActive,
    navigateReplayTrainingToProgress,
    normalizedTrainingState.mode,
    replayNavigationCheckpoints,
    resetTrainingSession,
    trainingRequestIdRef,
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

  const openLichessTokenPopup = useCallback(() => {
    setShowLichessTokenPopup(true);
  }, []);

  const closeLichessTokenPopup = useCallback(() => {
    setShowLichessTokenPopup(false);
  }, []);

  const saveLichessToken = useCallback((nextToken) => {
    setLichessApiToken(nextToken);
    setShowLichessTokenPopup(false);
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

  const copyFenToClipboard = useCallback(async () => {
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
  }, [fen]);

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
          showOpeningTreePanel,
          showEngineWindow,
          showComments,
          showImportedPgn,
          showVariants,
        };

    try {
      savePersistedAppState({
        variantTree,
        engineSearchDepth,
        lichessApiToken,
        boardOrientation,
        showMoveHistory: persistedRightSideViews.showMoveHistory,
        showOpeningTreePanel: persistedRightSideViews.showOpeningTreePanel,
        showReplayTrainingPanel,
        showPlayComputerPanel,
        showEngineWindow: persistedRightSideViews.showEngineWindow,
        showEvaluationBar,
        showComments: persistedRightSideViews.showComments,
        showImportedPgn: persistedRightSideViews.showImportedPgn,
        showVariants: persistedRightSideViews.showVariants,
        showVariantArrows,
        lichessSearchFilters,
        otbSearchFilters,
        importedPgnData,
        positionComments,
        trainingState,
      });
    } catch (error) {
      console.error("Failed to persist app state:", error);
    }
  }, [
    boardOrientation,
    engineSearchDepth,
    lichessApiToken,
    lichessSearchFilters,
    importedPgnData,
    isTrainingFocusMode,
    otbSearchFilters,
    positionComments,
    showEngineWindow,
    showEvaluationBar,
    showComments,
    showImportedPgn,
    showMoveHistory,
    showOpeningTreePanel,
    showReplayTrainingPanel,
    showPlayComputerPanel,
    showVariants,
    showVariantArrows,
    trainingState,
    trainingFocusRestoreRef,
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
            depth: engineSearchDepth,
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
  }, [engineSearchDepth, fen]);

  const analyzePosition = useCallback(async () => {
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
          depth: engineSearchDepth,
          multipv: 3,
        }),
      });

      setEngineResult(data);
    } catch (error) {
      setEngineResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }, [engineSearchDepth, fen]);

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

  const resetGame = useCallback(() => {
    resetTrainingSession();
    setVariantTree(createEmptyVariantTree());
    setEngineResult(null);
    setEvaluationResult(null);
    setImportedPgnData(null);
    setPositionComments([]);
    setEditingCommentId(null);
    setCommentDraft("");
  }, [resetTrainingSession]);

  const toggleMoveHistory = useCallback(() => {
    setShowMoveHistory((currentValue) => !currentValue);
  }, []);

  const closeMoveHistory = useCallback(() => {
    setShowMoveHistory(false);
  }, []);

  const toggleOpeningTreePanel = useCallback(() => {
    setShowOpeningTreePanel((currentValue) => !currentValue);
  }, []);

  const closeOpeningTreePanel = useCallback(() => {
    setShowOpeningTreePanel(false);
  }, []);

  const toggleReplayTrainingPanel = useCallback(() => {
    setShowReplayTrainingPanel((currentValue) => !currentValue);
  }, []);

  const closeReplayTrainingPanel = useCallback(() => {
    setShowReplayTrainingPanel(false);
  }, []);

  const togglePlayComputerPanel = useCallback(() => {
    setShowPlayComputerPanel((currentValue) => !currentValue);
  }, []);

  const closePlayComputerPanel = useCallback(() => {
    setShowPlayComputerPanel(false);
  }, []);

  const toggleEngineWindow = useCallback(() => {
    setShowEngineWindow((currentValue) => !currentValue);
  }, []);

  const closeEngineWindow = useCallback(() => {
    setShowEngineWindow(false);
  }, []);

  const toggleEvaluationBar = useCallback(() => {
    setShowEvaluationBar((currentValue) => !currentValue);
  }, []);

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

  const toggleVariantArrows = useCallback(() => {
    setShowVariantArrows((currentValue) => !currentValue);
  }, []);

  const toggleBoardOrientation = useCallback(() => {
    setBoardOrientation((currentValue) =>
      currentValue === "white" ? "black" : "white",
    );
  }, []);

  const menuActions = useMemo(() => ({
    analyzePosition,
    toggleVariantArrows,
    undoMove,
    redoMove,
    openImportPgnPopup,
    copyFenToClipboard,
    resetGame,
    openLichessSearchPopup,
    openLichessTokenPopup,
    openOtbSearchPopup,
    openSaveStudyPopup,
    openStudiesPopup,
    toggleBoardOrientation,
    toggleMoveHistory,
    toggleOpeningTreePanel,
    toggleReplayTrainingPanel,
    togglePlayComputerPanel,
    toggleEngineWindow,
    toggleEvaluationBar,
    toggleComments,
    toggleImportedPgn,
    toggleVariants,
    openShortcutsPopup,
  }), [
    analyzePosition,
    copyFenToClipboard,
    openImportPgnPopup,
    openLichessSearchPopup,
    openLichessTokenPopup,
    openOtbSearchPopup,
    openSaveStudyPopup,
    openShortcutsPopup,
    openStudiesPopup,
    redoMove,
    resetGame,
    toggleBoardOrientation,
    toggleComments,
    toggleEngineWindow,
    toggleEvaluationBar,
    toggleImportedPgn,
    toggleMoveHistory,
    toggleOpeningTreePanel,
    toggleReplayTrainingPanel,
    togglePlayComputerPanel,
    toggleVariantArrows,
    toggleVariants,
    undoMove,
  ]);

  const keyboardActions = useMemo(() => ({
    closeImportPgnPopup,
    closeSaveStudyPopup,
    closeCreateCollectionPopup,
    closeManageCollectionsPopup,
    closeStudiesPopup,
    closeLichessSearchPopup,
    closeLichessTokenPopup,
    closeOtbSearchPopup,
    closeShortcutsPopup,
    openShortcutsPopup,
    setOpenMenu,
    goToStart,
    undoMove,
    redoMove,
    jumpToMainVariant,
    jumpBackToSideline,
    goToEnd,
    toggleBoardOrientation,
    toggleMoveHistory,
    toggleOpeningTreePanel,
    toggleReplayTrainingPanel,
    togglePlayComputerPanel,
    toggleEngineWindow,
    toggleComments,
    toggleImportedPgn,
    toggleVariants,
  }), [
    closeCreateCollectionPopup,
    closeImportPgnPopup,
    closeLichessSearchPopup,
    closeLichessTokenPopup,
    closeManageCollectionsPopup,
    closeOtbSearchPopup,
    closeSaveStudyPopup,
    closeShortcutsPopup,
    closeStudiesPopup,
    goToEnd,
    goToStart,
    jumpBackToSideline,
    jumpToMainVariant,
    openShortcutsPopup,
    redoMove,
    toggleBoardOrientation,
    toggleComments,
    toggleEngineWindow,
    toggleImportedPgn,
    toggleMoveHistory,
    toggleOpeningTreePanel,
    toggleReplayTrainingPanel,
    togglePlayComputerPanel,
    toggleVariants,
    undoMove,
  ]);

  const keyboardModalState = useMemo(() => ({
    showImportPgnPopup,
    showSaveStudyPopup,
    showCreateCollectionPopup,
    showManageCollectionsPopup,
    showStudiesPopup,
    showLichessSearchPopup,
    showLichessTokenPopup,
    showOtbSearchPopup,
    showShortcutsPopup,
  }), [
    showCreateCollectionPopup,
    showImportPgnPopup,
    showLichessSearchPopup,
    showLichessTokenPopup,
    showManageCollectionsPopup,
    showOtbSearchPopup,
    showSaveStudyPopup,
    showShortcutsPopup,
    showStudiesPopup,
  ]);

  useKeyboardShortcuts({
    shortcutConfig,
    modalState: keyboardModalState,
    actions: keyboardActions,
  });
  return (
    <div className="app">
      <AppMenuBar
        openMenu={openMenu}
        onToggleMenu={toggleMenu}
        onMenuAction={handleMenuAction}
        showVariantArrows={showVariantArrows}
        canUndo={canUndo}
        canRedo={canRedo}
        showMoveHistory={showMoveHistory}
        showOpeningTreePanel={showOpeningTreePanel}
        showReplayTrainingPanel={showReplayTrainingPanel}
        showPlayComputerPanel={showPlayComputerPanel}
        showEngineWindow={showEngineWindow}
        showEvaluationBar={showEvaluationBar}
        showComments={showComments}
        showImportedPgn={showImportedPgn}
        showVariants={showVariants}
        actions={menuActions}
      />

      <BoardWorkspace
        isTrainingFocusMode={isTrainingFocusMode}
        boardPanelRef={boardPanelRef}
        fen={fen}
        onPieceDrop={handlePieceDrop}
        boardOrientation={boardOrientation}
        showVariantArrows={showVariantArrows}
        variantArrows={variantArrows}
        showEvaluationBar={showEvaluationBar}
        evaluation={evaluationResult?.evaluation}
        turn={game.turn()}
        showMoveHistory={showMoveHistory}
        moveHistoryItems={moveHistoryItems}
        currentMoveIndex={currentMoveIndex}
        boardPanelHeight={boardPanelHeight}
        canUndo={canUndo}
        canRedo={canRedo}
        onCloseMoveHistory={closeMoveHistory}
        onSelectMove={goToMoveHistoryNode}
        onUndo={undoMove}
        onRedo={redoMove}
        onGoToStart={goToStart}
        onGoToEnd={goToEnd}
      >
        {showPlayComputerPanel && !isTrainingFocusMode && (
          <>
            <PlayComputerPanel
              panelHeight={boardPanelHeight}
              onClose={closePlayComputerPanel}
              normalizedTrainingState={normalizedTrainingState}
              setTrainingPlayerSide={setTrainingPlayerSide}
              isReplayTrainingActive={isReplayTrainingActive}
              isTrainingPlayActive={isTrainingPlayActive}
              isEngineOpponentUserTurn={isEngineOpponentUserTurn}
              isStandaloneComputerPlayActive={isStandaloneComputerPlayActive}
              isStandaloneComputerPlayCompleted={isStandaloneComputerPlayCompleted}
              computerPlaySourceLabel={computerPlaySourceLabel}
              computerPlayStatusText={computerPlayStatusText}
              computerPlayOutcomeText={computerPlayOutcomeText}
              trainingLoading={trainingLoading}
              trainingError={trainingError}
              startComputerPlayFromInitialPosition={() =>
                startStandaloneComputerPlay(TRAINING_COMPUTER_PLAY_SOURCE_INITIAL)
              }
              startComputerPlayFromCurrentPosition={() =>
                startStandaloneComputerPlay(TRAINING_COMPUTER_PLAY_SOURCE_CURRENT)
              }
              restartStandaloneComputerPlay={restartStandaloneComputerPlay}
              exitStandaloneComputerPlay={exitStandaloneComputerPlay}
            />
          </>
        )}
        {showReplayTrainingPanel && (
          <>
            <ReplayTrainingPanel
              panelHeight={boardPanelHeight}
              onClose={closeReplayTrainingPanel}
              hasReplaySource={hasReplaySource}
              normalizedTrainingState={normalizedTrainingState}
              setTrainingPlayerSide={setTrainingPlayerSide}
              isReplayTrainingActive={isReplayTrainingActive}
              isTrainingPlayActive={isTrainingPlayActive}
              trainingLoading={trainingLoading}
              whiteTrainingLabel={whiteTrainingLabel}
              blackTrainingLabel={blackTrainingLabel}
              currentReplayMoveNumber={currentReplayMoveNumber}
              replaySummary={replaySummary}
              activeTrainingPlaySession={activeTrainingPlaySession}
              isEngineOpponentUserTurn={isEngineOpponentUserTurn}
              exitTrainingPlayMode={exitTrainingPlayMode}
              currentReplayMove={currentReplayMove}
              trainingError={trainingError}
              pendingTrainingAttempts={pendingTrainingAttempts}
              currentMoveLabel={currentMoveLabel}
              showTrainingPreview={showTrainingPreview}
              hideTrainingPreview={hideTrainingPreview}
              startTrainingPlayMode={startTrainingPlayMode}
              retryReplayMove={retryReplayMove}
              revealReplayMove={revealReplayMove}
              lastCompletedTrainingAttempts={lastCompletedTrainingAttempts}
              lastCompletedExpectedMove={lastCompletedExpectedMove}
              lastCompletedIncorrectTrainingAttempts={lastCompletedIncorrectTrainingAttempts}
              startReplayTraining={startReplayTraining}
              resetTrainingSession={resetTrainingSession}
            />
          </>
        )}

        {!isTrainingFocusMode && showOpeningTreePanel && (
          <OpeningTreePanel
            fen={fen}
            currentMoveLabel={currentMoveLabel}
            lichessApiToken={lichessApiToken}
            onClose={closeOpeningTreePanel}
            onOpenLichessTokenPopup={openLichessTokenPopup}
          />
        )}

        {!isTrainingFocusMode && showEngineWindow && (
          <EnginePanel
            onClose={closeEngineWindow}
            engineSearchDepth={engineSearchDepth}
            minEngineSearchDepth={MIN_ENGINE_SEARCH_DEPTH}
            maxEngineSearchDepth={MAX_ENGINE_SEARCH_DEPTH}
            onChangeEngineSearchDepth={(event) =>
              setEngineSearchDepth(normalizeEngineSearchDepth(event.target.value))
            }
            loading={loading}
            engineResult={engineResult}
            formattedBestMove={formattedBestMove}
            engineVariants={engineVariants}
            selectedEngineVariant={selectedEngineVariant}
            selectedEngineVariantIndex={selectedEngineVariantIndex}
            onSelectEngineVariant={setSelectedEngineVariantIndex}
            onAnalyzePosition={analyzePosition}
            onAddSelectedVariant={addSelectedEngineVariantToTree}
          />
        )}

        {!isTrainingFocusMode && showComments && (
          <CommentsPanel
            onClose={closeComments}
            currentMoveLabel={currentMoveLabel}
            currentPositionComments={currentPositionComments}
            onStartEditingComment={startEditingComment}
            onRemoveComment={removeComment}
            editedComment={editedComment}
            onStartAddingComment={startAddingComment}
            commentDraft={commentDraft}
            onChangeCommentDraft={setCommentDraft}
            onSaveComment={saveComment}
            onCancelCommentEdit={cancelCommentEdit}
          />
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
          <ImportedPgnPanel
            onClose={closeImportedPgn}
            importedPgnData={importedPgnData}
            importedMainlineComments={importedMainlineComments}
          />
        )}
      </BoardWorkspace>

      {showImportPgnPopup && (
        <ImportPgnModal
          importPgnValue={importPgnValue}
          setImportPgnValue={setImportPgnValue}
          importPgnError={importPgnError}
          setImportPgnError={setImportPgnError}
          onImport={importPgn}
          onClose={closeImportPgnPopup}
        />
      )}

      {showSaveStudyPopup && (
        <SaveStudyModal
          saveStudyTitle={saveStudyTitle}
          setSaveStudyTitle={setSaveStudyTitle}
          saveStudyError={saveStudyError}
          savingStudy={savingStudy}
          placeholderTitle={buildStudyTitle(importedPgnData)}
          onSave={saveCurrentStudy}
          onClose={closeSaveStudyPopup}
        />
      )}

      {showStudiesPopup && (
        <StudiesModal
          studiesError={studiesError}
          openCreateCollectionPopup={openCreateCollectionPopup}
          collectionsLoading={collectionsLoading}
          studiesLoading={studiesLoading}
          collections={collections}
          selectedCollectionId={selectedCollectionId}
          setSelectedCollectionId={setSelectedCollectionId}
          studies={studies}
          deletingCollectionId={deletingCollectionId}
          removeCollection={removeCollection}
          selectedCollection={selectedCollection}
          visibleStudies={visibleStudies}
          loadingStudyId={loadingStudyId}
          deletingStudyId={deletingStudyId}
          openManageCollectionsPopup={openManageCollectionsPopup}
          loadStudy={loadStudy}
          removeStudy={removeStudy}
          loadStudies={loadStudies}
          loadCollections={loadCollections}
          updatingCollectionId={updatingCollectionId}
          onClose={closeStudiesPopup}
        />
      )}

      {showCreateCollectionPopup && (
        <CreateCollectionModal
          createCollectionTitle={createCollectionTitle}
          setCreateCollectionTitle={setCreateCollectionTitle}
          createCollectionError={createCollectionError}
          creatingCollection={creatingCollection}
          onCreate={createCollection}
          onClose={closeCreateCollectionPopup}
        />
      )}

      {showManageCollectionsPopup && managingStudy && (
        <ManageCollectionsModal
          managingStudy={managingStudy}
          collections={collections}
          updatingCollectionId={updatingCollectionId}
          onToggleStudyCollection={toggleStudyCollection}
          onClose={closeManageCollectionsPopup}
        />
      )}

      {showLichessSearchPopup && (
        <LichessSearchModal
          filters={lichessSearchFilters}
          setFilters={setLichessSearchFilters}
          searchError={lichessSearchError}
          setSearchError={setLichessSearchError}
          importError={lichessImportError}
          searchLoading={lichessSearchLoading}
          hasSearched={hasSearchedLichess}
          results={lichessSearchResults}
          importingGameId={lichessImportingGameId}
          onSearch={searchLichessGames}
          onImport={importLichessGame}
          onClose={closeLichessSearchPopup}
        />
      )}

      {showLichessTokenPopup && (
        <LichessTokenModal
          currentToken={lichessApiToken}
          onClose={closeLichessTokenPopup}
          onSave={saveLichessToken}
        />
      )}

      {showOtbSearchPopup && (
        <OtbSearchModal
          filters={otbSearchFilters}
          setFilters={setOtbSearchFilters}
          searchError={otbSearchError}
          setSearchError={setOtbSearchError}
          importError={otbImportError}
          searchLoading={otbSearchLoading}
          hasSearched={hasSearchedOtb}
          results={otbSearchResults}
          importingGameId={otbImportingGameId}
          onSearch={searchOtbGames}
          onImport={importOtbGame}
          onClose={closeOtbSearchPopup}
        />
      )}

      {showShortcutsPopup && (
        <ShortcutsModal
          shortcutEntries={shortcutEntries}
          onClose={closeShortcutsPopup}
        />
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
