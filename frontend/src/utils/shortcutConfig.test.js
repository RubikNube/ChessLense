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
        toggleMoveHistory: {
          label: "Toggle history",
          keys: [],
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
        toggleMoveHistory: {
          label: "Toggle history",
          keys: [],
        },
        redoMove: DEFAULT_SHORTCUT_CONFIG.redoMove,
      });
  });

  it("filters unsafe bindings from view-toggle actions", () => {
    expect(
      normalizeShortcutConfig({
        toggleEngineWindow: {
          label: "Toggle engine",
          keys: ["j", "Ctrl+L", "Alt+E", "F8"],
        },
        toggleOpeningTreePanel: {
          label: "Toggle opening tree",
          keys: ["o", "Ctrl+T", "Alt+O", "F11"],
        },
        toggleReplayTrainingPanel: {
          label: "Toggle replay training",
          keys: ["k", "Ctrl+W", "Alt+T", "F9"],
        },
        togglePlayComputerPanel: {
          label: "Toggle play computer",
          keys: ["l", "Ctrl+R", "Alt+P", "F10"],
        },
      }).toggleEngineWindow,
    ).toEqual({
      label: "Toggle engine",
      keys: ["F8"],
    });
    expect(
      normalizeShortcutConfig({
        toggleOpeningTreePanel: {
          label: "Toggle opening tree",
          keys: ["o", "Ctrl+T", "Alt+O", "F11"],
        },
      }).toggleOpeningTreePanel,
    ).toEqual({
      label: "Toggle opening tree",
      keys: ["F11"],
    });
    expect(
      normalizeShortcutConfig({
        toggleReplayTrainingPanel: {
          label: "Toggle replay training",
          keys: ["k", "Ctrl+W", "Alt+T", "F9"],
        },
      }).toggleReplayTrainingPanel,
    ).toEqual({
      label: "Toggle replay training",
      keys: ["F9"],
    });
    expect(
      normalizeShortcutConfig({
        togglePlayComputerPanel: {
          label: "Toggle play computer",
          keys: ["l", "Ctrl+R", "Alt+P", "F10"],
        },
      }).togglePlayComputerPanel,
    ).toEqual({
      label: "Toggle play computer",
      keys: ["F10"],
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
