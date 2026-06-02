import { THEME_CSS_VARS } from "../../utils/theme.js";

export const shortcutOverlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: THEME_CSS_VARS.overlay,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
  zIndex: 1000,
};

export const shortcutModalStyle = {
  width: "min(100%, 28rem)",
  backgroundColor: THEME_CSS_VARS.modalBackground,
  color: THEME_CSS_VARS.modalText,
  borderRadius: "0.75rem",
  boxShadow: `0 20px 45px ${THEME_CSS_VARS.shadow}`,
  padding: "1.5rem",
};

export const wideModalStyle = {
  ...shortcutModalStyle,
  width: "min(100%, 48rem)",
  maxHeight: "90vh",
  overflowY: "auto",
};

export const modalHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "1rem",
  marginBottom: "1rem",
};

export const modalTitleStyle = {
  margin: 0,
};

export const modalIconCloseButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "2.25rem",
  minWidth: "2.25rem",
  height: "2.25rem",
  border: `1px solid ${THEME_CSS_VARS.modalBorder}`,
  borderRadius: "999px",
  backgroundColor: THEME_CSS_VARS.modalSurface,
  color: THEME_CSS_VARS.modalText,
  cursor: "pointer",
  fontSize: "1.35rem",
  lineHeight: 1,
  fontWeight: 700,
  padding: 0,
};

export const shortcutListStyle = {
  listStyle: "none",
  padding: 0,
  margin: "1rem 0 0",
  display: "grid",
  gap: "0.75rem",
};

export const shortcutItemStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
};

export const shortcutKeyStyle = {
  fontFamily: "inherit",
  fontSize: "0.95rem",
  fontWeight: 700,
  padding: "0.35rem 0.6rem",
  borderRadius: "0.45rem",
  border: `1px solid ${THEME_CSS_VARS.modalBorder}`,
  backgroundColor: THEME_CSS_VARS.modalSurface,
  minWidth: "4.5rem",
  textAlign: "center",
};

export const shortcutCloseButtonStyle = {
  marginTop: "1.25rem",
  padding: "0.65rem 1rem",
  border: `1px solid ${THEME_CSS_VARS.modalBorder}`,
  borderRadius: "0.5rem",
  backgroundColor: THEME_CSS_VARS.modalSurface,
  color: THEME_CSS_VARS.modalText,
  cursor: "pointer",
  fontWeight: 600,
};

export const importPgnTextAreaStyle = {
  width: "100%",
  minHeight: "12rem",
  marginTop: "1rem",
  padding: "0.75rem",
  borderRadius: "0.5rem",
  border: `1px solid ${THEME_CSS_VARS.modalBorder}`,
  boxSizing: "border-box",
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: "0.95rem",
  lineHeight: 1.5,
  resize: "vertical",
  backgroundColor: THEME_CSS_VARS.modalBackground,
  color: THEME_CSS_VARS.modalText,
};

export const modalActionRowStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "0.75rem",
  marginTop: "1rem",
  flexWrap: "wrap",
};

export const modalButtonStyle = {
  padding: "0.65rem 1rem",
  border: `1px solid ${THEME_CSS_VARS.modalBorder}`,
  borderRadius: "0.5rem",
  backgroundColor: THEME_CSS_VARS.modalSurface,
  color: THEME_CSS_VARS.modalText,
  cursor: "pointer",
  fontWeight: 600,
};

export const modalPrimaryButtonStyle = {
  ...modalButtonStyle,
  borderColor: THEME_CSS_VARS.accent,
  backgroundColor: THEME_CSS_VARS.accent,
  color: THEME_CSS_VARS.accentText,
};

export const modalDangerButtonStyle = {
  ...modalButtonStyle,
  borderColor: THEME_CSS_VARS.danger,
  backgroundColor: THEME_CSS_VARS.dangerSoft,
  color: THEME_CSS_VARS.danger,
};

export const modalErrorStyle = {
  marginTop: "0.75rem",
  color: THEME_CSS_VARS.danger,
};

export const modalSuccessStyle = {
  marginTop: "0.75rem",
  color: THEME_CSS_VARS.success,
};

export const modalFieldLabelStyle = {
  display: "block",
  marginTop: "1rem",
  fontWeight: 600,
  color: THEME_CSS_VARS.modalText,
};

export const modalInputStyle = {
  width: "100%",
  marginTop: "0.5rem",
  padding: "0.75rem",
  borderRadius: "0.5rem",
  border: `1px solid ${THEME_CSS_VARS.modalBorder}`,
  boxSizing: "border-box",
  fontSize: "0.95rem",
  lineHeight: 1.4,
  backgroundColor: THEME_CSS_VARS.modalBackground,
  color: THEME_CSS_VARS.modalText,
};

export const studyListStyle = {
  listStyle: "none",
  padding: 0,
  margin: "1rem 0 0",
  display: "grid",
  gap: "0.75rem",
};

export const studyListItemStyle = {
  border: `1px solid ${THEME_CSS_VARS.modalBorder}`,
  borderRadius: "0.65rem",
  padding: "0.9rem",
  backgroundColor: THEME_CSS_VARS.modalSurface,
};

export const studyHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "0.75rem",
};

export const studyMetaStyle = {
  marginTop: "0.45rem",
  color: THEME_CSS_VARS.modalTextMuted,
  fontSize: "0.92rem",
  lineHeight: 1.5,
};

export const collectionListStyle = {
  listStyle: "none",
  padding: 0,
  margin: "1rem 0 0",
  display: "grid",
  gap: "0.65rem",
};

export const collectionRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
  padding: "0.75rem 0.9rem",
  borderRadius: "0.65rem",
  border: `1px solid ${THEME_CSS_VARS.modalBorder}`,
  backgroundColor: THEME_CSS_VARS.modalSurface,
};

export const collectionSelectButtonStyle = {
  ...modalButtonStyle,
  flex: 1,
  textAlign: "left",
};

export const collectionTagListStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
  marginTop: "0.6rem",
};

export const collectionTagStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "0.25rem 0.55rem",
  borderRadius: "999px",
  backgroundColor: THEME_CSS_VARS.modalBorder,
  color: THEME_CSS_VARS.modalTextMuted,
  fontSize: "0.82rem",
  fontWeight: 600,
};
