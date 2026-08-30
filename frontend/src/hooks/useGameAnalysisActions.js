/* Controller inputs such as React setters and imported utilities have stable identities. */
/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback } from "react";

function useGameAnalysisActions(context) {
  const {
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
  } = context;

  const cancelGameAnalysis = useCallback(() => {
    gameAnalysisAbortControllerRef.current?.abort();
  }, []);

  const goToGameAnalysisPosition = useCallback(
    (position) => {
      const matchingEntry = mainlinePositionEntries.find(
        (entry) =>
          entry.nodeId === position?.nodeId && entry.fen === position?.fen,
      );

      if (!matchingEntry || isPositionSetupMode) {
        return;
      }

      resetTrainingSession();
      setVariantTree((currentValue) =>
        goToMainlineNodeInVariantTree(currentValue, position.nodeId),
      );
      setEngineResult(null);
      setEvaluationResult(null);
    },
    [isPositionSetupMode, mainlinePositionEntries, resetTrainingSession],
  );

  const analyzeWholeGame = useCallback(async () => {
    setShowGameAnalysisPanel(true);

    if (isPositionSetupMode) {
      setPositionSetupError("Finish setup before analyzing the game.");
      return;
    }

    gameAnalysisRetryRequestIdRef.current += 1;
    setGameAnalysisRetry(null);

    gameAnalysisAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    const analysisEntries = mainlinePositionEntries;
    const analysisSignature = createMainlineSignature(analysisEntries);
    let streamedPositions = [];
    let receivedCompleteEvent = false;
    gameAnalysisAbortControllerRef.current = abortController;
    gameAnalysisRunSignatureRef.current = analysisSignature;
    setGameAnalysis({
      version: GAME_ANALYSIS_VERSION,
      status: GAME_ANALYSIS_STATUS_RUNNING,
      depth: engineSearchDepth,
      completedAt: "",
      total: analysisEntries.length,
      mainlineSignature: analysisSignature,
      positions: [],
    });

    try {
      await streamNdjson(
        "/api/analyze/game",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            buildGameAnalysisRequest(analysisEntries, engineSearchDepth),
          ),
          signal: abortController.signal,
        },
        (event) => {
          if (abortController !== gameAnalysisAbortControllerRef.current) {
            return;
          }

          if (event?.type === "start") {
            setGameAnalysis((currentValue) => ({
              ...currentValue,
              total: event.total,
              depth: event.depth,
            }));
            return;
          }

          if (event?.type === "position") {
            streamedPositions = appendGameAnalysisPosition(
              streamedPositions,
              event,
              analysisEntries,
            );
            setGameAnalysis((currentValue) => ({
              ...currentValue,
              positions: streamedPositions,
            }));
            return;
          }

          if (event?.type === "error") {
            throw new Error(event.details || "Whole-game analysis failed.");
          }

          if (event?.type === "complete") {
            receivedCompleteEvent = true;
          }
        },
      );

      if (abortController.signal.aborted) {
        throw new DOMException("Analysis cancelled.", "AbortError");
      }

      if (
        !receivedCompleteEvent ||
        streamedPositions.length !== analysisEntries.length
      ) {
        throw new Error(
          "Whole-game analysis ended before every position was evaluated.",
        );
      }

      setGameAnalysis(
        createCompletedGameAnalysis({
          depth: engineSearchDepth,
          positions: streamedPositions,
          mainlineEntries: analysisEntries,
        }),
      );
    } catch (error) {
      if (abortController !== gameAnalysisAbortControllerRef.current) {
        return;
      }

      if (error?.name === "AbortError" || abortController.signal.aborted) {
        setGameAnalysis((currentValue) => ({
          ...currentValue,
          status: GAME_ANALYSIS_STATUS_CANCELLED,
        }));
      } else {
        setGameAnalysis((currentValue) => ({
          ...currentValue,
          status: GAME_ANALYSIS_STATUS_ERROR,
          error: error.message,
        }));
      }
    } finally {
      if (abortController === gameAnalysisAbortControllerRef.current) {
        gameAnalysisAbortControllerRef.current = null;
      }
    }
  }, [engineSearchDepth, isPositionSetupMode, mainlinePositionEntries]);

  const goToPreviousGameAnalysisIssue = useCallback(() => {
    goToGameAnalysisPosition(previousGameAnalysisIssue);
  }, [goToGameAnalysisPosition, previousGameAnalysisIssue]);

  const goToNextGameAnalysisIssue = useCallback(() => {
    goToGameAnalysisPosition(nextGameAnalysisIssue);
  }, [goToGameAnalysisPosition, nextGameAnalysisIssue]);

  const analyzePosition = useCallback(async () => {
    if (isPositionSetupMode) {
      setPositionSetupError("Finish setup before analyzing this position.");
      return;
    }

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
  }, [engineSearchDepth, fen, isPositionSetupMode]);

  const addSelectedEngineVariantToTree = useCallback(() => {
    if (isPositionSetupMode || !selectedEngineVariant?.moveObjects?.length) {
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
              error:
                "Unable to add the selected engine line to the variant tree.",
            }
          : {
              error:
                "Unable to add the selected engine line to the variant tree.",
            },
      );
      return;
    }

    resetTrainingSession();
    setVariantTree(nextVariantTree);
    setShowMoveHistory(true);
    setShowVariants(true);
    setEngineResult(null);
    setEvaluationResult(null);
  }, [
    resetTrainingSession,
    selectedEngineVariant,
    variantTree,
    isPositionSetupMode,
  ]);

  return {
    cancelGameAnalysis,
    goToGameAnalysisPosition,
    analyzeWholeGame,
    goToPreviousGameAnalysisIssue,
    goToNextGameAnalysisIssue,
    analyzePosition,
    addSelectedEngineVariantToTree,
  };
}

export default useGameAnalysisActions;
