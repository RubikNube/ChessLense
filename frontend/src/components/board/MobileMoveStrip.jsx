import { useEffect, useId, useMemo, useRef, useState } from "react";
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

function MobileMoveStrip({
  moveHistoryItems,
  currentMoveIndex,
  onSelectMove,
  getVariantOptionsForMove = () => [],
  onSelectVariant,
}) {
  const selectedMoveRef = useRef(null);
  const variantPickerId = useId();
  const [variantPickerMove, setVariantPickerMove] = useState(null);

  const moveChips = useMemo(
    () =>
      moveHistoryItems.map((moveEntry, index) => ({
        index,
        nodeId: moveEntry.nodeId,
        label: formatMoveLabel(moveEntry),
        hasVariants: moveEntry.hasVariants,
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

  const variantOptions = variantPickerMove
    ? getVariantOptionsForMove(variantPickerMove.nodeId)
    : [];

  return (
    <>
      <div className="mobile-move-strip" role="list" aria-label="Move history">
        {moveChips.map((chip) => {
          const isSelected = chip.index === currentMoveIndex;
          const isVariantPickerOpen = variantPickerMove?.nodeId === chip.nodeId;

          return (
            <div
              className="mobile-move-item"
              role="listitem"
              key={chip.nodeId ?? `${chip.index}-${chip.label}`}
            >
              <button
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
              {chip.hasVariants && (
                <button
                  type="button"
                  className="mobile-move-variant-button"
                  onClick={() =>
                    setVariantPickerMove(
                      isVariantPickerOpen
                        ? null
                        : { nodeId: chip.nodeId, label: chip.label },
                    )
                  }
                  aria-label={`Select variant after ${chip.label}`}
                  aria-expanded={isVariantPickerOpen}
                  aria-controls={
                    isVariantPickerOpen ? variantPickerId : undefined
                  }
                >
                  V
                </button>
              )}
            </div>
          );
        })}
      </div>
      {variantPickerMove && variantOptions.length > 0 && (
        <section
          id={variantPickerId}
          className="mobile-variant-picker"
          aria-label={`Variants after ${variantPickerMove.label}`}
        >
          <div className="mobile-variant-picker-header">
            <strong>Variants after {variantPickerMove.label}</strong>
            <button
              type="button"
              className="card-close-button"
              onClick={() => setVariantPickerMove(null)}
              aria-label="Close variant selection"
              title="Close variant selection"
            >
              ×
            </button>
          </div>
          <div className="mobile-variant-options">
            {variantOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`mobile-variant-option${option.isSelected ? " mobile-variant-option-selected" : ""}`}
                onClick={() => {
                  if (option.isSelected) {
                    return;
                  }

                  onSelectVariant(option.id);
                  setVariantPickerMove(null);
                }}
                disabled={option.isSelected}
              >
                <span>
                  {option.continuationText ||
                    option.displayText ||
                    "Current line"}
                </span>
                <span className="mobile-variant-option-meta">
                  {option.isMainLine ? "Main line" : "Sideline"}
                  {option.isSelected ? " · Selected" : ""}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default MobileMoveStrip;
