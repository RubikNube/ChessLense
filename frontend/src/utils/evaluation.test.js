import { describe, expect, it } from "vitest";
import {
  getEvaluationBarPercentage,
  getEvaluationDisplayValue,
  getEvaluationLabel,
  getEvaluationScore,
  normalizeEvaluationForWhite,
} from "./evaluation.js";

describe("normalizeEvaluationForWhite", () => {
  it("keeps white-to-move evaluations unchanged", () => {
    expect(normalizeEvaluationForWhite({ type: "cp", value: 34 }, "w")).toEqual({
      type: "cp",
      value: 34,
    });
  });

  it("flips black-to-move evaluations to white's perspective", () => {
    expect(normalizeEvaluationForWhite({ type: "mate", value: 3 }, "b")).toEqual({
      type: "mate",
      value: -3,
    });
  });
});

describe("evaluation display helpers", () => {
  it("converts centipawn scores to pawns", () => {
    expect(getEvaluationScore({ type: "cp", value: 125 })).toBe(1.25);
    expect(getEvaluationDisplayValue({ type: "cp", value: 125 })).toBe("+1.3");
    expect(getEvaluationLabel({ type: "cp", value: -80 })).toBe(
      "Black advantage (0.8)",
    );
  });

  it("formats mate scores and treats mate as a capped bar value", () => {
    expect(getEvaluationScore({ type: "mate", value: 2 })).toBe(100);
    expect(getEvaluationDisplayValue({ type: "mate", value: -4 })).toBe("-M4");
    expect(getEvaluationLabel({ type: "mate", value: 2 })).toBe(
      "White winning by mate in 2",
    );
    expect(getEvaluationBarPercentage({ type: "mate", value: 2 })).toBe(100);
  });

  it("handles missing and equal evaluations", () => {
    expect(getEvaluationBarPercentage(null)).toBe(50);
    expect(getEvaluationLabel({ type: "cp", value: 0 })).toBe("Equal position");
    expect(getEvaluationDisplayValue(null)).toBe("–");
  });
});
