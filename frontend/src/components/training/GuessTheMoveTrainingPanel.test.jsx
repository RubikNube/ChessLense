// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import GuessTheMoveTrainingPanel from "./GuessTheMoveTrainingPanel.jsx";
import {
  TRAINING_MODE_GUESS_THE_MOVE,
  TRAINING_STATUS_COMPLETED,
} from "../../utils/training.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const scrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollIntoView",
);

const summary = {
  evaluation: { label: "Strong" },
  totalScore: 9,
  parScore: 12,
  completedParScore: 9,
  matchedMoves: 1,
  betterMoves: 1,
  equalMoves: 0,
  attemptedMoves: 2,
  remainingMoves: 0,
  totalMoves: 2,
  moveHistory: [
    {
      ply: 1,
      moveNumber: 1,
      side: "white",
      expectedSan: "e4",
      userSan: "e4",
      outcome: "match",
      points: 6,
    },
    {
      ply: 3,
      moveNumber: 2,
      side: "white",
      expectedSan: "Nf3",
      userSan: "Nc3",
      classification: "equal",
      points: 3,
    },
  ],
};

function renderPanel(
  root,
  guessBrowseIndex,
  trainingStatus = TRAINING_STATUS_COMPLETED,
  isMobileView = false,
) {
  act(() => {
    root.render(
      <GuessTheMoveTrainingPanel
        isMobileView={isMobileView}
        hasReplaySource
        normalizedTrainingState={{
          mode: TRAINING_MODE_GUESS_THE_MOVE,
          status: trainingStatus,
          playerSide: "white",
        }}
        setTrainingPlayerSide={() => {}}
        isGuessTrainingActive={false}
        isGuessTrainingEnded={false}
        isTrainingPlayActive={false}
        isEngineOpponentUserTurn={false}
        trainingLoading={false}
        whiteTrainingLabel="White"
        blackTrainingLabel="Black"
        currentGuessMoveNumber={0}
        currentGuessMove={null}
        guessTheMoveSummary={summary}
        trainingError=""
        guessHistoryEntries={[]}
        guessHistoryLoading={false}
        guessHistoryError=""
        activeGuessHistoryEntry={null}
        currentMoveLabel=""
        showTrainingPreview={() => {}}
        hideTrainingPreview={() => {}}
        lastCompletedTrainingAttempts={[]}
        lastCompletedExpectedMove={null}
        startTrainingPlayMode={() => {}}
        exitTrainingPlayMode={() => {}}
        startGuessTraining={() => {}}
        endGuessTraining={() => {}}
        viewGuessHistoryEntry={() => {}}
        closeGuessHistoryView={() => {}}
        isGuessResultBrowsing={Number.isInteger(guessBrowseIndex)}
        guessBrowseIndex={guessBrowseIndex}
        onSelectGuessBrowseIndex={() => {}}
        onGuessBrowsePrev={() => {}}
        onGuessBrowseNext={() => {}}
        onGuessBrowseStart={() => {}}
        onGuessBrowseEnd={() => {}}
        onStopGuessBrowsing={() => {}}
        resetTrainingSession={() => {}}
      />,
    );
  });
}

describe("GuessTheMoveTrainingPanel", () => {
  let container;
  let root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
    vi.restoreAllMocks();
    if (scrollIntoViewDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        "scrollIntoView",
        scrollIntoViewDescriptor,
      );
    } else {
      delete HTMLElement.prototype.scrollIntoView;
    }
  });

  it("keeps the selected browsed move visible as the browse index changes", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    renderPanel(root, null);
    scrollIntoView.mockClear();
    renderPanel(root, null);
    expect(scrollIntoView).not.toHaveBeenCalled();

    renderPanel(root, 0);
    const firstSelectedEntry = container.querySelector(
      ".training-summary-history-entry-selected",
    );
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: "nearest" });
    expect(scrollIntoView.mock.instances.at(-1)).toBe(firstSelectedEntry);

    renderPanel(root, 1);
    const secondSelectedEntry = container.querySelector(
      ".training-summary-history-entry-selected",
    );
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(scrollIntoView.mock.instances.at(-1)).toBe(secondSelectedEntry);
  });

  it("scrolls only the training body when browsing moves on mobile", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    renderPanel(root, null, TRAINING_STATUS_COMPLETED, true);
    scrollIntoView.mockClear();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getBoundingClientRect() {
        if (this.classList.contains("training-card-body")) {
          return { top: 100, bottom: 400 };
        }

        if (
          this.classList.contains("training-summary-history-entry-selected")
        ) {
          return { top: 500, bottom: 550 };
        }

        return { top: 0, bottom: 0 };
      },
    );
    const trainingBody = container.querySelector(".training-card-body");
    trainingBody.scrollTop = 100;

    renderPanel(root, 0, TRAINING_STATUS_COMPLETED, true);

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(trainingBody.scrollTop).toBe(250);
  });

  it("keeps mobile summary auto-scroll contained within the training body", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getBoundingClientRect() {
        if (this.classList.contains("training-card-body")) {
          return { top: 100, bottom: 400 };
        }

        if (this.classList.contains("annotation-section")) {
          return { top: -50, bottom: 0 };
        }

        return { top: 0, bottom: 0 };
      },
    );

    renderPanel(root, null, "idle", true);
    const trainingBody = container.querySelector(".training-card-body");
    trainingBody.scrollTop = 300;

    renderPanel(root, null, TRAINING_STATUS_COMPLETED, true);

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(trainingBody.scrollTop).toBe(150);
  });
});
