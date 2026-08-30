import { useEffect } from "react";
import { savePersistedAppState } from "../utils/appState.js";

function useAppPersistence(state, trainingFocusRestoreRef) {
  const stateSignature = JSON.stringify(state);

  useEffect(() => {
    const currentState = JSON.parse(stateSignature);
    const {
      isTrainingFocusMode,
      showMoveHistory,
      showOpeningTreePanel,
      showEngineWindow,
      showGameAnalysisPanel,
      showComments,
      showImportedPgn,
      showVariants,
      ...persistedState
    } = currentState;
    const restoredViews =
      isTrainingFocusMode && trainingFocusRestoreRef.current
        ? trainingFocusRestoreRef.current
        : {
            showMoveHistory,
            showOpeningTreePanel,
            showEngineWindow,
            showGameAnalysisPanel,
            showComments,
            showImportedPgn,
            showVariants,
          };

    try {
      savePersistedAppState({
        ...persistedState,
        showMoveHistory: restoredViews.showMoveHistory,
        showOpeningTreePanel: restoredViews.showOpeningTreePanel,
        showEngineWindow: restoredViews.showEngineWindow,
        showGameAnalysisPanel: restoredViews.showGameAnalysisPanel,
        showComments: restoredViews.showComments,
        showImportedPgn: restoredViews.showImportedPgn,
        showVariants: restoredViews.showVariants,
      });
    } catch (error) {
      console.error("Failed to persist app state:", error);
    }
  }, [stateSignature, trainingFocusRestoreRef]);
}

export default useAppPersistence;
