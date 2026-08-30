/* Controller inputs such as React setters and imported utilities have stable identities. */
/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect } from "react";
import useBoardSounds from "./useBoardSounds.js";

function useTrainingActions(context) {
  const {
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
  } = context;

  const resetTrainingSession = useCallback(() => {
    trainingRequestIdRef.current += 1;
    guessHistoryRunIdRef.current = null;
    savedGuessHistoryRunIdRef.current = null;
    pendingGuessHistoryEntryIdRef.current = "";
    setTrainingState(
      createEmptyTrainingState(normalizedTrainingState.playerSide),
    );
    setActiveGuessHistoryEntryId("");
    hideTrainingPreview();
    setTrainingError("");
    setTrainingLoading(false);
    setTrainingPlayAutoReplyPaused(false);
  }, [
    hideTrainingPreview,
    normalizedTrainingState.playerSide,
    trainingRequestIdRef,
  ]);
  const startGameAnalysisRetry = useCallback(
    async (target) => {
      if (!target || !gameAnalysisIsCurrent) {
        return;
      }

      resetTrainingSession();
      const requestId = ++gameAnalysisRetryRequestIdRef.current;
      setGameAnalysisRetry({
        target,
        status: target.bestMove
          ? GAME_ANALYSIS_RETRY_STATUS_READY
          : GAME_ANALYSIS_RETRY_STATUS_PREPARING,
        attempt: null,
        feedback: null,
        error: "",
      });
      setVariantTree((currentValue) =>
        goToMainlineNodeInVariantTree(currentValue, target.sourceNodeId),
      );
      setEngineResult(null);
      setEvaluationResult(null);

      if (target.bestMove) {
        return;
      }

      try {
        const analysis = await fetchJson("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fen: target.sourceFen,
            depth: engineSearchDepth,
            multipv: 1,
          }),
        });

        if (requestId !== gameAnalysisRetryRequestIdRef.current) {
          return;
        }

        const hydratedTarget = setGameAnalysisRetryBestMove(
          target,
          analysis.bestmove,
        );

        if (!hydratedTarget) {
          throw new Error("Stockfish did not return a legal best move.");
        }

        setGameAnalysisRetry({
          target: hydratedTarget,
          status: GAME_ANALYSIS_RETRY_STATUS_READY,
          attempt: null,
          feedback: null,
          error: "",
        });
      } catch (error) {
        if (requestId !== gameAnalysisRetryRequestIdRef.current) {
          return;
        }

        setGameAnalysisRetry((currentValue) =>
          currentValue
            ? {
                ...currentValue,
                status: GAME_ANALYSIS_RETRY_STATUS_PREPARING,
                error: error.message,
              }
            : currentValue,
        );
      }
    },
    [engineSearchDepth, gameAnalysisIsCurrent, resetTrainingSession],
  );
  const startCurrentGameAnalysisRetry = useCallback(() => {
    startGameAnalysisRetry(currentGameAnalysisRetryTarget);
  }, [currentGameAnalysisRetryTarget, startGameAnalysisRetry]);
  const retryCurrentGameAnalysisMove = useCallback(() => {
    setGameAnalysisRetry((currentValue) =>
      currentValue?.target?.bestMove
        ? {
            ...currentValue,
            status: GAME_ANALYSIS_RETRY_STATUS_READY,
            attempt: null,
            feedback: null,
            error: "",
          }
        : currentValue,
    );
  }, []);
  const restartGameAnalysisRetryPreparation = useCallback(() => {
    if (gameAnalysisRetry?.target) {
      startGameAnalysisRetry(gameAnalysisRetry.target);
    }
  }, [gameAnalysisRetry?.target, startGameAnalysisRetry]);
  const exitGameAnalysisRetry = useCallback(() => {
    const issueNodeId = gameAnalysisRetry?.target?.issueNodeId;

    gameAnalysisRetryRequestIdRef.current += 1;
    setGameAnalysisRetry(null);

    if (issueNodeId) {
      setVariantTree((currentValue) =>
        goToMainlineNodeInVariantTree(currentValue, issueNodeId),
      );
      setEngineResult(null);
      setEvaluationResult(null);
    }
  }, [gameAnalysisRetry?.target?.issueNodeId]);
  const goToNextGameAnalysisRetry = useCallback(() => {
    if (nextGameAnalysisRetryTarget) {
      startGameAnalysisRetry(nextGameAnalysisRetryTarget);
    }
  }, [nextGameAnalysisRetryTarget, startGameAnalysisRetry]);
  const playBoardSound = useBoardSounds(boardSoundsEnabled);
  const playBoardSoundForVariantTree = useCallback(
    (nextVariantTree) => {
      const nextGame = buildGameToNode(nextVariantTree);
      const lastMove = getLastMoveFromGame(nextGame);
      const soundEvent = getBoardSoundEvent(lastMove, nextGame);

      if (!soundEvent) {
        return;
      }

      playBoardSound(soundEvent);
    },
    [playBoardSound],
  );
  const exploreGameAnalysisRetryAgainstComputer = useCallback(() => {
    const attempt = gameAnalysisRetry?.attempt;
    const target = gameAnalysisRetry?.target;

    if (
      !attempt?.userMove ||
      !attempt.resultingFen ||
      !target?.issueSide ||
      variantTree.currentNodeId !== target.sourceNodeId
    ) {
      return;
    }

    const attemptedTree = applyMoveToVariantTree(variantTree, attempt.userMove);

    if (!attemptedTree) {
      setGameAnalysisRetry((currentValue) =>
        currentValue
          ? { ...currentValue, error: "Unable to explore the attempted move." }
          : currentValue,
      );
      return;
    }

    const {
      trainingState: nextTrainingState,
      variantTree: nextVariantTree,
      error,
    } = createComputerPlayTrainingState(
      attemptedTree,
      target.issueSide,
      TRAINING_COMPUTER_PLAY_SOURCE_CURRENT,
    );

    if (error || !nextVariantTree) {
      setGameAnalysisRetry((currentValue) =>
        currentValue
          ? {
              ...currentValue,
              error: error ?? "Unable to start computer exploration.",
            }
          : currentValue,
      );
      return;
    }

    gameAnalysisRetryRequestIdRef.current += 1;
    trainingRequestIdRef.current += 1;
    setGameAnalysisRetry(null);
    setVariantTree(nextVariantTree);
    setTrainingState(nextTrainingState);
    setShowPlayComputerPanel(true);
    setTrainingError("");
    setTrainingLoading(false);
    setTrainingPlayAutoReplyPaused(false);
    setEngineResult(null);
    setEvaluationResult(null);
    playBoardSoundForVariantTree(nextVariantTree);
  }, [
    gameAnalysisRetry,
    playBoardSoundForVariantTree,
    trainingRequestIdRef,
    variantTree,
  ]);

  const buildReplayVariantTreeForProgress = useCallback(
    (referenceMoves, progressPly) => {
      let nextVariantTree = createEmptyVariantTree(
        referenceMoves[0]?.fenBefore,
      );

      for (const referenceMove of referenceMoves) {
        const updatedTree = applyMoveToVariantTree(
          nextVariantTree,
          referenceMove.move,
        );

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
    },
    [],
  );

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

  const startStandaloneComputerPlay = useCallback(
    (startFrom) => {
      const startVariantTree =
        startFrom === TRAINING_COMPUTER_PLAY_SOURCE_INITIAL
          ? createEmptyVariantTree()
          : normalizeVariantTree(variantTree);
      const {
        trainingState: nextTrainingState,
        variantTree: nextVariantTree,
        error,
      } = createComputerPlayTrainingState(
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
    },
    [
      hideTrainingPreview,
      normalizedTrainingState.playerSide,
      trainingRequestIdRef,
      variantTree,
    ],
  );

  const restartStandaloneComputerPlay = useCallback(() => {
    if (
      !computerPlayConfig?.startVariantTree ||
      !computerPlayConfig?.startFrom
    ) {
      return;
    }

    const {
      trainingState: nextTrainingState,
      variantTree: nextVariantTree,
      error,
    } = createComputerPlayTrainingState(
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
    setTrainingState(
      createEmptyTrainingState(normalizedTrainingState.playerSide),
    );
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
      playBoardSoundForVariantTree(nextVariantTree);
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
    playBoardSoundForVariantTree,
  ]);

  const startTrainingPlayMode = useCallback(
    (attempt) => {
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
    },
    [
      hideTrainingPreview,
      isTrainingPlayActive,
      normalizedTrainingState,
      trainingRequestIdRef,
      variantTree,
    ],
  );

  const loadGuessHistory = useCallback(async (rawPgn) => {
    const normalizedRawPgn = typeof rawPgn === "string" ? rawPgn.trim() : "";

    if (!normalizedRawPgn) {
      setGuessHistoryEntries([]);
      setGuessHistoryError("");
      setGuessHistoryLoading(false);
      setActiveGuessHistoryEntryId("");
      return;
    }

    setGuessHistoryLoading(true);
    setGuessHistoryError("");

    try {
      const data = await fetchJson("/api/guess-history/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawPgn: normalizedRawPgn,
        }),
      });
      const nextEntries = normalizeGuessHistoryEntries(data.entries);
      setGuessHistoryEntries(nextEntries);
      setActiveGuessHistoryEntryId((currentValue) => {
        const preferredEntryId = pendingGuessHistoryEntryIdRef.current;

        if (
          preferredEntryId &&
          nextEntries.some((entry) => entry.id === preferredEntryId)
        ) {
          pendingGuessHistoryEntryIdRef.current = "";
          return preferredEntryId;
        }

        return nextEntries.some((entry) => entry.id === currentValue)
          ? currentValue
          : "";
      });
    } catch (error) {
      setGuessHistoryEntries([]);
      setActiveGuessHistoryEntryId("");
      pendingGuessHistoryEntryIdRef.current = "";
      setGuessHistoryError(error.message);
    } finally {
      setGuessHistoryLoading(false);
    }
  }, []);

  const navigateReplayTrainingToProgress = useCallback(
    (targetProgressPly) => {
      const currentTrainingValue = normalizeTrainingState(
        normalizedTrainingState,
      );
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
            (attempt) =>
              Number.isInteger(attempt.ply) &&
              attempt.ply <= boundedProgressPly,
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
    },
    [
      buildReplayVariantTreeForProgress,
      hideTrainingPreview,
      normalizedTrainingState,
      trainingRequestIdRef,
    ],
  );

  useEffect(() => {
    requestTrainingPlayEngineMove();
  }, [requestTrainingPlayEngineMove]);

  useEffect(() => {
    loadGuessHistory(importedPgnData?.rawPgn ?? "");
  }, [importedPgnData?.rawPgn, loadGuessHistory]);

  useEffect(() => {
    if (
      normalizedTrainingState.mode !== TRAINING_MODE_GUESS_THE_MOVE ||
      (normalizedTrainingState.status !== TRAINING_STATUS_COMPLETED &&
        normalizedTrainingState.status !== TRAINING_STATUS_ENDED) ||
      !normalizedTrainingState.attempts.length ||
      !hasReplaySource
    ) {
      return;
    }

    if (!guessHistoryRunIdRef.current) {
      guessHistoryRunIdRef.current = `guess-run-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
    }

    if (savedGuessHistoryRunIdRef.current === guessHistoryRunIdRef.current) {
      return;
    }

    const entry = createGuessHistoryEntryPayload(normalizedTrainingState);

    if (!entry) {
      return;
    }

    const runId = guessHistoryRunIdRef.current;
    let cancelled = false;

    async function persistGuessHistory() {
      try {
        const data = await fetchJson("/api/guess-history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rawPgn: importedPgnData?.rawPgn ?? "",
            entry,
          }),
        });

        if (cancelled) {
          return;
        }

        savedGuessHistoryRunIdRef.current = runId;
        setGuessHistoryEntries(normalizeGuessHistoryEntries(data.entries));
        setGuessHistoryError("");
      } catch (error) {
        if (!cancelled) {
          setGuessHistoryError(error.message);
        }
      }
    }

    void persistGuessHistory();

    return () => {
      cancelled = true;
    };
  }, [hasReplaySource, importedPgnData?.rawPgn, normalizedTrainingState]);

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
    if (
      playerSide !== TRAINING_SIDE_WHITE &&
      playerSide !== TRAINING_SIDE_BLACK
    ) {
      return;
    }

    setTrainingState((currentValue) => {
      const currentTrainingState = normalizeTrainingState(currentValue);

      if (
        (currentTrainingState.mode === TRAINING_MODE_REPLAY_GAME &&
          currentTrainingState.status === TRAINING_STATUS_ACTIVE) ||
        (currentTrainingState.mode === TRAINING_MODE_GUESS_THE_MOVE &&
          currentTrainingState.status === TRAINING_STATUS_ACTIVE) ||
        (currentTrainingState.mode === TRAINING_MODE_PLAY_COMPUTER &&
          currentTrainingState.status === TRAINING_STATUS_ACTIVE)
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

  const advanceReplayToPlayerTurn = useCallback(
    (trainingStateValue, variantTreeValue) => {
      const currentTrainingState = normalizeTrainingState(trainingStateValue);
      let nextVariantTree = variantTreeValue;
      let nextProgressPly = currentTrainingState.progressPly;

      while (nextProgressPly < currentTrainingState.referenceMoves.length) {
        const nextReferenceMove =
          currentTrainingState.referenceMoves[nextProgressPly];

        if (
          !nextReferenceMove ||
          nextReferenceMove.side === currentTrainingState.playerSide
        ) {
          break;
        }

        const updatedTree = applyMoveToVariantTree(
          nextVariantTree,
          nextReferenceMove.move,
        );

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
    },
    [],
  );

  const buildResolvedReplayAttempt = useCallback(
    (expectedMove, userMove, userSan, comparison = null) => {
      return buildReplayAttempt({
        expectedMove,
        userMove,
        userSan,
        referenceEvaluation: comparison?.referenceEvaluation ?? null,
        userEvaluation: comparison?.userEvaluation ?? null,
      });
    },
    [],
  );

  const completeReplayMove = useCallback(
    (expectedMove, completionMode, finalAttempt = null) => {
      const currentTrainingState = normalizeTrainingState(
        normalizedTrainingState,
      );
      const advancedReplayTree = applyMoveToVariantTree(
        variantTree,
        expectedMove.move,
      );

      if (!advancedReplayTree) {
        setTrainingError("Unable to advance the replay game.");
        return;
      }

      const {
        trainingState: nextTrainingState,
        variantTree: nextVariantTree,
        error,
      } = advanceReplayToPlayerTurn(
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
      playBoardSoundForVariantTree(nextVariantTree);
    },
    [
      advanceReplayToPlayerTurn,
      normalizedTrainingState,
      playBoardSoundForVariantTree,
      variantTree,
    ],
  );

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

    const {
      trainingState: nextTrainingState,
      variantTree: replayTree,
      error,
    } = createReplayTrainingState(
      importedPgnData.rawPgn,
      normalizedTrainingState.playerSide,
    );

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
    setShowPuzzleTrainingPanel(false);
    setShowReplayTrainingPanel(true);
    setShowGuessTrainingPanel(false);
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

  const endReplayTraining = useCallback(() => {
    if (!isReplayTrainingActive) {
      return;
    }

    trainingRequestIdRef.current += 1;
    hideTrainingPreview();
    setTrainingState((currentValue) => {
      const currentTrainingState = normalizeTrainingState(currentValue);

      if (
        currentTrainingState.mode !== TRAINING_MODE_REPLAY_GAME ||
        currentTrainingState.status !== TRAINING_STATUS_ACTIVE
      ) {
        return currentTrainingState;
      }

      return normalizeTrainingState({
        ...currentTrainingState,
        status: TRAINING_STATUS_ENDED,
        pendingAttempts: [],
        lastCompletedAttempts: [],
        lastCompletedExpectedMove: null,
        lastCompletionMode: null,
      });
    });
    setTrainingError("");
    setTrainingLoading(false);
    setTrainingPlayAutoReplyPaused(false);
    setEngineResult(null);
    setEvaluationResult(null);
  }, [hideTrainingPreview, isReplayTrainingActive, trainingRequestIdRef]);

  const startGuessTraining = useCallback(() => {
    if (!hasReplaySource) {
      setTrainingError(
        "Import a game before starting guess the move training.",
      );
      return;
    }

    const {
      trainingState: nextTrainingState,
      variantTree: guessTree,
      error,
    } = createGuessTheMoveTrainingState(
      importedPgnData.rawPgn,
      normalizedTrainingState.playerSide,
    );

    if (error || !guessTree) {
      setTrainingError(error ?? "Unable to start guess the move training.");
      return;
    }

    const {
      trainingState: preparedTrainingState,
      variantTree: preparedGuessTree,
      error: autoAdvanceError,
    } = advanceReplayToPlayerTurn(nextTrainingState, guessTree);

    if (autoAdvanceError) {
      setTrainingError(autoAdvanceError);
      return;
    }

    trainingRequestIdRef.current += 1;
    guessHistoryRunIdRef.current = `guess-run-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    savedGuessHistoryRunIdRef.current = null;
    pendingGuessHistoryEntryIdRef.current = "";
    setVariantTree(preparedGuessTree);
    setShowPuzzleTrainingPanel(false);
    setShowGuessTrainingPanel(true);
    setShowReplayTrainingPanel(false);
    setActiveGuessHistoryEntryId("");
    setEngineResult(null);
    setEvaluationResult(null);
    setTrainingState(preparedTrainingState);
    setTrainingError("");
    setGuessHistoryError("");
    setTrainingLoading(false);
  }, [
    advanceReplayToPlayerTurn,
    hasReplaySource,
    importedPgnData,
    normalizedTrainingState.playerSide,
    trainingRequestIdRef,
  ]);

  const endGuessTraining = useCallback(() => {
    if (!isGuessTrainingActive) {
      return;
    }

    trainingRequestIdRef.current += 1;
    hideTrainingPreview();
    setTrainingState((currentValue) => {
      const currentTrainingState = normalizeTrainingState(currentValue);

      if (
        currentTrainingState.mode !== TRAINING_MODE_GUESS_THE_MOVE ||
        currentTrainingState.status !== TRAINING_STATUS_ACTIVE
      ) {
        return currentTrainingState;
      }

      return normalizeTrainingState({
        ...currentTrainingState,
        status: TRAINING_STATUS_ENDED,
        pendingAttempts: [],
      });
    });
    setTrainingError("");
    setTrainingLoading(false);
    setTrainingPlayAutoReplyPaused(false);
    setEngineResult(null);
    setEvaluationResult(null);
  }, [hideTrainingPreview, isGuessTrainingActive, trainingRequestIdRef]);

  const rememberRecentLichessPuzzleId = useCallback((filterKey, puzzleId) => {
    if (!filterKey || typeof puzzleId !== "string" || !puzzleId.trim()) {
      return;
    }

    const currentIds = recentLichessPuzzleIdsRef.current.get(filterKey) ?? [];
    const nextIds = [
      ...currentIds.filter((id) => id !== puzzleId),
      puzzleId,
    ].slice(-MAX_RECENT_LICHESS_PUZZLE_IDS);

    recentLichessPuzzleIdsRef.current.set(filterKey, nextIds);
  }, []);

  const getBlockedLichessPuzzleIds = useCallback(
    (filterKey, currentPuzzleId = "") => {
      const blockedIds = new Set(
        recentLichessPuzzleIdsRef.current.get(filterKey) ?? [],
      );

      if (typeof currentPuzzleId === "string" && currentPuzzleId.trim()) {
        blockedIds.add(currentPuzzleId.trim());
      }

      return blockedIds;
    },
    [],
  );

  const applyPuzzleTrainingPayload = useCallback(
    (puzzleData, filterKey) => {
      const {
        trainingState: nextTrainingState,
        variantTree: nextVariantTree,
        error,
      } = createPuzzleTrainingState(puzzleData);

      if (error || !nextVariantTree) {
        setTrainingError(error ?? "Unable to start puzzle mode.");
        return false;
      }

      setVariantTree(nextVariantTree);
      setShowPuzzleTrainingPanel(true);
      setShowReplayTrainingPanel(false);
      setShowGuessTrainingPanel(false);
      setEngineResult(null);
      setEvaluationResult(null);
      setBoardOrientation(
        nextTrainingState.playerSide === TRAINING_SIDE_BLACK
          ? "black"
          : "white",
      );
      setTrainingState(nextTrainingState);
      setTrainingError("");
      rememberRecentLichessPuzzleId(
        filterKey,
        nextTrainingState.puzzle?.id ?? "",
      );

      return true;
    },
    [rememberRecentLichessPuzzleId],
  );

  const loadPuzzleTraining = useCallback(async () => {
    const { query } = buildLichessPuzzleQuery(lichessPuzzleFilters);
    const filterKey = createLichessPuzzleFilterKey(lichessPuzzleFilters);
    const requestId = ++trainingRequestIdRef.current;
    const currentPuzzleId = normalizedTrainingState.puzzle?.id ?? "";
    const currentPuzzleOutcome = getPuzzleTerminalOutcome(
      normalizedTrainingState,
    );
    const blockedPuzzleIds = getBlockedLichessPuzzleIds(
      filterKey,
      currentPuzzleId,
    );

    hideTrainingPreview();
    setTrainingError("");
    setTrainingLoading(true);
    setTrainingPlayAutoReplyPaused(false);

    try {
      const tokenHeaders = lichessApiToken
        ? { "X-Lichess-Api-Token": lichessApiToken }
        : {};
      let puzzleData = null;

      if (currentPuzzleOutcome) {
        const advanceRequest = buildLichessPuzzleAdvanceRequest(
          lichessPuzzleFilters,
          currentPuzzleOutcome.puzzleId,
          currentPuzzleOutcome.win,
        );
        const advanceKey = advanceRequest
          ? `${advanceRequest.puzzleId}:${advanceRequest.win}`
          : "";

        if (advanceRequest && advanceKey !== lastAdvancedPuzzleKeyRef.current) {
          try {
            const data = await fetchJson("/api/lichess/puzzle/advance", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...tokenHeaders,
              },
              body: JSON.stringify(advanceRequest),
            });

            if (requestId !== trainingRequestIdRef.current) {
              return;
            }

            if (!data?.unavailable) {
              lastAdvancedPuzzleKeyRef.current = advanceKey;

              if (data?.puzzle?.id && !blockedPuzzleIds.has(data.puzzle.id)) {
                puzzleData = data;
              }
            }
          } catch {
            if (requestId !== trainingRequestIdRef.current) {
              return;
            }
          }
        }
      }

      for (
        let attemptIndex = 0;
        attemptIndex < PUZZLE_FETCH_RETRY_ATTEMPTS;
        attemptIndex += 1
      ) {
        if (puzzleData) {
          break;
        }

        const params = new URLSearchParams(query);
        params.set("_ts", `${Date.now()}-${attemptIndex}`);
        const data = await fetchJson(
          `/api/lichess/puzzle/next?${params.toString()}`,
          {
            ...(Object.keys(tokenHeaders).length
              ? { headers: tokenHeaders }
              : {}),
            cache: "no-store",
          },
        );

        console.log("Lichess puzzle fetch attempt", attemptIndex + 1, {
          query,
          data,
        });

        if (requestId !== trainingRequestIdRef.current) {
          return;
        }

        if (data?.unavailable) {
          setTrainingError(
            data.details || "Lichess puzzle service is unavailable right now.",
          );
          return;
        }

        if (data?.puzzle?.id && !blockedPuzzleIds.has(data.puzzle.id)) {
          puzzleData = data;
          break;
        }

        if (attemptIndex < PUZZLE_FETCH_RETRY_ATTEMPTS - 1) {
          await wait(PUZZLE_FETCH_RETRY_DELAY_MS);

          if (requestId !== trainingRequestIdRef.current) {
            return;
          }
        }
      }

      if (!puzzleData) {
        setTrainingError(
          "Lichess kept returning the same puzzle. Try again or change the filters.",
        );
        return;
      }

      if (!applyPuzzleTrainingPayload(puzzleData, filterKey)) {
        return;
      }
    } catch (error) {
      if (requestId === trainingRequestIdRef.current) {
        setTrainingError(error.message);
      }
    } finally {
      if (requestId === trainingRequestIdRef.current) {
        setTrainingLoading(false);
      }
    }
  }, [
    applyPuzzleTrainingPayload,
    getBlockedLichessPuzzleIds,
    hideTrainingPreview,
    lichessApiToken,
    lichessPuzzleFilters,
    normalizedTrainingState,
    trainingRequestIdRef,
  ]);

  const restartPuzzleTraining = useCallback(() => {
    if (normalizedTrainingState.mode !== TRAINING_MODE_PUZZLE) {
      return;
    }

    const initialFen = normalizedTrainingState.referenceMoves[0]?.fenBefore;

    if (!initialFen) {
      setTrainingError("Unable to restart the current puzzle.");
      return;
    }

    trainingRequestIdRef.current += 1;
    hideTrainingPreview();
    setVariantTree(createEmptyVariantTree(initialFen));
    setBoardOrientation(
      normalizedTrainingState.playerSide === TRAINING_SIDE_BLACK
        ? "black"
        : "white",
    );
    setTrainingState(
      normalizeTrainingState({
        ...normalizedTrainingState,
        status: TRAINING_STATUS_ACTIVE,
        progressPly: 0,
        attempts: [],
        pendingAttempts: [],
        lastCompletedAttempts: [],
        lastCompletedExpectedMove: null,
        lastCompletionMode: null,
      }),
    );
    setTrainingError("");
    setTrainingLoading(false);
    setTrainingPlayAutoReplyPaused(false);
    setEngineResult(null);
    setEvaluationResult(null);
  }, [hideTrainingPreview, normalizedTrainingState, trainingRequestIdRef]);

  const applyImportedPgn = useCallback(
    (rawPgn) => {
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
      gameAnalysisAbortControllerRef.current?.abort();
      gameAnalysisAbortControllerRef.current = null;
      setGameAnalysis(null);
      setEngineResult(null);
      setEvaluationResult(null);
      guessHistoryRunIdRef.current = null;
      savedGuessHistoryRunIdRef.current = null;
      pendingGuessHistoryEntryIdRef.current = "";
      setActiveGuessHistoryEntryId("");
      setGuessHistoryError("");
      resetTrainingSession();
      setImportedPgnData(nextImportedPgnData);
      setPositionComments(
        seedPositionCommentsFromImportedPgnData(nextImportedPgnData),
      );
      setEditingCommentId(null);
      setCommentDraft("");
      setPositionSetupState(null);
      setPositionSetupError("");
      return "";
    },
    [resetTrainingSession],
  );

  const loadGuessHistoryGame = useCallback(
    async (browseEntry) => {
      if (!browseEntry?.gameKey) {
        return;
      }

      setLoadingGuessHistoryGameKey(browseEntry.gameKey);
      setGuessHistoryBrowserError("");

      try {
        const data = await fetchJson(
          `/api/guess-history/games/${browseEntry.gameKey}`,
        );
        const nextEntries = normalizeGuessHistoryEntries(data.entries);
        const error = applyImportedPgn(data.rawPgn);

        if (error) {
          setGuessHistoryBrowserError(error);
          return;
        }

        pendingGuessHistoryEntryIdRef.current =
          browseEntry.latestEntry?.id ?? nextEntries[0]?.id ?? "";
        setGuessHistoryEntries(nextEntries);
        setActiveGuessHistoryEntryId(pendingGuessHistoryEntryIdRef.current);
        setShowGuessTrainingPanel(true);
        setShowReplayTrainingPanel(false);
        setShowGuessHistoryBrowserPopup(false);
        setGuessHistoryBrowserError("");
        setCopyNotification(
          `Loaded Guess history for "${browseEntry.game.white || "saved game"}".`,
        );
      } catch (error) {
        setGuessHistoryBrowserError(error.message);
      } finally {
        setLoadingGuessHistoryGameKey("");
      }
    },
    [applyImportedPgn, setCopyNotification],
  );

  return {
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
  };
}

export default useTrainingActions;
