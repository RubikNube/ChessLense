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
  const [redoStack, setRedoStack] = useState([]);

  function cloneGame(sourceGame) {
    const next = new Chess();

    if (sourceGame.history().length) {
      next.loadPgn(sourceGame.pgn());
    }

    return next;
  }

  const fen = useMemo(() => game.fen(), [game]);
  const canUndo = game.history().length > 0;
  const canRedo = redoStack.length > 0;

  function safeGameMutate(modify) {
    const next = cloneGame(game);
    const result = modify(next);

    if (!result) {
      return null;
    }

    setGame(next);
    setRedoStack([]);
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

  function undoMove() {
    const next = cloneGame(game);
    const undoneMove = next.undo();

    if (!undoneMove) {
      return;
    }

    setGame(next);
    setRedoStack((currentValue) => [
      {
        from: undoneMove.from,
        to: undoneMove.to,
        promotion: undoneMove.promotion,
      },
      ...currentValue,
    ]);
    setEngineResult(null);
  }

  function redoMove() {
    const moveToRedo = redoStack[0];

    if (!moveToRedo) {
      return;
    }

    const next = cloneGame(game);
    const move = {
      from: moveToRedo.from,
      to: moveToRedo.to,
      ...(moveToRedo.promotion ? { promotion: moveToRedo.promotion } : {}),
    };
    const redoneMove = next.move(move);

    if (!redoneMove) {
      return;
    }

    setGame(next);
    setRedoStack((currentValue) => currentValue.slice(1));
    setEngineResult(null);
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
    setRedoStack([]);
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
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(undoMove)}
                disabled={!canUndo}
              >
                Undo
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => handleMenuAction(redoMove)}
                disabled={!canRedo}
              >
                Redo
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

        {showMoveHistory && (
          <MoveHistory
            game={game}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undoMove}
            onRedo={redoMove}
          />
        )}
      </div>
    </div>
  );
}

export default App;
