// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ISSUE_FILTER_ALL, ISSUE_SIDE_BOTH } from "../../utils/gameAnalysis.js";
import WholeGameAnalysisPanel from "./WholeGameAnalysisPanel.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderPanel(root, overrides = {}) {
  const props = {
    onClose: () => {},
    engineSearchDepth: 12,
    minEngineSearchDepth: 1,
    maxEngineSearchDepth: 30,
    onChangeEngineSearchDepth: () => {},
    gameAnalysis: null,
    gameAnalysisIsCurrent: true,
    currentNodeId: "root",
    gameAnalysisScale: "auto",
    onChangeGameAnalysisScale: () => {},
    issueFilter: ISSUE_FILTER_ALL,
    onChangeIssueFilter: () => {},
    issueSide: ISSUE_SIDE_BOTH,
    onChangeIssueSide: () => {},
    onAnalyzeGame: () => {},
    onCancelGameAnalysis: () => {},
    onSelectGameAnalysisPosition: () => {},
    onPreviousIssue: () => {},
    onNextIssue: () => {},
    canGoToPreviousIssue: false,
    canGoToNextIssue: false,
    gameAnalysisRetry: null,
    canRetryCurrentIssue: false,
    onRetryCurrentIssue: () => {},
    onRetryAgain: () => {},
    onRetryPreparation: () => {},
    onExitRetry: () => {},
    onNextRetryIssue: () => {},
    canGoToNextRetryIssue: false,
    onExploreRetryAgainstComputer: () => {},
    ...overrides,
  };

  act(() => root.render(<WholeGameAnalysisPanel {...props} />));
}

describe("WholeGameAnalysisPanel", () => {
  let container;
  let root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it("shows progress and cancels a running analysis", () => {
    const onCancelGameAnalysis = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    renderPanel(root, {
      gameAnalysis: {
        status: "running",
        total: 4,
        positions: [{ nodeId: "root" }],
      },
      onCancelGameAnalysis,
    });

    expect(container.textContent).toContain("1 / 4 positions");
    const cancelButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Cancel analysis",
    );
    act(() => cancelButton.click());
    expect(onCancelGameAnalysis).toHaveBeenCalledOnce();
  });

  it("navigates from histogram bars and issue controls", () => {
    const onSelectGameAnalysisPosition = vi.fn();
    const onNextIssue = vi.fn();
    const position = {
      nodeId: "node-1",
      fen: "fen-1",
      ply: 1,
      moveNumber: 1,
      side: "white",
      san: "e4",
      evaluation: { type: "cp", value: -120 },
      scoreCp: -120,
      lossCp: 140,
      severity: "mistake",
    };
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    renderPanel(root, {
      gameAnalysis: {
        status: "complete",
        total: 1,
        positions: [position],
      },
      onSelectGameAnalysisPosition,
      onNextIssue,
      canGoToNextIssue: true,
    });

    expect(container.textContent).toContain("−2");
    expect(container.textContent).toContain("+2");
    const bar = container.querySelector('[aria-label^="Go to 1.e4"]');
    act(() => bar.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onSelectGameAnalysisPosition).toHaveBeenCalledWith(position);

    const nextButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Next",
    );
    act(() => nextButton.click());
    expect(onNextIssue).toHaveBeenCalledOnce();
  });

  it("places mate evaluations at the dynamic scale edge", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    renderPanel(root, {
      gameAnalysis: {
        status: "complete",
        total: 2,
        positions: [
          {
            nodeId: "root",
            fen: "fen-0",
            ply: 0,
            moveNumber: 0,
            side: null,
            san: null,
            evaluation: { type: "cp", value: 150 },
            scoreCp: 150,
            lossCp: null,
            severity: null,
          },
          {
            nodeId: "node-1",
            fen: "fen-1",
            ply: 1,
            moveNumber: 1,
            side: "white",
            san: "Qh5",
            evaluation: { type: "mate", value: -2 },
            scoreCp: -99998,
            lossCp: 100148,
            severity: "blunder",
          },
        ],
      },
    });

    expect(container.textContent).toContain("+2");
    expect(container.textContent).toContain("−2");
    const mateBar = container.querySelector('[aria-label*="-M2"]');
    expect(mateBar.getAttribute("y")).toBe("90");
    expect(mateBar.getAttribute("height")).toBe("72");
  });

  it("selects a fixed histogram scale", () => {
    const onChangeGameAnalysisScale = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    renderPanel(root, {
      gameAnalysisScale: 500,
      onChangeGameAnalysisScale,
      gameAnalysis: {
        status: "complete",
        total: 1,
        positions: [
          {
            nodeId: "node-1",
            ply: 1,
            scoreCp: 120,
            evaluation: { type: "cp", value: 120 },
          },
        ],
      },
    });

    const scaleSelect = container.querySelector("#game-analysis-scale");
    expect(scaleSelect.value).toBe("500");
    expect(
      [...scaleSelect.options].map((option) => option.textContent),
    ).toEqual(["Auto", "±1", "±2", "±5", "±10"]);
    expect(
      container.querySelector(".game-analysis-chart").textContent,
    ).toContain("+5");

    act(() => {
      scaleSelect.value = "200";
      scaleSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onChangeGameAnalysisScale).toHaveBeenCalledWith("200");
  });

  it("selects which side to jump through", () => {
    const onChangeIssueSide = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    renderPanel(root, {
      issueSide: "white",
      onChangeIssueSide,
      gameAnalysis: {
        status: "complete",
        total: 1,
        positions: [{ nodeId: "node-1", ply: 1, side: "white" }],
      },
    });

    const sideSelect = container.querySelector("#game-analysis-issue-side");
    expect(sideSelect.value).toBe("white");
    expect([...sideSelect.options].map((option) => option.textContent)).toEqual(
      ["Both sides", "White", "Black"],
    );

    act(() => {
      sideSelect.value = "black";
      sideSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onChangeIssueSide).toHaveBeenCalledWith("black");
  });

  it("marks issue bars with their severity fill classes", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    renderPanel(root, {
      currentNodeId: "mistake",
      gameAnalysis: {
        status: "complete",
        total: 4,
        positions: [
          {
            nodeId: "quiet",
            ply: 0,
            scoreCp: 20,
            severity: null,
          },
          {
            nodeId: "inaccuracy",
            ply: 1,
            scoreCp: 10,
            severity: "inaccuracy",
          },
          {
            nodeId: "mistake",
            ply: 2,
            scoreCp: -40,
            severity: "mistake",
          },
          {
            nodeId: "blunder",
            ply: 3,
            scoreCp: -120,
            severity: "blunder",
          },
        ],
      },
    });

    expect(
      container.querySelector(".game-analysis-bar-white").classList,
    ).not.toContain("game-analysis-bar-inaccuracy");
    expect(
      container.querySelector(".game-analysis-bar-inaccuracy"),
    ).not.toBeNull();
    expect(
      container.querySelector(".game-analysis-bar-mistake").classList,
    ).toContain("game-analysis-bar-selected");
    expect(
      container.querySelector(".game-analysis-bar-blunder"),
    ).not.toBeNull();
  });

  it("starts a retry and exposes feedback actions", () => {
    const onRetryCurrentIssue = vi.fn();
    const onRetryAgain = vi.fn();
    const onNextRetryIssue = vi.fn();
    const onExploreRetryAgainstComputer = vi.fn();
    const onExitRetry = vi.fn();
    const position = {
      nodeId: "issue",
      ply: 1,
      moveNumber: 1,
      side: "white",
      san: "e4",
      scoreCp: -120,
      lossCp: 140,
      severity: "mistake",
    };
    const target = {
      issueNodeId: "issue",
      issueSan: "e4",
      bestMoveSan: "d4",
    };
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    renderPanel(root, {
      gameAnalysis: { status: "complete", total: 1, positions: [position] },
      canRetryCurrentIssue: true,
      onRetryCurrentIssue,
    });

    const retryMoveButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Retry",
    );
    act(() => retryMoveButton.click());
    expect(onRetryCurrentIssue).toHaveBeenCalledOnce();

    renderPanel(root, {
      gameAnalysis: { status: "complete", total: 1, positions: [position] },
      gameAnalysisRetry: {
        target,
        status: "feedback",
        feedback: "bad",
        attempt: { userSan: "f3", deltaCp: -125 },
        error: "",
      },
      onRetryAgain,
      onNextRetryIssue,
      canGoToNextRetryIssue: true,
      onExploreRetryAgainstComputer,
      onExitRetry,
    });

    expect(container.textContent).toContain("Bad move");
    expect(container.textContent).toContain("f3 is a bad move");
    expect(container.textContent).toContain("1.3 pawns worse");
    expect(container.textContent).toContain("Stockfish preferred d4");

    for (const [label, callback] of [
      ["Retry", onRetryAgain],
      ["Next issue", onNextRetryIssue],
      ["Play vs computer", onExploreRetryAgainstComputer],
      ["Exit retry", onExitRetry],
    ]) {
      const button = [...container.querySelectorAll("button")].find(
        (entry) => entry.textContent === label,
      );
      act(() => button.click());
      expect(callback).toHaveBeenCalledOnce();
    }
  });
});
