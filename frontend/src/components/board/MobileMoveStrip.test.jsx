// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import MobileMoveStrip from "./MobileMoveStrip.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("MobileMoveStrip", () => {
  let container;
  let root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it("shows issue quality on move chips without changing navigation", () => {
    const onSelectMove = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() =>
      root.render(
        <MobileMoveStrip
          moveHistoryItems={[
            {
              nodeId: "node-1",
              san: "e4",
              moveNumber: 1,
              side: "white",
              gameAnalysisIssue: {
                severity: "mistake",
                lossCp: 125,
                evaluation: { type: "cp", value: -80 },
              },
            },
            {
              nodeId: "node-2",
              san: "e5",
              moveNumber: 1,
              side: "black",
            },
          ]}
          currentMoveIndex={-1}
          onSelectMove={onSelectMove}
        />,
      ),
    );

    expect(
      container.querySelector(
        '[aria-label="Mistake, 125 cp loss, evaluation -0.8"]',
      ).textContent,
    ).toBe("?");
    expect(
      container.querySelectorAll(".mobile-move-evaluation-indicator"),
    ).toHaveLength(1);

    const issueChip = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "1. e4?",
    );
    act(() => issueChip.click());
    expect(onSelectMove).toHaveBeenCalledWith("node-1");
  });

  it("selects variants separately from move navigation", () => {
    const onSelectMove = vi.fn();
    const onSelectVariant = vi.fn();
    const getVariantOptionsForMove = vi.fn(() => [
      {
        id: "main-line",
        continuationText: "e5 Nf3",
        isMainLine: true,
        isSelected: true,
      },
      {
        id: "sideline",
        continuationText: "c5 Nf3",
        isMainLine: false,
        isSelected: false,
      },
    ]);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() =>
      root.render(
        <MobileMoveStrip
          moveHistoryItems={[
            {
              nodeId: "node-1",
              san: "e4",
              moveNumber: 1,
              side: "white",
              hasVariants: true,
            },
            {
              nodeId: "node-2",
              san: "e5",
              moveNumber: 1,
              side: "black",
              hasVariants: false,
            },
          ]}
          currentMoveIndex={-1}
          onSelectMove={onSelectMove}
          getVariantOptionsForMove={getVariantOptionsForMove}
          onSelectVariant={onSelectVariant}
        />,
      ),
    );

    const variantButton = container.querySelector(
      '[aria-label="Select variant after 1. e4"]',
    );
    expect(variantButton).not.toBeNull();
    expect(
      container.querySelector('[aria-label="Select variant after e5"]'),
    ).toBeNull();

    act(() => variantButton.click());

    expect(getVariantOptionsForMove).toHaveBeenCalledWith("node-1");
    expect(container.textContent).toContain("e5 Nf3");
    expect(container.textContent).toContain("Main line · Selected");
    expect(
      [...container.querySelectorAll("button")].find(
        (button) => button.textContent === "e5 Nf3Main line · Selected",
      ).disabled,
    ).toBe(true);
    expect(onSelectMove).not.toHaveBeenCalled();

    const sidelineButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "c5 Nf3Sideline",
    );
    act(() => sidelineButton.click());

    expect(onSelectVariant).toHaveBeenCalledWith("sideline");
    expect(
      container.querySelector('[aria-label="Variants after 1. e4"]'),
    ).toBeNull();

    const moveButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "1. e4",
    );
    act(() => moveButton.click());
    expect(onSelectMove).toHaveBeenCalledWith("node-1");
  });
});
