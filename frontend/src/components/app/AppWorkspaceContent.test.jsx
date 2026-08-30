// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppWorkspaceContent from "./AppWorkspaceContent.jsx";

vi.mock("../board/BoardWorkspace.jsx", () => ({
  default: ({ belowBoardContent, children }) => (
    <div>
      <div data-testid="below-board-slot">{belowBoardContent}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("../engine/WholeGameAnalysisPanel.jsx", () => ({
  default: () => <div data-testid="analysis-panel" />,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function createApp(overrides = {}) {
  return {
    game: { turn: () => "w" },
    variantTree: { currentNodeId: "root" },
    effectiveBoardArrows: [],
    boardSquareStyles: {},
    moveHistoryItems: [],
    viewLayout: { navigation: [], reference: [] },
    gameAnalysisIssueFilter: "all",
    gameAnalysisIssueSide: "both",
    setGameAnalysisIssueFilter: () => {},
    setGameAnalysisIssueSide: () => {},
    showGameAnalysisPanel: true,
    gameAnalysis: {
      status: "complete",
      total: 1,
      positions: [{ nodeId: "node-1", ply: 1 }],
    },
    ...overrides,
  };
}

describe("AppWorkspaceContent whole-game analysis board controls", () => {
  let container;
  let root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it("shows them only for a visible analysis with available positions", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => root.render(<AppWorkspaceContent app={createApp()} />));
    expect(
      container.querySelector(".game-analysis-navigation-below-board"),
    ).not.toBeNull();
    expect(
      container.querySelector(
        '.game-analysis-navigation-below-board [aria-label="Analysis navigation settings"]',
      ),
    ).not.toBeNull();
    expect(
      container.querySelector(".game-analysis-navigation-below-board select"),
    ).toBeNull();

    act(() =>
      root.render(
        <AppWorkspaceContent
          app={createApp({
            gameAnalysis: { status: "running", total: 1, positions: [] },
          })}
        />,
      ),
    );
    expect(
      container.querySelector(".game-analysis-navigation-below-board"),
    ).toBeNull();

    act(() =>
      root.render(
        <AppWorkspaceContent
          app={createApp({ showGameAnalysisPanel: false })}
        />,
      ),
    );
    expect(
      container.querySelector(".game-analysis-navigation-below-board"),
    ).toBeNull();
  });
});
