import { describe, expect, it } from "vitest";
import {
  DEFAULT_SHORTCUT_CONFIG,
  getShortcutDisplayLabel,
  matchesShortcut,
  normalizeShortcutConfig,
} from "./appState.js";

describe("normalizeShortcutConfig", () => {
  it("returns defaults when config is missing", () => {
    expect(normalizeShortcutConfig(null)).toEqual(DEFAULT_SHORTCUT_CONFIG);
  });

  it("merges valid shortcut entries and falls back for invalid ones", () => {
    expect(
      normalizeShortcutConfig({
        undoMove: {
          label: "Step back",
          keys: ["Backspace"],
        },
        redoMove: {
          label: "",
          keys: [""],
        },
      }),
    ).toEqual({
      ...DEFAULT_SHORTCUT_CONFIG,
      undoMove: {
        label: "Step back",
        keys: ["Backspace"],
      },
      redoMove: DEFAULT_SHORTCUT_CONFIG.redoMove,
    });
  });
});

describe("shortcut helpers", () => {
  it("matches configured keys against keyboard events", () => {
    expect(matchesShortcut({ key: "ArrowLeft" }, ["ArrowRight", "ArrowLeft"])).toBe(
      true,
    );
    expect(matchesShortcut({ key: "x" }, ["ArrowRight", "ArrowLeft"])).toBe(
      false,
    );
  });

  it("returns display labels for special keys", () => {
    expect(getShortcutDisplayLabel("ArrowUp")).toBe("↑");
    expect(getShortcutDisplayLabel("CustomKey")).toBe("CustomKey");
  });
});
