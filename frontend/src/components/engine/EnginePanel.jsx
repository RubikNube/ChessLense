import {
  modalActionRowStyle,
  modalButtonStyle,
  modalPrimaryButtonStyle,
} from "../modals/modalStyles.js";
import { THEME_CSS_VARS } from "../../utils/theme.js";
import EngineDepthControl from "./EngineDepthControl.jsx";

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
  border: `1px solid ${THEME_CSS_VARS.modalBorder}`,
  borderRadius: "0.6rem",
  backgroundColor: THEME_CSS_VARS.modalSurface,
  color: THEME_CSS_VARS.modalText,
  textAlign: "left",
  cursor: "pointer",
};

const selectedEngineVariantButtonStyle = {
  borderColor: THEME_CSS_VARS.accent,
  backgroundColor: THEME_CSS_VARS.accentSoft,
  boxShadow: `0 0 0 1px ${THEME_CSS_VARS.accent} inset`,
};

const engineVariantHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
};

const engineVariantMovesStyle = {
  margin: "0.5rem 0 0",
  color: THEME_CSS_VARS.modalTextMuted,
  lineHeight: 1.5,
  fontSize: "0.95rem",
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
      <EngineDepthControl
        inputId="engine-search-depth"
        value={engineSearchDepth}
        min={minEngineSearchDepth}
        max={maxEngineSearchDepth}
        onChange={onChangeEngineSearchDepth}
      />
      {loading && <p>Evaluating position...</p>}
      {engineResult?.error && <p className="error">{engineResult.error}</p>}
      {!engineResult && !loading && <p>No analysis yet.</p>}
      {engineResult?.bestmove && (
        <>
          <p>
            <strong>Best move:</strong> {formattedBestMove}
          </p>
          <p>
            <strong>Evaluation:</strong>{" "}
            {formatEngineEvaluation(engineResult.evaluation)}
          </p>
          {!engineVariants.length && (
            <p className="annotation-empty">
              This backend is still returning the legacy single-variant
              response. Restart the server once so the engine view can load the
              top three variants.
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
