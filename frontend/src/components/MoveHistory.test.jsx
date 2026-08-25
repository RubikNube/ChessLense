// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import MoveHistory from "./MoveHistory.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("MoveHistory", () => {
  let container;
  let root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it("shows accessible whole-game issue badges alongside other indicators", () => {
    const onSelectMove = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() =>
      root.render(
        <MoveHistory
          moveHistoryItems={[
            {
              nodeId: "node-1",
              fen: "fen-1",
              san: "e4",
              moveNumber: 1,
              side: "white",
              hasVariants: true,
              hasComments: true,
              comments: ["A note"],
              gameAnalysisIssue: {
                severity: "inaccuracy",
                lossCp: 62,
                evaluation: { type: "cp", value: 20 },
              },
            },
            {
              nodeId: "node-2",
              fen: "fen-2",
              san: "e5",
              moveNumber: 1,
              side: "black",
              gameAnalysisIssue: {
                severity: "mistake",
                lossCp: 140,
                evaluation: { type: "cp", value: -120 },
              },
            },
            {
              nodeId: "node-3",
              fen: "fen-3",
              san: "Nf3",
              moveNumber: 2,
              side: "white",
              gameAnalysisIssue: {
                severity: "blunder",
                lossCp: 280,
                evaluation: { type: "mate", value: -3 },
              },
            },
          ]}
          currentMoveIndex={1}
          canUndo={true}
          canRedo={true}
          onClose={() => {}}
          onSelectMove={onSelectMove}
          onUndo={() => {}}
          onRedo={() => {}}
          onGoToStart={() => {}}
          onGoToEnd={() => {}}
          onRevertMovesUntil={() => {}}
          getVariantOptionsForMove={() => []}
          onSelectVariant={() => {}}
        />,
      ),
    );

    expect(
      container.querySelector(
        '[aria-label="Inaccuracy, 62 cp loss, evaluation +0.2"]',
      ).textContent,
    ).toBe("?!");
    expect(
      container.querySelector(
        '[aria-label="Mistake, 140 cp loss, evaluation -1.2"]',
      ).textContent,
    ).toBe("?");
    expect(
      container.querySelector(
        '[aria-label="Blunder, 280 cp loss, evaluation -M3"]',
      ).textContent,
    ).toBe("??");
    expect(container.querySelector(".move-entry-selected").textContent).toBe(
      "e5?",
    );
    expect(container.textContent).toContain("VC");

    const e4Button = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "e4?!VC",
    );
    act(() => e4Button.click());
    expect(onSelectMove).toHaveBeenCalledWith("node-1");
  });
});
