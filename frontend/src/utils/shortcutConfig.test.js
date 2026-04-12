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
        jumpToMainVariant: {
          label: "Jump main line",
          keys: [" Ctrl+M "],
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
        jumpToMainVariant: {
          label: "Jump main line",
          keys: ["Ctrl+M"],
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
    expect(matchesShortcut({ key: "m", ctrlKey: true }, ["Ctrl+M"])).toBe(true);
    expect(matchesShortcut({ key: "M", ctrlKey: true, shiftKey: true }, ["Ctrl+M"])).toBe(
      true,
    );
    expect(matchesShortcut({ key: "m", ctrlKey: false }, ["Ctrl+M"])).toBe(false);
  });

  it("returns display labels for special keys", () => {
    expect(getShortcutDisplayLabel("ArrowUp")).toBe("↑");
    expect(getShortcutDisplayLabel("Ctrl+M")).toBe("Ctrl+M");
    expect(getShortcutDisplayLabel("CustomKey")).toBe("CustomKey");
  });
});
