import InfoTip from "../InfoTip.jsx";
import { modalInputStyle } from "../modals/modalStyles.js";

const controlsStyle = {
  display: "grid",
  gap: "0.5rem",
  marginBottom: "1rem",
};

const headerStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
};

const inputStyle = {
  ...modalInputStyle,
  width: "8rem",
  marginTop: 0,
  padding: "0.6rem 0.75rem",
};

function EngineDepthControl({
  inputId,
  value,
  min,
  max,
  onChange,
  infoText = "Used for evaluation bar, engine analysis, and training replies.",
}) {
  return (
    <div style={controlsStyle}>
      <div style={headerStyle}>
        <label htmlFor={inputId} style={{ fontWeight: 600 }}>
          Search depth
        </label>
        <InfoTip text={infoText} />
      </div>
      <input
        id={inputId}
        type="number"
        min={min}
        max={max}
        step="1"
        inputMode="numeric"
        value={value}
        onChange={onChange}
        style={inputStyle}
      />
    </div>
  );
}

export default EngineDepthControl;
