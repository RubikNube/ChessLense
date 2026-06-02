import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  getThemePresetById,
  normalizeThemeOverrides,
  resolveTheme,
  THEME_PRESETS,
  THEME_TOKEN_ORDER,
} from "./theme.js";

describe("theme presets", () => {
  it("defines valid color values for every preset token", () => {
    for (const preset of THEME_PRESETS) {
      expect(Object.keys(preset.values).sort()).toEqual(
        [...THEME_TOKEN_ORDER].sort(),
      );

      expect(resolveTheme(normalizeThemeOverrides(preset.values))).toEqual(
        preset.values,
      );
    }
  });

  it("returns the default preset when an id is unknown", () => {
    expect(getThemePresetById("missing-preset")).toEqual(THEME_PRESETS[0]);
  });

  it("keeps default token values out of stored overrides", () => {
    expect(
      normalizeThemeOverrides({
        accent: DEFAULT_THEME.accent,
        border: "#ABCDEF",
      }),
    ).toEqual({
      border: "#abcdef",
    });
  });
});
