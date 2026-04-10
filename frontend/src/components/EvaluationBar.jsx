import {
  getEvaluationBarPercentage,
  getEvaluationDisplayValue,
  getEvaluationLabel,
  normalizeEvaluationForWhite,
} from "../utils/evaluation.js";

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
