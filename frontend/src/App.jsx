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
  const [boardOrientation, setBoardOrientation] = useState("white");

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

  function handlePieceDrop(sourceSquareOrMove, maybeTargetSquare) {
    const sourceSquare =
      typeof sourceSquareOrMove === "string"
        ? sourceSquareOrMove
        : sourceSquareOrMove?.sourceSquare;
    const targetSquare =
      typeof maybeTargetSquare === "string"
        ? maybeTargetSquare
        : sourceSquareOrMove?.targetSquare;

    if (!sourceSquare || !targetSquare) {
      return false;
    }

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

  function handleMenuAction(action) {
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

  function toggleBoardOrientation() {
    setBoardOrientation((currentValue) =>
      currentValue === "white" ? "black" : "white",
    );
  }

  return (
    <div className="app">
      <nav className="top-menu" aria-label="Application menu">
        <div className="menu-group">
          <button type="button" className="menu-trigger" onClick={() => toggleMenu("engine")}>
            Engine
          </button>
          {openMenu === "engine" && (
            <div className="menu-dropdown">
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(analyzePosition)}
              >
                Analyze with Stockfish
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
              <button type="button" className="menu-entry" onClick={() => handleMenuAction()}>
                Undo
              </button>
              <button type="button" className="menu-entry" onClick={() => handleMenuAction()}>
                Copy FEN
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(resetGame)}
              >
                Reset
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
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(toggleBoardOrientation)}
              >
                Flip Board
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(toggleMoveHistory)}
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
                  handleMenuAction(() =>
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
              <button type="button" className="menu-entry" onClick={() => handleMenuAction()}>
                Keyboard Shortcuts
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="board-panel">
        <div className="chessboard-wrapper">
          <Chessboard
            position={fen}
            onPieceDrop={handlePieceDrop}
            boardOrientation={boardOrientation}
            options={{
              position: fen,
              onPieceDrop: handlePieceDrop,
              boardOrientation,
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
