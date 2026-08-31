// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import useAppController from "./useAppController.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function ControllerHarness({ onController }) {
  const controller = useAppController();
  onController?.(controller);
  return <div data-testid="controller-ready">{controller.fen}</div>;
}

describe("useAppController", () => {
  let container;
  let root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    vi.unstubAllGlobals();
    root = null;
    container = null;
  });

  it("initializes the complete controller without accessing actions early", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    expect(() => {
      act(() => root.render(<ControllerHarness />));
    }).not.toThrow();
    expect(
      container.querySelector('[data-testid="controller-ready"]'),
    ).not.toBeNull();
  });

  it("resolves auto, normal, and mobile view modes", () => {
    let matches = false;
    const listeners = new Set();
    const mediaQuery = {
      get matches() {
        return matches;
      },
      addEventListener: vi.fn((eventName, listener) => {
        if (eventName === "change") listeners.add(listener);
      }),
      removeEventListener: vi.fn((eventName, listener) => {
        if (eventName === "change") listeners.delete(listener);
      }),
    };
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => mediaQuery),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    let controller;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() =>
      root.render(
        <ControllerHarness onController={(value) => (controller = value)} />,
      ),
    );
    expect(controller.viewMode).toBe("auto");
    expect(controller.isMobileView).toBe(false);

    act(() => {
      matches = true;
      listeners.forEach((listener) => listener({ matches }));
    });
    expect(controller.isMobileView).toBe(true);

    act(() => controller.menuActions.useNormalViewMode());
    expect(controller.viewMode).toBe("normal");
    expect(controller.isMobileView).toBe(false);

    act(() => controller.menuActions.useMobileViewMode());
    expect(controller.viewMode).toBe("mobile");
    expect(controller.isMobileView).toBe(true);
  });
});
