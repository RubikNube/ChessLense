import ModalShell from "./ModalShell.jsx";
import {
  modalActionRowStyle,
  modalButtonStyle,
  modalPrimaryButtonStyle,
} from "./modalStyles.js";
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  THEME_FIELD_SECTIONS,
  THEME_CSS_VARS,
  THEME_TOKEN_ORDER,
} from "../../utils/theme.js";

const previewGridStyle = {
  display: "grid",
  gap: "0.75rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  marginTop: "1rem",
};

const previewCardStyle = {
  borderRadius: "0.75rem",
  border: `1px solid ${THEME_CSS_VARS.modalBorder}`,
  padding: "1rem",
  display: "grid",
  gap: "0.5rem",
};

const sectionStyle = {
  marginTop: "1.5rem",
};

const fieldGridStyle = {
  display: "grid",
  gap: "0.75rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  marginTop: "0.75rem",
};

const colorFieldStyle = {
  display: "grid",
  gap: "0.45rem",
};

const colorLabelStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
  fontWeight: 600,
};

const colorInputRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
};

const colorInputStyle = {
  width: "3rem",
  height: "2.5rem",
  padding: 0,
  border: "none",
  background: "transparent",
  cursor: "pointer",
};

const colorValueStyle = {
  minWidth: "6.5rem",
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: "0.9rem",
  color: THEME_CSS_VARS.modalTextMuted,
};

const helperTextStyle = {
  margin: 0,
  color: THEME_CSS_VARS.modalTextMuted,
  lineHeight: 1.5,
};

const presetGridStyle = {
  display: "grid",
  gap: "0.75rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  marginTop: "1rem",
};

const presetCardStyle = {
  ...previewCardStyle,
  alignContent: "start",
};

const presetDescriptionStyle = {
  margin: 0,
  color: THEME_CSS_VARS.modalTextMuted,
  lineHeight: 1.5,
  fontSize: "0.92rem",
};

const resetTokenButtonStyle = {
  ...modalButtonStyle,
  padding: "0.45rem 0.7rem",
  fontSize: "0.85rem",
};

function ThemePreviewCard({
  title,
  backgroundColor,
  borderColor,
  headingColor,
  textColor,
  accentColor,
  accentTextColor,
}) {
  return (
    <div
      style={{
        ...previewCardStyle,
        backgroundColor,
        borderColor,
      }}
    >
      <strong style={{ color: headingColor }}>{title}</strong>
      <p style={{ margin: 0, color: textColor }}>
        Preview the active colors before saving them.
      </p>
      <button
        type="button"
        style={{
          ...modalPrimaryButtonStyle,
          marginTop: "0.25rem",
          alignSelf: "start",
          backgroundColor: accentColor,
          borderColor: accentColor,
          color: accentTextColor,
        }}
      >
        Accent button
      </button>
    </div>
  );
}

function isPresetActive(presetValues, resolvedTheme) {
  return THEME_TOKEN_ORDER.every(
    (tokenName) => presetValues[tokenName] === resolvedTheme[tokenName],
  );
}

function ThemeSettingsModal({
  themeOverrides,
  resolvedTheme,
  onChangeThemeColor,
  onApplyThemePreset,
  onResetTheme,
  onClose,
}) {
  return (
    <ModalShell
      title="Theme Settings"
      titleId="theme-settings-title"
      onClose={onClose}
      wide
      showCloseButton
    >
      <p style={helperTextStyle}>
        Pick the colors you want to customize. Reset any token to fall back to
        the default theme.
      </p>

      <section style={sectionStyle}>
        <h3>Presets</h3>
        <p style={helperTextStyle}>
          Start with a high-contrast preset, then fine-tune any color below.
        </p>
        <div style={presetGridStyle}>
          {THEME_PRESETS.map((preset) => {
            const isActive = isPresetActive(preset.values, resolvedTheme);

            return (
              <div
                key={preset.id}
                style={{
                  ...presetCardStyle,
                  backgroundColor: preset.values.modalBackground,
                  borderColor: isActive
                    ? preset.values.accent
                    : preset.values.modalBorder,
                  boxShadow: isActive
                    ? `0 0 0 1px ${preset.values.accent} inset`
                    : undefined,
                }}
              >
                <strong style={{ color: preset.values.modalText }}>
                  {preset.label}
                </strong>
                <p
                  style={{
                    ...presetDescriptionStyle,
                    color: preset.values.modalTextMuted,
                  }}
                >
                  {preset.description}
                </p>
                <ThemePreviewCard
                  title="Preview"
                  backgroundColor={preset.values.surface}
                  borderColor={preset.values.border}
                  headingColor={preset.values.surfaceText}
                  textColor={preset.values.surfaceTextMuted}
                  accentColor={preset.values.accent}
                  accentTextColor={preset.values.accentText}
                />
                <button
                  type="button"
                  style={{
                    ...modalPrimaryButtonStyle,
                    marginTop: "0.25rem",
                    backgroundColor: preset.values.accent,
                    borderColor: preset.values.accent,
                    color: preset.values.accentText,
                  }}
                  onClick={() => onApplyThemePreset(preset.id)}
                  disabled={isActive}
                >
                  {isActive ? "Active preset" : "Apply preset"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <div style={previewGridStyle}>
        <ThemePreviewCard
          title="App surface"
          backgroundColor={THEME_CSS_VARS.surface}
          borderColor={THEME_CSS_VARS.border}
          headingColor={THEME_CSS_VARS.surfaceText}
          textColor={THEME_CSS_VARS.surfaceTextMuted}
          accentColor={THEME_CSS_VARS.accent}
          accentTextColor={THEME_CSS_VARS.accentText}
        />
        <ThemePreviewCard
          title="Modal surface"
          backgroundColor={THEME_CSS_VARS.modalBackground}
          borderColor={THEME_CSS_VARS.modalBorder}
          headingColor={THEME_CSS_VARS.modalText}
          textColor={THEME_CSS_VARS.modalTextMuted}
          accentColor={THEME_CSS_VARS.accent}
          accentTextColor={THEME_CSS_VARS.accentText}
        />
      </div>

      {THEME_FIELD_SECTIONS.map((section) => (
        <section key={section.id} style={sectionStyle}>
          <h3>{section.title}</h3>
          <div style={fieldGridStyle}>
            {section.fields.map((field) => {
              const isCustomized = Object.prototype.hasOwnProperty.call(
                themeOverrides,
                field.key,
              );

              return (
                <div key={field.key} style={colorFieldStyle}>
                  <div style={colorLabelStyle}>
                    <span>{field.label}</span>
                    <button
                      type="button"
                      style={resetTokenButtonStyle}
                      onClick={() =>
                        onChangeThemeColor(field.key, DEFAULT_THEME[field.key])
                      }
                      disabled={!isCustomized}
                    >
                      Reset
                    </button>
                  </div>
                  <div style={colorInputRowStyle}>
                    <input
                      type="color"
                      value={resolvedTheme[field.key]}
                      style={colorInputStyle}
                      onChange={(event) =>
                        onChangeThemeColor(field.key, event.target.value)
                      }
                      aria-label={field.label}
                    />
                    <span style={colorValueStyle}>
                      {resolvedTheme[field.key]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div style={modalActionRowStyle}>
        <button type="button" style={modalButtonStyle} onClick={onClose}>
          Close
        </button>
        <button
          type="button"
          style={modalButtonStyle}
          onClick={onResetTheme}
          disabled={!Object.keys(themeOverrides).length}
        >
          Reset theme
        </button>
      </div>
    </ModalShell>
  );
}

export default ThemeSettingsModal;
