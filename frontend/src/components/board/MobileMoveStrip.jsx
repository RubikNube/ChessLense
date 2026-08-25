import { useEffect, useMemo, useRef } from "react";
import {
  getGameAnalysisIssueDescription,
  getMoveSeveritySymbol,
} from "../../utils/gameAnalysis.js";

function formatMoveLabel(moveEntry) {
  if (!moveEntry) {
    return "";
  }

  if (moveEntry.side === "white") {
    return `${moveEntry.moveNumber}. ${moveEntry.san}`;
  }

  return moveEntry.san;
}

function MobileMoveEvaluationIndicator({ issue }) {
  const symbol = getMoveSeveritySymbol(issue?.severity);

  if (!symbol) {
    return null;
  }

  const description = getGameAnalysisIssueDescription(issue);

  return (
    <span
      className={`mobile-move-evaluation-indicator move-evaluation-indicator move-evaluation-indicator-${issue.severity}`}
      role="img"
      aria-label={description}
      title={description}
    >
      {symbol}
    </span>
  );
}

function MobileMoveStrip({ moveHistoryItems, currentMoveIndex, onSelectMove }) {
  const selectedMoveRef = useRef(null);

  const moveChips = useMemo(
    () =>
      moveHistoryItems.map((moveEntry, index) => ({
        index,
        nodeId: moveEntry.nodeId,
        label: formatMoveLabel(moveEntry),
        gameAnalysisIssue: moveEntry.gameAnalysisIssue,
      })),
    [moveHistoryItems],
  );

  useEffect(() => {
    if (!selectedMoveRef.current) {
      return;
    }

    selectedMoveRef.current.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, [currentMoveIndex]);

  if (!moveHistoryItems.length) {
    return null;
  }

  return (
    <div className="mobile-move-strip" role="list" aria-label="Move history">
      {moveChips.map((chip) => {
        const isSelected = chip.index === currentMoveIndex;

        return (
          <button
            key={chip.nodeId ?? `${chip.index}-${chip.label}`}
            type="button"
            className={`mobile-move-chip${isSelected ? " mobile-move-chip-selected" : ""}`}
            onClick={() => {
              if (!chip.nodeId) {
                return;
              }

              onSelectMove(chip.nodeId);
            }}
            ref={isSelected ? selectedMoveRef : null}
            aria-current={isSelected ? "true" : undefined}
          >
            <span>{chip.label}</span>
            <MobileMoveEvaluationIndicator issue={chip.gameAnalysisIssue} />
          </button>
        );
      })}
    </div>
  );
}

export default MobileMoveStrip;
