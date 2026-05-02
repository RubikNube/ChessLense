import { useEffect, useRef } from "react";

import {
  TRAINING_COMPLETION_REVEALED,
  TRAINING_MODE_REPLAY_GAME,
  TRAINING_SIDE_BLACK,
  TRAINING_SIDE_WHITE,
  TRAINING_STATUS_COMPLETED,
  TRAINING_STATUS_ENDED,
} from "../../utils/training.js";

function formatReplayMoveLabel(move) {
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

function formatReplayGuessPrompt(move, previousMoveLabel) {
  if (!move || typeof move !== "object") {
    return "Keep guessing.";
  }

  if (move.side === "white") {
    return previousMoveLabel && previousMoveLabel !== "Game introduction"
      ? `Keep guessing for White's move after ${previousMoveLabel}.`
      : "Keep guessing for White's first move.";
  }

  return previousMoveLabel && previousMoveLabel !== "Game introduction"
    ? `Keep guessing for Black's reply to ${previousMoveLabel}.`
    : "Keep guessing for Black's move.";
}

function formatReplayDelta(deltaCp) {
  if (!Number.isFinite(deltaCp)) {
    return "n/a";
  }

  const pawns = deltaCp / 100;
  return pawns > 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
}

function getReplayAttemptResultLabel(attempt) {
  if (!attempt || typeof attempt !== "object") {
    return "n/a";
  }

  if (attempt.outcome === "match") {
    return "Match";
  }

  if (attempt.classification === "better") {
    return "Better";
  }

  if (attempt.classification === "equal") {
    return "Equal";
  }

  if (attempt.classification === "worse") {
    return "Worse";
  }

  return "n/a";
}

function getReplayAttemptResultClassName(attempt) {
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

function ReplayTrainingPanel({
  panelHeight,
  onClose,
  hasReplaySource,
  normalizedTrainingState,
  setTrainingPlayerSide,
  isReplayTrainingActive,
  isReplayTrainingEnded,
  isTrainingPlayActive,
  trainingLoading,
  whiteTrainingLabel,
  blackTrainingLabel,
  currentReplayMoveNumber,
  replaySummary,
  activeTrainingPlaySession,
  isEngineOpponentUserTurn,
  currentReplayMove,
  trainingError,
  pendingTrainingAttempts,
  currentMoveLabel,
  showTrainingPreview,
  hideTrainingPreview,
  startTrainingPlayMode,
  retryReplayMove,
  revealReplayMove,
  lastCompletedTrainingAttempts,
  lastCompletedExpectedMove,
  lastCompletedIncorrectTrainingAttempts,
  startReplayTraining,
  endReplayTraining,
  resetTrainingSession,
  exitTrainingPlayMode,
}) {
  const isReplayMode = normalizedTrainingState.mode === TRAINING_MODE_REPLAY_GAME;
  const isReplaySessionFinished =
    normalizedTrainingState.status === TRAINING_STATUS_COMPLETED || isReplayTrainingEnded;
  const shouldShowReplaySummary =
    isReplayMode && !isTrainingPlayActive && isReplaySessionFinished;
  const shouldShowReplayFeedback = isReplayMode || isTrainingPlayActive;
  const sideSelectionDisabled = isReplayTrainingActive || isTrainingPlayActive || trainingLoading;
  const summaryRef = useRef(null);

  useEffect(() => {
    if (!shouldShowReplaySummary) {
      return;
    }

    summaryRef.current?.scrollIntoView({ block: "start" });
  }, [shouldShowReplaySummary]);

  return (
    <div
      className="card training-card"
      style={panelHeight ? { height: `${panelHeight}px` } : undefined}
    >
      <TrainingPanelHeader
        title="Replay Training"
        onClose={onClose}
        closeLabel="Close Replay Training"
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
            Import a game to enable replay training.
          </p>
        )}
        {hasReplaySource && (
          <>
            <p className="current-move-label">
              {isTrainingPlayActive
                ? "Exploring a wrong try against the computer"
                : isReplayMode &&
                    normalizedTrainingState.status === TRAINING_STATUS_COMPLETED
                  ? "Replay complete"
                  : isReplayTrainingEnded
                    ? "Replay ended"
                  : isReplayTrainingActive
                    ? `Replay move ${Math.min(currentReplayMoveNumber, replaySummary.totalMoves)} of ${replaySummary.totalMoves}`
                    : "Replay game mode is ready."}
            </p>
            {!isReplayMode && (
              <p className="annotation-empty">
                Start replay mode to test your moves against the imported game.
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
                  <strong>{activeTrainingPlaySession.sourceAttempt.userSan}</strong>.
                  Return to training to resume the replay exactly where you left it.
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
            {!isTrainingPlayActive && isReplayTrainingActive && currentReplayMove && (
              <p className="annotation-empty">
                Play the next move on the board. If you miss it, you can retry or reveal
                the next game move when you are ready.
              </p>
            )}
            {shouldShowReplayFeedback && trainingLoading && (
              <p className="annotation-empty">
                {isTrainingPlayActive
                  ? "Computer is thinking..."
                  : "Comparing your move with the game move..."}
              </p>
            )}
            {shouldShowReplayFeedback && trainingError && <p className="error">{trainingError}</p>}
            {!isTrainingPlayActive &&
              pendingTrainingAttempts.length > 0 &&
              currentReplayMove && (
                <div className="annotation-item training-feedback">
                  <div className="annotation-item-header">
                    <span className="annotation-label">Move not matched</span>
                    <span className="training-feedback-result">
                      {pendingTrainingAttempts.length} tries saved
                    </span>
                  </div>
                  <p>
                    {formatReplayGuessPrompt(currentReplayMove, currentMoveLabel)} Or reveal
                    the next move from the game.
                  </p>
                  <ul className="annotation-list training-attempt-list">
                    {pendingTrainingAttempts.map((attempt, index) => (
                      <li
                        key={`${attempt.ply}-${attempt.userSan}-${index}`}
                        className={`annotation-item${attempt.isCritical ? " training-feedback-critical" : ""}${attempt.resultingFen ? " training-preview-trigger" : ""}`}
                        tabIndex={attempt.resultingFen ? 0 : undefined}
                        onMouseEnter={(event) =>
                          showTrainingPreview(attempt, event.currentTarget)
                        }
                        onMouseLeave={hideTrainingPreview}
                        onFocus={(event) => showTrainingPreview(attempt, event.currentTarget)}
                        onBlur={hideTrainingPreview}
                      >
                        <div className="annotation-item-header">
                          <span className="annotation-label">Try {index + 1}</span>
                          <span className="training-feedback-result">
                            {attempt.classification === "better"
                              ? "Better"
                              : attempt.classification === "equal"
                                ? "Equal"
                                : attempt.classification === "worse"
                                  ? "Worse"
                                  : "n/a"}
                          </span>
                        </div>
                        <p>Played {attempt.userSan}.</p>
                        <p className="training-feedback-detail">
                          <strong>Delta:</strong> {formatReplayDelta(attempt.deltaCp)} pawns
                          {" "}vs the game move
                          {attempt.isCritical ? " - critical mistake" : ""}.
                        </p>
                        <div className="annotation-item-actions">
                          <button
                            type="button"
                            className="annotation-secondary-button"
                            onClick={() => startTrainingPlayMode(attempt)}
                            disabled={isTrainingPlayActive || trainingLoading}
                          >
                            Play vs computer
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="annotation-item-actions">
                    <button
                      type="button"
                      className="annotation-secondary-button"
                      onClick={retryReplayMove}
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      className="annotation-primary-button"
                      onClick={revealReplayMove}
                    >
                      Next move
                    </button>
                  </div>
                </div>
              )}
            {!isTrainingPlayActive &&
              !pendingTrainingAttempts.length &&
              lastCompletedTrainingAttempts.length > 0 &&
              lastCompletedExpectedMove && (
                <div className="annotation-item training-feedback">
                  <div className="annotation-item-header">
                    <span className="annotation-label">Last resolved move</span>
                    <span className="training-feedback-result">
                      {normalizedTrainingState.lastCompletionMode ===
                        TRAINING_COMPLETION_REVEALED
                        ? "Revealed"
                        : "Matched"}
                    </span>
                  </div>
                  <p>
                    <strong>{formatReplayMoveLabel(lastCompletedExpectedMove)}</strong>
                    {normalizedTrainingState.lastCompletionMode ===
                      TRAINING_COMPLETION_REVEALED
                      ? " was revealed from the game after your tries."
                      : lastCompletedIncorrectTrainingAttempts.length > 0
                        ? ` matched after ${lastCompletedIncorrectTrainingAttempts.length} earlier ${lastCompletedIncorrectTrainingAttempts.length === 1 ? "try" : "tries"}.`
                        : " matched the game move."}
                  </p>
                  {lastCompletedIncorrectTrainingAttempts.length > 0 && (
                    <ul className="annotation-list training-attempt-list">
                      {lastCompletedIncorrectTrainingAttempts.map((attempt, index) => (
                        <li
                          key={`${attempt.ply}-${attempt.userSan}-${index}`}
                          className={`annotation-item${attempt.isCritical ? " training-feedback-critical" : ""}${attempt.resultingFen ? " training-preview-trigger" : ""}`}
                          tabIndex={attempt.resultingFen ? 0 : undefined}
                          onMouseEnter={(event) =>
                            showTrainingPreview(attempt, event.currentTarget)
                          }
                          onMouseLeave={hideTrainingPreview}
                          onFocus={(event) => showTrainingPreview(attempt, event.currentTarget)}
                          onBlur={hideTrainingPreview}
                        >
                          <div className="annotation-item-header">
                            <span className="annotation-label">Try {index + 1}</span>
                            <span className="training-feedback-result">
                              {attempt.classification === "better"
                                ? "Better"
                                : attempt.classification === "equal"
                                  ? "Equal"
                                  : attempt.classification === "worse"
                                    ? "Worse"
                                    : "n/a"}
                            </span>
                          </div>
                          <p>
                            Played {attempt.userSan} instead of{" "}
                            {lastCompletedExpectedMove.san}.
                          </p>
                          <p className="training-feedback-detail">
                            <strong>Delta:</strong> {formatReplayDelta(attempt.deltaCp)} pawns
                            {" "}vs the game move
                            {attempt.isCritical ? " - critical mistake" : ""}.
                          </p>
                          <div className="annotation-item-actions">
                            <button
                              type="button"
                              className="annotation-secondary-button"
                              onClick={() => startTrainingPlayMode(attempt)}
                              disabled={isTrainingPlayActive || trainingLoading}
                            >
                              Play vs computer
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            {shouldShowReplaySummary && (
              <>
                <div ref={summaryRef} className="annotation-section">
                  <h3>Training summary</h3>
                </div>
                <div className="training-summary-grid">
                  <div className="training-summary-card">
                    <span className="annotation-label">Moves</span>
                    <strong>{replaySummary.totalMoves}</strong>
                  </div>
                  <div className="training-summary-card">
                    <span className="annotation-label">Matches</span>
                    <strong>{replaySummary.matchedMoves}</strong>
                  </div>
                  <div className="training-summary-card">
                    <span className="annotation-label">Better</span>
                    <strong>{replaySummary.betterMoves}</strong>
                  </div>
                  <div className="training-summary-card">
                    <span className="annotation-label">Equal</span>
                    <strong>{replaySummary.equalMoves}</strong>
                  </div>
                  <div className="training-summary-card">
                    <span className="annotation-label">Worse</span>
                    <strong>{replaySummary.worseMoves}</strong>
                  </div>
                  <div className="training-summary-card">
                    <span className="annotation-label">Critical</span>
                    <strong>{replaySummary.criticalMistakes.length}</strong>
                  </div>
                </div>
                <div className="annotation-section">
                  <h3>Move history</h3>
                  {replaySummary.moveHistory.length > 0 ? (
                    <ol className="training-summary-history">
                      {replaySummary.moveHistory.map((moveEntry) => (
                        <li
                          key={`${moveEntry.ply}-${moveEntry.expectedSan}`}
                          className="training-summary-history-entry"
                        >
                          <div className="training-summary-history-header">
                            <span className="annotation-label">
                              {formatReplayMoveLabel({
                                moveNumber: moveEntry.moveNumber,
                                side: moveEntry.side,
                                san: moveEntry.expectedSan,
                              })}
                            </span>
                            <strong>{moveEntry.expectedSan}</strong>
                          </div>
                          <div className="training-summary-history-attempts">
                            {moveEntry.attempts.map((attempt) => (
                              <div
                                key={`${moveEntry.ply}-${attempt.index}-${attempt.userSan}`}
                                className={`training-summary-history-attempt${attempt.resultingFen ? " training-preview-trigger" : ""}`}
                                tabIndex={attempt.resultingFen ? 0 : undefined}
                                onMouseEnter={(event) =>
                                  showTrainingPreview(attempt, event.currentTarget)
                                }
                                onMouseLeave={hideTrainingPreview}
                                onFocus={(event) =>
                                  showTrainingPreview(attempt, event.currentTarget)
                                }
                                onBlur={hideTrainingPreview}
                              >
                                <span className={getReplayAttemptResultClassName(attempt)}>
                                  {getReplayAttemptResultLabel(attempt)}
                                </span>
                                <span>
                                  Try {attempt.index}: {attempt.userSan}
                                </span>
                                {attempt.outcome !== "match" && (
                                  <span className="training-feedback-detail">
                                    Delta {formatReplayDelta(attempt.deltaCp)}
                                    {attempt.isCritical ? " - critical" : ""}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="annotation-empty">
                      No completed replay moves to list yet.
                    </p>
                  )}
                </div>
                <div className="annotation-section">
                  <h3>Critical mistakes</h3>
                  {replaySummary.criticalMistakes.length > 0 ? (
                    <ul className="annotation-list training-critical-list">
                      {replaySummary.criticalMistakes.map((attempt) => (
                        <li
                          key={`${attempt.ply}-${attempt.userSan}-${attempt.expectedSan}`}
                          className={`annotation-item${attempt.resultingFen ? " training-preview-trigger" : ""}`}
                          tabIndex={attempt.resultingFen ? 0 : undefined}
                          onMouseEnter={(event) =>
                            showTrainingPreview(attempt, event.currentTarget)
                          }
                          onMouseLeave={hideTrainingPreview}
                          onFocus={(event) =>
                            showTrainingPreview(attempt, event.currentTarget)
                          }
                          onBlur={hideTrainingPreview}
                        >
                          <div className="annotation-item-header">
                            <span className="annotation-label">
                              {formatReplayMoveLabel({
                                moveNumber: attempt.moveNumber,
                                side: attempt.side,
                                san: attempt.expectedSan,
                              })}
                            </span>
                            <span className="training-feedback-result">Critical</span>
                          </div>
                          <p>
                            Played {attempt.userSan} instead of {attempt.expectedSan}.
                          </p>
                          <p className="training-feedback-detail">
                            <strong>Delta:</strong> {formatReplayDelta(attempt.deltaCp)} pawns
                            {" "}vs the game move.
                          </p>
                          <div className="annotation-item-actions">
                            <button
                              type="button"
                              className="annotation-secondary-button"
                              onClick={() => startTrainingPlayMode(attempt)}
                              disabled={isTrainingPlayActive || trainingLoading}
                            >
                              Play vs computer
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="annotation-empty">
                      No critical mistakes in this replay.
                    </p>
                  )}
                </div>
              </>
            )}
            <div className="annotation-editor-actions">
              <button
                type="button"
                className="annotation-primary-button"
                onClick={startReplayTraining}
                disabled={trainingLoading}
              >
                {isReplayMode
                  ? isReplaySessionFinished
                    ? "Replay again"
                    : "Restart replay"
                  : "Start replay game"}
              </button>
              {isReplayMode && (
                <button
                  type="button"
                  className="annotation-secondary-button"
                  onClick={isReplayTrainingActive ? endReplayTraining : resetTrainingSession}
                  disabled={trainingLoading}
                >
                  {isReplayTrainingActive ? "End Training" : "Clear training"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ReplayTrainingPanel;
