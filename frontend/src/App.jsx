import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import MoveHistory from "./components/MoveHistory.jsx";
import "./App.css";

function App() {
  const [game, setGame] = useState(new Chess());
  const [engineResult, setEngineResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [showMoveHistory, setShowMoveHistory] = useState(true);

  const fen = useMemo(() => game.fen(), [game]);

  function safeGameMutate(modify) {
    const next = new Chess();

    if (game.history().length) {
      next.loadPgn(game.pgn());
    }

    const result = modify(next);

    if (!result) {
      return null;
    }

    setGame(next);
    setEngineResult(null);

    return result;
  }

  function handlePieceDrop({ sourceSquare, targetSquare }) {
    return !!safeGameMutate((next) =>
      next.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      }),
    );
  }

  function toggleMenu(menuName) {
    setOpenMenu((currentMenu) => (currentMenu === menuName ? null : menuName));
  }

  function handleMenuAction(label, action) {
    setOpenMenu(null);

    if (action) {
      action();
    }
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

  function toggleMoveHistory() {
    setShowMoveHistory((currentValue) => !currentValue);
  }

  return (
    <div className="app">
      <nav className="top-menu" aria-label="Application menu">
        <div className="menu-group">
          <button type="button" className="menu-trigger" onClick={() => toggleMenu("file")}>
            File
          </button>
          {openMenu === "file" && (
            <div className="menu-dropdown">
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction("Analyze with Stockfish", analyzePosition)}
              >
                Analyze with Stockfish
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction("Reset", resetGame)}
              >
                Reset
              </button>
            </div>
          )}
        </div>

        <div className="menu-group">
          <button type="button" className="menu-trigger" onClick={() => toggleMenu("edit")}>
            Edit
          </button>
          {openMenu === "edit" && (
            <div className="menu-dropdown">
              <button type="button" className="menu-entry" onClick={() => handleMenuAction("Undo")}>
                Undo
              </button>
              <button type="button" className="menu-entry" onClick={() => handleMenuAction("Copy FEN")}>
                Copy FEN
              </button>
            </div>
          )}
        </div>

        <div className="menu-group">
          <button type="button" className="menu-trigger" onClick={() => toggleMenu("view")}>
            View
          </button>
          {openMenu === "view" && (
            <div className="menu-dropdown">
              <button type="button" className="menu-entry" onClick={() => handleMenuAction("Flip Board")}>
                Flip Board
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() =>
                  handleMenuAction(
                    showMoveHistory ? "Hide Move History" : "Show Move History",
                    toggleMoveHistory,
                  )
                }
              >
                {showMoveHistory ? "Hide Move History" : "Show Move History"}
              </button>
            </div>
          )}
        </div>

        <div className="menu-group">
          <button type="button" className="menu-trigger" onClick={() => toggleMenu("help")}>
            Help
          </button>
          {openMenu === "help" && (
            <div className="menu-dropdown">
              <button
                type="button"
                className="menu-entry"
                onClick={() =>
                  handleMenuAction("About ChessLense", () =>
                    window.open(
                      "https://github.com/RubikNube/ChessLense/tree/main",
                      "_blank",
                      "noopener,noreferrer",
                    ),
                  )
                }
              >
                About ChessLense
              </button>
              <button type="button" className="menu-entry" onClick={() => handleMenuAction("Keyboard Shortcuts")}>
                Keyboard Shortcuts
              </button>
            </div>
          )}
        </div>
      </nav>

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

        {showMoveHistory && <MoveHistory game={game} />}
      </div>
    </div>
  );
}

export default App;
