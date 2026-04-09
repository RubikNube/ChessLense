function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeEvaluationForWhite(evaluation, turn) {
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

function getEvaluationScore(evaluation) {
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

function getEvaluationBarPercentage(evaluation) {
  const score = getEvaluationScore(evaluation);

  if (score === null) {
    return 50;
  }

  const normalizedScore = score / 4;
  return clamp(50 + normalizedScore * 50, 0, 100);
}

function getEvaluationLabel(evaluation) {
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

function getEvaluationDisplayValue(evaluation) {
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

function EvaluationBar({ evaluation, boardOrientation, turn = "w" }) {
  const normalizedEvaluation = normalizeEvaluationForWhite(evaluation, turn);
  const evaluationBarPercentage =
    getEvaluationBarPercentage(normalizedEvaluation);
  const evaluationBarLabel = getEvaluationLabel(normalizedEvaluation);
  const evaluationDisplayValue =
    getEvaluationDisplayValue(normalizedEvaluation);

  return (
    <div
      className="evaluation-bar-container"
      role="img"
      aria-label={evaluationBarLabel}
      title={`${evaluationBarLabel}: ${evaluationDisplayValue}`}
    >
      <div className="evaluation-bar-value evaluation-bar-value-top">
        {boardOrientation === "white" ? "Black" : "White"}
      </div>
      <div className="evaluation-bar-track">
        <div
          className="evaluation-bar-fill evaluation-bar-fill-black"
          style={{ height: `${100 - evaluationBarPercentage}%` }}
        />
        <div
          className="evaluation-bar-fill evaluation-bar-fill-white"
          style={{ height: `${evaluationBarPercentage}%` }}
        />
        <div
          className="evaluation-bar-marker"
          style={{ bottom: `calc(${evaluationBarPercentage}% - 1px)` }}
        />
      </div>
      <div className="evaluation-bar-score">{evaluationDisplayValue}</div>
      <div className="evaluation-bar-value evaluation-bar-value-bottom">
        {boardOrientation === "white" ? "White" : "Black"}
      </div>
    </div>
  );
}

export default EvaluationBar;
