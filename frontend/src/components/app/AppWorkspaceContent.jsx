import BoardWorkspace from "../board/BoardWorkspace.jsx";
import PositionSetupPanel from "../board/PositionSetupPanel.jsx";
import CommentsPanel from "../comments/CommentsPanel.jsx";
import EnginePanel from "../engine/EnginePanel.jsx";
import WholeGameAnalysisPanel from "../engine/WholeGameAnalysisPanel.jsx";
import GameAnalysisNavigation from "../engine/GameAnalysisNavigation.jsx";
import OpeningTreePanel from "../opening/OpeningTreePanel.jsx";
import OtbPlayerOpeningTreePanel from "../opening/OtbPlayerOpeningTreePanel.jsx";
import ImportedPgnPanel from "../pgn/ImportedPgnPanel.jsx";
import GuessTheMoveTrainingPanel from "../training/GuessTheMoveTrainingPanel.jsx";
import PlayComputerPanel from "../training/PlayComputerPanel.jsx";
import PuzzleTrainingPanel from "../training/PuzzleTrainingPanel.jsx";
import ReplayTrainingPanel from "../training/ReplayTrainingPanel.jsx";
import VariantsView from "../VariantsView.jsx";
import { normalizeGameAnalysisScale } from "../../utils/gameAnalysis.js";

function AppWorkspaceContent({ app }) {
  const {
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
    blackTrainingLabel,
    boardOrientation,
    boardPanelHeight,
    boardPanelRef,
    boardRenderKey,
    boardSquareStyles,
    boardWorkspaceFocusMode,
    boundedGuessBrowseIndex,
    canJumpToMainVariant,
    canRedo,
    canUndo,
    cancelCommentEdit,
    cancelGameAnalysis,
    cancelPositionSetup,
    clearPositionSetupBoard,
    closeComments,
    closeEngineWindow,
    closeGameAnalysisPanel,
    closeGuessHistoryView,
    closeGuessTrainingPanel,
    closeImportedPgn,
    closeMoveHistory,
    closeOpeningTreePanel,
    closeOtbPlayerTreePanel,
    closePlayComputerPanel,
    closePuzzleTrainingPanel,
    closeReplayTrainingPanel,
    closeVariants,
    commentDraft,
    computerPlayOutcomeText,
    computerPlaySourceLabel,
    computerPlayStatusText,
    currentGameAnalysisRetryTarget,
    currentGuessMove,
    currentGuessMoveNumber,
    currentMoveIndex,
    currentMoveLabel,
    currentPositionComments,
    currentPuzzleMove,
    currentReplayMove,
    currentReplayMoveNumber,
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
    fen,
    finishPositionSetup,
    formattedBestMove,
    game,
    gameAnalysis,
    gameAnalysisIsCurrent,
    gameAnalysisIssueFilter,
    gameAnalysisIssueSide,
    gameAnalysisScale,
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
    guessHistoryEntries,
    guessHistoryError,
    guessHistoryLoading,
    guessTheMoveSummary,
    handleBoardSquareMouseDown,
    handleBoardSquareMouseUp,
    handleOpeningTreeHoverMove,
    handleOpeningTreeSelectMove,
    handlePieceDrop,
    handlePositionSetupSquareClick,
    hasImportedPgnDetails,
    hasReplaySource,
    hideTrainingPreview,
    importedMainlineComments,
    importedPgnData,
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
    lichessPuzzleFilters,
    loadPuzzleTraining,
    loading,
    moveHistoryItems,
    nextGameAnalysisIssue,
    nextGameAnalysisRetryTarget,
    normalizeEngineSearchDepth,
    normalizedTrainingState,
    openLichessTokenPopup,
    otbPlayerTreeColor,
    otbPlayerTreeExportSettings,
    otbPlayerTreeScope,
    pendingTrainingAttempts,
    positionSetupError,
    positionSetupState,
    previousGameAnalysisIssue,
    promoteVariant,
    redoMove,
    removeComment,
    removeVariant,
    reorderComments,
    replaySummary,
    resetPositionSetup,
    resetPositionSetupToStartPosition,
    resetTrainingSession,
    restartGameAnalysisRetryPreparation,
    restartPuzzleTraining,
    restartStandaloneComputerPlay,
    retryCurrentGameAnalysisMove,
    retryReplayMove,
    revealReplayMove,
    revertMoveHistoryToNode,
    saveComment,
    selectGuessBrowseIndex,
    selectPositionSetupActiveColor,
    selectPositionSetupTool,
    selectVariant,
    selectedEngineVariant,
    selectedEngineVariantIndex,
    setCommentDraft,
    setEngineSearchDepth,
    setGameAnalysisIssueFilter,
    setGameAnalysisIssueSide,
    setGameAnalysisScale,
    setLichessPuzzleFilters,
    setOtbOpeningTreeGameSelection,
    setOtbPlayerTreeColor,
    setOtbPlayerTreeExportSettings,
    setSelectedEngineVariantIndex,
    setTrainingPlayerSide,
    setViewLayout,
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
    showTrainingPreview,
    showVariants,
    startAddingComment,
    startCurrentGameAnalysisRetry,
    startEditingComment,
    startGuessTraining,
    startReplayTraining,
    startStandaloneComputerPlay,
    startTrainingPlayMode,
    stopGuessBrowse,
    togglePositionSetupCastlingRight,
    trainingError,
    trainingLoading,
    undoMove,
    variantLines,
    variantTree,
    viewGuessHistoryEntry,
    viewLayout,
    whiteTrainingLabel,
  } = app;

  return (
    <>
      <BoardWorkspace
        boardRenderKey={boardRenderKey}
        isTrainingFocusMode={boardWorkspaceFocusMode}
        boardPanelRef={boardPanelRef}
        position={effectiveBoardPosition}
        onPieceDrop={isGuessResultBrowsing ? undefined : handlePieceDrop}
        onSquareClick={
          isPositionSetupMode ? handlePositionSetupSquareClick : undefined
        }
        allowDragging={
          (!isPositionSetupMode ||
            positionSetupState?.selectedTool === POSITION_SETUP_MOVE_TOOL) &&
          !isGuessResultBrowsing
        }
        boardOrientation={boardOrientation}
        boardArrows={isPositionSetupMode ? [] : effectiveBoardArrows}
        boardSquareStyles={isPositionSetupMode ? {} : boardSquareStyles}
        onSquareMouseDown={
          isGuessResultBrowsing ? undefined : handleBoardSquareMouseDown
        }
        onSquareMouseUp={
          isGuessResultBrowsing ? undefined : handleBoardSquareMouseUp
        }
        showEvaluationBar={
          showEvaluationBar && !isPositionSetupMode && !isGuessResultBrowsing
        }
        evaluation={evaluationResult?.evaluation}
        turn={game.turn()}
        showMoveHistory={showMoveHistory && !isPositionSetupMode}
        moveHistoryItems={moveHistoryItems}
        currentMoveIndex={currentMoveIndex}
        boardPanelHeight={boardPanelHeight}
        canUndo={isGuessResultBrowsing ? boundedGuessBrowseIndex > 0 : canUndo}
        canRedo={
          isGuessResultBrowsing
            ? boundedGuessBrowseIndex < guessBrowseMoveCount - 1
            : canRedo
        }
        onCloseMoveHistory={closeMoveHistory}
        onSelectMove={goToMoveHistoryNode}
        onUndo={isGuessResultBrowsing ? goGuessBrowsePrev : undoMove}
        onRedo={isGuessResultBrowsing ? goGuessBrowseNext : redoMove}
        onGoToStart={isGuessResultBrowsing ? goGuessBrowseStart : goToStart}
        onGoToEnd={isGuessResultBrowsing ? goGuessBrowseEnd : goToEnd}
        belowBoardContent={
          !isPositionSetupMode &&
          !effectiveTrainingFocusMode &&
          showGameAnalysisPanel &&
          !!gameAnalysis?.positions?.length ? (
            <GameAnalysisNavigation
              idPrefix="below-board-game-analysis"
              className="game-analysis-navigation-below-board"
              issueFilter={gameAnalysisIssueFilter}
              onChangeIssueFilter={setGameAnalysisIssueFilter}
              issueSide={gameAnalysisIssueSide}
              onChangeIssueSide={setGameAnalysisIssueSide}
              onPreviousIssue={goToPreviousGameAnalysisIssue}
              onNextIssue={goToNextGameAnalysisIssue}
              canGoToPreviousIssue={!!previousGameAnalysisIssue}
              canGoToNextIssue={!!nextGameAnalysisIssue}
              onRetryCurrentIssue={startCurrentGameAnalysisRetry}
              canRetryCurrentIssue={!!currentGameAnalysisRetryTarget}
              retryInProgress={!!gameAnalysisRetry}
              compactSettings
            />
          ) : null
        }
        onRevertMovesUntil={revertMoveHistoryToNode}
        getVariantOptionsForMove={getMoveHistoryVariantOptions}
        onSelectVariant={selectVariant}
        viewLayout={viewLayout}
        onViewLayoutChange={setViewLayout}
        showViewLayout={!isPositionSetupMode}
      >
        {isPositionSetupMode ? (
          <PositionSetupPanel
            panelHeight={boardPanelHeight}
            selectedTool={positionSetupState.selectedTool}
            activeColor={positionSetupState.activeColor}
            castlingRights={positionSetupState.castlingRights}
            error={positionSetupError}
            onSelectTool={selectPositionSetupTool}
            onSelectActiveColor={selectPositionSetupActiveColor}
            onToggleCastlingRight={togglePositionSetupCastlingRight}
            onClearBoard={clearPositionSetupBoard}
            onResetPosition={resetPositionSetup}
            onResetToStartPosition={resetPositionSetupToStartPosition}
            onFinish={finishPositionSetup}
            onCancel={cancelPositionSetup}
          />
        ) : (
          <>
            {showPlayComputerPanel && !effectiveTrainingFocusMode && (
              <>
                <PlayComputerPanel
                  viewId="play-computer"
                  panelHeight={boardPanelHeight}
                  onClose={closePlayComputerPanel}
                  normalizedTrainingState={normalizedTrainingState}
                  setTrainingPlayerSide={setTrainingPlayerSide}
                  isReplayTrainingActive={
                    isReplayTrainingActive || isGuessTrainingActive
                  }
                  isReplayTrainingEnded={isReplayTrainingEnded}
                  isTrainingPlayActive={isTrainingPlayActive}
                  isEngineOpponentUserTurn={isEngineOpponentUserTurn}
                  isStandaloneComputerPlayActive={
                    isStandaloneComputerPlayActive
                  }
                  isStandaloneComputerPlayCompleted={
                    isStandaloneComputerPlayCompleted
                  }
                  computerPlaySourceLabel={computerPlaySourceLabel}
                  computerPlayStatusText={computerPlayStatusText}
                  computerPlayOutcomeText={computerPlayOutcomeText}
                  trainingLoading={trainingLoading}
                  trainingError={trainingError}
                  startComputerPlayFromInitialPosition={() =>
                    startStandaloneComputerPlay(
                      TRAINING_COMPUTER_PLAY_SOURCE_INITIAL,
                    )
                  }
                  startComputerPlayFromCurrentPosition={() =>
                    startStandaloneComputerPlay(
                      TRAINING_COMPUTER_PLAY_SOURCE_CURRENT,
                    )
                  }
                  restartStandaloneComputerPlay={restartStandaloneComputerPlay}
                  exitStandaloneComputerPlay={exitStandaloneComputerPlay}
                />
              </>
            )}
            {showPuzzleTrainingPanel && (
              <PuzzleTrainingPanel
                viewId="puzzle-training"
                panelHeight={boardPanelHeight}
                onClose={closePuzzleTrainingPanel}
                filters={lichessPuzzleFilters}
                setFilters={setLichessPuzzleFilters}
                normalizedTrainingState={normalizedTrainingState}
                currentPuzzleMove={currentPuzzleMove}
                trainingLoading={trainingLoading}
                trainingError={trainingError}
                lastCompletedExpectedMove={lastCompletedExpectedMove}
                lastCompletedTrainingAttempts={lastCompletedTrainingAttempts}
                onStartPuzzle={loadPuzzleTraining}
                onNextPuzzle={loadPuzzleTraining}
                onRetryPuzzle={restartPuzzleTraining}
                onResetPuzzle={resetTrainingSession}
                onOpenLichessTokenPopup={openLichessTokenPopup}
              />
            )}
            {showReplayTrainingPanel && (
              <>
                <ReplayTrainingPanel
                  viewId="replay-training"
                  panelHeight={boardPanelHeight}
                  onClose={closeReplayTrainingPanel}
                  hasReplaySource={hasReplaySource}
                  normalizedTrainingState={normalizedTrainingState}
                  setTrainingPlayerSide={setTrainingPlayerSide}
                  isReplayTrainingActive={isReplayTrainingActive}
                  isReplayTrainingEnded={isReplayTrainingEnded}
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
                  lastCompletedIncorrectTrainingAttempts={
                    lastCompletedIncorrectTrainingAttempts
                  }
                  startReplayTraining={startReplayTraining}
                  endReplayTraining={endReplayTraining}
                  resetTrainingSession={resetTrainingSession}
                />
              </>
            )}
            {showGuessTrainingPanel && (
              <GuessTheMoveTrainingPanel
                viewId="guess-training"
                panelHeight={boardPanelHeight}
                onClose={closeGuessTrainingPanel}
                hasReplaySource={hasReplaySource}
                normalizedTrainingState={normalizedTrainingState}
                setTrainingPlayerSide={setTrainingPlayerSide}
                isGuessTrainingActive={isGuessTrainingActive}
                isGuessTrainingEnded={isGuessTrainingEnded}
                activeTrainingPlaySession={activeTrainingPlaySession}
                isTrainingPlayActive={isTrainingPlayActive}
                isEngineOpponentUserTurn={isEngineOpponentUserTurn}
                trainingLoading={trainingLoading}
                whiteTrainingLabel={whiteTrainingLabel}
                blackTrainingLabel={blackTrainingLabel}
                currentGuessMoveNumber={currentGuessMoveNumber}
                currentGuessMove={currentGuessMove}
                guessTheMoveSummary={guessTheMoveSummary}
                trainingError={trainingError}
                guessHistoryEntries={guessHistoryEntries}
                guessHistoryLoading={guessHistoryLoading}
                guessHistoryError={guessHistoryError}
                activeGuessHistoryEntry={activeGuessHistoryEntry}
                currentMoveLabel={currentMoveLabel}
                showTrainingPreview={showTrainingPreview}
                hideTrainingPreview={hideTrainingPreview}
                lastCompletedTrainingAttempts={lastCompletedTrainingAttempts}
                lastCompletedExpectedMove={lastCompletedExpectedMove}
                startTrainingPlayMode={startTrainingPlayMode}
                exitTrainingPlayMode={exitTrainingPlayMode}
                startGuessTraining={startGuessTraining}
                endGuessTraining={endGuessTraining}
                viewGuessHistoryEntry={viewGuessHistoryEntry}
                closeGuessHistoryView={closeGuessHistoryView}
                isGuessResultBrowsing={isGuessResultBrowsing}
                guessBrowseIndex={boundedGuessBrowseIndex}
                onSelectGuessBrowseIndex={selectGuessBrowseIndex}
                onGuessBrowseStart={goGuessBrowseStart}
                onGuessBrowseEnd={goGuessBrowseEnd}
                onGuessBrowsePrev={goGuessBrowsePrev}
                onGuessBrowseNext={goGuessBrowseNext}
                onStopGuessBrowsing={stopGuessBrowse}
                resetTrainingSession={resetTrainingSession}
              />
            )}

            {!effectiveTrainingFocusMode && showOpeningTreePanel && (
              <OpeningTreePanel
                viewId="opening-tree"
                fen={fen}
                currentMoveLabel={currentMoveLabel}
                lichessApiToken={lichessApiToken}
                onClose={closeOpeningTreePanel}
                onOpenLichessTokenPopup={openLichessTokenPopup}
                onHoverMove={handleOpeningTreeHoverMove}
                onSelectMove={handleOpeningTreeSelectMove}
              />
            )}

            {!effectiveTrainingFocusMode &&
              showOtbPlayerTreePanel &&
              otbPlayerTreeScope?.player && (
                <OtbPlayerOpeningTreePanel
                  viewId="otb-player-opening-tree"
                  scope={otbPlayerTreeScope}
                  color={otbPlayerTreeColor}
                  onColorChange={setOtbPlayerTreeColor}
                  exportSettings={otbPlayerTreeExportSettings}
                  onExportSettingsChange={setOtbPlayerTreeExportSettings}
                  fen={fen}
                  currentMoveLabel={currentMoveLabel}
                  onClose={closeOtbPlayerTreePanel}
                  onHoverMove={handleOpeningTreeHoverMove}
                  onOpenGames={(move) =>
                    setOtbOpeningTreeGameSelection({
                      scope: otbPlayerTreeScope,
                      color: otbPlayerTreeColor,
                      fen,
                      currentMoveLabel,
                      move,
                    })
                  }
                  onSelectMove={handleOpeningTreeSelectMove}
                />
              )}

            {!effectiveTrainingFocusMode && showEngineWindow && (
              <EnginePanel
                viewId="engine"
                onClose={closeEngineWindow}
                engineSearchDepth={engineSearchDepth}
                minEngineSearchDepth={MIN_ENGINE_SEARCH_DEPTH}
                maxEngineSearchDepth={MAX_ENGINE_SEARCH_DEPTH}
                onChangeEngineSearchDepth={(event) =>
                  setEngineSearchDepth(
                    normalizeEngineSearchDepth(event.target.value),
                  )
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

            {!effectiveTrainingFocusMode && showGameAnalysisPanel && (
              <WholeGameAnalysisPanel
                viewId="game-analysis"
                onClose={closeGameAnalysisPanel}
                engineSearchDepth={engineSearchDepth}
                minEngineSearchDepth={MIN_ENGINE_SEARCH_DEPTH}
                maxEngineSearchDepth={MAX_ENGINE_SEARCH_DEPTH}
                onChangeEngineSearchDepth={(event) =>
                  setEngineSearchDepth(
                    normalizeEngineSearchDepth(event.target.value),
                  )
                }
                gameAnalysis={gameAnalysis}
                gameAnalysisIsCurrent={gameAnalysisIsCurrent}
                currentNodeId={variantTree.currentNodeId}
                gameAnalysisScale={gameAnalysisScale}
                onChangeGameAnalysisScale={(value) =>
                  setGameAnalysisScale(normalizeGameAnalysisScale(value))
                }
                issueFilter={gameAnalysisIssueFilter}
                onChangeIssueFilter={setGameAnalysisIssueFilter}
                issueSide={gameAnalysisIssueSide}
                onChangeIssueSide={setGameAnalysisIssueSide}
                onAnalyzeGame={analyzeWholeGame}
                onCancelGameAnalysis={cancelGameAnalysis}
                onSelectGameAnalysisPosition={goToGameAnalysisPosition}
                onPreviousIssue={goToPreviousGameAnalysisIssue}
                onNextIssue={goToNextGameAnalysisIssue}
                canGoToPreviousIssue={!!previousGameAnalysisIssue}
                canGoToNextIssue={!!nextGameAnalysisIssue}
                gameAnalysisRetry={gameAnalysisRetry}
                canRetryCurrentIssue={!!currentGameAnalysisRetryTarget}
                onRetryCurrentIssue={startCurrentGameAnalysisRetry}
                onRetryAgain={retryCurrentGameAnalysisMove}
                onRetryPreparation={restartGameAnalysisRetryPreparation}
                onExitRetry={exitGameAnalysisRetry}
                onNextRetryIssue={goToNextGameAnalysisRetry}
                canGoToNextRetryIssue={!!nextGameAnalysisRetryTarget}
                onExploreRetryAgainstComputer={
                  exploreGameAnalysisRetryAgainstComputer
                }
              />
            )}

            {!effectiveTrainingFocusMode && showComments && (
              <CommentsPanel
                viewId="comments"
                onClose={closeComments}
                currentMoveLabel={currentMoveLabel}
                currentPositionComments={currentPositionComments}
                onStartEditingComment={startEditingComment}
                onRemoveComment={removeComment}
                onReorderComments={reorderComments}
                editedComment={editedComment}
                onStartAddingComment={startAddingComment}
                commentDraft={commentDraft}
                onChangeCommentDraft={setCommentDraft}
                onSaveComment={saveComment}
                onCancelCommentEdit={cancelCommentEdit}
              />
            )}

            {!effectiveTrainingFocusMode && showVariants && (
              <VariantsView
                viewId="variants"
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

            {!effectiveTrainingFocusMode &&
              showImportedPgn &&
              hasImportedPgnDetails && (
                <ImportedPgnPanel
                  viewId="imported-pgn"
                  onClose={closeImportedPgn}
                  importedPgnData={importedPgnData}
                  importedMainlineComments={importedMainlineComments}
                />
              )}
          </>
        )}
      </BoardWorkspace>
    </>
  );
}

export default AppWorkspaceContent;
