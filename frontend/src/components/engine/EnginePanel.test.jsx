// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import EnginePanel from "./EnginePanel.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("EnginePanel", () => {
  let container;
  let root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it("contains position analysis without whole-game controls", () => {
    const onAnalyzePosition = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root.render(
        <EnginePanel
          onClose={() => {}}
          engineSearchDepth={12}
          minEngineSearchDepth={1}
          maxEngineSearchDepth={30}
          onChangeEngineSearchDepth={() => {}}
          loading={false}
          engineResult={null}
          formattedBestMove=""
          engineVariants={[]}
          selectedEngineVariant={null}
          onSelectEngineVariant={() => {}}
          onAnalyzePosition={onAnalyzePosition}
          onAddSelectedVariant={() => {}}
        />,
      );
    });

    expect(container.textContent).not.toContain("Whole Game Analysis");
    const evaluateButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Evaluate position",
    );
    act(() => evaluateButton.click());
    expect(onAnalyzePosition).toHaveBeenCalledOnce();
  });
});
