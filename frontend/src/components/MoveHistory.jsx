import { useEffect, useMemo, useRef } from "react";

const actionRowStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "0.75rem",
  marginTop: "1rem",
  flexWrap: "wrap",
};

const actionButtonStyle = {
  padding: "0.6rem 1rem",
  border: "1px solid #d0d7de",
  borderRadius: "0.5rem",
  backgroundColor: "#f6f8fa",
  color: "#24292f",
  fontWeight: 600,
  fontSize: "1rem",
  lineHeight: 1,
  minWidth: "2.75rem",
  cursor: "pointer",
  transition: "background-color 0.2s ease, transform 0.2s ease",
};

const disabledActionButtonStyle = {
  backgroundColor: "#eaeef2",
  color: "#8c959f",
  borderColor: "#d8dee4",
  cursor: "not-allowed",
  opacity: 0.75,
};

function MoveHistory({
  moveHistory,
  currentMoveIndex,
  boardPanelHeight,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onGoToStart,
  onGoToEnd,
}) {
  const moveHistoryRef = useRef(null);
  const selectedMoveRef = useRef(null);
  const groupedMoveHistory = useMemo(
    () =>
      moveHistory.reduce((pairs, move, index) => {
        if (index % 2 === 0) {
          pairs.push({
            moveNumber: Math.floor(index / 2) + 1,
            white: move,
            whiteIndex: index,
            black: null,
            blackIndex: null,
          });
        } else {
          pairs[pairs.length - 1].black = move;
          pairs[pairs.length - 1].blackIndex = index;
        }

        return pairs;
      }, []),
    [moveHistory],
  );

  useEffect(() => {
    const moveHistoryElement = moveHistoryRef.current;
    const selectedMoveElement = selectedMoveRef.current;

    if (!moveHistoryElement || !selectedMoveElement) {
      return;
    }

    const containerRect = moveHistoryElement.getBoundingClientRect();
    const selectedRect = selectedMoveElement.getBoundingClientRect();
    const topOffset = selectedRect.top - containerRect.top;
    const bottomOffset = selectedRect.bottom - containerRect.bottom;

    if (topOffset < 0) {
      moveHistoryElement.scrollTop += topOffset - 8;
      return;
    }

    if (bottomOffset > 0) {
      moveHistoryElement.scrollTop += bottomOffset + 8;
    }
  }, [currentMoveIndex]);

  return (
    <div
      className="card move-history-card"
      style={boardPanelHeight ? { height: `${boardPanelHeight}px` } : undefined}
    >
      <h2>Move History</h2>
      <div className="move-history-body">
        {!groupedMoveHistory.length && <p className="annotation-empty">No moves yet.</p>}
        {!!groupedMoveHistory.length && (
          <ol className="move-history" ref={moveHistoryRef}>
            {groupedMoveHistory.map(
              ({ moveNumber, white, whiteIndex, black, blackIndex }) => (
                <li key={moveNumber} className="move-row">
                  <span className="move-number">{moveNumber}.</span>
                  <span
                    ref={whiteIndex === currentMoveIndex ? selectedMoveRef : null}
                    className={`move-entry${whiteIndex === currentMoveIndex ? " move-entry-selected" : ""}`}
                  >
                    {white}
                  </span>
                  <span
                    ref={blackIndex === currentMoveIndex ? selectedMoveRef : null}
                    className={`move-entry${blackIndex === currentMoveIndex ? " move-entry-selected" : ""}`}
                  >
                    {black || "..."}
                  </span>
                </li>
              ),
            )}
          </ol>
        )}
      </div>
      <div style={actionRowStyle}>
        <button
          type="button"
          onClick={onGoToStart}
          disabled={!canUndo}
          aria-label="Go to start"
          title="Go to start"
          style={{ ...actionButtonStyle, ...(!canUndo ? disabledActionButtonStyle : {}) }}
        >
          ⏮
        </button>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo"
          style={{ ...actionButtonStyle, ...(!canUndo ? disabledActionButtonStyle : {}) }}
        >
          ◀
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo"
          style={{ ...actionButtonStyle, ...(!canRedo ? disabledActionButtonStyle : {}) }}
        >
          ▶
        </button>
        <button
          type="button"
          onClick={onGoToEnd}
          disabled={!canRedo}
          aria-label="Go to end"
          title="Go to end"
          style={{ ...actionButtonStyle, ...(!canRedo ? disabledActionButtonStyle : {}) }}
        >
          ⏭
        </button>
      </div>
    </div>
  );
}

export default MoveHistory;
