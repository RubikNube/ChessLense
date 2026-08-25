// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import useTrainingController from "./useTrainingController.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function Harness({ isTrainingFocusMode }) {
  const [showMoveHistory, setShowMoveHistory] = useState(true);
  const [showOpeningTreePanel, setShowOpeningTreePanel] = useState(true);
  const [showEngineWindow, setShowEngineWindow] = useState(true);
  const [showGameAnalysisPanel, setShowGameAnalysisPanel] = useState(true);
  const [showComments, setShowComments] = useState(true);
  const [showImportedPgn, setShowImportedPgn] = useState(true);
  const [showVariants, setShowVariants] = useState(true);

  useTrainingController({
    isTrainingFocusMode,
    showMoveHistory,
    setShowMoveHistory,
    showOpeningTreePanel,
    setShowOpeningTreePanel,
    showEngineWindow,
    setShowEngineWindow,
    showGameAnalysisPanel,
    setShowGameAnalysisPanel,
    showComments,
    setShowComments,
    showImportedPgn,
    setShowImportedPgn,
    showVariants,
    setShowVariants,
  });

  return <output data-game-analysis-visible={String(showGameAnalysisPanel)} />;
}

describe("useTrainingController", () => {
  let container;
  let root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it("hides and restores the whole-game analysis view in focus mode", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => root.render(<Harness isTrainingFocusMode={false} />));
    expect(container.querySelector("output").dataset.gameAnalysisVisible).toBe(
      "true",
    );

    act(() => root.render(<Harness isTrainingFocusMode />));
    expect(container.querySelector("output").dataset.gameAnalysisVisible).toBe(
      "false",
    );

    act(() => root.render(<Harness isTrainingFocusMode={false} />));
    expect(container.querySelector("output").dataset.gameAnalysisVisible).toBe(
      "true",
    );
  });
});
