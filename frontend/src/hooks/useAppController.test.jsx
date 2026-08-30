// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import useAppController from "./useAppController.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function ControllerHarness() {
  const controller = useAppController();
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
});
