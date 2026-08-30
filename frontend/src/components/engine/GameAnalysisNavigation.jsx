import { useEffect, useRef, useState } from "react";
import { modalButtonStyle, modalInputStyle } from "../modals/modalStyles.js";
import {
  ISSUE_FILTER_ALL,
  ISSUE_FILTER_BLUNDERS,
  ISSUE_FILTER_MISTAKES,
  ISSUE_SIDE_BLACK,
  ISSUE_SIDE_BOTH,
  ISSUE_SIDE_WHITE,
} from "../../utils/gameAnalysis.js";

function GameAnalysisNavigation({
  idPrefix,
  className = "",
  issueFilter,
  onChangeIssueFilter,
  issueSide,
  onChangeIssueSide,
  onPreviousIssue,
  onNextIssue,
  canGoToPreviousIssue,
  canGoToNextIssue,
  onRetryCurrentIssue,
  canRetryCurrentIssue,
  retryInProgress,
  compactSettings = false,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRootRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const filterId = `${idPrefix}-issue-filter`;
  const sideId = `${idPrefix}-issue-side`;
  const settingsId = `${idPrefix}-settings`;

  useEffect(() => {
    if (!settingsOpen) {
      return undefined;
    }

    function handleMouseDown(event) {
      if (!settingsRootRef.current?.contains(event.target)) {
        setSettingsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSettingsOpen(false);
        settingsButtonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsOpen]);

  const settingsControls = (
    <>
      <label htmlFor={filterId}>Jump through</label>
      <select
        id={filterId}
        value={issueFilter}
        onChange={(event) => onChangeIssueFilter(event.target.value)}
        style={modalInputStyle}
      >
        <option value={ISSUE_FILTER_ALL}>All issues (50+ cp)</option>
        <option value={ISSUE_FILTER_MISTAKES}>
          Mistakes and blunders (100+ cp)
        </option>
        <option value={ISSUE_FILTER_BLUNDERS}>Blunders (200+ cp)</option>
      </select>
      <label htmlFor={sideId}>Side</label>
      <select
        id={sideId}
        value={issueSide}
        onChange={(event) => onChangeIssueSide(event.target.value)}
        style={modalInputStyle}
      >
        <option value={ISSUE_SIDE_BOTH}>Both sides</option>
        <option value={ISSUE_SIDE_WHITE}>White</option>
        <option value={ISSUE_SIDE_BLACK}>Black</option>
      </select>
    </>
  );

  return (
    <div
      className={`game-analysis-navigation${className ? ` ${className}` : ""}`}
      role="group"
      aria-label="Whole game analysis navigation"
    >
      {!compactSettings && settingsControls}
      <button
        type="button"
        style={modalButtonStyle}
        onClick={onPreviousIssue}
        disabled={!canGoToPreviousIssue}
      >
        Previous
      </button>
      <button
        type="button"
        style={modalButtonStyle}
        onClick={onNextIssue}
        disabled={!canGoToNextIssue}
      >
        Next
      </button>
      <button
        type="button"
        className="annotation-primary-button"
        onClick={onRetryCurrentIssue}
        disabled={!canRetryCurrentIssue || retryInProgress}
      >
        Retry
      </button>
      {compactSettings && (
        <div className="game-analysis-settings" ref={settingsRootRef}>
          <button
            ref={settingsButtonRef}
            type="button"
            className="game-analysis-settings-button"
            style={{ ...modalButtonStyle, paddingInline: "0.7rem" }}
            onClick={() => setSettingsOpen((currentValue) => !currentValue)}
            aria-label="Analysis navigation settings"
            title="Analysis navigation settings"
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            aria-controls={settingsId}
          >
            ⚙
          </button>
          {settingsOpen && (
            <div
              id={settingsId}
              className="game-analysis-settings-popover"
              role="dialog"
              aria-label="Analysis navigation settings"
            >
              {settingsControls}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GameAnalysisNavigation;
