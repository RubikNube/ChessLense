import { THEME_CSS_VARS } from "../utils/theme.js";

const fieldsetStyle = {
  minWidth: 0,
  margin: 0,
  padding: 0,
  border: "none",
};

const legendStyle = {
  padding: 0,
  color: THEME_CSS_VARS.surfaceTextMuted,
  fontSize: "0.8rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const optionsStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "0.75rem",
  minHeight: 40,
};

const optionStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
  color: THEME_CSS_VARS.surfaceText,
  cursor: "pointer",
};

const radioStyle = {
  accentColor: THEME_CSS_VARS.accent,
  cursor: "inherit",
  margin: 0,
};

function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  disabled = false,
}) {
  return (
    <fieldset style={fieldsetStyle}>
      <legend style={legendStyle}>{label}</legend>
      <div style={optionsStyle}>
        {options.map((option) => {
          const optionDisabled = disabled || Boolean(option.disabled);

          return (
            <label key={option.value} style={optionStyle}>
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                disabled={optionDisabled}
                style={radioStyle}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default RadioGroup;
