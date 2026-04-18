import {
  TRAINING_MODE_PLAY_COMPUTER,
  TRAINING_MODE_REPLAY_GAME,
  TRAINING_SIDE_BLACK,
  TRAINING_SIDE_WHITE,
} from "../../utils/training.js";

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

function PlayComputerPanel({
  panelHeight,
  onClose,
  normalizedTrainingState,
  setTrainingPlayerSide,
  whiteTrainingLabel,
  blackTrainingLabel,
  isReplayTrainingActive,
  isTrainingPlayActive,
  isEngineOpponentUserTurn,
  isStandaloneComputerPlayActive,
  isStandaloneComputerPlayCompleted,
  computerPlaySourceLabel,
  computerPlayStatusText,
  computerPlayOutcomeText,
  trainingLoading,
  trainingError,
  startComputerPlayFromInitialPosition,
  startComputerPlayFromCurrentPosition,
  restartStandaloneComputerPlay,
  exitStandaloneComputerPlay,
}) {
  const isStandaloneComputerPlay =
    normalizedTrainingState.mode === TRAINING_MODE_PLAY_COMPUTER;
  const shouldShowComputerPlayError =
    !isTrainingPlayActive && normalizedTrainingState.mode !== TRAINING_MODE_REPLAY_GAME;
  const sideSelectionDisabled =
    isReplayTrainingActive ||
    isTrainingPlayActive ||
    isStandaloneComputerPlayActive ||
    trainingLoading;

  return (
    <div
      className="card training-card"
      style={panelHeight ? { height: `${panelHeight}px` } : undefined}
    >
      <TrainingPanelHeader
        title="Play vs Computer"
        onClose={onClose}
        closeLabel="Close Play vs Computer"
      />
      <div className="training-card-body">
        <TrainingSideSelector
          normalizedTrainingState={normalizedTrainingState}
          setTrainingPlayerSide={setTrainingPlayerSide}
          whiteTrainingLabel="White"
          blackTrainingLabel="Black"
          disabled={sideSelectionDisabled}
        />
        <p className="current-move-label">{computerPlayStatusText}</p>
        {isStandaloneComputerPlay && (
          <div className="annotation-item training-feedback">
            <div className="annotation-item-header">
              <span className="annotation-label">Computer game</span>
              <span className="training-feedback-result">
                {isStandaloneComputerPlayCompleted
                  ? "Finished"
                  : isEngineOpponentUserTurn
                    ? "Your move"
                    : "Computer move"}
              </span>
            </div>
            <p>
              Playing from the <strong>{computerPlaySourceLabel}</strong>. Manual board
              navigation exits this mode.
            </p>
            {computerPlayOutcomeText && <p>{computerPlayOutcomeText}</p>}
          </div>
        )}
        {trainingLoading && isStandaloneComputerPlayActive && (
          <p className="annotation-empty">Computer is thinking...</p>
        )}
        {shouldShowComputerPlayError && trainingError && <p className="error">{trainingError}</p>}
        <div className="annotation-item-actions">
          <button
            type="button"
            className="annotation-primary-button"
            onClick={startComputerPlayFromInitialPosition}
            disabled={
              isReplayTrainingActive ||
              isTrainingPlayActive ||
              isStandaloneComputerPlayActive ||
              trainingLoading
            }
          >
            Play from initial position
          </button>
          <button
            type="button"
            className="annotation-secondary-button"
            onClick={startComputerPlayFromCurrentPosition}
            disabled={
              isReplayTrainingActive ||
              isTrainingPlayActive ||
              isStandaloneComputerPlayActive ||
              trainingLoading
            }
          >
            Play from current position
          </button>
        </div>
        {isStandaloneComputerPlay && (
          <div className="annotation-item-actions">
            <button
              type="button"
              className="annotation-secondary-button"
              onClick={restartStandaloneComputerPlay}
              disabled={trainingLoading}
            >
              Restart computer game
            </button>
            <button
              type="button"
              className="annotation-secondary-button"
              onClick={exitStandaloneComputerPlay}
              disabled={trainingLoading}
            >
              Exit computer play
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayComputerPanel;
