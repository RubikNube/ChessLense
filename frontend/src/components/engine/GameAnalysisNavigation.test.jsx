// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import GameAnalysisNavigation from "./GameAnalysisNavigation.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function createProps(overrides = {}) {
  return {
    idPrefix: "test-analysis",
    issueFilter: "all",
    onChangeIssueFilter: () => {},
    issueSide: "both",
    onChangeIssueSide: () => {},
    onPreviousIssue: () => {},
    onNextIssue: () => {},
    canGoToPreviousIssue: false,
    canGoToNextIssue: false,
    onRetryCurrentIssue: () => {},
    canRetryCurrentIssue: false,
    retryInProgress: false,
    ...overrides,
  };
}

describe("GameAnalysisNavigation", () => {
  let container;
  let root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it("changes filters and invokes each enabled action", () => {
    const onChangeIssueFilter = vi.fn();
    const onChangeIssueSide = vi.fn();
    const onPreviousIssue = vi.fn();
    const onNextIssue = vi.fn();
    const onRetryCurrentIssue = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() =>
      root.render(
        <GameAnalysisNavigation
          {...createProps({
            onChangeIssueFilter,
            onChangeIssueSide,
            onPreviousIssue,
            onNextIssue,
            canGoToPreviousIssue: true,
            canGoToNextIssue: true,
            onRetryCurrentIssue,
            canRetryCurrentIssue: true,
          })}
        />,
      ),
    );

    const filterSelect = container.querySelector("#test-analysis-issue-filter");
    const sideSelect = container.querySelector("#test-analysis-issue-side");
    act(() => {
      filterSelect.value = "mistakes";
      filterSelect.dispatchEvent(new Event("change", { bubbles: true }));
      sideSelect.value = "white";
      sideSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const buttons = Object.fromEntries(
      [...container.querySelectorAll("button")].map((button) => [
        button.textContent,
        button,
      ]),
    );
    act(() => {
      buttons.Previous.click();
      buttons.Next.click();
      buttons["Retry"].click();
    });

    expect(onChangeIssueFilter).toHaveBeenCalledWith("mistakes");
    expect(onChangeIssueSide).toHaveBeenCalledWith("white");
    expect(onPreviousIssue).toHaveBeenCalledOnce();
    expect(onNextIssue).toHaveBeenCalledOnce();
    expect(onRetryCurrentIssue).toHaveBeenCalledOnce();
  });

  it("uses unique IDs and preserves disabled action states", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() =>
      root.render(
        <>
          <GameAnalysisNavigation {...createProps({ idPrefix: "panel" })} />
          <GameAnalysisNavigation
            {...createProps({
              idPrefix: "below-board",
              canRetryCurrentIssue: true,
              retryInProgress: true,
            })}
          />
        </>,
      ),
    );

    const ids = [...container.querySelectorAll("select")].map(
      (select) => select.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "panel-issue-filter",
      "panel-issue-side",
      "below-board-issue-filter",
      "below-board-issue-side",
    ]);
    expect(
      [...container.querySelectorAll("button")].every(
        (button) => button.disabled,
      ),
    ).toBe(true);
  });

  it("opens compact settings without rendering inline selects", () => {
    const onChangeIssueFilter = vi.fn();
    const onChangeIssueSide = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() =>
      root.render(
        <GameAnalysisNavigation
          {...createProps({
            compactSettings: true,
            issueFilter: "mistakes",
            issueSide: "white",
            onChangeIssueFilter,
            onChangeIssueSide,
          })}
        />,
      ),
    );

    const settingsButton = container.querySelector(
      '[aria-label="Analysis navigation settings"]',
    );
    expect(container.querySelector("select")).toBeNull();
    expect(settingsButton.getAttribute("aria-expanded")).toBe("false");

    act(() => settingsButton.click());

    const filterSelect = container.querySelector("#test-analysis-issue-filter");
    const sideSelect = container.querySelector("#test-analysis-issue-side");
    expect(settingsButton.getAttribute("aria-expanded")).toBe("true");
    expect(filterSelect.value).toBe("mistakes");
    expect(sideSelect.value).toBe("white");

    act(() => {
      filterSelect.value = "blunders";
      filterSelect.dispatchEvent(new Event("change", { bubbles: true }));
      sideSelect.value = "black";
      sideSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onChangeIssueFilter).toHaveBeenCalledWith("blunders");
    expect(onChangeIssueSide).toHaveBeenCalledWith("black");
    expect(container.querySelector("select")).not.toBeNull();
  });

  it("dismisses compact settings outside or with Escape", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() =>
      root.render(
        <GameAnalysisNavigation {...createProps({ compactSettings: true })} />,
      ),
    );

    const settingsButton = container.querySelector(
      '[aria-label="Analysis navigation settings"]',
    );
    act(() => settingsButton.click());
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();

    act(() =>
      document.body.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true }),
      ),
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    act(() => {
      settingsButton.focus();
      settingsButton.click();
    });
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(settingsButton);
  });
});
