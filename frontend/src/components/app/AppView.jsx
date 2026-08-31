import AppMenuBar from "../app/AppMenuBar.jsx";
import AppWorkspaceContent from "./AppWorkspaceContent.jsx";
import AppModalHost from "./AppModalHost.jsx";
import AppOverlays from "./AppOverlays.jsx";

function AppView({ app }) {
  const {
    boardSoundsEnabled,
    canRedo,
    canUndo,
    handleMenuAction,
    menuActions,
    openMenu,
    showComments,
    showEngineWindow,
    showEvaluationBar,
    showGameAnalysisPanel,
    showGuessTrainingPanel,
    showImportedPgn,
    showMoveHistory,
    showOpeningTreePanel,
    showOtbPlayerTreePanel,
    showPlayComputerPanel,
    showPuzzleTrainingPanel,
    showReplayTrainingPanel,
    showVariantArrows,
    showVariants,
    toggleMenu,
    viewMode,
  } = app;

  return (
    <div className={`app view-mode-${viewMode}`}>
      <AppMenuBar
        openMenu={openMenu}
        onToggleMenu={toggleMenu}
        onMenuAction={handleMenuAction}
        showVariantArrows={showVariantArrows}
        canUndo={canUndo}
        canRedo={canRedo}
        showMoveHistory={showMoveHistory}
        showOpeningTreePanel={showOpeningTreePanel}
        showOtbPlayerTreePanel={showOtbPlayerTreePanel}
        showPuzzleTrainingPanel={showPuzzleTrainingPanel}
        showReplayTrainingPanel={showReplayTrainingPanel}
        showGuessTrainingPanel={showGuessTrainingPanel}
        showPlayComputerPanel={showPlayComputerPanel}
        showEngineWindow={showEngineWindow}
        showGameAnalysisPanel={showGameAnalysisPanel}
        showEvaluationBar={showEvaluationBar}
        boardSoundsEnabled={boardSoundsEnabled}
        showComments={showComments}
        showImportedPgn={showImportedPgn}
        showVariants={showVariants}
        viewMode={viewMode}
        actions={menuActions}
      />

      <AppWorkspaceContent app={app} />

      <AppModalHost app={app} />
      <AppOverlays app={app} />
    </div>
  );
}

export default AppView;
