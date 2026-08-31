// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppMenuBar from "./AppMenuBar.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function createActions() {
  return new Proxy(
    {},
    {
      get(target, property) {
        if (!target[property]) {
          target[property] = vi.fn();
        }

        return target[property];
      },
    },
  );
}

function renderMenu(root, overrides = {}) {
  const actions = overrides.actions ?? createActions();
  const props = {
    openMenu: null,
    onToggleMenu: () => {},
    onMenuAction: () => {},
    showVariantArrows: false,
    canUndo: false,
    canRedo: false,
    showMoveHistory: true,
    showOpeningTreePanel: true,
    showOtbPlayerTreePanel: false,
    showPuzzleTrainingPanel: false,
    showReplayTrainingPanel: false,
    showGuessTrainingPanel: false,
    showPlayComputerPanel: false,
    showEngineWindow: true,
    showGameAnalysisPanel: false,
    showEvaluationBar: true,
    boardSoundsEnabled: true,
    showComments: true,
    showImportedPgn: true,
    showVariants: true,
    viewMode: "auto",
    actions,
    ...overrides,
  };

  act(() => root.render(<AppMenuBar {...props} />));
  return actions;
}

describe("AppMenuBar whole-game analysis actions", () => {
  let container;
  let root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it("offers start and independent view-toggle actions", () => {
    const onMenuAction = vi.fn();
    const actions = createActions();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    renderMenu(root, { openMenu: "engine", actions, onMenuAction });
    const analyzeButton = [
      ...container.querySelectorAll(".menu-dropdown button"),
    ].find((button) => button.textContent === "Analyze Whole Game");
    act(() => analyzeButton.click());
    expect(onMenuAction).toHaveBeenCalledWith(actions.analyzeWholeGame);

    renderMenu(root, { openMenu: "view", actions, onMenuAction });
    const toggleButton = [
      ...container.querySelectorAll(".menu-dropdown button"),
    ].find((button) => button.textContent === "Show Whole Game Analysis");
    act(() => toggleButton.click());
    expect(onMenuAction).toHaveBeenCalledWith(actions.toggleGameAnalysisPanel);
  });

  it("offers explicit view modes and marks the active mode", () => {
    const onMenuAction = vi.fn();
    const actions = createActions();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    renderMenu(root, {
      openMenu: "view",
      actions,
      onMenuAction,
      viewMode: "normal",
    });

    const modeButtons = [
      ...container.querySelectorAll(".menu-dropdown button"),
    ].filter((button) => button.textContent.includes("View Mode:"));
    expect(modeButtons).toHaveLength(3);
    expect(
      modeButtons
        .find((button) => button.textContent.includes("Normal"))
        .getAttribute("aria-pressed"),
    ).toBe("true");

    const mobileButton = modeButtons.find((button) =>
      button.textContent.includes("Mobile"),
    );
    act(() => mobileButton.click());
    expect(onMenuAction).toHaveBeenCalledWith(actions.useMobileViewMode);

    renderMenu(root, {
      openMenu: "mobile",
      actions,
      onMenuAction,
      viewMode: "normal",
    });
    const viewSectionButton = [
      ...container.querySelectorAll(".menu-accordion-trigger"),
    ].find((button) => button.textContent.includes("View"));
    act(() => viewSectionButton.click());
    const mobileModeChoices = [
      ...container.querySelectorAll(".menu-accordion-content button"),
    ].filter((button) => button.textContent.includes("View Mode:"));
    expect(mobileModeChoices).toHaveLength(3);
  });
});
