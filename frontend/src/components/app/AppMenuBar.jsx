function AppMenuBar({
  openMenu,
  onToggleMenu,
  onMenuAction,
  showVariantArrows,
  canUndo,
  canRedo,
  showMoveHistory,
  showOpeningTreePanel,
  showReplayTrainingPanel,
  showGuessTrainingPanel,
  showPlayComputerPanel,
  showEngineWindow,
  showEvaluationBar,
  showComments,
  showImportedPgn,
  showVariants,
  actions,
}) {
  return (
    <nav className="top-menu" aria-label="Application menu">
      <div className="menu-group">
        <button
          type="button"
          className="menu-trigger"
          onClick={() => onToggleMenu("training")}
        >
          Training
        </button>
        {openMenu === "training" && (
          <div className="menu-dropdown">
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.togglePlayComputerPanel)}
            >
              {showPlayComputerPanel ? "Hide Play vs Computer" : "Show Play vs Computer"}
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.toggleReplayTrainingPanel)}
            >
              {showReplayTrainingPanel ? "Hide Replay Mode" : "Show Replay Mode"}
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.toggleGuessTrainingPanel)}
            >
              {showGuessTrainingPanel ? "Hide Guess The Move" : "Show Guess The Move"}
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.openGuessHistoryBrowser)}
            >
              Browse Guess History
            </button>
          </div>
        )}
      </div>

      <div className="menu-group">
        <button
          type="button"
          className="menu-trigger"
          onClick={() => onToggleMenu("engine")}
        >
          Engine
        </button>
        {openMenu === "engine" && (
          <div className="menu-dropdown">
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.analyzePosition)}
            >
              Analyze with Stockfish
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.toggleVariantArrows)}
            >
              {showVariantArrows ? "Hide Variant Arrows" : "Show Variant Arrows"}
            </button>
          </div>
        )}
      </div>

      <div className="menu-group">
        <button
          type="button"
          className="menu-trigger"
          onClick={() => onToggleMenu("edit")}
        >
          Edit
        </button>
        {openMenu === "edit" && (
          <div className="menu-dropdown">
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.undoMove)}
              disabled={!canUndo}
            >
              Undo
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.redoMove)}
              disabled={!canRedo}
            >
              Redo
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.openImportPgnPopup)}
            >
              Import PGN
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.copyFenToClipboard)}
            >
              Copy FEN
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.resetGame)}
            >
              Reset
            </button>
          </div>
        )}
      </div>

      <div className="menu-group">
        <button
          type="button"
          className="menu-trigger"
          onClick={() => onToggleMenu("search")}
        >
          Search
        </button>
        {openMenu === "search" && (
          <div className="menu-dropdown">
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.openLichessSearchPopup)}
            >
              Search Lichess
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.openOtbSearchPopup)}
            >
              Search OTB Master Games
            </button>
          </div>
        )}
      </div>

      <div className="menu-group">
        <button
          type="button"
          className="menu-trigger"
          onClick={() => onToggleMenu("studies")}
        >
          Studies
        </button>
        {openMenu === "studies" && (
          <div className="menu-dropdown">
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.openSaveStudyPopup)}
            >
              Save Current Study
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.openStudiesPopup)}
            >
              Browse Studies
            </button>
          </div>
        )}
      </div>

      <div className="menu-group">
        <button
          type="button"
          className="menu-trigger"
          onClick={() => onToggleMenu("view")}
        >
          View
        </button>
        {openMenu === "view" && (
          <div className="menu-dropdown">
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.toggleBoardOrientation)}
            >
              Flip Board
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.toggleMoveHistory)}
            >
              {showMoveHistory ? "Hide Move History" : "Show Move History"}
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.toggleOpeningTreePanel)}
            >
              {showOpeningTreePanel ? "Hide Opening Tree" : "Show Opening Tree"}
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.toggleReplayTrainingPanel)}
            >
              {showReplayTrainingPanel ? "Hide Replay Mode" : "Show Replay Mode"}
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.toggleGuessTrainingPanel)}
            >
              {showGuessTrainingPanel ? "Hide Guess The Move" : "Show Guess The Move"}
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.togglePlayComputerPanel)}
            >
              {showPlayComputerPanel ? "Hide Play vs Computer" : "Show Play vs Computer"}
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.toggleEngineWindow)}
            >
              {showEngineWindow ? "Hide Engine Window" : "Show Engine Window"}
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.toggleEvaluationBar)}
            >
              {showEvaluationBar ? "Hide Evaluation Bar" : "Show Evaluation Bar"}
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.toggleComments)}
            >
              {showComments ? "Hide Comments" : "Show Comments"}
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.toggleImportedPgn)}
            >
              {showImportedPgn ? "Hide Imported PGN" : "Show Imported PGN"}
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.toggleVariants)}
            >
              {showVariants ? "Hide Variants" : "Show Variants"}
            </button>
          </div>
        )}
      </div>

      <div className="menu-group">
        <button
          type="button"
          className="menu-trigger"
          onClick={() => onToggleMenu("help")}
        >
          Help
        </button>
        {openMenu === "help" && (
          <div className="menu-dropdown">
            <button
              type="button"
              className="menu-entry"
              onClick={() =>
                onMenuAction(() =>
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
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.openLichessTokenPopup)}
            >
              Lichess Token
            </button>
            <button
              type="button"
              className="menu-entry"
              onClick={() => onMenuAction(actions.openShortcutsPopup)}
            >
              Keyboard Shortcuts
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default AppMenuBar;
