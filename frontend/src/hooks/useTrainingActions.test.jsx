// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createEmptyTrainingState,
  TRAINING_MODE_PLAY_COMPUTER,
  TRAINING_SIDE_WHITE,
  TRAINING_STATUS_ACTIVE,
} from "../utils/training.js";
import {
  applyMoveToVariantTree,
  createVariantTreeFromMoves,
  goToMainlineNodeInVariantTree,
} from "../utils/variantTree.js";
import useTrainingActions from "./useTrainingActions.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function Harness({ computerPlayConfig, setVariantTree }) {
  const actions = useTrainingActions({
    boardSoundsEnabled: false,
    computerPlayConfig,
    createEmptyTrainingState,
    game: { isGameOver: () => false },
    goToMainlineNodeInVariantTree,
    guessHistoryRunIdRef: { current: null },
    hasReplaySource: false,
    hideTrainingPreview: vi.fn(),
    importedPgnData: null,
    isEngineOpponentSessionActive: false,
    isStandaloneComputerPlay: true,
    isStandaloneComputerPlayActive: false,
    normalizedTrainingState: {
      mode: TRAINING_MODE_PLAY_COMPUTER,
      status: TRAINING_STATUS_ACTIVE,
      playerSide: TRAINING_SIDE_WHITE,
    },
    pendingGuessHistoryEntryIdRef: { current: "" },
    savedGuessHistoryRunIdRef: { current: null },
    setActiveGuessHistoryEntryId: vi.fn(),
    setEngineResult: vi.fn(),
    setEvaluationResult: vi.fn(),
    setGuessHistoryEntries: vi.fn(),
    setGuessHistoryError: vi.fn(),
    setGuessHistoryLoading: vi.fn(),
    setTrainingError: vi.fn(),
    setTrainingLoading: vi.fn(),
    setTrainingPlayAutoReplyPaused: vi.fn(),
    setTrainingState: vi.fn(),
    setVariantTree,
    trainingPlayAutoReplyPaused: false,
    trainingRequestIdRef: { current: 0 },
  });

  return <button onClick={actions.exitStandaloneComputerPlay}>Exit</button>;
}

describe("useTrainingActions", () => {
  let container;
  let root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it("returns analysis exploration to the mainline and keeps its sideline", () => {
    const mainlineTree = createVariantTreeFromMoves([
      { from: "e2", to: "e4" },
      { from: "e7", to: "e5" },
    ]);
    const resumeMainlineNodeId = mainlineTree.currentNodeId;
    const sourceNodeId = mainlineTree.nodes[resumeMainlineNodeId].parentId;
    let explorationTree = goToMainlineNodeInVariantTree(
      mainlineTree,
      sourceNodeId,
    );
    explorationTree = applyMoveToVariantTree(explorationTree, {
      from: "c7",
      to: "c5",
    });
    explorationTree = applyMoveToVariantTree(explorationTree, {
      from: "g1",
      to: "f3",
    });
    const explorationNodeIds = Object.keys(explorationTree.nodes);
    const setVariantTree = vi.fn();

    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <Harness
          computerPlayConfig={{ resumeMainlineNodeId }}
          setVariantTree={setVariantTree}
        />,
      ),
    );
    act(() => container.querySelector("button").click());

    expect(setVariantTree).toHaveBeenCalledOnce();
    const restoredTree = setVariantTree.mock.calls[0][0](explorationTree);
    expect(restoredTree.currentNodeId).toBe(resumeMainlineNodeId);
    expect(restoredTree.activeLineLeafId).toBe(resumeMainlineNodeId);
    expect(Object.keys(restoredTree.nodes)).toEqual(explorationNodeIds);
    expect(
      Object.values(restoredTree.nodes).some(
        (node) => node.move?.from === "c7" && node.move?.to === "c5",
      ),
    ).toBe(true);
  });
});
