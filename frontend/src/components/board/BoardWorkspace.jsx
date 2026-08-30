import { Children, Fragment, isValidElement, useEffect, useState } from "react";
import { Chessboard } from "react-chessboard";
import EvaluationBar from "../EvaluationBar.jsx";
import MoveHistory from "../MoveHistory.jsx";
import MobileMoveStrip from "./MobileMoveStrip.jsx";
import SortableViewLayout from "../app/SortableViewLayout.jsx";
import { THEME_CSS_VARS } from "../../utils/theme.js";

const MOBILE_VIEWPORT_QUERY = "(max-width: 640px)";

function getIsMobileViewport() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(MOBILE_VIEWPORT_QUERY).matches
  );
}

function useIsMobileViewport() {
  const [isMobileViewport, setIsMobileViewport] = useState(getIsMobileViewport);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_VIEWPORT_QUERY);
    const handleChange = (event) => setIsMobileViewport(event.matches);

    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isMobileViewport;
}

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
  belowBoardContent,
  onRevertMovesUntil,
  getVariantOptionsForMove,
  onSelectVariant,
  viewLayout,
  onViewLayoutChange,
  showViewLayout,
  children,
}) {
  const isMobileViewport = useIsMobileViewport();
  const viewLabels = {
    "move-history": "Move History",
    "play-computer": "Play vs Computer",
    "puzzle-training": "Puzzle Training",
    "replay-training": "Replay Training",
    "guess-training": "Guess the Move",
    "opening-tree": "Opening Tree",
    "otb-player-opening-tree": "Player Opening Tree",
    engine: "Engine",
    "game-analysis": "Whole Game Analysis",
    comments: "Comments",
    variants: "Variants",
    "imported-pgn": "Imported PGN",
  };
  const childViews = {};

  function collectViewElements(nodes) {
    Children.forEach(nodes, (node) => {
      if (!isValidElement(node)) {
        return;
      }

      if (node.type === Fragment) {
        collectViewElements(node.props.children);
      } else if (node.props.viewId && viewLabels[node.props.viewId]) {
        childViews[node.props.viewId] = {
          label: viewLabels[node.props.viewId],
          content: node,
        };
      }
    });
  }

  collectViewElements(children);
  const views = {
    ...(showMoveHistory && !isMobileViewport
      ? {
          "move-history": {
            label: "Move History",
            content: (
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
            ),
          },
        }
      : {}),
    ...childViews,
  };

  return (
    <div
      className={`workspace${isTrainingFocusMode ? " workspace-training-focus" : ""}`}
    >
      <div className="board-panel" ref={boardPanelRef}>
        {showMoveHistory && isMobileViewport && (
          <MobileMoveStrip
            moveHistoryItems={moveHistoryItems}
            currentMoveIndex={currentMoveIndex}
            onSelectMove={onSelectMove}
            getVariantOptionsForMove={getVariantOptionsForMove}
            onSelectVariant={onSelectVariant}
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

        {belowBoardContent}

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

      {!showViewLayout || isTrainingFocusMode ? (
        <div className="info-column info-column-training-focus">{children}</div>
      ) : (
        <SortableViewLayout
          layout={viewLayout}
          onLayoutChange={onViewLayoutChange}
          views={views}
        />
      )}
    </div>
  );
}

export default BoardWorkspace;
