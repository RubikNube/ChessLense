export const DEFAULT_THEME = {
  appBackground: "#111827",
  appText: "#e5e7eb",
  surface: "#1f2937",
  surfaceAlt: "#111827",
  surfaceText: "#e5e7eb",
  surfaceTextMuted: "#9ca3af",
  border: "#374151",
  accent: "#2563eb",
  accentText: "#ffffff",
  success: "#16a34a",
  successText: "#ffffff",
  danger: "#dc2626",
  dangerText: "#ffffff",
  modalBackground: "#ffffff",
  modalSurface: "#f9fafb",
  modalText: "#111827",
  modalTextMuted: "#4b5563",
  modalBorder: "#d1d5db",
  boardLightSquare: "#f0d9b5",
  boardDarkSquare: "#b58863",
  boardWhitePiece: "#f9fafb",
  boardBlackPiece: "#111827",
};

export const THEME_TOKEN_ORDER = [
  "appBackground",
  "appText",
  "surface",
  "surfaceAlt",
  "surfaceText",
  "surfaceTextMuted",
  "border",
  "accent",
  "accentText",
  "success",
  "successText",
  "danger",
  "dangerText",
  "modalBackground",
  "modalSurface",
  "modalText",
  "modalTextMuted",
  "modalBorder",
  "boardLightSquare",
  "boardDarkSquare",
  "boardWhitePiece",
  "boardBlackPiece",
];

export const THEME_FIELD_SECTIONS = [
  {
    id: "app",
    title: "App",
    fields: [
      { key: "appBackground", label: "App background" },
      { key: "appText", label: "App text" },
      { key: "surface", label: "Panel surface" },
      { key: "surfaceAlt", label: "Nested surface" },
      { key: "surfaceText", label: "Panel text" },
      { key: "surfaceTextMuted", label: "Muted panel text" },
      { key: "border", label: "Border" },
      { key: "accent", label: "Accent" },
      { key: "accentText", label: "Accent text" },
      { key: "success", label: "Success" },
      { key: "successText", label: "Success text" },
      { key: "danger", label: "Danger" },
      { key: "dangerText", label: "Danger text" },
    ],
  },
  {
    id: "modal",
    title: "Modal",
    fields: [
      { key: "modalBackground", label: "Modal background" },
      { key: "modalSurface", label: "Modal surface" },
      { key: "modalText", label: "Modal text" },
      { key: "modalTextMuted", label: "Modal muted text" },
      { key: "modalBorder", label: "Modal border" },
    ],
  },
  {
    id: "board",
    title: "Board",
    fields: [
      { key: "boardLightSquare", label: "Light square" },
      { key: "boardDarkSquare", label: "Dark square" },
      { key: "boardWhitePiece", label: "White piece" },
      { key: "boardBlackPiece", label: "Black piece" },
    ],
  },
];

export const THEME_PRESETS = [
  {
    id: "midnight-blue",
    label: "Midnight Blue",
    description:
      "The default dark theme with strong contrast and familiar board colors.",
    values: DEFAULT_THEME,
  },
  {
    id: "slate-light",
    label: "Slate Light",
    description:
      "A bright, low-glare light theme with dark text and clear borders.",
    values: {
      appBackground: "#e5e7eb",
      appText: "#111827",
      surface: "#ffffff",
      surfaceAlt: "#f3f4f6",
      surfaceText: "#111827",
      surfaceTextMuted: "#374151",
      border: "#94a3b8",
      accent: "#1d4ed8",
      accentText: "#ffffff",
      success: "#15803d",
      successText: "#ffffff",
      danger: "#b91c1c",
      dangerText: "#ffffff",
      modalBackground: "#ffffff",
      modalSurface: "#f8fafc",
      modalText: "#111827",
      modalTextMuted: "#334155",
      modalBorder: "#cbd5e1",
      boardLightSquare: "#f0d9b5",
      boardDarkSquare: "#b58863",
      boardWhitePiece: "#ffffff",
      boardBlackPiece: "#111827",
    },
  },
  {
    id: "emerald-night",
    label: "Emerald Night",
    description:
      "A dark green palette with bright text, bold accenting, and a calmer board.",
    values: {
      appBackground: "#081c15",
      appText: "#ecfdf5",
      surface: "#0f2d24",
      surfaceAlt: "#0b241d",
      surfaceText: "#ecfdf5",
      surfaceTextMuted: "#a7f3d0",
      border: "#2d6a4f",
      accent: "#34d399",
      accentText: "#052e16",
      success: "#4ade80",
      successText: "#052e16",
      danger: "#f87171",
      dangerText: "#111827",
      modalBackground: "#f5fffb",
      modalSurface: "#dcfce7",
      modalText: "#052e16",
      modalTextMuted: "#166534",
      modalBorder: "#86efac",
      boardLightSquare: "#efe9d5",
      boardDarkSquare: "#4b7b4f",
      boardWhitePiece: "#f8fafc",
      boardBlackPiece: "#111827",
    },
  },
  {
    id: "amber-study",
    label: "Amber Study",
    description:
      "A high-contrast dark slate theme with warm amber highlights and readable light dialogs.",
    values: {
      appBackground: "#020617",
      appText: "#f8fafc",
      surface: "#0f172a",
      surfaceAlt: "#111827",
      surfaceText: "#f8fafc",
      surfaceTextMuted: "#cbd5e1",
      border: "#334155",
      accent: "#f59e0b",
      accentText: "#111827",
      success: "#22c55e",
      successText: "#052e16",
      danger: "#f87171",
      dangerText: "#111827",
      modalBackground: "#fff7ed",
      modalSurface: "#ffedd5",
      modalText: "#111827",
      modalTextMuted: "#7c2d12",
      modalBorder: "#fdba74",
      boardLightSquare: "#f3e5c3",
      boardDarkSquare: "#8b5e3c",
      boardWhitePiece: "#ffffff",
      boardBlackPiece: "#111827",
    },
  },
  {
    id: "nord-frost",
    label: "Nord Frost",
    description:
      "A cool blue-gray dark theme with icy accents and high readability.",
    values: {
      appBackground: "#0b1220",
      appText: "#e5eefc",
      surface: "#162033",
      surfaceAlt: "#111827",
      surfaceText: "#eff6ff",
      surfaceTextMuted: "#bfdbfe",
      border: "#375a7f",
      accent: "#60a5fa",
      accentText: "#0f172a",
      success: "#4ade80",
      successText: "#052e16",
      danger: "#f87171",
      dangerText: "#111827",
      modalBackground: "#f8fbff",
      modalSurface: "#e0f2fe",
      modalText: "#0f172a",
      modalTextMuted: "#1e3a8a",
      modalBorder: "#93c5fd",
      boardLightSquare: "#dbe4f0",
      boardDarkSquare: "#58708a",
      boardWhitePiece: "#ffffff",
      boardBlackPiece: "#0f172a",
    },
  },
  {
    id: "violet-royal",
    label: "Violet Royal",
    description:
      "A dark violet theme with bright lavender accents and crisp contrast.",
    values: {
      appBackground: "#160a2e",
      appText: "#f5f3ff",
      surface: "#241149",
      surfaceAlt: "#1b0d38",
      surfaceText: "#f5f3ff",
      surfaceTextMuted: "#ddd6fe",
      border: "#6d28d9",
      accent: "#a78bfa",
      accentText: "#1e1b4b",
      success: "#4ade80",
      successText: "#052e16",
      danger: "#fca5a5",
      dangerText: "#111827",
      modalBackground: "#faf5ff",
      modalSurface: "#ede9fe",
      modalText: "#2e1065",
      modalTextMuted: "#5b21b6",
      modalBorder: "#c4b5fd",
      boardLightSquare: "#efe8ff",
      boardDarkSquare: "#6b4fa3",
      boardWhitePiece: "#ffffff",
      boardBlackPiece: "#111827",
    },
  },
  {
    id: "graphite-mono",
    label: "Graphite Mono",
    description:
      "A neutral monochrome preset with strong contrast and minimal color noise.",
    values: {
      appBackground: "#0a0a0a",
      appText: "#f5f5f5",
      surface: "#171717",
      surfaceAlt: "#0f0f0f",
      surfaceText: "#fafafa",
      surfaceTextMuted: "#d4d4d4",
      border: "#525252",
      accent: "#fafafa",
      accentText: "#111111",
      success: "#86efac",
      successText: "#052e16",
      danger: "#fca5a5",
      dangerText: "#111827",
      modalBackground: "#fafafa",
      modalSurface: "#f5f5f5",
      modalText: "#171717",
      modalTextMuted: "#404040",
      modalBorder: "#a3a3a3",
      boardLightSquare: "#d4d4d4",
      boardDarkSquare: "#525252",
      boardWhitePiece: "#ffffff",
      boardBlackPiece: "#111111",
    },
  },
  {
    id: "rosewood-light",
    label: "Rosewood Light",
    description:
      "A warm light preset with deep rose accents and dark text for long study sessions.",
    values: {
      appBackground: "#fdf2f8",
      appText: "#3f0d24",
      surface: "#ffffff",
      surfaceAlt: "#fce7f3",
      surfaceText: "#4a044e",
      surfaceTextMuted: "#831843",
      border: "#f9a8d4",
      accent: "#be185d",
      accentText: "#ffffff",
      success: "#15803d",
      successText: "#ffffff",
      danger: "#b91c1c",
      dangerText: "#ffffff",
      modalBackground: "#fffafc",
      modalSurface: "#fdf2f8",
      modalText: "#4a044e",
      modalTextMuted: "#9d174d",
      modalBorder: "#f9a8d4",
      boardLightSquare: "#f4e1d2",
      boardDarkSquare: "#a97155",
      boardWhitePiece: "#ffffff",
      boardBlackPiece: "#111827",
    },
  },
];

const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function expandHexColor(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (!HEX_COLOR_PATTERN.test(normalizedValue)) {
    return null;
  }

  if (normalizedValue.length === 4) {
    return `#${normalizedValue
      .slice(1)
      .split("")
      .map((character) => character.repeat(2))
      .join("")}`;
  }

  return normalizedValue;
}

function hexToRgbChannels(value) {
  const normalizedValue = expandHexColor(value);

  if (!normalizedValue) {
    return null;
  }

  return {
    red: Number.parseInt(normalizedValue.slice(1, 3), 16),
    green: Number.parseInt(normalizedValue.slice(3, 5), 16),
    blue: Number.parseInt(normalizedValue.slice(5, 7), 16),
  };
}

function withAlpha(hexColor, alpha) {
  const channels = hexToRgbChannels(hexColor);

  if (!channels) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  return `rgba(${channels.red}, ${channels.green}, ${channels.blue}, ${alpha})`;
}

function toCssVariableName(tokenName) {
  return `--theme-${tokenName.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)}`;
}

export function isValidThemeColor(value) {
  return Boolean(expandHexColor(value));
}

export function normalizeThemeOverrides(overrides) {
  if (!overrides || typeof overrides !== "object") {
    return {};
  }

  return THEME_TOKEN_ORDER.reduce((normalizedOverrides, tokenName) => {
    const nextValue = expandHexColor(overrides[tokenName]);

    if (!nextValue) {
      return normalizedOverrides;
    }

    if (nextValue !== DEFAULT_THEME[tokenName]) {
      normalizedOverrides[tokenName] = nextValue;
    }

    return normalizedOverrides;
  }, {});
}

export function resolveTheme(overrides = {}) {
  return {
    ...DEFAULT_THEME,
    ...normalizeThemeOverrides(overrides),
  };
}

export function getThemeOverrideValue(overrides, tokenName, nextColor) {
  const normalizedColor = expandHexColor(nextColor);

  if (!normalizedColor || normalizedColor === DEFAULT_THEME[tokenName]) {
    const nextOverrides = { ...normalizeThemeOverrides(overrides) };
    delete nextOverrides[tokenName];
    return nextOverrides;
  }

  return {
    ...normalizeThemeOverrides(overrides),
    [tokenName]: normalizedColor,
  };
}

export function createThemeCssVariables(overrides = {}) {
  const theme = resolveTheme(overrides);

  return {
    [toCssVariableName("appBackground")]: theme.appBackground,
    [toCssVariableName("appText")]: theme.appText,
    [toCssVariableName("surface")]: theme.surface,
    [toCssVariableName("surfaceAlt")]: theme.surfaceAlt,
    [toCssVariableName("surfaceText")]: theme.surfaceText,
    [toCssVariableName("surfaceTextMuted")]: theme.surfaceTextMuted,
    [toCssVariableName("border")]: theme.border,
    [toCssVariableName("accent")]: theme.accent,
    [toCssVariableName("accentText")]: theme.accentText,
    [toCssVariableName("success")]: theme.success,
    [toCssVariableName("successText")]: theme.successText,
    [toCssVariableName("danger")]: theme.danger,
    [toCssVariableName("dangerText")]: theme.dangerText,
    [toCssVariableName("modalBackground")]: theme.modalBackground,
    [toCssVariableName("modalSurface")]: theme.modalSurface,
    [toCssVariableName("modalText")]: theme.modalText,
    [toCssVariableName("modalTextMuted")]: theme.modalTextMuted,
    [toCssVariableName("modalBorder")]: theme.modalBorder,
    [toCssVariableName("boardLightSquare")]: theme.boardLightSquare,
    [toCssVariableName("boardDarkSquare")]: theme.boardDarkSquare,
    [toCssVariableName("boardWhitePiece")]: theme.boardWhitePiece,
    [toCssVariableName("boardBlackPiece")]: theme.boardBlackPiece,
    "--theme-accent-soft": withAlpha(theme.accent, 0.18),
    "--theme-accent-outline": withAlpha(theme.accent, 0.35),
    "--theme-success-soft": withAlpha(theme.success, 0.18),
    "--theme-danger-soft": withAlpha(theme.danger, 0.18),
    "--theme-overlay": withAlpha(theme.appBackground, 0.78),
    "--theme-tooltip-background": withAlpha(theme.appBackground, 0.98),
    "--theme-shadow": withAlpha(theme.appBackground, 0.35),
    "--theme-shadow-strong": withAlpha(theme.appBackground, 0.5),
    "--theme-board-white-piece-shadow-strong": withAlpha(
      theme.boardBlackPiece,
      0.95,
    ),
    "--theme-board-white-piece-shadow-soft": withAlpha(
      theme.boardBlackPiece,
      0.45,
    ),
    "--theme-board-white-piece-stroke": withAlpha(theme.boardBlackPiece, 0.9),
    "--theme-board-black-piece-shadow-strong": withAlpha(
      theme.boardWhitePiece,
      0.55,
    ),
    "--theme-board-black-piece-shadow-soft": withAlpha(
      theme.boardWhitePiece,
      0.2,
    ),
  };
}

export function getThemePresetById(presetId) {
  return (
    THEME_PRESETS.find((themePreset) => themePreset.id === presetId) ??
    THEME_PRESETS[0]
  );
}

export const THEME_CSS_VARS = {
  appBackground: "var(--theme-app-background)",
  appText: "var(--theme-app-text)",
  surface: "var(--theme-surface)",
  surfaceAlt: "var(--theme-surface-alt)",
  surfaceText: "var(--theme-surface-text)",
  surfaceTextMuted: "var(--theme-surface-text-muted)",
  border: "var(--theme-border)",
  accent: "var(--theme-accent)",
  accentText: "var(--theme-accent-text)",
  accentSoft: "var(--theme-accent-soft)",
  accentOutline: "var(--theme-accent-outline)",
  success: "var(--theme-success)",
  successText: "var(--theme-success-text)",
  successSoft: "var(--theme-success-soft)",
  danger: "var(--theme-danger)",
  dangerText: "var(--theme-danger-text)",
  dangerSoft: "var(--theme-danger-soft)",
  modalBackground: "var(--theme-modal-background)",
  modalSurface: "var(--theme-modal-surface)",
  modalText: "var(--theme-modal-text)",
  modalTextMuted: "var(--theme-modal-text-muted)",
  modalBorder: "var(--theme-modal-border)",
  boardLightSquare: "var(--theme-board-light-square)",
  boardDarkSquare: "var(--theme-board-dark-square)",
  boardWhitePiece: "var(--theme-board-white-piece)",
  boardBlackPiece: "var(--theme-board-black-piece)",
  overlay: "var(--theme-overlay)",
  tooltipBackground: "var(--theme-tooltip-background)",
  shadow: "var(--theme-shadow)",
  shadowStrong: "var(--theme-shadow-strong)",
  boardWhitePieceShadowStrong: "var(--theme-board-white-piece-shadow-strong)",
  boardWhitePieceShadowSoft: "var(--theme-board-white-piece-shadow-soft)",
  boardWhitePieceStroke: "var(--theme-board-white-piece-stroke)",
  boardBlackPieceShadowStrong: "var(--theme-board-black-piece-shadow-strong)",
  boardBlackPieceShadowSoft: "var(--theme-board-black-piece-shadow-soft)",
};
