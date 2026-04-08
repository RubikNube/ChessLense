import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import "./App.css";

function App() {
  const [game, setGame] = useState(new Chess());
  const [engineResult, setEngineResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const fen = useMemo(() => game.fen(), [game]);

  function safeGameMutate(modify) {
    const next = new Chess(game.fen());
    modify(next);
    setGame(next);
  }

  function handlePieceDrop({ sourceSquare, targetSquare }) {
    console.log(`Attempting move from ${sourceSquare} to ${targetSquare}`);
    let move = null;

    safeGameMutate((next) => {
      move = next.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });
    });

    return !!move;
  }

  async function analyzePosition() {
    setLoading(true);
    setEngineResult(null);

    try {
      const response = await fetch("http://localhost:3001/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fen,
          depth: 12,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Request failed");
      }

      setEngineResult(data);
    } catch (error) {
      setEngineResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  function resetGame() {
    setGame(new Chess());
    setEngineResult(null);
  }

  return (
    <div className="app">
      <div className="board-panel">
        <div className="chessboard-wrapper">
          <Chessboard
            options={{
              position: fen,
              onPieceDrop: handlePieceDrop,
            }}
          />
        </div>
      </div>

      <div className="side-panel">
        <h1>ChessLense</h1>

        <button onClick={analyzePosition} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze with Stockfish"}
        </button>

        <button onClick={resetGame}>Reset</button>

        <div className="card">
          <h2>FEN</h2>
          <code>{fen}</code>
        </div>

        <div className="card">
          <h2>Engine</h2>
          {engineResult?.error && <p className="error">{engineResult.error}</p>}
          {!engineResult && !loading && <p>No analysis yet.</p>}
          {engineResult?.bestmove && (
            <>
              <p>
                <strong>Best move:</strong> {engineResult.bestmove}
              </p>
              <p>
                <strong>Evaluation:</strong>{" "}
                {engineResult.evaluation
                  ? `${engineResult.evaluation.type} ${engineResult.evaluation.value}`
                  : "n/a"}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
