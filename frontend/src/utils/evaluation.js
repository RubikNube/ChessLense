function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeEvaluationForWhite(evaluation, turn) {
  if (!evaluation || typeof evaluation !== "object") {
    return null;
  }

  const multiplier = turn === "b" ? -1 : 1;

  if (evaluation.type === "mate" && typeof evaluation.value === "number") {
    return {
      ...evaluation,
      value: evaluation.value * multiplier,
    };
  }

  if (evaluation.type === "cp" && typeof evaluation.value === "number") {
    return {
      ...evaluation,
      value: evaluation.value * multiplier,
    };
  }

  return evaluation;
}

export function getEvaluationScore(evaluation) {
  if (!evaluation || typeof evaluation !== "object") {
    return null;
  }

  if (evaluation.type === "mate") {
    if (typeof evaluation.value !== "number" || evaluation.value === 0) {
      return 0;
    }

    return evaluation.value > 0 ? 100 : -100;
  }

  if (evaluation.type === "cp" && typeof evaluation.value === "number") {
    return evaluation.value / 100;
  }

  return null;
}

export function getEvaluationBarPercentage(evaluation) {
  const score = getEvaluationScore(evaluation);

  if (score === null) {
    return 50;
  }

  const normalizedScore = score / 4;
  return clamp(50 + normalizedScore * 50, 0, 100);
}

export function getEvaluationLabel(evaluation) {
  if (!evaluation || typeof evaluation !== "object") {
    return "Evaluation unavailable";
  }

  if (evaluation.type === "mate" && typeof evaluation.value === "number") {
    if (evaluation.value > 0) {
      return `White winning by mate in ${evaluation.value}`;
    }

    if (evaluation.value < 0) {
      return `Black winning by mate in ${Math.abs(evaluation.value)}`;
    }
  }

  if (evaluation.type === "cp" && typeof evaluation.value === "number") {
    if (evaluation.value > 0) {
      return `White advantage (${(evaluation.value / 100).toFixed(1)})`;
    }

    if (evaluation.value < 0) {
      return `Black advantage (${Math.abs(evaluation.value / 100).toFixed(1)})`;
    }

    return "Equal position";
  }

  return "Evaluation unavailable";
}

export function getEvaluationDisplayValue(evaluation) {
  if (!evaluation || typeof evaluation !== "object") {
    return "–";
  }

  if (evaluation.type === "mate" && typeof evaluation.value === "number") {
    return evaluation.value > 0
      ? `M${evaluation.value}`
      : `-M${Math.abs(evaluation.value)}`;
  }

  if (evaluation.type === "cp" && typeof evaluation.value === "number") {
    const pawns = evaluation.value / 100;
    return pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
  }

  return "–";
}
