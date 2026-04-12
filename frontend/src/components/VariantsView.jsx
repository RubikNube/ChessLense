const actionRowStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "0.75rem",
  marginTop: "1rem",
  flexWrap: "wrap",
};

const actionButtonStyle = {
  padding: "0.6rem 1rem",
  border: "1px solid #d0d7de",
  borderRadius: "0.5rem",
  backgroundColor: "#f6f8fa",
  color: "#24292f",
  fontWeight: 600,
  fontSize: "1rem",
  lineHeight: 1,
  minWidth: "2.75rem",
  cursor: "pointer",
  transition: "background-color 0.2s ease, transform 0.2s ease",
};

const disabledActionButtonStyle = {
  backgroundColor: "#eaeef2",
  color: "#8c959f",
  borderColor: "#d8dee4",
  cursor: "not-allowed",
  opacity: 0.75,
};

function VariantsView({
  variantLines,
  canUndo,
  canRedo,
  canJumpToMainVariant,
  onClose,
  onSelectLine,
  onPromoteLine,
  onDemoteLine,
  onUndo,
  onRedo,
  onGoToStart,
  onGoToEnd,
  onJumpToMainVariant,
}) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Variants</h2>
        <button
          type="button"
          className="card-close-button"
          onClick={onClose}
          aria-label="Close Variants"
          title="Close Variants"
        >
          ×
        </button>
      </div>
      {!variantLines.length && <p>No variants branch from this move.</p>}
      {!!variantLines.length && (
        <ul className="variant-lines">
          {variantLines.map((line) => (
            <li
              key={line.id}
              className={`variant-line${line.isSelected ? " variant-line-selected" : ""}`}
            >
              <div className="variant-line-header">
                <div>
                  <span className="variant-line-title">
                    {line.isMainLine ? "Main line" : "Sideline"}
                  </span>
                  <span className="variant-line-branch">{line.branchLabel}</span>
                </div>
                {line.isSelected && <span className="variant-line-badge">Selected</span>}
              </div>
              <button
                type="button"
                className="variant-line-select"
                onClick={() => onSelectLine(line.id)}
              >
                {line.displayText || "Starting position"}
              </button>
              <div className="variant-line-actions">
                <button
                  type="button"
                  className="variant-action-button"
                  onClick={() => onPromoteLine(line.id)}
                  disabled={!line.canPromote}
                >
                  Promote
                </button>
                <button
                  type="button"
                  className="variant-action-button"
                  onClick={() => onDemoteLine(line.id)}
                  disabled={!line.canDemote}
                >
                  Make sideline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div style={actionRowStyle}>
        <button
          type="button"
          onClick={onJumpToMainVariant}
          disabled={!canJumpToMainVariant}
          aria-label="Jump to main variant"
          title="Jump to main variant"
          style={{
            ...actionButtonStyle,
            ...(!canJumpToMainVariant ? disabledActionButtonStyle : {}),
            minWidth: "auto",
          }}
        >
          Main line
        </button>
        <button
          type="button"
          onClick={onGoToStart}
          disabled={!canUndo}
          aria-label="Go to start"
          title="Go to start"
          style={{ ...actionButtonStyle, ...(!canUndo ? disabledActionButtonStyle : {}) }}
        >
          ⏮
        </button>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo"
          style={{ ...actionButtonStyle, ...(!canUndo ? disabledActionButtonStyle : {}) }}
        >
          ◀
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo"
          style={{ ...actionButtonStyle, ...(!canRedo ? disabledActionButtonStyle : {}) }}
        >
          ▶
        </button>
        <button
          type="button"
          onClick={onGoToEnd}
          disabled={!canRedo}
          aria-label="Go to end"
          title="Go to end"
          style={{ ...actionButtonStyle, ...(!canRedo ? disabledActionButtonStyle : {}) }}
        >
          ⏭
        </button>
      </div>
    </div>
  );
}

export default VariantsView;
