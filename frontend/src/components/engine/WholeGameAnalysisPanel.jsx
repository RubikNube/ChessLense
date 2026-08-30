import {
  modalDangerButtonStyle,
  modalInputStyle,
  modalPrimaryButtonStyle,
} from "../modals/modalStyles.js";
import {
  GAME_ANALYSIS_STATUS_CANCELLED,
  GAME_ANALYSIS_STATUS_ERROR,
  GAME_ANALYSIS_STATUS_RUNNING,
  GAME_ANALYSIS_FIXED_SCALE_MAX_CP,
  GAME_ANALYSIS_SCALE_AUTO,
} from "../../utils/gameAnalysis.js";
import EngineDepthControl from "./EngineDepthControl.jsx";
import GameAnalysisHistogram from "./GameAnalysisHistogram.jsx";
import GameAnalysisNavigation from "./GameAnalysisNavigation.jsx";
import {
  GAME_ANALYSIS_RETRY_FEEDBACK_BAD,
  GAME_ANALYSIS_RETRY_FEEDBACK_BEST,
  GAME_ANALYSIS_RETRY_FEEDBACK_GOOD,
  GAME_ANALYSIS_RETRY_STATUS_EVALUATING,
  GAME_ANALYSIS_RETRY_STATUS_FEEDBACK,
  GAME_ANALYSIS_RETRY_STATUS_PREPARING,
  GAME_ANALYSIS_RETRY_STATUS_READY,
} from "../../utils/gameAnalysisRetry.js";

function formatRetryDifference(deltaCp) {
  if (!Number.isFinite(deltaCp)) {
    return "";
  }

  return `${Math.abs(deltaCp / 100).toFixed(1)} pawns`;
}

function GameAnalysisRetryFeedback({ retry }) {
  const { attempt, feedback, target } = retry;
  const difference = formatRetryDifference(attempt?.deltaCp);

  if (feedback === GAME_ANALYSIS_RETRY_FEEDBACK_BEST) {
    return (
      <p>
        <strong>{attempt.userSan}</strong> is Stockfish&apos;s best move.
      </p>
    );
  }

  if (feedback === GAME_ANALYSIS_RETRY_FEEDBACK_GOOD) {
    return (
      <p>
        <strong>{attempt.userSan}</strong> is a good move
        {difference ? ` (${difference} from the engine move)` : ""}. Stockfish
        preferred <strong>{target.bestMoveSan}</strong>.
      </p>
    );
  }

  if (feedback === GAME_ANALYSIS_RETRY_FEEDBACK_BAD) {
    return (
      <p>
        <strong>{attempt.userSan}</strong> is a bad move
        {difference ? ` (${difference} worse)` : ""}. Stockfish preferred{" "}
        <strong>{target.bestMoveSan}</strong>.
      </p>
    );
  }

  return null;
}

function WholeGameAnalysisPanel({
  onClose,
  engineSearchDepth,
  minEngineSearchDepth,
  maxEngineSearchDepth,
  onChangeEngineSearchDepth,
  gameAnalysis,
  gameAnalysisIsCurrent,
  currentNodeId,
  gameAnalysisScale,
  onChangeGameAnalysisScale,
  issueFilter,
  onChangeIssueFilter,
  issueSide,
  onChangeIssueSide,
  onAnalyzeGame,
  onCancelGameAnalysis,
  onSelectGameAnalysisPosition,
  onPreviousIssue,
  onNextIssue,
  canGoToPreviousIssue,
  canGoToNextIssue,
  gameAnalysisRetry,
  canRetryCurrentIssue,
  onRetryCurrentIssue,
  onRetryAgain,
  onRetryPreparation,
  onExitRetry,
  onNextRetryIssue,
  canGoToNextRetryIssue,
  onExploreRetryAgainstComputer,
}) {
  const gameAnalysisRunning =
    gameAnalysis?.status === GAME_ANALYSIS_STATUS_RUNNING;
  const gameAnalysisPositions = gameAnalysis?.positions ?? [];

  return (
    <div className="card">
      <div className="card-header">
        <h2>Whole Game Analysis</h2>
        <button
          type="button"
          className="card-close-button"
          onClick={onClose}
          aria-label="Close Whole Game Analysis"
          title="Close Whole Game Analysis"
        >
          ×
        </button>
      </div>
      <p className="game-analysis-description">
        Stockfish evaluation across the main line.
      </p>
      <EngineDepthControl
        inputId="game-analysis-search-depth"
        value={engineSearchDepth}
        min={minEngineSearchDepth}
        max={maxEngineSearchDepth}
        onChange={onChangeEngineSearchDepth}
        infoText="Used for whole-game analysis and shared with other engine features."
      />
      <div className="game-analysis-heading">
        {gameAnalysisRunning ? (
          <button
            type="button"
            style={modalDangerButtonStyle}
            onClick={onCancelGameAnalysis}
          >
            Cancel analysis
          </button>
        ) : (
          <button
            type="button"
            style={modalPrimaryButtonStyle}
            onClick={onAnalyzeGame}
          >
            {gameAnalysis ? "Analyze again" : "Analyze whole game"}
          </button>
        )}
      </div>
      {gameAnalysisRunning && (
        <div className="game-analysis-progress" aria-live="polite">
          <progress
            value={gameAnalysisPositions.length}
            max={Math.max(gameAnalysis.total, 1)}
          />
          <span>
            {gameAnalysisPositions.length} / {gameAnalysis.total} positions
          </span>
        </div>
      )}
      {gameAnalysis?.status === GAME_ANALYSIS_STATUS_CANCELLED && (
        <p className="annotation-empty">
          Analysis cancelled. Partial results are not saved.
        </p>
      )}
      {gameAnalysis?.status === GAME_ANALYSIS_STATUS_ERROR && (
        <p className="error">{gameAnalysis.error}</p>
      )}
      {!!gameAnalysisPositions.length && (
        <>
          {!gameAnalysisIsCurrent && !gameAnalysisRunning && (
            <p className="annotation-empty">
              The main line changed. Analyze the game again before saving these
              results.
            </p>
          )}
          <div className="game-analysis-scale-control">
            <label htmlFor="game-analysis-scale">Scale</label>
            <select
              id="game-analysis-scale"
              value={gameAnalysisScale}
              onChange={(event) =>
                onChangeGameAnalysisScale(event.target.value)
              }
              style={modalInputStyle}
            >
              <option value={GAME_ANALYSIS_SCALE_AUTO}>Auto</option>
              {GAME_ANALYSIS_FIXED_SCALE_MAX_CP.map((scaleMaxCp) => (
                <option key={scaleMaxCp} value={scaleMaxCp}>
                  ±{scaleMaxCp / 100}
                </option>
              ))}
            </select>
          </div>
          <GameAnalysisHistogram
            positions={gameAnalysisPositions}
            currentNodeId={currentNodeId}
            scale={gameAnalysisScale}
            onSelectPosition={onSelectGameAnalysisPosition}
          />
          <GameAnalysisNavigation
            idPrefix="game-analysis"
            issueFilter={issueFilter}
            onChangeIssueFilter={onChangeIssueFilter}
            issueSide={issueSide}
            onChangeIssueSide={onChangeIssueSide}
            onPreviousIssue={onPreviousIssue}
            onNextIssue={onNextIssue}
            canGoToPreviousIssue={canGoToPreviousIssue}
            canGoToNextIssue={canGoToNextIssue}
            onRetryCurrentIssue={onRetryCurrentIssue}
            canRetryCurrentIssue={canRetryCurrentIssue}
            retryInProgress={!!gameAnalysisRetry}
          />
          {gameAnalysisRetry && (
            <div
              className={`annotation-item game-analysis-retry game-analysis-retry-${gameAnalysisRetry.feedback ?? gameAnalysisRetry.status}`}
              aria-live="polite"
            >
              <div className="annotation-item-header">
                <span className="annotation-label">
                  Retry {gameAnalysisRetry.target.issueSan}
                </span>
                <span className="training-feedback-result">
                  {gameAnalysisRetry.status ===
                  GAME_ANALYSIS_RETRY_STATUS_PREPARING
                    ? "Preparing"
                    : gameAnalysisRetry.status ===
                        GAME_ANALYSIS_RETRY_STATUS_EVALUATING
                      ? "Evaluating"
                      : gameAnalysisRetry.feedback ===
                          GAME_ANALYSIS_RETRY_FEEDBACK_BEST
                        ? "Best move"
                        : gameAnalysisRetry.feedback ===
                            GAME_ANALYSIS_RETRY_FEEDBACK_GOOD
                          ? "Good move"
                          : gameAnalysisRetry.feedback ===
                              GAME_ANALYSIS_RETRY_FEEDBACK_BAD
                            ? "Bad move"
                            : "Your move"}
                </span>
              </div>
              {gameAnalysisRetry.status ===
                GAME_ANALYSIS_RETRY_STATUS_PREPARING && (
                <p>Stockfish is preparing the position.</p>
              )}
              {gameAnalysisRetry.status ===
                GAME_ANALYSIS_RETRY_STATUS_READY && (
                <p>
                  Play a replacement for the original move{" "}
                  <strong>{gameAnalysisRetry.target.issueSan}</strong> on the
                  board.
                </p>
              )}
              {gameAnalysisRetry.status ===
                GAME_ANALYSIS_RETRY_STATUS_EVALUATING && (
                <p>Comparing your move with Stockfish&apos;s best move...</p>
              )}
              {gameAnalysisRetry.status ===
                GAME_ANALYSIS_RETRY_STATUS_FEEDBACK && (
                <GameAnalysisRetryFeedback retry={gameAnalysisRetry} />
              )}
              {gameAnalysisRetry.error && (
                <p className="error">{gameAnalysisRetry.error}</p>
              )}
              <div className="annotation-item-actions">
                {gameAnalysisRetry.status ===
                  GAME_ANALYSIS_RETRY_STATUS_PREPARING &&
                  gameAnalysisRetry.error && (
                    <button
                      type="button"
                      className="annotation-secondary-button"
                      onClick={onRetryPreparation}
                    >
                      Try preparation again
                    </button>
                  )}
                {gameAnalysisRetry.status ===
                  GAME_ANALYSIS_RETRY_STATUS_FEEDBACK && (
                  <>
                    <button
                      type="button"
                      className="annotation-secondary-button"
                      onClick={onRetryAgain}
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      className="annotation-primary-button"
                      onClick={onNextRetryIssue}
                      disabled={!canGoToNextRetryIssue}
                    >
                      Next issue
                    </button>
                    <button
                      type="button"
                      className="annotation-secondary-button"
                      onClick={onExploreRetryAgainstComputer}
                    >
                      Play vs computer
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="annotation-secondary-button"
                  onClick={onExitRetry}
                >
                  Exit retry
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {!gameAnalysis && (
        <p className="annotation-empty">No whole-game analysis yet.</p>
      )}
    </div>
  );
}

export default WholeGameAnalysisPanel;
