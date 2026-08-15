// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJson } from "../../utils/api.js";
import OtbPlayerOpeningTreePanel from "./OtbPlayerOpeningTreePanel.jsx";

vi.mock("../../utils/api.js", () => ({ fetchJson: vi.fn() }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const move = {
  uci: "e2e4",
  san: "e4",
  gameCount: 3,
  frequencyPercent: 75,
  playerWinPercent: 50,
  drawPercent: 25,
  playerLossPercent: 25,
};

describe("OtbPlayerOpeningTreePanel", () => {
  let container;
  let root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("opens matching games from the count without selecting the move", async () => {
    vi.useFakeTimers();
    fetchJson.mockResolvedValue({
      gamesAtPosition: 4,
      indexing: { indexedGames: 4, skippedGames: 0, totalGames: 4 },
      moves: [move],
    });
    const onOpenGames = vi.fn();
    const onSelectMove = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root.render(
        <OtbPlayerOpeningTreePanel
          scope={{ player: "Morphy" }}
          color="white"
          onColorChange={() => {}}
          exportSettings={{ maxDepth: "20", minGames: "2", maxBranches: "5" }}
          onExportSettingsChange={() => {}}
          fen="start-fen"
          currentMoveLabel="Start position"
          onClose={() => {}}
          onHoverMove={() => {}}
          onOpenGames={onOpenGames}
          onSelectMove={onSelectMove}
        />,
      );
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    const countButton = container.querySelector(
      'button[aria-label="Show 3 database games after e4"]',
    );
    const row = countButton.closest("tr");

    act(() => countButton.click());
    expect(onOpenGames).toHaveBeenCalledWith(move);
    expect(onSelectMove).not.toHaveBeenCalled();

    act(() => row.click());
    expect(onSelectMove).toHaveBeenCalledWith(move);
  });
});
