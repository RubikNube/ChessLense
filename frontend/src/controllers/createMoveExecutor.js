function createMoveExecutor(context) {
  const {
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
  } = context;

  function getMoveAttemptForCurrentPosition(
    move,
    { defaultPromotion = false } = {},
  ) {
    if (!move?.from || !move?.to) {
      return null;
    }

    const previewGame = new Chess(fen);
    const attemptedMove = {
      from: move.from,
      to: move.to,
      ...(move.promotion
        ? { promotion: move.promotion }
        : defaultPromotion
          ? { promotion: "q" }
          : {}),
    };
    let appliedUserMove = null;

    try {
      appliedUserMove = previewGame.move(attemptedMove);
    } catch {
      return null;
    }

    if (!appliedUserMove) {
      return null;
    }

    return {
      appliedUserMove,
      normalizedAttemptedMove: {
        from: appliedUserMove.from,
        to: appliedUserMove.to,
        ...(appliedUserMove.promotion
          ? { promotion: appliedUserMove.promotion }
          : {}),
      },
    };
  }

  function tryExecuteMove(move, { defaultPromotion = false } = {}) {
    if (trainingLoading) {
      return false;
    }

    const moveAttempt = getMoveAttemptForCurrentPosition(move, {
      defaultPromotion,
    });

    if (!moveAttempt) {
      return false;
    }

    const { appliedUserMove, normalizedAttemptedMove } = moveAttempt;

    if (gameAnalysisRetry) {
      if (
        gameAnalysisRetry.status !== GAME_ANALYSIS_RETRY_STATUS_READY ||
        !gameAnalysisRetry.target.bestMove ||
        !gameAnalysisRetry.target.bestMoveUci
      ) {
        return false;
      }

      const target = gameAnalysisRetry.target;
      const attemptedMoveUci = formatMoveAsUci(normalizedAttemptedMove);
      const didMatchBestMove = attemptedMoveUci === target.bestMoveUci;

      if (didMatchBestMove) {
        const attempt = buildGameAnalysisRetryAttempt({
          target,
          userMove: normalizedAttemptedMove,
          userSan: appliedUserMove.san,
        });
        const feedback = getGameAnalysisRetryFeedback(attempt);

        if (!attempt || !feedback) {
          setGameAnalysisRetry((currentValue) =>
            currentValue
              ? { ...currentValue, error: "Unable to score the retry move." }
              : currentValue,
          );
          return false;
        }

        setGameAnalysisRetry((currentValue) =>
          currentValue
            ? {
                ...currentValue,
                status: GAME_ANALYSIS_RETRY_STATUS_FEEDBACK,
                attempt,
                feedback,
                error: "",
              }
            : currentValue,
        );
        setHoveredOpeningTreeMove(null);
        return true;
      }

      const requestId = ++gameAnalysisRetryRequestIdRef.current;
      setGameAnalysisRetry((currentValue) =>
        currentValue
          ? {
              ...currentValue,
              status: GAME_ANALYSIS_RETRY_STATUS_EVALUATING,
              attempt: null,
              feedback: null,
              error: "",
            }
          : currentValue,
      );
      fetchJson("/api/analyze/compare-moves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fen: target.sourceFen,
          referenceMove: target.bestMoveUci,
          userMove: attemptedMoveUci,
          depth: engineSearchDepth,
        }),
      })
        .then((comparison) => {
          if (requestId !== gameAnalysisRetryRequestIdRef.current) {
            return;
          }

          const attempt = buildGameAnalysisRetryAttempt({
            target,
            userMove: normalizedAttemptedMove,
            userSan: appliedUserMove.san,
            comparison,
          });
          const feedback = getGameAnalysisRetryFeedback(attempt);

          if (!attempt || !feedback) {
            throw new Error("Stockfish could not score the retry move.");
          }

          setGameAnalysisRetry((currentValue) =>
            currentValue
              ? {
                  ...currentValue,
                  status: GAME_ANALYSIS_RETRY_STATUS_FEEDBACK,
                  attempt,
                  feedback,
                  error: "",
                }
              : currentValue,
          );
        })
        .catch((error) => {
          if (requestId !== gameAnalysisRetryRequestIdRef.current) {
            return;
          }

          setGameAnalysisRetry((currentValue) =>
            currentValue
              ? {
                  ...currentValue,
                  status: GAME_ANALYSIS_RETRY_STATUS_READY,
                  error: error.message,
                }
              : currentValue,
          );
        });

      setHoveredOpeningTreeMove(null);
      return true;
    }

    if (isTrainingPlayActive || isStandaloneComputerPlayActive) {
      if (!isEngineOpponentUserTurn) {
        return false;
      }

      const nextVariantTree = applyMoveToVariantTree(
        variantTree,
        normalizedAttemptedMove,
      );

      if (!nextVariantTree) {
        return false;
      }

      setTrainingError("");
      setTrainingPlayAutoReplyPaused(false);
      setVariantTree(nextVariantTree);
      setEngineResult(null);
      setEvaluationResult(null);
      setHoveredOpeningTreeMove(null);
      playBoardSoundForVariantTree(nextVariantTree);
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
        setHoveredOpeningTreeMove(null);
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

      setHoveredOpeningTreeMove(null);
      return true;
    }

    if (isGuessTrainingActive && currentGuessMove) {
      setTrainingError("");

      const didMatchExpectedMove =
        currentGuessMove.move.from === normalizedAttemptedMove.from &&
        currentGuessMove.move.to === normalizedAttemptedMove.to &&
        currentGuessMove.move.promotion === normalizedAttemptedMove.promotion;

      if (didMatchExpectedMove) {
        const matchingAttempt = buildResolvedReplayAttempt(
          currentGuessMove,
          normalizedAttemptedMove,
          appliedUserMove.san,
        );

        if (!matchingAttempt) {
          setTrainingError("Unable to record the guess attempt.");
          return false;
        }

        completeReplayMove(
          currentGuessMove,
          TRAINING_COMPLETION_MATCH,
          matchingAttempt,
        );
        setHoveredOpeningTreeMove(null);
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
          referenceMove: formatMoveAsUci(currentGuessMove.move),
          userMove: formatMoveAsUci(normalizedAttemptedMove),
          depth: engineSearchDepth,
        }),
      })
        .then((comparison) => {
          if (requestId !== trainingRequestIdRef.current) {
            return;
          }

          const resolvedAttempt = buildResolvedReplayAttempt(
            currentGuessMove,
            normalizedAttemptedMove,
            appliedUserMove.san,
            comparison,
          );

          if (!resolvedAttempt) {
            setTrainingError("Unable to record the guess attempt.");
            return;
          }

          completeReplayMove(
            currentGuessMove,
            TRAINING_COMPLETION_REVEALED,
            resolvedAttempt,
          );
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

      setHoveredOpeningTreeMove(null);
      return true;
    }

    if (isPuzzleTrainingActive && currentPuzzleMove) {
      setTrainingError("");

      const didMatchExpectedMove =
        currentPuzzleMove.move.from === normalizedAttemptedMove.from &&
        currentPuzzleMove.move.to === normalizedAttemptedMove.to &&
        currentPuzzleMove.move.promotion === normalizedAttemptedMove.promotion;

      if (didMatchExpectedMove) {
        const matchingAttempt = buildResolvedReplayAttempt(
          currentPuzzleMove,
          normalizedAttemptedMove,
          appliedUserMove.san,
        );

        if (!matchingAttempt) {
          setTrainingError("Unable to record the puzzle move.");
          return false;
        }

        completeReplayMove(
          currentPuzzleMove,
          TRAINING_COMPLETION_MATCH,
          matchingAttempt,
        );
        setHoveredOpeningTreeMove(null);
        return true;
      }

      const failedAttempt = buildResolvedReplayAttempt(
        currentPuzzleMove,
        normalizedAttemptedMove,
        appliedUserMove.san,
      );
      const failedPuzzleTree = applyMoveToVariantTree(
        variantTree,
        normalizedAttemptedMove,
      );

      if (!failedAttempt || !failedPuzzleTree) {
        setTrainingError("Unable to record the puzzle attempt.");
        return false;
      }

      trainingRequestIdRef.current += 1;
      hideTrainingPreview();
      setVariantTree(failedPuzzleTree);
      setTrainingState((currentValue) => {
        const currentTrainingState = normalizeTrainingState(currentValue);

        if (
          currentTrainingState.mode !== TRAINING_MODE_PUZZLE ||
          currentTrainingState.status !== TRAINING_STATUS_ACTIVE
        ) {
          return currentTrainingState;
        }

        return normalizeTrainingState({
          ...currentTrainingState,
          status: TRAINING_STATUS_ENDED,
          attempts: [...currentTrainingState.attempts, failedAttempt],
          pendingAttempts: [],
          lastCompletedAttempts: [failedAttempt],
          lastCompletedExpectedMove: currentPuzzleMove,
          lastCompletionMode: TRAINING_COMPLETION_REVEALED,
        });
      });
      setTrainingLoading(false);
      setEngineResult(null);
      setEvaluationResult(null);
      setHoveredOpeningTreeMove(null);
      playBoardSoundForVariantTree(failedPuzzleTree);
      return true;
    }

    const nextVariantTree = applyMoveToVariantTree(
      variantTree,
      normalizedAttemptedMove,
    );

    if (!nextVariantTree) {
      return false;
    }

    resetTrainingSession();
    setVariantTree(nextVariantTree);
    setEngineResult(null);
    setEvaluationResult(null);
    setHoveredOpeningTreeMove(null);
    playBoardSoundForVariantTree(nextVariantTree);

    return true;
  }

  return tryExecuteMove;
}

export default createMoveExecutor;
