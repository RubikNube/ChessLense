import { useMemo } from "react";

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
  game,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onGoToStart,
  onGoToEnd,
}) {
  const moveHistory = useMemo(() => {
    const moves = game.history();

    return moves.reduce((pairs, move, index) => {
      if (index % 2 === 0) {
        pairs.push({
          moveNumber: Math.floor(index / 2) + 1,
          white: move,
          black: null,
        });
      } else {
        pairs[pairs.length - 1].black = move;
      }

      return pairs;
    }, []);
  }, [game]);

  return (
    <div className="card">
      <h2>Move History</h2>
      {!moveHistory.length && <p>No moves yet.</p>}
      {!!moveHistory.length && (
        <ol className="move-history">
          {moveHistory.map(({ moveNumber, white, black }) => (
            <li key={moveNumber} className="move-row">
              <span className="move-number">{moveNumber}.</span>
              <span className="move-entry">{white}</span>
              <span className="move-entry">{black || "..."}</span>
            </li>
          ))}
        </ol>
      )}
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
