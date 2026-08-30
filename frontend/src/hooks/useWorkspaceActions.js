/* Controller inputs such as React setters and imported utilities have stable identities. */
/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback } from "react";
import { Chess } from "chess.js";

function useWorkspaceActions(context) {
  const {
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
  } = context;

  const undoMove = useCallback(() => {
    if (isPositionSetupMode) {
      return;
    }

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

    if (isReferenceTrainingMode) {
      const currentCheckpointIndex = trainingNavigationCheckpoints.indexOf(
        normalizedTrainingState.progressPly,
      );
      const previousCheckpoint =
        currentCheckpointIndex > 0
          ? trainingNavigationCheckpoints[currentCheckpointIndex - 1]
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
    isReferenceTrainingMode,
    isTrainingPlayActive,
    navigateReplayTrainingToProgress,
    normalizedTrainingState.progressPly,
    trainingNavigationCheckpoints,
    resetTrainingSession,
    trainingRequestIdRef,
    isPositionSetupMode,
  ]);

  const redoMove = useCallback(() => {
    if (isPositionSetupMode) {
      return;
    }

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

    if (isReferenceTrainingMode) {
      const currentCheckpointIndex = trainingNavigationCheckpoints.indexOf(
        normalizedTrainingState.progressPly,
      );
      const nextCheckpoint =
        currentCheckpointIndex >= 0 &&
        currentCheckpointIndex < trainingNavigationCheckpoints.length - 1
          ? trainingNavigationCheckpoints[currentCheckpointIndex + 1]
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
    isReferenceTrainingMode,
    isTrainingPlayActive,
    navigateReplayTrainingToProgress,
    normalizedTrainingState.progressPly,
    trainingNavigationCheckpoints,
    resetTrainingSession,
    trainingRequestIdRef,
    isPositionSetupMode,
  ]);

  const goToStart = useCallback(() => {
    if (isPositionSetupMode) {
      return;
    }

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

    if (isReferenceTrainingMode) {
      navigateReplayTrainingToProgress(trainingNavigationCheckpoints[0] ?? 0);
      return;
    }

    resetTrainingSession();
    setVariantTree((currentValue) => goToStartInVariantTree(currentValue));
    setEngineResult(null);
    setEvaluationResult(null);
  }, [
    canUndo,
    hideTrainingPreview,
    isReferenceTrainingMode,
    isTrainingPlayActive,
    navigateReplayTrainingToProgress,
    trainingNavigationCheckpoints,
    resetTrainingSession,
    trainingRequestIdRef,
    isPositionSetupMode,
  ]);

  const goToEnd = useCallback(() => {
    if (isPositionSetupMode) {
      return;
    }

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

    if (isReferenceTrainingMode) {
      navigateReplayTrainingToProgress(
        trainingNavigationCheckpoints[
          trainingNavigationCheckpoints.length - 1
        ] ?? 0,
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
    isReferenceTrainingMode,
    isTrainingPlayActive,
    navigateReplayTrainingToProgress,
    trainingNavigationCheckpoints,
    resetTrainingSession,
    trainingRequestIdRef,
    isPositionSetupMode,
  ]);

  const jumpToMainVariant = useCallback(() => {
    if (isPositionSetupMode || !canJumpToMainVariant) {
      return;
    }

    resetTrainingSession();
    setVariantTree((currentValue) => jumpToMainVariantInTree(currentValue));
    setEngineResult(null);
    setEvaluationResult(null);
  }, [canJumpToMainVariant, resetTrainingSession, isPositionSetupMode]);

  const jumpBackToSideline = useCallback(() => {
    if (isPositionSetupMode || !canJumpBackToSideline) {
      return;
    }

    resetTrainingSession();
    setVariantTree((currentValue) => jumpBackToSidelineInTree(currentValue));
    setEngineResult(null);
    setEvaluationResult(null);
  }, [canJumpBackToSideline, resetTrainingSession, isPositionSetupMode]);

  const goToMoveHistoryNode = useCallback(
    (nodeId) => {
      resetTrainingSession();
      setVariantTree((currentValue) =>
        goToNodeInVariantTree(currentValue, nodeId),
      );
      setEngineResult(null);
      setEvaluationResult(null);
    },
    [resetTrainingSession],
  );

  const revertMoveHistoryToNode = useCallback(
    (nodeId) => {
      resetTrainingSession();
      setVariantTree((currentValue) =>
        truncateLineAfterNode(currentValue, nodeId),
      );
      setEngineResult(null);
      setEvaluationResult(null);
    },
    [resetTrainingSession],
  );

  const selectVariant = useCallback(
    (lineId) => {
      resetTrainingSession();
      setVariantTree((currentValue) => selectVariantLine(currentValue, lineId));
      setEngineResult(null);
      setEvaluationResult(null);
    },
    [resetTrainingSession],
  );

  const promoteVariant = useCallback(
    (lineId) => {
      resetTrainingSession();
      setVariantTree((currentValue) =>
        promoteVariantLine(currentValue, lineId),
      );
    },
    [resetTrainingSession],
  );

  const demoteVariant = useCallback(
    (lineId) => {
      resetTrainingSession();
      setVariantTree((currentValue) => demoteVariantLine(currentValue, lineId));
    },
    [resetTrainingSession],
  );

  const removeVariant = useCallback(
    (lineId) => {
      resetTrainingSession();
      setVariantTree((currentValue) => removeVariantLine(currentValue, lineId));
      setEngineResult(null);
      setEvaluationResult(null);
    },
    [resetTrainingSession],
  );

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

  const removeComment = useCallback(
    (commentId) => {
      const isRemovingEditedComment = editingCommentId === commentId;

      setPositionComments((currentValue) =>
        removePositionCommentEntry(currentValue, commentId),
      );
      if (isRemovingEditedComment) {
        setEditingCommentId(null);
        setCommentDraft("");
      }
    },
    [editingCommentId],
  );

  const reorderComments = useCallback((activeCommentId, overCommentId) => {
    setPositionComments((currentValue) =>
      reorderPositionCommentEntries(
        currentValue,
        activeCommentId,
        overCommentId,
      ),
    );
  }, []);

  const handleBoardSquareMouseDown = useCallback(
    ({ square }, event) => {
      if (isPositionSetupMode) {
        boardRightMouseSelectionRef.current = null;
        if (event.button === 2) {
          event.preventDefault();
        }
        return;
      }

      if (event.button === 2) {
        boardRightMouseSelectionRef.current = { startSquare: square };
        return;
      }

      boardRightMouseSelectionRef.current = null;
    },
    [isPositionSetupMode],
  );

  const handleBoardSquareMouseUp = useCallback(
    ({ square }, event) => {
      if (isPositionSetupMode) {
        boardRightMouseSelectionRef.current = null;
        if (event.button === 2) {
          event.preventDefault();
          setPositionSetupState((currentValue) =>
            currentValue
              ? {
                  ...currentValue,
                  position: applyPositionSetupTool(
                    currentValue.position,
                    square,
                    POSITION_SETUP_CLEAR_TOOL,
                  ),
                }
              : currentValue,
          );
          setPositionSetupError("");
        }
        return;
      }

      if (event.button !== 2) {
        boardRightMouseSelectionRef.current = null;
        return;
      }

      const startSquare =
        boardRightMouseSelectionRef.current?.startSquare ?? null;

      boardRightMouseSelectionRef.current = null;

      if (!startSquare) {
        return;
      }

      const color = getBoardAnnotationColor({
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
      });

      setBoardRenderNonce((currentValue) => currentValue + 1);

      if (startSquare === square) {
        setVariantTree((currentValue) =>
          toggleBoardHighlightAnnotation(
            currentValue,
            currentValue.currentNodeId,
            {
              square,
              color,
            },
          ),
        );
        return;
      }

      setVariantTree((currentValue) =>
        toggleBoardArrowAnnotation(currentValue, currentValue.currentNodeId, {
          startSquare,
          endSquare: square,
          color,
        }),
      );
    },
    [isPositionSetupMode],
  );

  const openPositionSetup = useCallback(() => {
    setPositionSetupState(createPositionSetupDraft(fen));
    setPositionSetupError("");
  }, [fen]);

  const cancelPositionSetup = useCallback(() => {
    setPositionSetupState(null);
    setPositionSetupError("");
  }, []);

  const selectPositionSetupTool = useCallback((selectedTool) => {
    setPositionSetupState((currentValue) =>
      currentValue
        ? {
            ...currentValue,
            selectedTool,
          }
        : currentValue,
    );
    setPositionSetupError("");
  }, []);

  const togglePositionSetupCastlingRight = useCallback((castlingRightKey) => {
    setPositionSetupState((currentValue) =>
      currentValue
        ? {
            ...currentValue,
            castlingRights: {
              ...currentValue.castlingRights,
              [castlingRightKey]:
                !currentValue.castlingRights?.[castlingRightKey],
            },
          }
        : currentValue,
    );
    setPositionSetupError("");
  }, []);

  const selectPositionSetupActiveColor = useCallback((activeColor) => {
    setPositionSetupState((currentValue) =>
      currentValue
        ? {
            ...currentValue,
            activeColor: activeColor === "black" ? "black" : "white",
          }
        : currentValue,
    );
    setPositionSetupError("");
  }, []);

  const resetPositionSetupFromFen = useCallback((nextFen) => {
    setPositionSetupState((currentValue) => {
      if (!currentValue) {
        return currentValue;
      }

      const nextDraft = createPositionSetupDraft(nextFen);
      return {
        ...nextDraft,
        initialFen: currentValue.initialFen,
        selectedTool: currentValue.selectedTool,
      };
    });
    setPositionSetupError("");
  }, []);

  const resetPositionSetup = useCallback(() => {
    if (!positionSetupState?.initialFen) {
      return;
    }

    resetPositionSetupFromFen(positionSetupState.initialFen);
  }, [positionSetupState?.initialFen, resetPositionSetupFromFen]);

  const resetPositionSetupToStartPosition = useCallback(() => {
    resetPositionSetupFromFen(new Chess().fen());
  }, [resetPositionSetupFromFen]);

  const clearPositionSetupBoard = useCallback(() => {
    setPositionSetupState((currentValue) =>
      currentValue
        ? {
            ...currentValue,
            castlingRights: { ...DEFAULT_POSITION_SETUP_CASTLING_RIGHTS },
            position: {},
          }
        : currentValue,
    );
    setPositionSetupError("");
  }, []);

  const handlePositionSetupSquareClick = useCallback(({ square }) => {
    if (!square) {
      return;
    }

    setPositionSetupState((currentValue) =>
      currentValue
        ? {
            ...currentValue,
            position: applyPositionSetupTool(
              currentValue.position,
              square,
              currentValue.selectedTool,
            ),
          }
        : currentValue,
    );
    setPositionSetupError("");
  }, []);

  const finishPositionSetup = useCallback(() => {
    if (!positionSetupState) {
      return;
    }

    const { fen: nextFen, error } = buildPositionSetupFen(
      positionSetupState.position,
      positionSetupState.activeColor,
      positionSetupState.castlingRights,
    );

    if (error) {
      setPositionSetupError(error);
      return;
    }

    resetTrainingSession();
    setVariantTree(createEmptyVariantTree(nextFen));
    gameAnalysisAbortControllerRef.current?.abort();
    gameAnalysisAbortControllerRef.current = null;
    setGameAnalysis(null);
    setEngineResult(null);
    setEvaluationResult(null);
    setImportedPgnData(null);
    setPositionComments([]);
    setGuessHistoryEntries([]);
    setGuessHistoryError("");
    setEditingCommentId(null);
    setCommentDraft("");
    setPositionSetupState(null);
    setPositionSetupError("");
  }, [positionSetupState, resetTrainingSession]);

  const saveComment = useCallback(() => {
    const trimmedDraft = commentDraft.trim();

    if (!trimmedDraft) {
      return;
    }

    const existingComment =
      currentPositionComments.find(
        (commentEntry) => commentEntry.id === editingCommentId,
      ) ?? null;
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
  }, [
    commentDraft,
    currentMoveHistory,
    currentPositionComments,
    editingCommentId,
    fen,
  ]);

  return {
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
  };
}

export default useWorkspaceActions;
