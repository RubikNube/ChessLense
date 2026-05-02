import { useEffect, useRef } from "react";

import {
  getGuessTheMovePoints,
  TRAINING_MODE_GUESS_THE_MOVE,
  TRAINING_SIDE_BLACK,
  TRAINING_SIDE_WHITE,
  TRAINING_STATUS_COMPLETED,
} from "../../utils/training.js";

function formatMoveLabel(move) {
  if (!move || typeof move !== "object") {
    return "Move";
  }

  if (
    typeof move.moveNumber === "number" &&
    move.moveNumber > 0 &&
    typeof move.san === "string" &&
    move.san
  ) {
    return move.side === "black"
      ? `${move.moveNumber}... ${move.san}`
      : `${move.moveNumber}. ${move.san}`;
  }

  return move.san ?? "Move";
}

function formatReplayDelta(deltaCp) {
  if (!Number.isFinite(deltaCp)) {
    return "n/a";
  }

  const pawns = deltaCp / 100;
  return pawns > 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
}

function formatPoints(points) {
  if (!Number.isFinite(points)) {
    return "0";
  }

  return points > 0 ? `+${points}` : String(points);
}

function getAttemptLabel(attempt) {
  if (!attempt || typeof attempt !== "object") {
    return "Scored";
  }

  if (attempt.outcome === "match") {
    return "Game move";
  }

  if (attempt.classification === "better") {
    return "Better";
  }

  if (attempt.classification === "equal") {
    return "Equal";
  }

  if (attempt.classification === "worse") {
    return attempt.isCritical ? "Significantly worse" : "Worse";
  }

  return "Scored";
}

function getAttemptClassName(attempt) {
  if (!attempt || typeof attempt !== "object") {
    return "training-result-badge training-result-badge-neutral";
  }

  if (attempt.outcome === "match") {
    return "training-result-badge training-result-badge-match";
  }

  if (attempt.classification === "better") {
    return "training-result-badge training-result-badge-better";
  }

  if (attempt.classification === "equal") {
    return "training-result-badge training-result-badge-equal";
  }

  if (attempt.classification === "worse") {
    return "training-result-badge training-result-badge-worse";
  }

  return "training-result-badge training-result-badge-neutral";
}

function TrainingPanelHeader({ title, onClose, closeLabel }) {
  return (
    <div className="card-header">
      <h2>{title}</h2>
      <button
        type="button"
        className="card-close-button"
        onClick={onClose}
        aria-label={closeLabel}
        title={closeLabel}
      >
        ×
      </button>
    </div>
  );
}

function TrainingSideSelector({
  normalizedTrainingState,
  setTrainingPlayerSide,
  whiteTrainingLabel,
  blackTrainingLabel,
  disabled,
}) {
  return (
    <div className="training-side-selector">
      <span className="annotation-label">Play as</span>
      <div className="training-side-options">
        <button
          type="button"
          className={
            normalizedTrainingState.playerSide === TRAINING_SIDE_WHITE
              ? "annotation-primary-button"
              : "annotation-secondary-button"
          }
          onClick={() => setTrainingPlayerSide(TRAINING_SIDE_WHITE)}
          disabled={disabled}
        >
          {whiteTrainingLabel}
        </button>
        <button
          type="button"
          className={
            normalizedTrainingState.playerSide === TRAINING_SIDE_BLACK
              ? "annotation-primary-button"
              : "annotation-secondary-button"
          }
          onClick={() => setTrainingPlayerSide(TRAINING_SIDE_BLACK)}
          disabled={disabled}
        >
          {blackTrainingLabel}
        </button>
      </div>
    </div>
  );
}

function getEvaluationText(summary) {
  if (!summary || typeof summary !== "object") {
    return "No moves were scored yet.";
  }

  if (!summary.attemptedMoves) {
    return "No moves were scored yet. Start the training to build an evaluation.";
  }

  if (summary.remainingMoves > 0) {
    return `Scored ${summary.totalScore} points across ${summary.attemptedMoves} guessed moves. That's ${summary.completedParScore} par on completed moves and ${summary.parScore} full par overall.`;
  }

  return `Finished on ${summary.totalScore} out of ${summary.parScore} par across all ${summary.totalMoves} target moves.`;
}

function GuessTheMoveTrainingPanel({
  panelHeight,
  onClose,
  hasReplaySource,
  normalizedTrainingState,
  setTrainingPlayerSide,
  isGuessTrainingActive,
  isGuessTrainingEnded,
  activeTrainingPlaySession,
  isTrainingPlayActive,
  isEngineOpponentUserTurn,
  trainingLoading,
  whiteTrainingLabel,
  blackTrainingLabel,
  currentGuessMoveNumber,
  currentGuessMove,
  guessTheMoveSummary,
  trainingError,
  currentMoveLabel,
  showTrainingPreview,
  hideTrainingPreview,
  lastCompletedTrainingAttempts,
  lastCompletedExpectedMove,
  startTrainingPlayMode,
  exitTrainingPlayMode,
  startGuessTraining,
  endGuessTraining,
  resetTrainingSession,
}) {
  const isGuessMode = normalizedTrainingState.mode === TRAINING_MODE_GUESS_THE_MOVE;
  const isGuessSessionFinished =
    normalizedTrainingState.status === TRAINING_STATUS_COMPLETED || isGuessTrainingEnded;
  const shouldShowSummary = isGuessMode && isGuessSessionFinished;
  const sideSelectionDisabled = isGuessTrainingActive || trainingLoading;
  const summaryRef = useRef(null);
  const lastAttempt = lastCompletedTrainingAttempts[0] ?? null;

  useEffect(() => {
    if (!shouldShowSummary) {
      return;
    }

    summaryRef.current?.scrollIntoView({ block: "start" });
  }, [shouldShowSummary]);

  return (
    <div
      className="card training-card"
      style={panelHeight ? { height: `${panelHeight}px` } : undefined}
    >
      <TrainingPanelHeader
        title="Guess The Move Training"
        onClose={onClose}
        closeLabel="Close Guess The Move Training"
      />
      <div className="training-card-body">
        <TrainingSideSelector
          normalizedTrainingState={normalizedTrainingState}
          setTrainingPlayerSide={setTrainingPlayerSide}
          whiteTrainingLabel={whiteTrainingLabel}
          blackTrainingLabel={blackTrainingLabel}
          disabled={sideSelectionDisabled}
        />
        {!hasReplaySource && (
          <p className="annotation-empty">
            Import a game to enable guess the move training.
          </p>
        )}
        {hasReplaySource && (
          <>
            <p className="current-move-label">
              {isGuessMode && normalizedTrainingState.status === TRAINING_STATUS_COMPLETED
                ? "Guess the move complete"
                : isGuessTrainingEnded
                  ? "Guess the move ended"
                  : isGuessTrainingActive
                    ? `Guess move ${Math.min(currentGuessMoveNumber, guessTheMoveSummary.totalMoves)} of ${guessTheMoveSummary.totalMoves}`
                    : "Guess the move mode is ready."}
            </p>
            <div className="training-summary-grid">
              <div className="training-summary-card">
                <span className="annotation-label">Score</span>
                <strong>{guessTheMoveSummary.totalScore}</strong>
              </div>
              <div className="training-summary-card">
                <span className="annotation-label">Par</span>
                <strong>{guessTheMoveSummary.parScore}</strong>
              </div>
              <div className="training-summary-card">
                <span className="annotation-label">Moves scored</span>
                <strong>
                  {guessTheMoveSummary.attemptedMoves}/{guessTheMoveSummary.totalMoves}
                </strong>
              </div>
            </div>
            {!isGuessMode && (
              <p className="annotation-empty">
                Start guess mode to score one move at a time against the imported game.
              </p>
            )}
            {isTrainingPlayActive && activeTrainingPlaySession && (
              <div className="annotation-item training-feedback">
                <div className="annotation-item-header">
                  <span className="annotation-label">Play vs computer</span>
                  <span className="training-feedback-result">
                    {isEngineOpponentUserTurn ? "Your move" : "Computer move"}
                  </span>
                </div>
                <p>
                  Exploring the position after{" "}
                  <strong>{activeTrainingPlaySession.sourceAttempt.userSan}</strong>. Return
                  to training to resume Guess The Move exactly where you left it.
                </p>
                <div className="annotation-item-actions">
                  <button
                    type="button"
                    className="annotation-secondary-button"
                    onClick={exitTrainingPlayMode}
                    disabled={trainingLoading}
                  >
                    Return to training
                  </button>
                </div>
              </div>
            )}
            {!isTrainingPlayActive && isGuessTrainingActive && currentGuessMove && (
              <p className="annotation-empty">
                Play the next move on the board. You only get one try; the game move is
                revealed immediately after your guess. Current position:{" "}
                <strong>{currentMoveLabel}</strong>.
              </p>
            )}
            {trainingLoading && !isTrainingPlayActive && (
              <p className="annotation-empty">Comparing your move with the game move...</p>
            )}
            {trainingError && <p className="error">{trainingError}</p>}
            {!isTrainingPlayActive && !shouldShowSummary && lastAttempt && lastCompletedExpectedMove && (
              <div
                className={`annotation-item training-feedback${lastAttempt.isCritical ? " training-feedback-critical" : ""}`}
              >
                <div className="annotation-item-header">
                  <span className="annotation-label">Last scored move</span>
                  <span className={getAttemptClassName(lastAttempt)}>
                    {getAttemptLabel(lastAttempt)}
                  </span>
                </div>
                <p>
                  <strong
                    className={lastCompletedExpectedMove.fenAfter ? "training-preview-trigger" : undefined}
                    tabIndex={lastCompletedExpectedMove.fenAfter ? 0 : undefined}
                    onMouseEnter={(event) =>
                      showTrainingPreview(
                        { resultingFen: lastCompletedExpectedMove.fenAfter },
                        event.currentTarget,
                      )
                    }
                    onMouseLeave={hideTrainingPreview}
                    onFocus={(event) =>
                      showTrainingPreview(
                        { resultingFen: lastCompletedExpectedMove.fenAfter },
                        event.currentTarget,
                      )
                    }
                    onBlur={hideTrainingPreview}
                  >
                    {formatMoveLabel(lastCompletedExpectedMove)}
                  </strong>{" "}
                  was the game move. You played{" "}
                  <strong
                    className={lastAttempt.resultingFen ? "training-preview-trigger" : undefined}
                    tabIndex={lastAttempt.resultingFen ? 0 : undefined}
                    onMouseEnter={(event) => showTrainingPreview(lastAttempt, event.currentTarget)}
                    onMouseLeave={hideTrainingPreview}
                    onFocus={(event) => showTrainingPreview(lastAttempt, event.currentTarget)}
                    onBlur={hideTrainingPreview}
                  >
                    {lastAttempt.userSan}
                  </strong>
                  .
                </p>
                <p className="training-feedback-detail">
                  <strong>Points:</strong> {formatPoints(getGuessTheMovePoints(lastAttempt))}
                  {lastAttempt.outcome !== "match" && (
                    <>
                      {" · "}
                      <strong>Delta:</strong> {formatReplayDelta(lastAttempt.deltaCp)} pawns
                    </>
                  )}
                </p>
                {lastAttempt.outcome !== "match" && lastAttempt.resultingFen && (
                  <div className="annotation-item-actions">
                    <button
                      type="button"
                      className="annotation-secondary-button"
                      onClick={() => startTrainingPlayMode(lastAttempt)}
                      disabled={isTrainingPlayActive || trainingLoading}
                    >
                      Play vs computer
                    </button>
                  </div>
                )}
              </div>
            )}
            {!isTrainingPlayActive && shouldShowSummary && (
              <>
                <div ref={summaryRef} className="annotation-section">
                  <h3>Final evaluation</h3>
                </div>
                <div className="training-summary-grid">
                  <div className="training-summary-card">
                    <span className="annotation-label">Evaluation</span>
                    <strong>{guessTheMoveSummary.evaluation.label}</strong>
                  </div>
                  <div className="training-summary-card">
                    <span className="annotation-label">Score</span>
                    <strong>{guessTheMoveSummary.totalScore}</strong>
                  </div>
                  <div className="training-summary-card">
                    <span className="annotation-label">Par</span>
                    <strong>{guessTheMoveSummary.parScore}</strong>
                  </div>
                  <div className="training-summary-card">
                    <span className="annotation-label">Completed par</span>
                    <strong>{guessTheMoveSummary.completedParScore}</strong>
                  </div>
                  <div className="training-summary-card">
                    <span className="annotation-label">Matches</span>
                    <strong>{guessTheMoveSummary.matchedMoves}</strong>
                  </div>
                  <div className="training-summary-card">
                    <span className="annotation-label">Equal or better</span>
                    <strong>
                      {guessTheMoveSummary.betterMoves + guessTheMoveSummary.equalMoves}
                    </strong>
                  </div>
                </div>
                <p>{getEvaluationText(guessTheMoveSummary)}</p>
                <div className="annotation-section">
                  <h3>Move history</h3>
                  {guessTheMoveSummary.moveHistory.length > 0 ? (
                    <ol className="training-summary-history">
                      {guessTheMoveSummary.moveHistory.map((moveEntry) => (
                        <li
                          key={`${moveEntry.ply}-${moveEntry.expectedSan}`}
                          className="training-summary-history-entry"
                        >
                          <div className="training-summary-history-header">
                            <span className="annotation-label">
                              {formatMoveLabel({
                                moveNumber: moveEntry.moveNumber,
                                side: moveEntry.side,
                                san: moveEntry.expectedSan,
                              })}
                            </span>
                            <strong
                              className={moveEntry.expectedResultingFen ? "training-preview-trigger" : undefined}
                              tabIndex={moveEntry.expectedResultingFen ? 0 : undefined}
                              onMouseEnter={(event) =>
                                showTrainingPreview(
                                  { resultingFen: moveEntry.expectedResultingFen },
                                  event.currentTarget,
                                )
                              }
                              onMouseLeave={hideTrainingPreview}
                              onFocus={(event) =>
                                showTrainingPreview(
                                  { resultingFen: moveEntry.expectedResultingFen },
                                  event.currentTarget,
                                )
                              }
                              onBlur={hideTrainingPreview}
                            >
                              {moveEntry.expectedSan}
                            </strong>
                          </div>
                          <div
                            className={`training-summary-history-attempt${moveEntry.resultingFen ? " training-preview-trigger" : ""}`}
                            tabIndex={moveEntry.resultingFen ? 0 : undefined}
                            onMouseEnter={(event) =>
                              showTrainingPreview(
                                { resultingFen: moveEntry.resultingFen },
                                event.currentTarget,
                              )
                            }
                            onMouseLeave={hideTrainingPreview}
                            onFocus={(event) =>
                              showTrainingPreview(
                                { resultingFen: moveEntry.resultingFen },
                                event.currentTarget,
                              )
                            }
                            onBlur={hideTrainingPreview}
                          >
                            <span
                              className={getAttemptClassName({
                                outcome: moveEntry.outcome,
                                classification: moveEntry.classification,
                                isCritical: moveEntry.isCritical,
                              })}
                            >
                              {getAttemptLabel({
                                outcome: moveEntry.outcome,
                                classification: moveEntry.classification,
                                isCritical: moveEntry.isCritical,
                              })}
                            </span>
                            <span>
                              Played {moveEntry.userSan} ({formatPoints(moveEntry.points)})
                            </span>
                            {moveEntry.outcome !== "match" && (
                              <>
                                <span className="training-feedback-detail">
                                  Delta {formatReplayDelta(moveEntry.deltaCp)}
                                  {moveEntry.isCritical ? " - critical" : ""}
                                </span>
                                {moveEntry.sourceAttempt?.resultingFen && (
                                  <button
                                    type="button"
                                    className="annotation-secondary-button"
                                    onClick={() => startTrainingPlayMode(moveEntry.sourceAttempt)}
                                    disabled={isTrainingPlayActive || trainingLoading}
                                  >
                                    Play vs computer
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="annotation-empty">
                      No scored moves to list yet.
                    </p>
                  )}
                </div>
              </>
            )}
            <div className="annotation-editor-actions">
              <button
                type="button"
                className="annotation-primary-button"
                onClick={startGuessTraining}
                disabled={trainingLoading}
              >
                {isGuessMode
                  ? isGuessSessionFinished
                    ? "Guess again"
                    : "Restart guess mode"
                  : "Start guess the move"}
              </button>
              {isGuessMode && (
                <button
                  type="button"
                  className="annotation-secondary-button"
                  onClick={isGuessTrainingActive ? endGuessTraining : resetTrainingSession}
                  disabled={trainingLoading}
                >
                  {isGuessTrainingActive ? "End Training" : "Clear training"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default GuessTheMoveTrainingPanel;
