import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  DEFAULT_BOARD_SOUNDS_ENABLED,
  DEFAULT_VIEW_LAYOUT,
  addCommentsToMoveHistoryEntries,
  createUserPositionComment,
  DEFAULT_ENGINE_SEARCH_DEPTH,
  MAX_ENGINE_SEARCH_DEPTH,
  MIN_ENGINE_SEARCH_DEPTH,
  getPositionCommentsForFen,
  loadPersistedAppState,
  normalizeEngineSearchDepth,
  normalizeViewLayout,
  reorderPositionCommentEntries,
  removePositionCommentEntry,
  savePositionCommentEntry,
  seedPositionCommentsFromImportedPgnData,
} from "../utils/appState.js";
import { parseAnnotatedPgn } from "../utils/annotatedPgn.js";
import { getBoardSoundEvent } from "../utils/boardSounds.js";
import {
  buildLichessPuzzleAdvanceRequest,
  createLichessPuzzleFilterKey,
  buildLichessPuzzleQuery,
  DEFAULT_LICHESS_PUZZLE_FILTERS,
} from "../utils/lichessPuzzles.js";
import {
  buildLichessSearchQuery,
  DEFAULT_LICHESS_SEARCH_FILTERS,
} from "../utils/lichessSearch.js";
import {
  buildOtbImportPath,
  formatOtbImportSummary,
  validateOtbImportFile,
} from "../utils/otbImport.js";
import {
  buildOtbSearchQuery,
  DEFAULT_OTB_SEARCH_FILTERS,
} from "../utils/otbSearch.js";
import {
  DEFAULT_OTB_TREE_EXPORT_SETTINGS,
  normalizeOtbTreeExportSettings,
  normalizeOtbTreeScope,
} from "../utils/otbOpeningTree.js";
import { buildOpeningTreeArrow } from "../utils/openingTree.js";
import {
  buildBoardHighlightSquareStyles,
  getBoardAnnotationColor,
  mergeBoardArrowCollections,
} from "../utils/boardAnnotations.js";
import {
  createCollectionPayload,
  filterStudiesByCollection,
  normalizeCollection,
} from "../utils/collections.js";
import {
  buildStudyTitle,
  createStudySavePayload,
  normalizeStudy,
  normalizeStudySummary,
} from "../utils/studies.js";
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
  getBoardAnnotationsForNode,
  getMoveHistoryEntries,
  getMoveHistoryForNode,
  getMainlinePositionEntries,
  getRelevantVariantLines,
  getVariantLinesForMoveHistoryNode,
  goToNodeInVariantTree,
  goToMainlineNodeInVariantTree,
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
  toggleBoardArrowAnnotation,
  toggleBoardHighlightAnnotation,
  truncateLineAfterNode,
  undoInVariantTree,
} from "../utils/variantTree.js";
import {
  buildGuessReviewArrows,
  buildReplayAttempt,
  createGuessHistoryEntryPayload,
  createComputerPlayTrainingState,
  createEmptyTrainingState,
  createGuessTheMoveTrainingState,
  createPuzzleTrainingState,
  createReplayTrainingState,
  getCurrentGuessTheMove,
  getCurrentPuzzleMove,
  getCurrentReplayMove,
  getPuzzleTerminalOutcome,
  normalizeGuessHistoryBrowseEntries,
  normalizeGuessHistoryEntries,
  normalizeTrainingState,
  REPLAY_RESULT_MATCH,
  summarizeGuessTheMoveAttempts,
  summarizeReplayAttempts,
  TRAINING_COMPUTER_PLAY_SOURCE_CURRENT,
  TRAINING_COMPUTER_PLAY_SOURCE_INITIAL,
  TRAINING_COMPLETION_MATCH,
  TRAINING_COMPLETION_REVEALED,
  TRAINING_MODE_GUESS_THE_MOVE,
  TRAINING_MODE_PLAY_COMPUTER,
  TRAINING_MODE_PUZZLE,
  TRAINING_MODE_REPLAY_GAME,
  TRAINING_PLAY_STATUS_ACTIVE,
  TRAINING_SIDE_BLACK,
  TRAINING_SIDE_WHITE,
  TRAINING_STATUS_ACTIVE,
  TRAINING_STATUS_COMPLETED,
  TRAINING_STATUS_ENDED,
} from "../utils/training.js";
import {
  fetchJson,
  loadConfiguredApiBaseUrl,
  loadConfiguredApiToken,
  normalizeApiBaseUrl,
  saveConfiguredApiBaseUrl,
  saveConfiguredApiToken,
  saveUseLocalApiBaseUrl,
  streamNdjson,
} from "../utils/api.js";
import {
  GAME_ANALYSIS_STATUS_CANCELLED,
  GAME_ANALYSIS_STATUS_COMPLETE,
  GAME_ANALYSIS_STATUS_ERROR,
  GAME_ANALYSIS_STATUS_RUNNING,
  GAME_ANALYSIS_VERSION,
  ISSUE_FILTER_ALL,
  addGameAnalysisToMoveHistoryEntries,
  appendGameAnalysisPosition,
  buildGameAnalysisIssueArrow,
  buildGameAnalysisRequest,
  createCompletedGameAnalysis,
  createMainlineSignature,
  findAdjacentIssue,
  isGameAnalysisCurrent,
} from "../utils/gameAnalysis.js";
import {
  GAME_ANALYSIS_RETRY_STATUS_EVALUATING,
  GAME_ANALYSIS_RETRY_STATUS_FEEDBACK,
  GAME_ANALYSIS_RETRY_STATUS_PREPARING,
  GAME_ANALYSIS_RETRY_STATUS_READY,
  buildGameAnalysisRetryArrows,
  buildGameAnalysisRetryAttempt,
  getGameAnalysisRetryFeedback,
  getGameAnalysisRetryTarget,
  getNextGameAnalysisRetryTarget,
  setGameAnalysisRetryBestMove,
} from "../utils/gameAnalysisRetry.js";
import {
  applyPositionSetupTool,
  buildPositionSetupFen,
  createPositionSetupDraft,
  DEFAULT_POSITION_SETUP_CASTLING_RIGHTS,
  movePositionSetupPiece,
  POSITION_SETUP_CLEAR_TOOL,
  POSITION_SETUP_MOVE_TOOL,
} from "../utils/positionSetup.js";
import useKeyboardShortcuts from "./useKeyboardShortcuts.js";
import useTrainingController from "./useTrainingController.js";
import useShortcutConfig from "./useShortcutConfig.js";
import useStudyLibraryActions from "./useStudyLibraryActions.js";
import useGameSourceActions from "./useGameSourceActions.js";
import useWorkspaceActions from "./useWorkspaceActions.js";
import useGameAnalysisActions from "./useGameAnalysisActions.js";
import useTrainingActions from "./useTrainingActions.js";
import useBoardPanelSize from "./useBoardPanelSize.js";
import useAppPersistence from "./useAppPersistence.js";
import useFenClipboard from "./useFenClipboard.js";
import {
  createThemeCssVariables,
  getThemePresetById,
  getThemeOverrideValue,
  normalizeThemeOverrides,
  resolveTheme,
} from "../utils/theme.js";
import {
  buildEngineVariantPreview,
  buildPositionCommentContext,
  formatMoveAsUci,
  formatUciMoveAsSan,
  getComputerPlayOutcomeText,
  getComputerPlaySourceLabel,
  getCurrentMoveLabel,
  getLastMoveFromGame,
  getPgnHeaderValue,
  getTrainingSideForTurn,
  parseUciMove,
  wait,
} from "../utils/appChess.js";
import createMoveExecutor from "../controllers/createMoveExecutor.js";

const PUZZLE_FETCH_RETRY_ATTEMPTS = 5;
const PUZZLE_FETCH_RETRY_DELAY_MS = 500;
const MAX_RECENT_LICHESS_PUZZLE_IDS = 25;

function useAppController() {
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
  const [gameAnalysis, setGameAnalysis] = useState(null);
  const [gameAnalysisIssueFilter, setGameAnalysisIssueFilter] =
    useState(ISSUE_FILTER_ALL);
  const [gameAnalysisRetry, setGameAnalysisRetry] = useState(null);
  const [selectedEngineVariantIndex, setSelectedEngineVariantIndex] =
    useState(0);
  const [openMenu, setOpenMenu] = useState(null);
  const [showMoveHistory, setShowMoveHistory] = useState(
    () => persistedAppState?.showMoveHistory ?? true,
  );
  const [showOpeningTreePanel, setShowOpeningTreePanel] = useState(
    () => persistedAppState?.showOpeningTreePanel ?? true,
  );
  const [showOtbPlayerTreePanel, setShowOtbPlayerTreePanel] = useState(
    () => persistedAppState?.showOtbPlayerTreePanel ?? false,
  );
  const [otbPlayerTreeScope, setOtbPlayerTreeScope] = useState(
    () => persistedAppState?.otbPlayerTreeScope ?? null,
  );
  const [otbPlayerTreeColor, setOtbPlayerTreeColor] = useState(
    () => persistedAppState?.otbPlayerTreeColor ?? "white",
  );
  const [otbPlayerTreeExportSettings, setOtbPlayerTreeExportSettings] =
    useState(() =>
      normalizeOtbTreeExportSettings(
        persistedAppState?.otbPlayerTreeExportSettings ??
          DEFAULT_OTB_TREE_EXPORT_SETTINGS,
      ),
    );
  const [showPuzzleTrainingPanel, setShowPuzzleTrainingPanel] = useState(
    () => persistedAppState?.showPuzzleTrainingPanel ?? true,
  );
  const [showReplayTrainingPanel, setShowReplayTrainingPanel] = useState(
    () => persistedAppState?.showReplayTrainingPanel ?? true,
  );
  const [showGuessTrainingPanel, setShowGuessTrainingPanel] = useState(
    () => persistedAppState?.showGuessTrainingPanel ?? true,
  );
  const [showPlayComputerPanel, setShowPlayComputerPanel] = useState(
    () => persistedAppState?.showPlayComputerPanel ?? true,
  );
  const [showEngineWindow, setShowEngineWindow] = useState(
    () => persistedAppState?.showEngineWindow ?? true,
  );
  const [showGameAnalysisPanel, setShowGameAnalysisPanel] = useState(
    () => persistedAppState?.showGameAnalysisPanel ?? false,
  );
  const [showEvaluationBar, setShowEvaluationBar] = useState(
    () => persistedAppState?.showEvaluationBar ?? true,
  );
  const [boardSoundsEnabled, setBoardSoundsEnabled] = useState(
    () => persistedAppState?.boardSoundsEnabled ?? DEFAULT_BOARD_SOUNDS_ENABLED,
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
  const [viewLayout, setViewLayout] = useState(
    () => persistedAppState?.viewLayout ?? DEFAULT_VIEW_LAYOUT,
  );
  const [hoveredOpeningTreeMove, setHoveredOpeningTreeMove] = useState(null);
  const [showShortcutsPopup, setShowShortcutsPopup] = useState(false);
  const [showImportPgnPopup, setShowImportPgnPopup] = useState(false);
  const [showSaveStudyPopup, setShowSaveStudyPopup] = useState(false);
  const [showStudiesPopup, setShowStudiesPopup] = useState(false);
  const [showGuessHistoryBrowserPopup, setShowGuessHistoryBrowserPopup] =
    useState(false);
  const [showCreateCollectionPopup, setShowCreateCollectionPopup] =
    useState(false);
  const [showManageCollectionsPopup, setShowManageCollectionsPopup] =
    useState(false);
  const [showLichessSearchPopup, setShowLichessSearchPopup] = useState(false);
  const [showBackendConnectionPopup, setShowBackendConnectionPopup] =
    useState(false);
  const [showLichessTokenPopup, setShowLichessTokenPopup] = useState(false);
  const [showOtbSearchPopup, setShowOtbSearchPopup] = useState(false);
  const [showThemeSettingsPopup, setShowThemeSettingsPopup] = useState(false);
  const [backendApiBaseUrl, setBackendApiBaseUrl] = useState(() =>
    loadConfiguredApiBaseUrl(),
  );
  const [backendApiToken, setBackendApiToken] = useState(() =>
    loadConfiguredApiToken(),
  );
  const [backendConnectionError, setBackendConnectionError] = useState("");
  const [lichessApiToken, setLichessApiToken] = useState(
    () => persistedAppState?.lichessApiToken ?? "",
  );
  const [boardOrientation, setBoardOrientation] = useState(
    () => persistedAppState?.boardOrientation ?? "white",
  );
  const [themeOverrides, setThemeOverrides] = useState(
    () => persistedAppState?.themeOverrides ?? {},
  );
  const { shortcutConfig, shortcutEntries } = useShortcutConfig();
  const [importPgnValue, setImportPgnValue] = useState("");
  const [importPgnError, setImportPgnError] = useState("");
  const [otbFileImportError, setOtbFileImportError] = useState("");
  const [otbFileImportStatus, setOtbFileImportStatus] = useState("");
  const [importingOtbFile, setImportingOtbFile] = useState(false);
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
    () =>
      persistedAppState?.lichessSearchFilters ?? DEFAULT_LICHESS_SEARCH_FILTERS,
  );
  const [lichessPuzzleFilters, setLichessPuzzleFilters] = useState(
    () =>
      persistedAppState?.lichessPuzzleFilters ?? DEFAULT_LICHESS_PUZZLE_FILTERS,
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
  const [appliedOtbSearchFilters, setAppliedOtbSearchFilters] = useState(
    () => persistedAppState?.otbSearchFilters ?? DEFAULT_OTB_SEARCH_FILTERS,
  );
  const [otbSearchResults, setOtbSearchResults] = useState([]);
  const [otbSearchPage, setOtbSearchPage] = useState(1);
  const [otbSearchPagination, setOtbSearchPagination] = useState(null);
  const [otbSearchError, setOtbSearchError] = useState("");
  const [otbImportError, setOtbImportError] = useState("");
  const [otbSearchLoading, setOtbSearchLoading] = useState(false);
  const [otbImportingGameId, setOtbImportingGameId] = useState("");
  const [hasSearchedOtb, setHasSearchedOtb] = useState(false);
  const [otbSearchNonce, setOtbSearchNonce] = useState(0);
  const [otbOpeningTreeGameSelection, setOtbOpeningTreeGameSelection] =
    useState(null);
  const { boardPanelRef, boardPanelHeight } =
    useBoardPanelSize(showEvaluationBar);
  const [importedPgnData, setImportedPgnData] = useState(
    () => persistedAppState?.importedPgnData ?? null,
  );
  const [positionComments, setPositionComments] = useState(
    () =>
      persistedAppState?.positionComments ??
      seedPositionCommentsFromImportedPgnData(
        persistedAppState?.importedPgnData,
      ),
  );
  const [trainingState, setTrainingState] = useState(
    () => persistedAppState?.trainingState ?? createEmptyTrainingState(),
  );
  const [trainingError, setTrainingError] = useState("");
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [trainingPlayAutoReplyPaused, setTrainingPlayAutoReplyPaused] =
    useState(false);
  const [guessHistoryEntries, setGuessHistoryEntries] = useState([]);
  const [guessHistoryLoading, setGuessHistoryLoading] = useState(false);
  const [guessHistoryError, setGuessHistoryError] = useState("");
  const [activeGuessHistoryEntryId, setActiveGuessHistoryEntryId] =
    useState("");
  const [guessResultBrowse, setGuessResultBrowse] = useState(null);
  const [guessHistoryBrowserGames, setGuessHistoryBrowserGames] = useState([]);
  const [guessHistoryBrowserLoading, setGuessHistoryBrowserLoading] =
    useState(false);
  const [guessHistoryBrowserError, setGuessHistoryBrowserError] = useState("");
  const [loadingGuessHistoryGameKey, setLoadingGuessHistoryGameKey] =
    useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [boardRenderNonce, setBoardRenderNonce] = useState(0);
  const [positionSetupState, setPositionSetupState] = useState(null);
  const [positionSetupError, setPositionSetupError] = useState("");
  const appliedOtbSearchFiltersRef = useRef(appliedOtbSearchFilters);
  const boardRightMouseSelectionRef = useRef(null);
  const guessHistoryRunIdRef = useRef(null);
  const savedGuessHistoryRunIdRef = useRef(null);
  const pendingGuessHistoryEntryIdRef = useRef("");
  const lastAdvancedPuzzleKeyRef = useRef("");
  const recentLichessPuzzleIdsRef = useRef(new Map());
  const gameAnalysisAbortControllerRef = useRef(null);
  const gameAnalysisRunSignatureRef = useRef("");
  const gameAnalysisRetryRequestIdRef = useRef(0);

  const game = useMemo(() => buildGameToNode(variantTree), [variantTree]);
  const fen = useMemo(() => game.fen(), [game]);
  const isPositionSetupMode = positionSetupState !== null;
  const { copyFenToClipboard, copyNotification, setCopyNotification } =
    useFenClipboard({
      fen,
      positionSetupState,
      setPositionSetupError,
    });
  const boardPosition = useMemo(
    () => positionSetupState?.position ?? fen,
    [fen, positionSetupState],
  );

  useEffect(() => {
    setHoveredOpeningTreeMove(null);
  }, [fen]);
  useEffect(() => {
    appliedOtbSearchFiltersRef.current = appliedOtbSearchFilters;
  }, [appliedOtbSearchFilters]);
  const currentMoveHistory = useMemo(
    () => getMoveHistoryForNode(variantTree),
    [variantTree],
  );
  const moveHistoryEntries = useMemo(
    () => getMoveHistoryEntries(variantTree),
    [variantTree],
  );
  const mainlinePositionEntries = useMemo(
    () => getMainlinePositionEntries(variantTree),
    [variantTree],
  );
  const mainlineSignature = useMemo(
    () => createMainlineSignature(mainlinePositionEntries),
    [mainlinePositionEntries],
  );
  const gameAnalysisIsCurrent = useMemo(
    () => isGameAnalysisCurrent(gameAnalysis, mainlinePositionEntries),
    [gameAnalysis, mainlinePositionEntries],
  );
  const currentVariantPly =
    variantTree.nodes[variantTree.currentNodeId]?.ply ?? 0;
  const previousGameAnalysisIssue = useMemo(
    () =>
      gameAnalysisIsCurrent
        ? findAdjacentIssue(
            gameAnalysis?.positions,
            currentVariantPly,
            gameAnalysisIssueFilter,
            -1,
          )
        : null,
    [
      gameAnalysis?.positions,
      currentVariantPly,
      gameAnalysisIssueFilter,
      gameAnalysisIsCurrent,
    ],
  );
  const nextGameAnalysisIssue = useMemo(
    () =>
      gameAnalysisIsCurrent
        ? findAdjacentIssue(
            gameAnalysis?.positions,
            currentVariantPly,
            gameAnalysisIssueFilter,
            1,
          )
        : null,
    [
      gameAnalysis?.positions,
      currentVariantPly,
      gameAnalysisIssueFilter,
      gameAnalysisIsCurrent,
    ],
  );
  const gameAnalysisIssueArrow = useMemo(() => {
    if (!gameAnalysisIsCurrent) {
      return null;
    }

    const currentPosition = gameAnalysis?.positions?.find(
      (position) => position.nodeId === variantTree.currentNodeId,
    );
    const currentMainlineEntry = mainlinePositionEntries.find(
      (entry) => entry.nodeId === variantTree.currentNodeId,
    );

    return buildGameAnalysisIssueArrow(currentPosition, currentMainlineEntry);
  }, [
    gameAnalysis?.positions,
    gameAnalysisIsCurrent,
    mainlinePositionEntries,
    variantTree.currentNodeId,
  ]);
  const currentGameAnalysisRetryTarget = useMemo(
    () =>
      gameAnalysisIsCurrent &&
      gameAnalysis?.status === GAME_ANALYSIS_STATUS_COMPLETE
        ? getGameAnalysisRetryTarget(
            gameAnalysis.positions,
            mainlinePositionEntries,
            variantTree.currentNodeId,
          )
        : null,
    [
      gameAnalysis?.positions,
      gameAnalysis?.status,
      gameAnalysisIsCurrent,
      mainlinePositionEntries,
      variantTree.currentNodeId,
    ],
  );
  const nextGameAnalysisRetryTarget = useMemo(
    () =>
      gameAnalysisRetry?.target && gameAnalysisIsCurrent
        ? getNextGameAnalysisRetryTarget(
            gameAnalysis?.positions,
            mainlinePositionEntries,
            gameAnalysisRetry.target.issuePly,
            gameAnalysisIssueFilter,
          )
        : null,
    [
      gameAnalysis?.positions,
      gameAnalysisIsCurrent,
      gameAnalysisIssueFilter,
      gameAnalysisRetry?.target,
      mainlinePositionEntries,
    ],
  );
  const gameAnalysisRetryArrows = useMemo(
    () =>
      gameAnalysisRetry?.attempt
        ? buildGameAnalysisRetryArrows(
            gameAnalysisRetry.target,
            gameAnalysisRetry.attempt,
          )
        : [],
    [gameAnalysisRetry],
  );

  useEffect(() => {
    if (!gameAnalysisRetry) {
      return;
    }

    if (
      !gameAnalysisIsCurrent ||
      variantTree.currentNodeId !== gameAnalysisRetry.target.sourceNodeId
    ) {
      gameAnalysisRetryRequestIdRef.current += 1;
      setGameAnalysisRetry(null);
    }
  }, [gameAnalysisIsCurrent, gameAnalysisRetry, variantTree.currentNodeId]);
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
  const openingTreeHoverArrow = useMemo(
    () => buildOpeningTreeArrow(hoveredOpeningTreeMove),
    [hoveredOpeningTreeMove],
  );
  const currentNodeBoardAnnotations = useMemo(
    () => getBoardAnnotationsForNode(variantTree),
    [variantTree],
  );
  const boardArrows = useMemo(
    () =>
      mergeBoardArrowCollections(
        showVariantArrows ? variantArrows : [],
        currentNodeBoardAnnotations.arrows,
        openingTreeHoverArrow ? [openingTreeHoverArrow] : [],
      ),
    [
      currentNodeBoardAnnotations.arrows,
      openingTreeHoverArrow,
      showVariantArrows,
      variantArrows,
    ],
  );
  const boardSquareStyles = useMemo(
    () =>
      buildBoardHighlightSquareStyles(currentNodeBoardAnnotations.highlights),
    [currentNodeBoardAnnotations.highlights],
  );
  const boardRenderKey = useMemo(
    () =>
      `${isPositionSetupMode ? "setup" : variantTree.currentNodeId}:${boardRenderNonce}`,
    [boardRenderNonce, isPositionSetupMode, variantTree.currentNodeId],
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
        (importedPgnData.headers.length ||
          importedMainlineComments.length ||
          importedPgnData.additionalComments.length ||
          importedPgnData.variationSnippets.length)
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
        const { moveObjects, sanMoves, displayText } =
          buildEngineVariantPreview(engineAnalysisFen, variation.moves);

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
    () =>
      engineVariants[selectedEngineVariantIndex] ?? engineVariants[0] ?? null,
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
      typeof importedPgnData?.rawPgn === "string" &&
      importedPgnData.rawPgn.trim().length > 0,
    [importedPgnData],
  );
  const normalizedTrainingState = useMemo(
    () => normalizeTrainingState(trainingState),
    [trainingState],
  );
  useEffect(() => {
    lastAdvancedPuzzleKeyRef.current = "";
  }, [normalizedTrainingState.puzzle?.id]);
  const selectedCollection = useMemo(
    () =>
      collections.find(
        (collection) => collection.id === selectedCollectionId,
      ) ?? null,
    [collections, selectedCollectionId],
  );
  const visibleStudies = useMemo(
    () => filterStudiesByCollection(studies, selectedCollectionId, collections),
    [collections, selectedCollectionId, studies],
  );
  const isReplayTrainingActive =
    normalizedTrainingState.mode === TRAINING_MODE_REPLAY_GAME &&
    normalizedTrainingState.status === TRAINING_STATUS_ACTIVE;
  const isReplayTrainingEnded =
    normalizedTrainingState.mode === TRAINING_MODE_REPLAY_GAME &&
    normalizedTrainingState.status === TRAINING_STATUS_ENDED;
  const isPuzzleTrainingActive =
    normalizedTrainingState.mode === TRAINING_MODE_PUZZLE &&
    normalizedTrainingState.status === TRAINING_STATUS_ACTIVE;
  const isGuessTrainingActive =
    normalizedTrainingState.mode === TRAINING_MODE_GUESS_THE_MOVE &&
    normalizedTrainingState.status === TRAINING_STATUS_ACTIVE;
  const isGuessTrainingEnded =
    normalizedTrainingState.mode === TRAINING_MODE_GUESS_THE_MOVE &&
    normalizedTrainingState.status === TRAINING_STATUS_ENDED;
  const isReferenceTrainingMode =
    normalizedTrainingState.mode === TRAINING_MODE_REPLAY_GAME ||
    normalizedTrainingState.mode === TRAINING_MODE_GUESS_THE_MOVE;
  const isTrainingFocusMode =
    (showPuzzleTrainingPanel &&
      normalizedTrainingState.mode === TRAINING_MODE_PUZZLE) ||
    (showReplayTrainingPanel &&
      normalizedTrainingState.mode === TRAINING_MODE_REPLAY_GAME) ||
    (showGuessTrainingPanel &&
      normalizedTrainingState.mode === TRAINING_MODE_GUESS_THE_MOVE);
  const effectiveTrainingFocusMode =
    isTrainingFocusMode && !isPositionSetupMode;
  const boardWorkspaceFocusMode =
    effectiveTrainingFocusMode || isPositionSetupMode;
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
    showGameAnalysisPanel,
    setShowGameAnalysisPanel,
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
  const currentPuzzleMove = useMemo(
    () => getCurrentPuzzleMove(normalizedTrainingState),
    [normalizedTrainingState],
  );
  const currentGuessMove = useMemo(
    () => getCurrentGuessTheMove(normalizedTrainingState),
    [normalizedTrainingState],
  );
  useEffect(() => {
    if (
      normalizedTrainingState.mode !== TRAINING_MODE_PUZZLE ||
      !normalizedTrainingState.puzzle?.id
    ) {
      return;
    }

    setBoardOrientation(
      normalizedTrainingState.playerSide === TRAINING_SIDE_BLACK
        ? "black"
        : "white",
    );
  }, [
    normalizedTrainingState.mode,
    normalizedTrainingState.playerSide,
    normalizedTrainingState.puzzle?.id,
  ]);
  const trainingNavigationCheckpoints = useMemo(() => {
    if (!isReferenceTrainingMode) {
      return [];
    }

    const checkpoints = normalizedTrainingState.referenceMoves.reduce(
      (result, move, index) => {
        if (move.side === normalizedTrainingState.playerSide) {
          result.push(index);
        }

        return result;
      },
      [],
    );

    checkpoints.push(normalizedTrainingState.referenceMoves.length);

    return [...new Set(checkpoints)];
  }, [
    isReferenceTrainingMode,
    normalizedTrainingState.playerSide,
    normalizedTrainingState.referenceMoves,
  ]);
  const pendingTrainingAttempts = normalizedTrainingState.pendingAttempts;
  const lastCompletedTrainingAttempts =
    normalizedTrainingState.lastCompletedAttempts;
  const lastCompletedIncorrectTrainingAttempts = useMemo(
    () =>
      lastCompletedTrainingAttempts.filter(
        (attempt) => attempt.outcome !== REPLAY_RESULT_MATCH,
      ),
    [lastCompletedTrainingAttempts],
  );
  const lastCompletedExpectedMove =
    normalizedTrainingState.lastCompletedExpectedMove;
  const computerPlayConfig = normalizedTrainingState.computerPlay;
  const isStandaloneComputerPlay =
    normalizedTrainingState.mode === TRAINING_MODE_PLAY_COMPUTER;
  const isStandaloneComputerPlayActive =
    isStandaloneComputerPlay &&
    normalizedTrainingState.status === TRAINING_STATUS_ACTIVE;
  const isStandaloneComputerPlayCompleted =
    isStandaloneComputerPlay &&
    normalizedTrainingState.status === TRAINING_STATUS_COMPLETED;
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
  const guessTheMoveSummary = useMemo(
    () =>
      summarizeGuessTheMoveAttempts(
        normalizedTrainingState.referenceMoves,
        normalizedTrainingState.attempts,
        normalizedTrainingState.playerSide,
      ),
    [normalizedTrainingState],
  );
  const activeGuessHistoryEntry = useMemo(
    () =>
      guessHistoryEntries.find(
        (entry) => entry.id === activeGuessHistoryEntryId,
      ) ?? null,
    [activeGuessHistoryEntryId, guessHistoryEntries],
  );

  const isViewingHistoricalGuessResult =
    !isTrainingPlayActive && !!activeGuessHistoryEntry;
  const canBrowseGuessResults =
    !isTrainingPlayActive &&
    (isViewingHistoricalGuessResult ||
      (normalizedTrainingState.mode === TRAINING_MODE_GUESS_THE_MOVE &&
        (normalizedTrainingState.status === TRAINING_STATUS_COMPLETED ||
          normalizedTrainingState.status === TRAINING_STATUS_ENDED)));
  const guessBrowseSourceKey = isViewingHistoricalGuessResult
    ? `entry:${activeGuessHistoryEntry.id}`
    : "current";
  const displayedGuessSummary = useMemo(
    () =>
      isViewingHistoricalGuessResult
        ? (activeGuessHistoryEntry?.summary ?? guessTheMoveSummary)
        : guessTheMoveSummary,
    [
      activeGuessHistoryEntry?.summary,
      guessTheMoveSummary,
      isViewingHistoricalGuessResult,
    ],
  );
  const guessBrowseMoveHistory = Array.isArray(
    displayedGuessSummary?.moveHistory,
  )
    ? displayedGuessSummary.moveHistory
    : [];
  const guessBrowseMoveCount = guessBrowseMoveHistory.length;
  const guessBrowseReferenceMoves = useMemo(
    () =>
      isViewingHistoricalGuessResult
        ? (activeGuessHistoryEntry?.referenceMoves ?? [])
        : normalizedTrainingState.referenceMoves,
    [
      activeGuessHistoryEntry?.referenceMoves,
      isViewingHistoricalGuessResult,
      normalizedTrainingState.referenceMoves,
    ],
  );
  const rawGuessBrowseIndex =
    guessResultBrowse?.sourceKey === guessBrowseSourceKey
      ? guessResultBrowse.index
      : null;
  const boundedGuessBrowseIndex =
    typeof rawGuessBrowseIndex === "number" && guessBrowseMoveCount
      ? Math.max(0, Math.min(rawGuessBrowseIndex, guessBrowseMoveCount - 1))
      : null;
  const guessBrowseMoveEntry =
    boundedGuessBrowseIndex === null
      ? null
      : (guessBrowseMoveHistory[boundedGuessBrowseIndex] ?? null);
  const isGuessResultBrowsing =
    canBrowseGuessResults && boundedGuessBrowseIndex !== null;

  useEffect(() => {
    if (
      guessResultBrowse?.sourceKey &&
      guessResultBrowse.sourceKey !== guessBrowseSourceKey
    ) {
      setGuessResultBrowse(null);
    }
  }, [guessBrowseSourceKey, guessResultBrowse?.sourceKey]);

  useEffect(() => {
    if (!canBrowseGuessResults) {
      setGuessResultBrowse(null);
      return;
    }

    if (guessBrowseMoveCount === 0) {
      setGuessResultBrowse(null);
      return;
    }

    if (
      guessResultBrowse?.sourceKey === guessBrowseSourceKey &&
      typeof boundedGuessBrowseIndex === "number" &&
      guessResultBrowse.index !== boundedGuessBrowseIndex
    ) {
      setGuessResultBrowse({
        sourceKey: guessBrowseSourceKey,
        index: boundedGuessBrowseIndex,
      });
    }
  }, [
    boundedGuessBrowseIndex,
    canBrowseGuessResults,
    guessBrowseMoveCount,
    guessBrowseSourceKey,
    guessResultBrowse,
  ]);

  useEffect(() => {
    if (isTrainingPlayActive) {
      setGuessResultBrowse(null);
    }
  }, [isTrainingPlayActive]);

  const selectGuessBrowseIndex = useCallback(
    (nextIndex) => {
      if (!canBrowseGuessResults || !Number.isInteger(nextIndex)) {
        return;
      }

      if (!guessBrowseMoveCount) {
        return;
      }

      const boundedIndex = Math.max(
        0,
        Math.min(nextIndex, guessBrowseMoveCount - 1),
      );
      setGuessResultBrowse({
        sourceKey: guessBrowseSourceKey,
        index: boundedIndex,
      });
    },
    [canBrowseGuessResults, guessBrowseMoveCount, guessBrowseSourceKey],
  );
  const stopGuessBrowse = useCallback(() => {
    setGuessResultBrowse(null);
  }, []);
  const goGuessBrowseStart = useCallback(() => {
    selectGuessBrowseIndex(0);
  }, [selectGuessBrowseIndex]);
  const goGuessBrowseEnd = useCallback(() => {
    selectGuessBrowseIndex(Math.max(0, guessBrowseMoveCount - 1));
  }, [guessBrowseMoveCount, selectGuessBrowseIndex]);
  const goGuessBrowsePrev = useCallback(() => {
    if (typeof boundedGuessBrowseIndex !== "number") {
      return;
    }

    selectGuessBrowseIndex(boundedGuessBrowseIndex - 1);
  }, [boundedGuessBrowseIndex, selectGuessBrowseIndex]);
  const goGuessBrowseNext = useCallback(() => {
    if (typeof boundedGuessBrowseIndex !== "number") {
      return;
    }

    selectGuessBrowseIndex(boundedGuessBrowseIndex + 1);
  }, [boundedGuessBrowseIndex, selectGuessBrowseIndex]);

  const guessBrowseFenBefore = useMemo(() => {
    if (!isGuessResultBrowsing) {
      return null;
    }

    const ply = guessBrowseMoveEntry?.ply;

    if (!Number.isInteger(ply)) {
      return null;
    }

    return (
      guessBrowseReferenceMoves.find((move) => move.ply === ply)?.fenBefore ??
      null
    );
  }, [
    guessBrowseMoveEntry?.ply,
    guessBrowseReferenceMoves,
    isGuessResultBrowsing,
  ]);

  const guessBrowseArrows = useMemo(() => {
    if (!isGuessResultBrowsing) {
      return [];
    }
    return buildGuessReviewArrows(
      guessBrowseMoveEntry,
      guessBrowseReferenceMoves,
    );
  }, [guessBrowseMoveEntry, guessBrowseReferenceMoves, isGuessResultBrowsing]);
  const resolvedTheme = useMemo(
    () => resolveTheme(themeOverrides),
    [themeOverrides],
  );
  const themeCssVariables = useMemo(
    () => createThemeCssVariables(themeOverrides),
    [themeOverrides],
  );

  const effectiveBoardArrows = useMemo(
    () =>
      mergeBoardArrowCollections(
        boardArrows,
        !isGuessResultBrowsing && gameAnalysisIssueArrow
          ? [gameAnalysisIssueArrow]
          : [],
        !isGuessResultBrowsing ? gameAnalysisRetryArrows : [],
        guessBrowseArrows,
      ),
    [
      boardArrows,
      gameAnalysisIssueArrow,
      gameAnalysisRetryArrows,
      guessBrowseArrows,
      isGuessResultBrowsing,
    ],
  );

  useEffect(() => {
    const rootStyle = document.documentElement.style;

    Object.entries(themeCssVariables).forEach(
      ([propertyName, propertyValue]) => {
        rootStyle.setProperty(propertyName, propertyValue);
      },
    );
  }, [themeCssVariables]);

  const effectiveBoardPosition = useMemo(
    () =>
      isPositionSetupMode
        ? boardPosition
        : (guessBrowseFenBefore ?? boardPosition),
    [boardPosition, guessBrowseFenBefore, isPositionSetupMode],
  );

  const currentReplayMoveNumber = useMemo(
    () =>
      currentReplayMove
        ? normalizedTrainingState.referenceMoves
            .slice(0, normalizedTrainingState.progressPly + 1)
            .filter((move) => move.side === normalizedTrainingState.playerSide)
            .length
        : replaySummary.totalMoves,
    [currentReplayMove, normalizedTrainingState, replaySummary.totalMoves],
  );
  const currentGuessMoveNumber = useMemo(
    () =>
      currentGuessMove
        ? normalizedTrainingState.referenceMoves
            .slice(0, normalizedTrainingState.progressPly + 1)
            .filter((move) => move.side === normalizedTrainingState.playerSide)
            .length
        : guessTheMoveSummary.totalMoves,
    [currentGuessMove, guessTheMoveSummary.totalMoves, normalizedTrainingState],
  );
  const {
    resetTrainingSession,
    startCurrentGameAnalysisRetry,
    retryCurrentGameAnalysisMove,
    restartGameAnalysisRetryPreparation,
    exitGameAnalysisRetry,
    goToNextGameAnalysisRetry,
    playBoardSoundForVariantTree,
    exploreGameAnalysisRetryAgainstComputer,
    exitTrainingPlayMode,
    startStandaloneComputerPlay,
    restartStandaloneComputerPlay,
    exitStandaloneComputerPlay,
    startTrainingPlayMode,
    navigateReplayTrainingToProgress,
    setTrainingPlayerSide,
    buildResolvedReplayAttempt,
    completeReplayMove,
    addPendingReplayAttempt,
    startReplayTraining,
    endReplayTraining,
    startGuessTraining,
    endGuessTraining,
    loadPuzzleTraining,
    restartPuzzleTraining,
    applyImportedPgn,
    loadGuessHistoryGame,
  } = useTrainingActions({
    GAME_ANALYSIS_RETRY_STATUS_PREPARING,
    GAME_ANALYSIS_RETRY_STATUS_READY,
    MAX_RECENT_LICHESS_PUZZLE_IDS,
    PUZZLE_FETCH_RETRY_ATTEMPTS,
    PUZZLE_FETCH_RETRY_DELAY_MS,
    TRAINING_COMPUTER_PLAY_SOURCE_CURRENT,
    TRAINING_COMPUTER_PLAY_SOURCE_INITIAL,
    TRAINING_MODE_GUESS_THE_MOVE,
    TRAINING_MODE_PLAY_COMPUTER,
    TRAINING_MODE_PUZZLE,
    TRAINING_MODE_REPLAY_GAME,
    TRAINING_PLAY_STATUS_ACTIVE,
    TRAINING_SIDE_BLACK,
    TRAINING_SIDE_WHITE,
    TRAINING_STATUS_ACTIVE,
    TRAINING_STATUS_COMPLETED,
    TRAINING_STATUS_ENDED,
    activeTrainingPlaySession,
    applyMoveToVariantTree,
    boardSoundsEnabled,
    buildGameToNode,
    buildLichessPuzzleAdvanceRequest,
    buildLichessPuzzleQuery,
    buildReplayAttempt,
    computerPlayConfig,
    createComputerPlayTrainingState,
    createEmptyTrainingState,
    createEmptyVariantTree,
    createGuessHistoryEntryPayload,
    createGuessTheMoveTrainingState,
    createLichessPuzzleFilterKey,
    createPuzzleTrainingState,
    createReplayTrainingState,
    currentGameAnalysisRetryTarget,
    engineSearchDepth,
    fen,
    fetchJson,
    game,
    gameAnalysisAbortControllerRef,
    gameAnalysisIsCurrent,
    gameAnalysisRetry,
    gameAnalysisRetryRequestIdRef,
    getBoardSoundEvent,
    getLastMoveFromGame,
    getPuzzleTerminalOutcome,
    goToMainlineNodeInVariantTree,
    goToStartInVariantTree,
    guessHistoryRunIdRef,
    hasReplaySource,
    hideTrainingPreview,
    importedPgnData,
    isEngineOpponentSessionActive,
    isEngineOpponentUserTurn,
    isGuessTrainingActive,
    isReplayTrainingActive,
    isStandaloneComputerPlay,
    isStandaloneComputerPlayActive,
    isTrainingPlayActive,
    lastAdvancedPuzzleKeyRef,
    lichessApiToken,
    lichessPuzzleFilters,
    nextGameAnalysisRetryTarget,
    normalizeGuessHistoryEntries,
    normalizeTrainingState,
    normalizeVariantTree,
    normalizedTrainingState,
    parseAnnotatedPgn,
    parseUciMove,
    pendingGuessHistoryEntryIdRef,
    recentLichessPuzzleIdsRef,
    redoInVariantTree,
    savedGuessHistoryRunIdRef,
    seedPositionCommentsFromImportedPgnData,
    setActiveGuessHistoryEntryId,
    setBoardOrientation,
    setCommentDraft,
    setCopyNotification,
    setEditingCommentId,
    setEngineResult,
    setEvaluationResult,
    setGameAnalysis,
    setGameAnalysisRetry,
    setGameAnalysisRetryBestMove,
    setGuessHistoryBrowserError,
    setGuessHistoryEntries,
    setGuessHistoryError,
    setGuessHistoryLoading,
    setImportedPgnData,
    setLoadingGuessHistoryGameKey,
    setPositionComments,
    setPositionSetupError,
    setPositionSetupState,
    setShowGuessHistoryBrowserPopup,
    setShowGuessTrainingPanel,
    setShowPlayComputerPanel,
    setShowPuzzleTrainingPanel,
    setShowReplayTrainingPanel,
    setTrainingError,
    setTrainingLoading,
    setTrainingPlayAutoReplyPaused,
    setTrainingState,
    setVariantTree,
    trainingError,
    trainingLoading,
    trainingPlayAutoReplyPaused,
    trainingRequestIdRef,
    variantTree,
    wait,
  });

  const currentMoveIndex = useMemo(
    () => moveHistoryEntries.findIndex((entry) => entry.isSelected),
    [moveHistoryEntries],
  );
  const moveHistoryItems = useMemo(
    () =>
      addGameAnalysisToMoveHistoryEntries(
        addCommentsToMoveHistoryEntries(moveHistoryEntries, positionComments),
        gameAnalysisIsCurrent ? gameAnalysis?.positions : [],
      ),
    [
      gameAnalysis?.positions,
      gameAnalysisIsCurrent,
      moveHistoryEntries,
      positionComments,
    ],
  );
  const getMoveHistoryVariantOptions = useCallback(
    (nodeId) => getVariantLinesForMoveHistoryNode(variantTree, nodeId),
    [variantTree],
  );
  const handleOpeningTreeHoverMove = useCallback((move) => {
    const parsedMove = parseUciMove(move?.uci);
    setHoveredOpeningTreeMove(parsedMove);
  }, []);

  const tryExecuteMove = createMoveExecutor({
    Chess,
    GAME_ANALYSIS_RETRY_STATUS_EVALUATING,
    GAME_ANALYSIS_RETRY_STATUS_FEEDBACK,
    GAME_ANALYSIS_RETRY_STATUS_READY,
    TRAINING_COMPLETION_MATCH,
    TRAINING_COMPLETION_REVEALED,
    TRAINING_MODE_PUZZLE,
    TRAINING_STATUS_ACTIVE,
    TRAINING_STATUS_ENDED,
    addPendingReplayAttempt,
    applyMoveToVariantTree,
    buildGameAnalysisRetryAttempt,
    buildResolvedReplayAttempt,
    completeReplayMove,
    currentGuessMove,
    currentPuzzleMove,
    currentReplayMove,
    engineSearchDepth,
    fen,
    fetchJson,
    formatMoveAsUci,
    gameAnalysisRetry,
    gameAnalysisRetryRequestIdRef,
    getGameAnalysisRetryFeedback,
    hideTrainingPreview,
    isEngineOpponentUserTurn,
    isGuessTrainingActive,
    isPuzzleTrainingActive,
    isReplayTrainingActive,
    isStandaloneComputerPlayActive,
    isStandaloneComputerPlayCompleted,
    isTrainingPlayActive,
    normalizeTrainingState,
    playBoardSoundForVariantTree,
    resetTrainingSession,
    setEngineResult,
    setEvaluationResult,
    setGameAnalysisRetry,
    setHoveredOpeningTreeMove,
    setTrainingError,
    setTrainingLoading,
    setTrainingPlayAutoReplyPaused,
    setTrainingState,
    setVariantTree,
    trainingLoading,
    trainingRequestIdRef,
    variantTree,
  });

  function handleOpeningTreeSelectMove(move) {
    if (isPositionSetupMode) {
      return false;
    }

    const parsedMove = parseUciMove(move?.uci);

    if (!parsedMove) {
      return false;
    }

    return tryExecuteMove(parsedMove);
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

    if (isPositionSetupMode) {
      if (positionSetupState?.selectedTool !== POSITION_SETUP_MOVE_TOOL) {
        return false;
      }

      setPositionSetupState((currentValue) =>
        currentValue
          ? {
              ...currentValue,
              position: movePositionSetupPiece(
                currentValue.position,
                sourceSquare,
                targetSquare,
              ),
            }
          : currentValue,
      );
      setPositionSetupError("");
      return true;
    }

    return tryExecuteMove(
      {
        from: sourceSquare,
        to: targetSquare,
      },
      { defaultPromotion: true },
    );
  }

  const {
    undoMove,
    redoMove,
    goToStart,
    goToEnd,
    jumpToMainVariant,
    jumpBackToSideline,
    goToMoveHistoryNode,
    revertMoveHistoryToNode,
    selectVariant,
    promoteVariant,
    demoteVariant,
    removeVariant,
    retryReplayMove,
    revealReplayMove,
    startAddingComment,
    startEditingComment,
    cancelCommentEdit,
    removeComment,
    reorderComments,
    handleBoardSquareMouseDown,
    handleBoardSquareMouseUp,
    openPositionSetup,
    cancelPositionSetup,
    selectPositionSetupTool,
    togglePositionSetupCastlingRight,
    selectPositionSetupActiveColor,
    resetPositionSetup,
    resetPositionSetupToStartPosition,
    clearPositionSetupBoard,
    handlePositionSetupSquareClick,
    finishPositionSetup,
    saveComment,
  } = useWorkspaceActions({
    DEFAULT_POSITION_SETUP_CASTLING_RIGHTS,
    POSITION_SETUP_CLEAR_TOOL,
    TRAINING_COMPLETION_REVEALED,
    applyPositionSetupTool,
    boardRightMouseSelectionRef,
    buildPositionCommentContext,
    buildPositionSetupFen,
    canJumpBackToSideline,
    canJumpToMainVariant,
    canRedo,
    canUndo,
    commentDraft,
    completeReplayMove,
    createEmptyVariantTree,
    createPositionSetupDraft,
    createUserPositionComment,
    currentMoveHistory,
    currentPositionComments,
    currentReplayMove,
    demoteVariantLine,
    editingCommentId,
    fen,
    gameAnalysisAbortControllerRef,
    getBoardAnnotationColor,
    goToEndInVariantTree,
    goToNodeInVariantTree,
    goToStartInVariantTree,
    hideTrainingPreview,
    isPositionSetupMode,
    isReferenceTrainingMode,
    isTrainingPlayActive,
    jumpBackToSidelineInTree,
    jumpToMainVariantInTree,
    navigateReplayTrainingToProgress,
    normalizedTrainingState,
    pendingTrainingAttempts,
    positionSetupState,
    promoteVariantLine,
    redoInVariantTree,
    removePositionCommentEntry,
    removeVariantLine,
    reorderPositionCommentEntries,
    resetTrainingSession,
    savePositionCommentEntry,
    selectVariantLine,
    setBoardRenderNonce,
    setCommentDraft,
    setEditingCommentId,
    setEngineResult,
    setEvaluationResult,
    setGameAnalysis,
    setGuessHistoryEntries,
    setGuessHistoryError,
    setImportedPgnData,
    setPositionComments,
    setPositionSetupError,
    setPositionSetupState,
    setShowComments,
    setTrainingError,
    setTrainingLoading,
    setTrainingPlayAutoReplyPaused,
    setVariantTree,
    toggleBoardArrowAnnotation,
    toggleBoardHighlightAnnotation,
    trainingNavigationCheckpoints,
    trainingRequestIdRef,
    truncateLineAfterNode,
    undoInVariantTree,
  });

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
    setOtbFileImportError("");
    setOtbFileImportStatus("");
    setShowImportPgnPopup(true);
  }, [game, importedPgnData]);

  const closeImportPgnPopup = useCallback(() => {
    setShowImportPgnPopup(false);
    setImportPgnValue("");
    setImportPgnError("");
    setOtbFileImportError("");
    setOtbFileImportStatus("");
  }, []);

  const resetGame = useCallback(() => {
    resetTrainingSession();
    gameAnalysisAbortControllerRef.current?.abort();
    gameAnalysisAbortControllerRef.current = null;
    setVariantTree(createEmptyVariantTree());
    setGameAnalysis(null);
    setEngineResult(null);
    setEvaluationResult(null);
    setImportedPgnData(null);
    setPositionComments([]);
    setEditingCommentId(null);
    setCommentDraft("");
    setPositionSetupState(null);
    setPositionSetupError("");
  }, [resetTrainingSession]);

  const {
    openSaveStudyPopup,
    closeSaveStudyPopup,
    openCreateCollectionPopup,
    closeCreateCollectionPopup,
    openManageCollectionsPopup,
    closeManageCollectionsPopup,
    closeStudiesPopup,
    loadCollections,
    loadStudies,
    openStudiesPopup,
    loadGuessHistoryGames,
    openGuessHistoryBrowser,
    closeGuessHistoryBrowser,
    saveCurrentStudy,
    loadStudy,
    removeStudy,
    createCollection,
    removeCollection,
    toggleStudyCollection,
  } = useStudyLibraryActions({
    GAME_ANALYSIS_STATUS_COMPLETE,
    buildStudyTitle,
    createCollectionPayload,
    createCollectionTitle,
    createStudySavePayload,
    fetchJson,
    gameAnalysis,
    gameAnalysisAbortControllerRef,
    gameAnalysisIsCurrent,
    importedPgnData,
    managingStudy,
    normalizeCollection,
    normalizeGuessHistoryBrowseEntries,
    normalizeStudy,
    normalizeStudySummary,
    positionComments,
    resetTrainingSession,
    saveStudyTitle,
    setCollections,
    setCollectionsLoading,
    setCommentDraft,
    setCopyNotification,
    setCreateCollectionError,
    setCreateCollectionTitle,
    setCreatingCollection,
    setDeletingCollectionId,
    setDeletingStudyId,
    setEditingCommentId,
    setEngineResult,
    setEvaluationResult,
    setGameAnalysis,
    setGuessHistoryBrowserError,
    setGuessHistoryBrowserGames,
    setGuessHistoryBrowserLoading,
    setImportedPgnData,
    setLoadingGuessHistoryGameKey,
    setLoadingStudyId,
    setManagingStudy,
    setPositionComments,
    setPositionSetupError,
    setPositionSetupState,
    setSaveStudyError,
    setSaveStudyTitle,
    setSavingStudy,
    setSelectedCollectionId,
    setShowComments,
    setShowCreateCollectionPopup,
    setShowGuessHistoryBrowserPopup,
    setShowImportedPgn,
    setShowManageCollectionsPopup,
    setShowMoveHistory,
    setShowSaveStudyPopup,
    setShowStudiesPopup,
    setShowVariants,
    setStudies,
    setStudiesError,
    setStudiesLoading,
    setUpdatingCollectionId,
    setVariantTree,
    showStudiesPopup,
    variantTree,
  });

  const {
    openLichessSearchPopup,
    closeLichessSearchPopup,
    openLichessTokenPopup,
    openBackendConnectionPopup,
    openThemeSettingsPopup,
    closeThemeSettingsPopup,
    closeBackendConnectionPopup,
    saveBackendConnection,
    closeLichessTokenPopup,
    saveLichessToken,
    openOtbSearchPopup,
    closeOtbSearchPopup,
    importPgn,
    importOtbPgnFile,
    searchLichessGames,
    importLichessGame,
    searchOtbGames,
    changeOtbPage,
    changeOtbPageSize,
    importOtbGame,
    importOtbOpeningTreeGame,
    exploreOtbPlayerOpeningTree,
  } = useGameSourceActions({
    appliedOtbSearchFilters,
    applyImportedPgn,
    buildLichessSearchQuery,
    buildOtbImportPath,
    buildOtbSearchQuery,
    closeImportPgnPopup,
    fetchJson,
    formatOtbImportSummary,
    importPgnValue,
    lichessSearchFilters,
    loadConfiguredApiBaseUrl,
    normalizeApiBaseUrl,
    normalizeOtbTreeScope,
    otbSearchFilters,
    resetGame,
    saveConfiguredApiBaseUrl,
    saveConfiguredApiToken,
    saveUseLocalApiBaseUrl,
    setAppliedOtbSearchFilters,
    setBackendApiBaseUrl,
    setBackendApiToken,
    setBackendConnectionError,
    setHasSearchedLichess,
    setHasSearchedOtb,
    setImportPgnError,
    setImportingOtbFile,
    setLichessApiToken,
    setLichessImportError,
    setLichessImportingGameId,
    setLichessSearchError,
    setLichessSearchLoading,
    setLichessSearchResults,
    setOtbFileImportError,
    setOtbFileImportStatus,
    setOtbImportError,
    setOtbImportingGameId,
    setOtbOpeningTreeGameSelection,
    setOtbPlayerTreeColor,
    setOtbPlayerTreeScope,
    setOtbSearchError,
    setOtbSearchFilters,
    setOtbSearchNonce,
    setOtbSearchPage,
    setOtbSearchPagination,
    setOtbSearchResults,
    setShowBackendConnectionPopup,
    setShowComments,
    setShowImportedPgn,
    setShowLichessSearchPopup,
    setShowLichessTokenPopup,
    setShowOtbPlayerTreePanel,
    setShowOtbSearchPopup,
    setShowThemeSettingsPopup,
    validateOtbImportFile,
  });

  useEffect(() => {
    if (!hasSearchedOtb) {
      return undefined;
    }

    let cancelled = false;

    async function runOtbSearch() {
      const { query, error } = buildOtbSearchQuery(
        appliedOtbSearchFiltersRef.current,
        otbSearchPage,
      );

      if (error) {
        if (!cancelled) {
          setOtbSearchError(error);
          setOtbImportError("");
          setOtbSearchResults([]);
          setOtbSearchPagination(null);
          setHasSearchedOtb(false);
        }
        return;
      }

      setOtbSearchLoading(true);
      setOtbSearchError("");
      setOtbImportError("");

      try {
        const data = await fetchJson(`/api/otb/games?${query}`);

        if (cancelled) {
          return;
        }

        const nextResults = Array.isArray(data.games) ? data.games : [];
        const nextPagination =
          data?.pagination && typeof data.pagination === "object"
            ? data.pagination
            : data?.search && typeof data.search === "object"
              ? {
                  page:
                    Number.isInteger(data.search.page) && data.search.page > 0
                      ? data.search.page
                      : otbSearchPage,
                  pageSize:
                    Number.isInteger(data.search.pageSize) &&
                    data.search.pageSize > 0
                      ? data.search.pageSize
                      : Number(appliedOtbSearchFiltersRef.current.pageSize) ||
                        25,
                  totalResults: Number.isInteger(data.search.totalResults)
                    ? data.search.totalResults
                    : nextResults.length,
                  totalPages: Number.isInteger(data.search.totalPages)
                    ? data.search.totalPages
                    : 1,
                  hasPreviousPage:
                    Number.isInteger(data.search.page) && data.search.page > 1,
                  hasNextPage:
                    Number.isInteger(data.search.page) &&
                    Number.isInteger(data.search.totalPages) &&
                    data.search.page < data.search.totalPages,
                }
              : {
                  page: otbSearchPage,
                  pageSize:
                    Number(appliedOtbSearchFiltersRef.current.pageSize) || 25,
                  totalResults: nextResults.length,
                  totalPages: nextResults.length > 0 ? 1 : 1,
                  hasPreviousPage: false,
                  hasNextPage: false,
                };

        setOtbSearchResults(nextResults);
        setOtbSearchPagination(nextPagination);

        if (
          Number.isInteger(nextPagination.page) &&
          nextPagination.page !== otbSearchPage
        ) {
          setOtbSearchPage(nextPagination.page);
        }
      } catch (error) {
        if (!cancelled) {
          setOtbSearchResults([]);
          setOtbSearchPagination(null);
          setOtbSearchError(error.message);
        }
      } finally {
        if (!cancelled) {
          setOtbSearchLoading(false);
        }
      }
    }

    void runOtbSearch();

    return () => {
      cancelled = true;
    };
  }, [
    hasSearchedOtb,
    otbSearchNonce,
    otbSearchPage,
    otbSearchFilters.pageSize,
  ]);

  useEffect(() => {
    setEditingCommentId(null);
    setCommentDraft("");
  }, [fen]);

  useAppPersistence(
    {
      variantTree,
      engineSearchDepth,
      lichessApiToken,
      boardOrientation,
      showMoveHistory,
      showOpeningTreePanel,
      showOtbPlayerTreePanel,
      otbPlayerTreeScope,
      otbPlayerTreeColor,
      otbPlayerTreeExportSettings,
      showPuzzleTrainingPanel,
      showReplayTrainingPanel,
      showGuessTrainingPanel,
      showPlayComputerPanel,
      showEngineWindow,
      showGameAnalysisPanel,
      showEvaluationBar,
      boardSoundsEnabled,
      showComments,
      showImportedPgn,
      showVariants,
      showVariantArrows,
      viewLayout,
      themeOverrides,
      lichessSearchFilters,
      lichessPuzzleFilters,
      otbSearchFilters,
      importedPgnData,
      positionComments,
      trainingState,
      isTrainingFocusMode,
    },
    trainingFocusRestoreRef,
  );

  useEffect(() => {
    if (isPositionSetupMode) {
      setEvaluationResult(null);
      return undefined;
    }

    let ignore = false;
    setEvaluationResult(null);
    const timeoutId = window.setTimeout(async () => {
      try {
        const data = await fetchJson("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fen,
            depth: engineSearchDepth,
            multipv: 1,
          }),
        });
        if (!ignore) setEvaluationResult(data);
      } catch {
        if (!ignore) setEvaluationResult(null);
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [engineSearchDepth, fen, isPositionSetupMode]);

  useEffect(
    () => () => {
      gameAnalysisAbortControllerRef.current?.abort();
      gameAnalysisAbortControllerRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (
      gameAnalysis?.status === GAME_ANALYSIS_STATUS_RUNNING &&
      gameAnalysisRunSignatureRef.current &&
      gameAnalysisRunSignatureRef.current !== mainlineSignature
    ) {
      gameAnalysisAbortControllerRef.current?.abort();
    }
  }, [gameAnalysis?.status, mainlineSignature]);

  const {
    cancelGameAnalysis,
    goToGameAnalysisPosition,
    analyzeWholeGame,
    goToPreviousGameAnalysisIssue,
    goToNextGameAnalysisIssue,
    analyzePosition,
    addSelectedEngineVariantToTree,
  } = useGameAnalysisActions({
    GAME_ANALYSIS_STATUS_CANCELLED,
    GAME_ANALYSIS_STATUS_ERROR,
    GAME_ANALYSIS_STATUS_RUNNING,
    GAME_ANALYSIS_VERSION,
    appendGameAnalysisPosition,
    buildGameAnalysisRequest,
    createCompletedGameAnalysis,
    createMainlineSignature,
    engineSearchDepth,
    fen,
    fetchJson,
    gameAnalysisAbortControllerRef,
    gameAnalysisRetryRequestIdRef,
    gameAnalysisRunSignatureRef,
    goToMainlineNodeInVariantTree,
    importMoveSequenceToVariantTree,
    isPositionSetupMode,
    mainlinePositionEntries,
    nextGameAnalysisIssue,
    previousGameAnalysisIssue,
    resetTrainingSession,
    selectedEngineVariant,
    setEngineResult,
    setEvaluationResult,
    setGameAnalysis,
    setGameAnalysisRetry,
    setLoading,
    setPositionSetupError,
    setSelectedEngineVariantIndex,
    setShowEngineWindow,
    setShowGameAnalysisPanel,
    setShowMoveHistory,
    setShowVariants,
    setVariantTree,
    streamNdjson,
    variantTree,
  });

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

  const toggleOtbPlayerTreePanel = useCallback(() => {
    if (!otbPlayerTreeScope?.player) {
      openOtbSearchPopup();
      return;
    }

    setShowOtbPlayerTreePanel((currentValue) => !currentValue);
  }, [openOtbSearchPopup, otbPlayerTreeScope]);

  const closeOtbPlayerTreePanel = useCallback(() => {
    setShowOtbPlayerTreePanel(false);
  }, []);

  const toggleReplayTrainingPanel = useCallback(() => {
    setShowReplayTrainingPanel((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        setShowPuzzleTrainingPanel(false);
        setShowGuessTrainingPanel(false);
      }

      return nextValue;
    });
  }, []);

  const closeReplayTrainingPanel = useCallback(() => {
    setShowReplayTrainingPanel(false);
  }, []);

  const togglePuzzleTrainingPanel = useCallback(() => {
    setShowPuzzleTrainingPanel((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        setShowReplayTrainingPanel(false);
        setShowGuessTrainingPanel(false);
      }

      return nextValue;
    });
  }, []);

  const closePuzzleTrainingPanel = useCallback(() => {
    setShowPuzzleTrainingPanel(false);
  }, []);

  const toggleGuessTrainingPanel = useCallback(() => {
    setShowGuessTrainingPanel((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        setShowPuzzleTrainingPanel(false);
        setShowReplayTrainingPanel(false);
      }

      return nextValue;
    });
  }, []);

  const closeGuessTrainingPanel = useCallback(() => {
    setShowGuessTrainingPanel(false);
  }, []);

  const viewGuessHistoryEntry = useCallback((entryId) => {
    setActiveGuessHistoryEntryId(entryId);
  }, []);

  const closeGuessHistoryView = useCallback(() => {
    setActiveGuessHistoryEntryId("");
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

  const toggleGameAnalysisPanel = useCallback(() => {
    if (showGameAnalysisPanel && gameAnalysisRetry) {
      exitGameAnalysisRetry();
    }
    setShowGameAnalysisPanel((currentValue) => !currentValue);
  }, [exitGameAnalysisRetry, gameAnalysisRetry, showGameAnalysisPanel]);

  const closeGameAnalysisPanel = useCallback(() => {
    if (gameAnalysisRetry) {
      exitGameAnalysisRetry();
    }
    setShowGameAnalysisPanel(false);
  }, [exitGameAnalysisRetry, gameAnalysisRetry]);

  const toggleEvaluationBar = useCallback(() => {
    setShowEvaluationBar((currentValue) => !currentValue);
  }, []);

  const toggleBoardSounds = useCallback(() => {
    setBoardSoundsEnabled((currentValue) => !currentValue);
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

  const resetViewLayout = useCallback(() => {
    setViewLayout(normalizeViewLayout());
  }, []);

  const updateThemeColor = useCallback((tokenName, nextColor) => {
    setThemeOverrides((currentOverrides) =>
      getThemeOverrideValue(currentOverrides, tokenName, nextColor),
    );
  }, []);

  const resetTheme = useCallback(() => {
    setThemeOverrides({});
  }, []);

  const applyThemePreset = useCallback((presetId) => {
    const themePreset = getThemePresetById(presetId);
    setThemeOverrides(normalizeThemeOverrides(themePreset.values));
  }, []);

  const menuActions = useMemo(
    () => ({
      analyzePosition,
      analyzeWholeGame,
      toggleVariantArrows,
      undoMove,
      redoMove,
      openImportPgnPopup,
      openPositionSetup,
      copyFenToClipboard,
      resetGame,
      openLichessSearchPopup,
      openBackendConnectionPopup,
      openLichessTokenPopup,
      openOtbSearchPopup,
      openGuessHistoryBrowser,
      openSaveStudyPopup,
      openStudiesPopup,
      toggleBoardOrientation,
      resetViewLayout,
      toggleMoveHistory,
      toggleOpeningTreePanel,
      toggleOtbPlayerTreePanel,
      togglePuzzleTrainingPanel,
      toggleReplayTrainingPanel,
      toggleGuessTrainingPanel,
      togglePlayComputerPanel,
      toggleEngineWindow,
      toggleGameAnalysisPanel,
      toggleEvaluationBar,
      toggleBoardSounds,
      toggleComments,
      toggleImportedPgn,
      toggleVariants,
      openShortcutsPopup,
      openThemeSettingsPopup,
    }),
    [
      analyzePosition,
      analyzeWholeGame,
      copyFenToClipboard,
      openImportPgnPopup,
      openPositionSetup,
      openGuessHistoryBrowser,
      openLichessSearchPopup,
      openBackendConnectionPopup,
      openLichessTokenPopup,
      openOtbSearchPopup,
      openSaveStudyPopup,
      openShortcutsPopup,
      openStudiesPopup,
      resetViewLayout,
      openThemeSettingsPopup,
      redoMove,
      resetGame,
      toggleBoardOrientation,
      toggleComments,
      toggleEngineWindow,
      toggleGameAnalysisPanel,
      toggleEvaluationBar,
      toggleBoardSounds,
      toggleImportedPgn,
      toggleMoveHistory,
      toggleOpeningTreePanel,
      toggleOtbPlayerTreePanel,
      togglePuzzleTrainingPanel,
      toggleReplayTrainingPanel,
      toggleGuessTrainingPanel,
      togglePlayComputerPanel,
      toggleVariantArrows,
      toggleVariants,
      undoMove,
    ],
  );

  const keyboardActions = useMemo(() => {
    const shouldBrowseGuessResults = isGuessResultBrowsing;

    return {
      closeImportPgnPopup,
      closeSaveStudyPopup,
      closeCreateCollectionPopup,
      closeManageCollectionsPopup,
      closeStudiesPopup,
      closeGuessHistoryBrowser,
      closeLichessSearchPopup,
      closeBackendConnectionPopup,
      closeLichessTokenPopup,
      closeOtbSearchPopup,
      closeShortcutsPopup,
      openShortcutsPopup,
      setOpenMenu,
      onEscape: shouldBrowseGuessResults ? stopGuessBrowse : undefined,
      goToStart: shouldBrowseGuessResults ? goGuessBrowseStart : goToStart,
      undoMove: shouldBrowseGuessResults ? goGuessBrowsePrev : undoMove,
      redoMove: shouldBrowseGuessResults ? goGuessBrowseNext : redoMove,
      jumpToMainVariant,
      jumpBackToSideline,
      goToEnd: shouldBrowseGuessResults ? goGuessBrowseEnd : goToEnd,
      toggleBoardOrientation,
      toggleMoveHistory,
      toggleOpeningTreePanel,
      togglePuzzleTrainingPanel,
      toggleReplayTrainingPanel,
      toggleGuessTrainingPanel,
      togglePlayComputerPanel,
      toggleEngineWindow,
      toggleComments,
      toggleImportedPgn,
      toggleVariants,
    };
  }, [
    closeBackendConnectionPopup,
    closeCreateCollectionPopup,
    closeGuessHistoryBrowser,
    closeImportPgnPopup,
    closeLichessSearchPopup,
    closeLichessTokenPopup,
    closeManageCollectionsPopup,
    closeOtbSearchPopup,
    closeSaveStudyPopup,
    closeShortcutsPopup,
    closeStudiesPopup,
    goGuessBrowseEnd,
    goGuessBrowseNext,
    goGuessBrowsePrev,
    goGuessBrowseStart,
    goToEnd,
    goToStart,
    isGuessResultBrowsing,
    jumpBackToSideline,
    jumpToMainVariant,
    openShortcutsPopup,
    redoMove,
    stopGuessBrowse,
    toggleBoardOrientation,
    toggleComments,
    toggleEngineWindow,
    toggleImportedPgn,
    toggleMoveHistory,
    toggleOpeningTreePanel,
    togglePlayComputerPanel,
    togglePuzzleTrainingPanel,
    toggleReplayTrainingPanel,
    toggleGuessTrainingPanel,
    toggleVariants,
    undoMove,
  ]);

  const keyboardModalState = useMemo(
    () => ({
      showImportPgnPopup,
      showSaveStudyPopup,
      showCreateCollectionPopup,
      showManageCollectionsPopup,
      showStudiesPopup,
      showGuessHistoryBrowserPopup,
      showLichessSearchPopup,
      showLichessTokenPopup,
      showOtbSearchPopup,
      showShortcutsPopup,
      showThemeSettingsPopup,
    }),
    [
      showCreateCollectionPopup,
      showImportPgnPopup,
      showGuessHistoryBrowserPopup,
      showLichessSearchPopup,
      showLichessTokenPopup,
      showManageCollectionsPopup,
      showOtbSearchPopup,
      showSaveStudyPopup,
      showShortcutsPopup,
      showStudiesPopup,
      showThemeSettingsPopup,
    ],
  );

  useKeyboardShortcuts({
    shortcutConfig,
    modalState: keyboardModalState,
    openMenu,
    actions: keyboardActions,
  });
  return {
    MAX_ENGINE_SEARCH_DEPTH,
    MIN_ENGINE_SEARCH_DEPTH,
    POSITION_SETUP_MOVE_TOOL,
    TRAINING_COMPUTER_PLAY_SOURCE_CURRENT,
    TRAINING_COMPUTER_PLAY_SOURCE_INITIAL,
    activeGuessHistoryEntry,
    activeTrainingPlaySession,
    addSelectedEngineVariantToTree,
    analyzePosition,
    analyzeWholeGame,
    appliedOtbSearchFilters,
    applyThemePreset,
    backendApiBaseUrl,
    backendApiToken,
    backendConnectionError,
    blackTrainingLabel,
    boardOrientation,
    boardPanelHeight,
    boardPanelRef,
    boardRenderKey,
    boardSoundsEnabled,
    boardSquareStyles,
    boardWorkspaceFocusMode,
    boundedGuessBrowseIndex,
    buildStudyTitle,
    canJumpToMainVariant,
    canRedo,
    canUndo,
    cancelCommentEdit,
    cancelGameAnalysis,
    cancelPositionSetup,
    changeOtbPage,
    changeOtbPageSize,
    clearPositionSetupBoard,
    closeBackendConnectionPopup,
    closeComments,
    closeCreateCollectionPopup,
    closeEngineWindow,
    closeGameAnalysisPanel,
    closeGuessHistoryBrowser,
    closeGuessHistoryView,
    closeGuessTrainingPanel,
    closeImportPgnPopup,
    closeImportedPgn,
    closeLichessSearchPopup,
    closeLichessTokenPopup,
    closeManageCollectionsPopup,
    closeMoveHistory,
    closeOpeningTreePanel,
    closeOtbPlayerTreePanel,
    closeOtbSearchPopup,
    closePlayComputerPanel,
    closePuzzleTrainingPanel,
    closeReplayTrainingPanel,
    closeSaveStudyPopup,
    closeShortcutsPopup,
    closeStudiesPopup,
    closeThemeSettingsPopup,
    closeVariants,
    collections,
    collectionsLoading,
    commentDraft,
    computerPlayOutcomeText,
    computerPlaySourceLabel,
    computerPlayStatusText,
    copyNotification,
    createCollection,
    createCollectionError,
    createCollectionTitle,
    creatingCollection,
    currentGameAnalysisRetryTarget,
    currentGuessMove,
    currentGuessMoveNumber,
    currentMoveIndex,
    currentMoveLabel,
    currentPositionComments,
    currentPuzzleMove,
    currentReplayMove,
    currentReplayMoveNumber,
    deletingCollectionId,
    deletingStudyId,
    demoteVariant,
    editedComment,
    effectiveBoardArrows,
    effectiveBoardPosition,
    effectiveTrainingFocusMode,
    endGuessTraining,
    endReplayTraining,
    engineResult,
    engineSearchDepth,
    engineVariants,
    evaluationResult,
    exitGameAnalysisRetry,
    exitStandaloneComputerPlay,
    exitTrainingPlayMode,
    exploreGameAnalysisRetryAgainstComputer,
    exploreOtbPlayerOpeningTree,
    fen,
    finishPositionSetup,
    formattedBestMove,
    game,
    gameAnalysis,
    gameAnalysisIsCurrent,
    gameAnalysisIssueFilter,
    gameAnalysisRetry,
    getMoveHistoryVariantOptions,
    goGuessBrowseEnd,
    goGuessBrowseNext,
    goGuessBrowsePrev,
    goGuessBrowseStart,
    goToEnd,
    goToGameAnalysisPosition,
    goToMoveHistoryNode,
    goToNextGameAnalysisIssue,
    goToNextGameAnalysisRetry,
    goToPreviousGameAnalysisIssue,
    goToStart,
    guessBrowseMoveCount,
    guessHistoryBrowserError,
    guessHistoryBrowserGames,
    guessHistoryBrowserLoading,
    guessHistoryEntries,
    guessHistoryError,
    guessHistoryLoading,
    guessTheMoveSummary,
    handleBoardSquareMouseDown,
    handleBoardSquareMouseUp,
    handleMenuAction,
    handleOpeningTreeHoverMove,
    handleOpeningTreeSelectMove,
    handlePieceDrop,
    handlePositionSetupSquareClick,
    hasImportedPgnDetails,
    hasReplaySource,
    hasSearchedLichess,
    hasSearchedOtb,
    hideTrainingPreview,
    importLichessGame,
    importOtbGame,
    importOtbOpeningTreeGame,
    importOtbPgnFile,
    importPgn,
    importPgnError,
    importPgnValue,
    importedMainlineComments,
    importedPgnData,
    importingOtbFile,
    isEngineOpponentUserTurn,
    isGuessResultBrowsing,
    isGuessTrainingActive,
    isGuessTrainingEnded,
    isPositionSetupMode,
    isReplayTrainingActive,
    isReplayTrainingEnded,
    isStandaloneComputerPlayActive,
    isStandaloneComputerPlayCompleted,
    isTrainingPlayActive,
    jumpToMainVariant,
    lastCompletedExpectedMove,
    lastCompletedIncorrectTrainingAttempts,
    lastCompletedTrainingAttempts,
    lichessApiToken,
    lichessImportError,
    lichessImportingGameId,
    lichessPuzzleFilters,
    lichessSearchError,
    lichessSearchFilters,
    lichessSearchLoading,
    lichessSearchResults,
    loadCollections,
    loadGuessHistoryGame,
    loadGuessHistoryGames,
    loadPuzzleTraining,
    loadStudies,
    loadStudy,
    loading,
    loadingGuessHistoryGameKey,
    loadingStudyId,
    managingStudy,
    menuActions,
    moveHistoryItems,
    nextGameAnalysisIssue,
    nextGameAnalysisRetryTarget,
    normalizeEngineSearchDepth,
    normalizedTrainingState,
    openCreateCollectionPopup,
    openLichessTokenPopup,
    openManageCollectionsPopup,
    openMenu,
    otbFileImportError,
    otbFileImportStatus,
    otbImportError,
    otbImportingGameId,
    otbOpeningTreeGameSelection,
    otbPlayerTreeColor,
    otbPlayerTreeExportSettings,
    otbPlayerTreeScope,
    otbSearchError,
    otbSearchFilters,
    otbSearchLoading,
    otbSearchPage,
    otbSearchPagination,
    otbSearchResults,
    pendingTrainingAttempts,
    positionSetupError,
    positionSetupState,
    previousGameAnalysisIssue,
    promoteVariant,
    redoMove,
    removeCollection,
    removeComment,
    removeStudy,
    removeVariant,
    reorderComments,
    replaySummary,
    resetPositionSetup,
    resetPositionSetupToStartPosition,
    resetTheme,
    resetTrainingSession,
    resolvedTheme,
    restartGameAnalysisRetryPreparation,
    restartPuzzleTraining,
    restartStandaloneComputerPlay,
    retryCurrentGameAnalysisMove,
    retryReplayMove,
    revealReplayMove,
    revertMoveHistoryToNode,
    saveBackendConnection,
    saveComment,
    saveCurrentStudy,
    saveLichessToken,
    saveStudyError,
    saveStudyTitle,
    savingStudy,
    searchLichessGames,
    searchOtbGames,
    selectGuessBrowseIndex,
    selectPositionSetupActiveColor,
    selectPositionSetupTool,
    selectVariant,
    selectedCollection,
    selectedCollectionId,
    selectedEngineVariant,
    selectedEngineVariantIndex,
    setCommentDraft,
    setCreateCollectionTitle,
    setEngineSearchDepth,
    setGameAnalysisIssueFilter,
    setImportPgnError,
    setImportPgnValue,
    setLichessPuzzleFilters,
    setLichessSearchError,
    setLichessSearchFilters,
    setOtbFileImportError,
    setOtbFileImportStatus,
    setOtbOpeningTreeGameSelection,
    setOtbPlayerTreeColor,
    setOtbPlayerTreeExportSettings,
    setOtbSearchError,
    setOtbSearchFilters,
    setSaveStudyTitle,
    setSelectedCollectionId,
    setSelectedEngineVariantIndex,
    setTrainingPlayerSide,
    setViewLayout,
    shortcutEntries,
    showBackendConnectionPopup,
    showComments,
    showCreateCollectionPopup,
    showEngineWindow,
    showEvaluationBar,
    showGameAnalysisPanel,
    showGuessHistoryBrowserPopup,
    showGuessTrainingPanel,
    showImportPgnPopup,
    showImportedPgn,
    showLichessSearchPopup,
    showLichessTokenPopup,
    showManageCollectionsPopup,
    showMoveHistory,
    showOpeningTreePanel,
    showOtbPlayerTreePanel,
    showOtbSearchPopup,
    showPlayComputerPanel,
    showPuzzleTrainingPanel,
    showReplayTrainingPanel,
    showSaveStudyPopup,
    showShortcutsPopup,
    showStudiesPopup,
    showThemeSettingsPopup,
    showTrainingPreview,
    showVariantArrows,
    showVariants,
    startAddingComment,
    startCurrentGameAnalysisRetry,
    startEditingComment,
    startGuessTraining,
    startReplayTraining,
    startStandaloneComputerPlay,
    startTrainingPlayMode,
    stopGuessBrowse,
    studies,
    studiesError,
    studiesLoading,
    themeOverrides,
    toggleMenu,
    togglePositionSetupCastlingRight,
    toggleStudyCollection,
    trainingError,
    trainingLoading,
    trainingPreview,
    undoMove,
    updateThemeColor,
    updatingCollectionId,
    variantLines,
    variantTree,
    viewGuessHistoryEntry,
    viewLayout,
    visibleStudies,
    whiteTrainingLabel,
  };
}

export default useAppController;
