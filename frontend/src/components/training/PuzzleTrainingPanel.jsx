import {
  LICHESS_PUZZLE_COLOR_OPTIONS,
  LICHESS_PUZZLE_DIFFICULTY_OPTIONS,
} from "../../utils/lichessPuzzles.js";
import {
  TRAINING_MODE_PUZZLE,
  TRAINING_STATUS_ACTIVE,
  TRAINING_STATUS_COMPLETED,
  TRAINING_STATUS_ENDED,
} from "../../utils/training.js";

const puzzleFilterGridStyle = {
  display: "grid",
  gap: "0.75rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
};

const puzzleMetaGridStyle = {
  display: "grid",
  gap: "0.75rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
};

const puzzleTextInputStyle = {
  width: "100%",
  minHeight: 40,
  borderRadius: 8,
  border: "1px solid #334155",
  backgroundColor: "#0f172a",
  color: "#e2e8f0",
  padding: "0.65rem 0.75rem",
  font: "inherit",
};

function formatPlayer(player) {
  if (!player?.name) {
    return "Unknown";
  }

  return player.rating ? `${player.name} (${player.rating})` : player.name;
}

function getPuzzleStatusText(isPuzzleMode, status, currentPuzzleMove, solvedMoves, totalMoves) {
  if (!isPuzzleMode) {
    return "Load a Lichess puzzle to start solving.";
  }

  if (status === TRAINING_STATUS_COMPLETED) {
    return "Puzzle solved.";
  }

  if (status === TRAINING_STATUS_ENDED) {
    return "Puzzle failed.";
  }

  if (status === TRAINING_STATUS_ACTIVE && currentPuzzleMove) {
    return `Solve move ${Math.min(solvedMoves + 1, totalMoves)} of ${totalMoves}.`;
  }

  return "Puzzle ready.";
}

function PuzzleTrainingPanel({
  panelHeight,
  onClose,
  filters,
  setFilters,
  normalizedTrainingState,
  currentPuzzleMove,
  trainingLoading,
  trainingError,
  lastCompletedExpectedMove,
  lastCompletedTrainingAttempts,
  onStartPuzzle,
  onNextPuzzle,
  onRetryPuzzle,
  onResetPuzzle,
  onOpenLichessTokenPopup,
}) {
  const isPuzzleMode = normalizedTrainingState.mode === TRAINING_MODE_PUZZLE;
  const puzzle = normalizedTrainingState.puzzle;
  const playerMoves = normalizedTrainingState.referenceMoves.filter(
    (move) => move.side === normalizedTrainingState.playerSide,
  );
  const solvedMoves = normalizedTrainingState.attempts.filter(
    (attempt) => attempt.side === normalizedTrainingState.playerSide,
  ).length;
  const totalMoves = playerMoves.length;
  const lastAttempt = lastCompletedTrainingAttempts[lastCompletedTrainingAttempts.length - 1] ?? null;
  const sourceGame = puzzle?.sourceGame ?? null;
  const whitePlayer = sourceGame?.players?.white ?? null;
  const blackPlayer = sourceGame?.players?.black ?? null;
  const statusText = getPuzzleStatusText(
    isPuzzleMode,
    normalizedTrainingState.status,
    currentPuzzleMove,
    solvedMoves,
    totalMoves,
  );

  return (
    <div
      className="card training-card"
      style={panelHeight ? { height: `${panelHeight}px` } : undefined}
    >
      <div className="card-header">
        <h2>Puzzle Mode</h2>
        <button
          type="button"
          className="card-close-button"
          onClick={onClose}
          aria-label="Close Puzzle Mode"
          title="Close Puzzle Mode"
        >
          ×
        </button>
      </div>
      <div className="training-card-body">
        <p className="current-move-label">{statusText}</p>

        <div className="annotation-section">
          <h3>Lichess filters</h3>
        </div>
        <div style={puzzleFilterGridStyle}>
          <label>
            <span className="annotation-label">Theme or opening</span>
            <input
              type="text"
              style={puzzleTextInputStyle}
              value={filters.angle}
              onChange={(event) =>
                setFilters((currentValue) => ({
                  ...currentValue,
                  angle: event.target.value,
                }))
              }
              placeholder="fork, mateIn2, italianGame..."
              spellCheck={false}
            />
          </label>
          <label>
            <span className="annotation-label">Difficulty</span>
            <select
              className="modal-input"
              value={filters.difficulty}
              onChange={(event) =>
                setFilters((currentValue) => ({
                  ...currentValue,
                  difficulty: event.target.value,
                }))
              }
            >
              {LICHESS_PUZZLE_DIFFICULTY_OPTIONS.map((option) => (
                <option key={option.value || "default"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="annotation-label">Color</span>
            <select
              className="modal-input"
              value={filters.color}
              onChange={(event) =>
                setFilters((currentValue) => ({
                  ...currentValue,
                  color: event.target.value,
                }))
              }
            >
              {LICHESS_PUZZLE_COLOR_OPTIONS.map((option) => (
                <option key={option.value || "default"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="annotation-actions">
          <button
            type="button"
            className="annotation-primary-button"
            onClick={isPuzzleMode ? onNextPuzzle : onStartPuzzle}
            disabled={trainingLoading}
          >
            {isPuzzleMode ? "Next puzzle" : "Load puzzle"}
          </button>
          <button
            type="button"
            className="annotation-secondary-button"
            onClick={onRetryPuzzle}
            disabled={!isPuzzleMode || trainingLoading}
          >
            Retry puzzle
          </button>
          <button
            type="button"
            className="annotation-secondary-button"
            onClick={onResetPuzzle}
            disabled={trainingLoading && !isPuzzleMode}
          >
            Clear puzzle
          </button>
          <button
            type="button"
            className="annotation-secondary-button"
            onClick={onOpenLichessTokenPopup}
          >
            Lichess token
          </button>
        </div>

        {trainingLoading && <p>Loading puzzle...</p>}
        {!trainingLoading && trainingError && <p className="error">{trainingError}</p>}

        {puzzle && (
          <>
            <div className="annotation-section">
              <h3>Puzzle details</h3>
            </div>
            <div style={puzzleMetaGridStyle}>
              <div className="training-summary-card">
                <span className="annotation-label">Puzzle ID</span>
                <strong>{puzzle.id}</strong>
              </div>
              <div className="training-summary-card">
                <span className="annotation-label">Rating</span>
                <strong>{puzzle.rating}</strong>
              </div>
              <div className="training-summary-card">
                <span className="annotation-label">Plays</span>
                <strong>{puzzle.plays.toLocaleString()}</strong>
              </div>
              <div className="training-summary-card">
                <span className="annotation-label">Perf</span>
                <strong>{sourceGame?.perf?.name ?? "Unknown"}</strong>
              </div>
            </div>

            {(whitePlayer || blackPlayer) && (
              <p>
                <strong>Game:</strong> {formatPlayer(whitePlayer)} vs {formatPlayer(blackPlayer)}
              </p>
            )}
            {sourceGame?.clock && (
              <p>
                <strong>Clock:</strong> {sourceGame.clock}
                {sourceGame.rated ? " rated" : " casual"}
              </p>
            )}
            {!!puzzle.themes.length && (
              <p>
                <strong>Themes:</strong> {puzzle.themes.join(", ")}
              </p>
            )}
            {sourceGame?.url && (
              <p>
                <strong>Source game:</strong>{" "}
                <a href={sourceGame.url} target="_blank" rel="noreferrer">
                  {sourceGame.id}
                </a>
              </p>
            )}
          </>
        )}

        {isPuzzleMode && currentPuzzleMove && normalizedTrainingState.status === TRAINING_STATUS_ACTIVE && (
          <>
            <div className="annotation-section">
              <h3>Current task</h3>
            </div>
            <p>
              Find the best move in the current position.
            </p>
          </>
        )}

        {isPuzzleMode && lastCompletedExpectedMove && lastAttempt && (
          <div className="annotation-item training-feedback">
            <div className="annotation-item-header">
              <span className="annotation-label">Last move</span>
              <span className="training-feedback-result">
                {lastAttempt.outcome === "match" ? "Correct" : "Incorrect"}
              </span>
            </div>
            <p className="training-feedback-detail">
              Expected {lastCompletedExpectedMove.san}. You played {lastAttempt.userSan}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PuzzleTrainingPanel;
