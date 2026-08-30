// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import BoardWorkspace from "./BoardWorkspace.jsx";

vi.mock("react-chessboard", () => ({
  Chessboard: () => <div data-testid="chessboard" />,
}));

vi.mock("../app/SortableViewLayout.jsx", () => ({
  default: ({ views }) => (
    <div data-testid="view-layout">
      {Object.entries(views).map(([viewId, view]) => (
        <div key={viewId} data-view-id={viewId}>
          {view.content}
        </div>
      ))}
    </div>
  ),
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const matchMediaDescriptor = Object.getOwnPropertyDescriptor(
  window,
  "matchMedia",
);

function createProps(overrides = {}) {
  return {
    boardRenderKey: "board",
    isTrainingFocusMode: false,
    position: "start",
    allowDragging: true,
    boardOrientation: "white",
    boardArrows: [],
    boardSquareStyles: {},
    showEvaluationBar: false,
    showMoveHistory: true,
    moveHistoryItems: [
      {
        nodeId: "node-1",
        san: "e4",
        moveNumber: 1,
        side: "white",
      },
    ],
    currentMoveIndex: -1,
    canUndo: false,
    canRedo: false,
    onCloseMoveHistory: () => {},
    onSelectMove: () => {},
    onUndo: () => {},
    onRedo: () => {},
    onGoToStart: () => {},
    onGoToEnd: () => {},
    onRevertMovesUntil: () => {},
    getVariantOptionsForMove: () => [],
    onSelectVariant: () => {},
    viewLayout: { navigation: ["move-history"], reference: [] },
    onViewLayoutChange: () => {},
    showViewLayout: true,
    ...overrides,
  };
}

describe("BoardWorkspace responsive move history", () => {
  let container;
  let root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;

    if (matchMediaDescriptor) {
      Object.defineProperty(window, "matchMedia", matchMediaDescriptor);
    } else {
      delete window.matchMedia;
    }
  });

  it("swaps the full panel for the mobile strip at the mobile breakpoint", () => {
    let matches = false;
    const listeners = new Set();
    const mediaQuery = {
      get matches() {
        return matches;
      },
      media: "(max-width: 640px)",
      addEventListener: vi.fn((eventName, listener) => {
        if (eventName === "change") {
          listeners.add(listener);
        }
      }),
      removeEventListener: vi.fn((eventName, listener) => {
        if (eventName === "change") {
          listeners.delete(listener);
        }
      }),
    };
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => mediaQuery),
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => root.render(<BoardWorkspace {...createProps()} />));

    expect(
      container.querySelector('[data-view-id="move-history"]'),
    ).not.toBeNull();
    expect(container.querySelector(".mobile-move-strip")).toBeNull();

    act(() => {
      matches = true;
      listeners.forEach((listener) => listener({ matches }));
    });

    expect(container.querySelector('[data-view-id="move-history"]')).toBeNull();
    expect(container.querySelector(".mobile-move-strip")).not.toBeNull();

    act(() =>
      root.render(
        <BoardWorkspace {...createProps({ showMoveHistory: false })} />,
      ),
    );

    expect(container.querySelector('[data-view-id="move-history"]')).toBeNull();
    expect(container.querySelector(".mobile-move-strip")).toBeNull();
  });

  it("renders optional content between the board and mobile navigation", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() =>
      root.render(
        <BoardWorkspace
          {...createProps({
            belowBoardContent: <div data-testid="below-board">Controls</div>,
          })}
        />,
      ),
    );

    const board = container.querySelector(".board-and-evaluation");
    const belowBoard = container.querySelector('[data-testid="below-board"]');
    const mobileNavigation = container.querySelector(".mobile-move-nav");

    expect(board.nextElementSibling).toBe(belowBoard);
    expect(belowBoard.nextElementSibling).toBe(mobileNavigation);
  });
});
