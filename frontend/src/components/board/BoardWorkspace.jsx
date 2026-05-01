import { Chessboard } from "react-chessboard";
import EvaluationBar from "../EvaluationBar.jsx";
import MoveHistory from "../MoveHistory.jsx";

function BoardWorkspace({
  boardRenderKey,
  isTrainingFocusMode,
  boardPanelRef,
  fen,
  onPieceDrop,
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
    <div className={`workspace${isTrainingFocusMode ? " workspace-training-focus" : ""}`}>
      <div className="board-panel" ref={boardPanelRef}>
        <div className="board-and-evaluation">
          <div className="chessboard-wrapper">
            <Chessboard
              key={boardRenderKey}
              position={fen}
              onPieceDrop={onPieceDrop}
              boardOrientation={boardOrientation}
              arrows={boardArrows}
              squareStyles={boardSquareStyles}
              options={{
                position: fen,
                onPieceDrop,
                boardOrientation,
                arrows: boardArrows,
                squareStyles: boardSquareStyles,
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
