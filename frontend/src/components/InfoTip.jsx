const infoTipStyle = {
  width: "1.15rem",
  height: "1.15rem",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  border: "1px solid #6b7280",
  backgroundColor: "#111827",
  color: "#d1d5db",
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
