// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import OtbSearchModal from "./OtbSearchModal.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const FILTERS = {
  player: "K�fergr�n, J�rg",
  opponent: "",
  color: "",
  event: "",
  yearFrom: "",
  yearTo: "",
  result: "",
  ecoFrom: "",
  ecoTo: "",
  opening: "",
  moveCountMin: "",
  moveCountMax: "",
  pageSize: "25",
};

function createProps(overrides = {}) {
  return {
    filters: FILTERS,
    setFilters: vi.fn(),
    page: 1,
    pagination: {
      page: 1,
      pageSize: 25,
      totalResults: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    },
    searchError: "",
    setSearchError: vi.fn(),
    importError: "",
    searchLoading: false,
    hasSearched: true,
    results: [
      {
        id: "otb-game",
        players: {
          white: { id: 42, name: "K�fergr�n, J�rg" },
          black: { id: 7, name: "Opponent, Alice" },
        },
        result: "1-0",
        moveCount: 20,
      },
    ],
    importingGameId: "",
    canExploreOpeningTree: true,
    onSearch: vi.fn(),
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    onImport: vi.fn(),
    onRenamePlayer: vi.fn().mockResolvedValue({
      playerId: 42,
      previousName: "K�fergr�n, J�rg",
      name: "Käfergrün, Jörg",
      affectedGames: 3,
      mergedGames: 0,
    }),
    onExploreOpeningTree: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

describe("OtbSearchModal player repair", () => {
  let container;
  let root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    vi.restoreAllMocks();
    root = null;
    container = null;
  });

  it("confirms and renames a selected player throughout the database", async () => {
    const props = createProps();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => root.render(<OtbSearchModal {...props} />));
    const renameButton = container.querySelector(
      'button[title="Rename this player throughout the OTB database"]',
    );
    act(() => renameButton.click());

    const input = container.querySelector(
      '[aria-labelledby="rename-otb-player-title"] input',
    );
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      ).set;
      valueSetter.call(input, "Käfergrün, Jörg");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const submitButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Rename in all games",
    );

    await act(async () => submitButton.click());

    expect(window.confirm).toHaveBeenCalled();
    expect(props.onRenamePlayer).toHaveBeenCalledWith(42, "Käfergrün, Jörg");
    expect(container.textContent).toContain(
      "Renamed K�fergr�n, J�rg to Käfergrün, Jörg in 3 games.",
    );
  });
});
