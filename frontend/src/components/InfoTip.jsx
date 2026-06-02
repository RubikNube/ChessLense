import { THEME_CSS_VARS } from "../utils/theme.js";

const infoTipStyle = {
  width: "1.15rem",
  height: "1.15rem",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  border: `1px solid ${THEME_CSS_VARS.border}`,
  backgroundColor: THEME_CSS_VARS.surfaceAlt,
  color: THEME_CSS_VARS.surfaceText,
  fontSize: "0.75rem",
  fontWeight: 700,
  lineHeight: 1,
  cursor: "help",
  flexShrink: 0,
};

function InfoTip({ text, ariaLabel = text }) {
  return (
    <span role="img" aria-label={ariaLabel} title={text} style={infoTipStyle}>
      i
    </span>
  );
}

export default InfoTip;
