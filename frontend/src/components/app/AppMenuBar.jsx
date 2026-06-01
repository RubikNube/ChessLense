import { useMemo, useState } from "react";

const menuIconStyle = {
  width: 18,
  height: 18,
  display: "block",
};

function BoardSoundIcon({ muted }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={menuIconStyle}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 9v6h4l5 4V5l-5 4H5Z" />
      {muted ? (
        <>
          <path d="m17 9 4 6" />
          <path d="m21 9-4 6" />
        </>
      ) : (
        <>
          <path d="M18 9.5a4 4 0 0 1 0 5" />
          <path d="M20.5 7a7.5 7.5 0 0 1 0 10" />
        </>
      )}
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={menuIconStyle}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

function AppMenuBar({
  openMenu,
  onToggleMenu,
  onMenuAction,
  showVariantArrows,
  canUndo,
  canRedo,
  showMoveHistory,
  showOpeningTreePanel,
  showPuzzleTrainingPanel,
  showReplayTrainingPanel,
  showGuessTrainingPanel,
  showPlayComputerPanel,
  showEngineWindow,
  showEvaluationBar,
  boardSoundsEnabled,
  showComments,
  showImportedPgn,
  showVariants,
  actions,
}) {
  const [expandedSection, setExpandedSection] = useState(null);

  const menuSections = useMemo(
    () => [
      {
        id: "training",
        label: "Training",
        items: [
          {
            label: showPlayComputerPanel
              ? "Hide Play vs Computer"
              : "Show Play vs Computer",
            action: actions.togglePlayComputerPanel,
          },
          {
            label: showPuzzleTrainingPanel
              ? "Hide Puzzle Mode"
              : "Show Puzzle Mode",
            action: actions.togglePuzzleTrainingPanel,
          },
          {
            label: showReplayTrainingPanel
              ? "Hide Replay Mode"
              : "Show Replay Mode",
            action: actions.toggleReplayTrainingPanel,
          },
          {
            label: showGuessTrainingPanel
              ? "Hide Guess The Move"
              : "Show Guess The Move",
            action: actions.toggleGuessTrainingPanel,
          },
          {
            label: "Browse Guess History",
            action: actions.openGuessHistoryBrowser,
          },
        ],
      },
      {
        id: "engine",
        label: "Engine",
        items: [
          {
            label: "Analyze with Stockfish",
            action: actions.analyzePosition,
          },
          {
            label: showVariantArrows
              ? "Hide Variant Arrows"
              : "Show Variant Arrows",
            action: actions.toggleVariantArrows,
          },
        ],
      },
      {
        id: "edit",
        label: "Edit",
        items: [
          {
            label: "Undo",
            action: actions.undoMove,
            disabled: !canUndo,
          },
          {
            label: "Redo",
            action: actions.redoMove,
            disabled: !canRedo,
          },
          {
            label: "Import PGN",
            action: actions.openImportPgnPopup,
          },
          {
            label: "Set Up Position",
            action: actions.openPositionSetup,
          },
          {
            label: "Copy FEN",
            action: actions.copyFenToClipboard,
          },
          {
            label: "Reset",
            action: actions.resetGame,
          },
        ],
      },
      {
        id: "search",
        label: "Search",
        items: [
          {
            label: "Search Lichess",
            action: actions.openLichessSearchPopup,
          },
          {
            label: "Search OTB Master Games",
            action: actions.openOtbSearchPopup,
          },
        ],
      },
      {
        id: "studies",
        label: "Studies",
        items: [
          {
            label: "Save Current Study",
            action: actions.openSaveStudyPopup,
          },
          {
            label: "Browse Studies",
            action: actions.openStudiesPopup,
          },
        ],
      },
      {
        id: "view",
        label: "View",
        items: [
          {
            label: "Flip Board",
            action: actions.toggleBoardOrientation,
          },
          {
            label: showMoveHistory ? "Hide Move History" : "Show Move History",
            action: actions.toggleMoveHistory,
          },
          {
            label: showOpeningTreePanel
              ? "Hide Opening Tree"
              : "Show Opening Tree",
            action: actions.toggleOpeningTreePanel,
          },
          {
            label: showPuzzleTrainingPanel
              ? "Hide Puzzle Mode"
              : "Show Puzzle Mode",
            action: actions.togglePuzzleTrainingPanel,
          },
          {
            label: showReplayTrainingPanel
              ? "Hide Replay Mode"
              : "Show Replay Mode",
            action: actions.toggleReplayTrainingPanel,
          },
          {
            label: showGuessTrainingPanel
              ? "Hide Guess The Move"
              : "Show Guess The Move",
            action: actions.toggleGuessTrainingPanel,
          },
          {
            label: showPlayComputerPanel
              ? "Hide Play vs Computer"
              : "Show Play vs Computer",
            action: actions.togglePlayComputerPanel,
          },
          {
            label: showEngineWindow
              ? "Hide Engine Window"
              : "Show Engine Window",
            action: actions.toggleEngineWindow,
          },
          {
            label: showEvaluationBar
              ? "Hide Evaluation Bar"
              : "Show Evaluation Bar",
            action: actions.toggleEvaluationBar,
          },
          {
            label: boardSoundsEnabled
              ? "Disable Board Sounds"
              : "Enable Board Sounds",
            action: actions.toggleBoardSounds,
          },
          {
            label: showComments ? "Hide Comments" : "Show Comments",
            action: actions.toggleComments,
          },
          {
            label: showImportedPgn ? "Hide Imported PGN" : "Show Imported PGN",
            action: actions.toggleImportedPgn,
          },
          {
            label: showVariants ? "Hide Variants" : "Show Variants",
            action: actions.toggleVariants,
          },
        ],
      },
      {
        id: "help",
        label: "Help",
        items: [
          {
            label: "About ChessLense",
            action: () =>
              window.open(
                "https://github.com/RubikNube/ChessLense/tree/main",
                "_blank",
                "noopener,noreferrer",
              ),
          },
          {
            label: "Backend Connection",
            action: actions.openBackendConnectionPopup,
          },
          {
            label: "Lichess Token",
            action: actions.openLichessTokenPopup,
          },
          {
            label: "Keyboard Shortcuts",
            action: actions.openShortcutsPopup,
          },
        ],
      },
    ],
    [
      actions,
      boardSoundsEnabled,
      canRedo,
      canUndo,
      showComments,
      showEngineWindow,
      showEvaluationBar,
      showGuessTrainingPanel,
      showImportedPgn,
      showMoveHistory,
      showOpeningTreePanel,
      showPlayComputerPanel,
      showPuzzleTrainingPanel,
      showReplayTrainingPanel,
      showVariantArrows,
      showVariants,
    ],
  );

  return (
    <nav className="top-menu" aria-label="Application menu">
      <div className="menu-mobile" aria-label="Mobile application menu">
        <div className="menu-group">
          <button
            type="button"
            className="menu-trigger menu-trigger-mobile"
            aria-expanded={openMenu === "mobile"}
            onClick={() => onToggleMenu("mobile")}
          >
            <span className="menu-trigger-mobile-icon">
              <HamburgerIcon />
            </span>
            Menu
          </button>
          {openMenu === "mobile" && (
            <div className="menu-dropdown menu-dropdown-mobile">
              {menuSections.map((section) => {
                const isExpanded = expandedSection === section.id;

                return (
                  <div
                    key={section.id}
                    className="menu-accordion-section"
                    data-expanded={isExpanded ? "true" : "false"}
                  >
                    <button
                      type="button"
                      className="menu-entry menu-accordion-trigger"
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpandedSection((currentValue) =>
                          currentValue === section.id ? null : section.id,
                        )
                      }
                    >
                      <span>{section.label}</span>
                      <span className="menu-accordion-caret" aria-hidden="true">
                        {isExpanded ? "▾" : "▸"}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="menu-accordion-content">
                        {section.items.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            className="menu-entry menu-entry-sub"
                            onClick={() => onMenuAction(item.action)}
                            disabled={item.disabled}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="menu-group">
          <button
            type="button"
            className="menu-trigger menu-trigger-icon"
            aria-pressed={!boardSoundsEnabled}
            aria-label={
              boardSoundsEnabled ? "Mute board sounds" : "Unmute board sounds"
            }
            title={
              boardSoundsEnabled ? "Mute board sounds" : "Unmute board sounds"
            }
            onClick={() => onMenuAction(actions.toggleBoardSounds)}
          >
            <BoardSoundIcon muted={!boardSoundsEnabled} />
          </button>
        </div>
      </div>

      <div className="menu-desktop">
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
                {showPlayComputerPanel
                  ? "Hide Play vs Computer"
                  : "Show Play vs Computer"}
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => onMenuAction(actions.togglePuzzleTrainingPanel)}
              >
                {showPuzzleTrainingPanel
                  ? "Hide Puzzle Mode"
                  : "Show Puzzle Mode"}
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => onMenuAction(actions.toggleReplayTrainingPanel)}
              >
                {showReplayTrainingPanel
                  ? "Hide Replay Mode"
                  : "Show Replay Mode"}
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => onMenuAction(actions.toggleGuessTrainingPanel)}
              >
                {showGuessTrainingPanel
                  ? "Hide Guess The Move"
                  : "Show Guess The Move"}
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
                {showVariantArrows
                  ? "Hide Variant Arrows"
                  : "Show Variant Arrows"}
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
                onClick={() => onMenuAction(actions.openPositionSetup)}
              >
                Set Up Position
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
                {showOpeningTreePanel
                  ? "Hide Opening Tree"
                  : "Show Opening Tree"}
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => onMenuAction(actions.togglePuzzleTrainingPanel)}
              >
                {showPuzzleTrainingPanel
                  ? "Hide Puzzle Mode"
                  : "Show Puzzle Mode"}
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => onMenuAction(actions.toggleReplayTrainingPanel)}
              >
                {showReplayTrainingPanel
                  ? "Hide Replay Mode"
                  : "Show Replay Mode"}
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => onMenuAction(actions.toggleGuessTrainingPanel)}
              >
                {showGuessTrainingPanel
                  ? "Hide Guess The Move"
                  : "Show Guess The Move"}
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => onMenuAction(actions.togglePlayComputerPanel)}
              >
                {showPlayComputerPanel
                  ? "Hide Play vs Computer"
                  : "Show Play vs Computer"}
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
                {showEvaluationBar
                  ? "Hide Evaluation Bar"
                  : "Show Evaluation Bar"}
              </button>
              <button
                type="button"
                className="menu-entry"
                onClick={() => onMenuAction(actions.toggleBoardSounds)}
              >
                {boardSoundsEnabled
                  ? "Disable Board Sounds"
                  : "Enable Board Sounds"}
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
                onClick={() => onMenuAction(actions.openBackendConnectionPopup)}
              >
                Backend Connection
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

        <div className="menu-group">
          <button
            type="button"
            className="menu-trigger menu-trigger-icon"
            aria-pressed={!boardSoundsEnabled}
            aria-label={
              boardSoundsEnabled ? "Mute board sounds" : "Unmute board sounds"
            }
            title={
              boardSoundsEnabled ? "Mute board sounds" : "Unmute board sounds"
            }
            onClick={() => onMenuAction(actions.toggleBoardSounds)}
          >
            <BoardSoundIcon muted={!boardSoundsEnabled} />
          </button>
        </div>
      </div>
    </nav>
  );
}

export default AppMenuBar;
