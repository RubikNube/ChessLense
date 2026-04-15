import { useCallback, useEffect, useRef, useState } from "react";

const TRAINING_PREVIEW_TOOLTIP_WIDTH_PX = 176;
const TRAINING_PREVIEW_TOOLTIP_HEIGHT_PX = 220;
const TRAINING_PREVIEW_TOOLTIP_GAP_PX = 12;
const TRAINING_PREVIEW_TOOLTIP_MARGIN_PX = 16;

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

function useTrainingController({
  isTrainingFocusMode,
  showMoveHistory,
  setShowMoveHistory,
  showEngineWindow,
  setShowEngineWindow,
  showComments,
  setShowComments,
  showImportedPgn,
  setShowImportedPgn,
  showVariants,
  setShowVariants,
}) {
  const [trainingPreview, setTrainingPreview] = useState(null);
  const trainingRequestIdRef = useRef(0);
  const trainingFocusRestoreRef = useRef(null);

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
    setShowComments,
    setShowEngineWindow,
    setShowImportedPgn,
    setShowMoveHistory,
    setShowVariants,
    showComments,
    showEngineWindow,
    showImportedPgn,
    showMoveHistory,
    showVariants,
  ]);

  return {
    trainingPreview,
    trainingRequestIdRef,
    hideTrainingPreview,
    showTrainingPreview,
    trainingFocusRestoreRef,
  };
}

export default useTrainingController;
