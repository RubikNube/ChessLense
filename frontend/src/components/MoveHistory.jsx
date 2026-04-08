import { useMemo } from "react";

function MoveHistory({ game }) {
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
    </div>
  );
}

export default MoveHistory;
