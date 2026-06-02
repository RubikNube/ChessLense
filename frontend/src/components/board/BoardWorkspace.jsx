import { Chessboard } from "react-chessboard";
import EvaluationBar from "../EvaluationBar.jsx";
import MoveHistory from "../MoveHistory.jsx";
import MobileMoveStrip from "./MobileMoveStrip.jsx";
import { THEME_CSS_VARS } from "../../utils/theme.js";

function BoardWorkspace({
  boardRenderKey,
  isTrainingFocusMode,
  boardPanelRef,
  position,
  onPieceDrop,
  onSquareClick,
  allowDragging,
  boardOrientation,
  boardArrows,
  boardSquareStyles,
  onSquareMouseDown,
  onSquareMouseUp,
  showEvaluationBar,
  evaluation,
  turn,
  showMoveHistory,
  moveHistoryItems,
  currentMoveIndex,
  boardPanelHeight,
  canUndo,
  canRedo,
  onCloseMoveHistory,
  onSelectMove,
  onUndo,
  onRedo,
  onGoToStart,
  onGoToEnd,
  onRevertMovesUntil,
  getVariantOptionsForMove,
  onSelectVariant,
  children,
}) {
  return (
    <div
      className={`workspace${isTrainingFocusMode ? " workspace-training-focus" : ""}`}
    >
      <div className="board-panel" ref={boardPanelRef}>
        {showMoveHistory && (
          <MobileMoveStrip
            moveHistoryItems={moveHistoryItems}
            currentMoveIndex={currentMoveIndex}
            onSelectMove={onSelectMove}
          />
        )}

        <div className="board-and-evaluation">
          <div className="chessboard-wrapper">
            <Chessboard
              key={boardRenderKey}
              position={position}
              onPieceDrop={onPieceDrop}
              boardOrientation={boardOrientation}
              arrows={boardArrows}
              squareStyles={boardSquareStyles}
              options={{
                position,
                onPieceDrop,
                onSquareClick,
                allowDragging,
                boardOrientation,
                arrows: boardArrows,
                squareStyles: boardSquareStyles,
                darkSquareStyle: {
                  backgroundColor: THEME_CSS_VARS.boardDarkSquare,
                },
                lightSquareStyle: {
                  backgroundColor: THEME_CSS_VARS.boardLightSquare,
                },
                onSquareMouseDown,
                onSquareMouseUp,
              }}
            />
          </div>
          {showEvaluationBar && (
            <EvaluationBar
              evaluation={evaluation}
              boardOrientation={boardOrientation}
              turn={turn}
            />
          )}
        </div>

        <div
          className="mobile-move-nav"
          role="group"
          aria-label="Move navigation"
        >
          <button
            type="button"
            className="mobile-move-nav-button"
            onClick={onGoToStart}
            disabled={!canUndo}
            aria-label="Go to start"
            title="Go to start"
          >
            ⏮
          </button>
          <button
            type="button"
            className="mobile-move-nav-button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Back"
            title="Back"
          >
            ◀
          </button>
          <button
            type="button"
            className="mobile-move-nav-button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Forward"
            title="Forward"
          >
            ▶
          </button>
          <button
            type="button"
            className="mobile-move-nav-button"
            onClick={onGoToEnd}
            disabled={!canRedo}
            aria-label="Go to end"
            title="Go to end"
          >
            ⏭
          </button>
        </div>
      </div>

      {!isTrainingFocusMode && (
        <div className="info-column info-column-navigation">
          {showMoveHistory && (
            <MoveHistory
              moveHistoryItems={moveHistoryItems}
              currentMoveIndex={currentMoveIndex}
              boardPanelHeight={boardPanelHeight}
              canUndo={canUndo}
              canRedo={canRedo}
              onClose={onCloseMoveHistory}
              onSelectMove={onSelectMove}
              onUndo={onUndo}
              onRedo={onRedo}
              onGoToStart={onGoToStart}
              onGoToEnd={onGoToEnd}
              onRevertMovesUntil={onRevertMovesUntil}
              getVariantOptionsForMove={getVariantOptionsForMove}
              onSelectVariant={onSelectVariant}
            />
          )}
        </div>
      )}

      <div
        className={`info-column info-column-reference${isTrainingFocusMode ? " info-column-training-focus" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

export default BoardWorkspace;
