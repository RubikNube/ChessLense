import InfoTip from "../InfoTip.jsx";
import {
  modalActionRowStyle,
  modalButtonStyle,
  modalInputStyle,
  modalPrimaryButtonStyle,
} from "../modals/modalStyles.js";

const engineVariantListStyle = {
  listStyle: "none",
  padding: 0,
  margin: "1rem 0 0",
  display: "grid",
  gap: "0.75rem",
};

const engineVariantButtonStyle = {
  width: "100%",
  padding: "0.85rem 0.9rem",
  border: "1px solid #d1d5db",
  borderRadius: "0.6rem",
  backgroundColor: "#f9fafb",
  color: "#111827",
  textAlign: "left",
  cursor: "pointer",
};

const selectedEngineVariantButtonStyle = {
  borderColor: "#2563eb",
  backgroundColor: "#eff6ff",
  boxShadow: "0 0 0 1px #2563eb inset",
};

const engineVariantHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
};

const engineVariantMovesStyle = {
  margin: "0.5rem 0 0",
  color: "#374151",
  lineHeight: 1.5,
  fontSize: "0.95rem",
};

const engineControlsStyle = {
  display: "grid",
  gap: "0.5rem",
  marginBottom: "1rem",
};

const engineDepthHeaderStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
};

const engineDepthLabelStyle = {
  fontWeight: 600,
};

const engineDepthInputStyle = {
  ...modalInputStyle,
  width: "8rem",
  marginTop: 0,
  padding: "0.6rem 0.75rem",
};

function formatEngineEvaluation(evaluation) {
  if (!evaluation) {
    return "n/a";
  }

  return `${evaluation.type} ${evaluation.value}`;
}

function EnginePanel({
  onClose,
  engineSearchDepth,
  minEngineSearchDepth,
  maxEngineSearchDepth,
  onChangeEngineSearchDepth,
  loading,
  engineResult,
  formattedBestMove,
  engineVariants,
  selectedEngineVariant,
  onSelectEngineVariant,
  onAnalyzePosition,
  onAddSelectedVariant,
}) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Engine</h2>
        <button
          type="button"
          className="card-close-button"
          onClick={onClose}
          aria-label="Close Engine"
          title="Close Engine"
        >
          ×
        </button>
      </div>
      <div style={engineControlsStyle}>
        <div style={engineDepthHeaderStyle}>
          <label htmlFor="engine-search-depth" style={engineDepthLabelStyle}>
            Search depth
          </label>
          <InfoTip text="Used for evaluation bar, engine analysis, and training replies." />
        </div>
        <input
          id="engine-search-depth"
          type="number"
          min={minEngineSearchDepth}
          max={maxEngineSearchDepth}
          step="1"
          inputMode="numeric"
          value={engineSearchDepth}
          onChange={onChangeEngineSearchDepth}
          style={engineDepthInputStyle}
        />
      </div>
      {loading && <p>Evaluating position...</p>}
      {engineResult?.error && <p className="error">{engineResult.error}</p>}
      {!engineResult && !loading && <p>No analysis yet.</p>}
      {engineResult?.bestmove && (
        <>
          <p>
            <strong>Best move:</strong> {formattedBestMove}
          </p>
          <p>
            <strong>Evaluation:</strong> {formatEngineEvaluation(engineResult.evaluation)}
          </p>
          {!engineVariants.length && (
            <p className="annotation-empty">
              This backend is still returning the legacy single-variant response.
              Restart the server once so the engine view can load the top three variants.
            </p>
          )}
          {!!engineVariants.length && (
            <ul style={engineVariantListStyle}>
              {engineVariants.map((variant, index) => (
                <li key={variant.multipv}>
                  <button
                    type="button"
                    onClick={() => onSelectEngineVariant(index)}
                    style={{
                      ...engineVariantButtonStyle,
                      ...(selectedEngineVariant?.index === index
                        ? selectedEngineVariantButtonStyle
                        : {}),
                    }}
                  >
                    <div style={engineVariantHeaderStyle}>
                      <strong>Variant {variant.multipv}</strong>
                      <span>{formatEngineEvaluation(variant.evaluation)}</span>
                    </div>
                    <p style={engineVariantMovesStyle}>
                      {variant.displayText || (variant.moves ?? []).join(" ")}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <div style={modalActionRowStyle}>
        <button
          type="button"
          style={modalButtonStyle}
          onClick={onAnalyzePosition}
          disabled={loading}
        >
          {loading ? "Evaluating..." : "Evaluate position"}
        </button>
        {!!engineVariants.length && (
          <button
            type="button"
            style={modalPrimaryButtonStyle}
            onClick={onAddSelectedVariant}
            disabled={!selectedEngineVariant?.moveObjects?.length}
          >
            Add to variants
          </button>
        )}
      </div>
    </div>
  );
}

export default EnginePanel;
