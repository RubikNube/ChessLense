export const shortcutOverlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
  zIndex: 1000,
};

export const shortcutModalStyle = {
  width: "min(100%, 28rem)",
  backgroundColor: "#ffffff",
  color: "#111827",
  borderRadius: "0.75rem",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.35)",
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
  border: "1px solid #d1d5db",
  borderRadius: "999px",
  backgroundColor: "#f9fafb",
  color: "#111827",
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
  border: "1px solid #d1d5db",
  backgroundColor: "#f9fafb",
  minWidth: "4.5rem",
  textAlign: "center",
};

export const shortcutCloseButtonStyle = {
  marginTop: "1.25rem",
  padding: "0.65rem 1rem",
  border: "1px solid #d1d5db",
  borderRadius: "0.5rem",
  backgroundColor: "#f3f4f6",
  color: "#111827",
  cursor: "pointer",
  fontWeight: 600,
};

export const importPgnTextAreaStyle = {
  width: "100%",
  minHeight: "12rem",
  marginTop: "1rem",
  padding: "0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: "0.95rem",
  lineHeight: 1.5,
  resize: "vertical",
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
  border: "1px solid #d1d5db",
  borderRadius: "0.5rem",
  backgroundColor: "#f3f4f6",
  color: "#111827",
  cursor: "pointer",
  fontWeight: 600,
};

export const modalPrimaryButtonStyle = {
  ...modalButtonStyle,
  borderColor: "#2563eb",
  backgroundColor: "#2563eb",
  color: "#ffffff",
};

export const modalDangerButtonStyle = {
  ...modalButtonStyle,
  borderColor: "#dc2626",
  backgroundColor: "#fef2f2",
  color: "#b91c1c",
};

export const modalErrorStyle = {
  marginTop: "0.75rem",
  color: "#dc2626",
};

export const modalSuccessStyle = {
  marginTop: "0.75rem",
  color: "#15803d",
};

export const modalFieldLabelStyle = {
  display: "block",
  marginTop: "1rem",
  fontWeight: 600,
  color: "#111827",
};

export const modalInputStyle = {
  width: "100%",
  marginTop: "0.5rem",
  padding: "0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  fontSize: "0.95rem",
  lineHeight: 1.4,
};

export const studyListStyle = {
  listStyle: "none",
  padding: 0,
  margin: "1rem 0 0",
  display: "grid",
  gap: "0.75rem",
};

export const studyListItemStyle = {
  border: "1px solid #d1d5db",
  borderRadius: "0.65rem",
  padding: "0.9rem",
  backgroundColor: "#f9fafb",
};

export const studyHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "0.75rem",
};

export const studyMetaStyle = {
  marginTop: "0.45rem",
  color: "#4b5563",
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
  border: "1px solid #d1d5db",
  backgroundColor: "#f9fafb",
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
  backgroundColor: "#e5e7eb",
  color: "#374151",
  fontSize: "0.82rem",
  fontWeight: 600,
};
