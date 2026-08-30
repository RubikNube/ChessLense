import { getEvaluationDisplayValue } from "../../utils/evaluation.js";
import { getGameAnalysisScaleMaxCp } from "../../utils/gameAnalysis.js";

const CHART_HEIGHT = 190;
const CHART_TOP = 18;
const CHART_BOTTOM = 162;
const CHART_BASELINE = (CHART_TOP + CHART_BOTTOM) / 2;
const CHART_HALF_HEIGHT = (CHART_BOTTOM - CHART_TOP) / 2;

function formatScaleLabel(scaleMaxCp) {
  const pawns = scaleMaxCp / 100;
  return Number.isInteger(pawns) ? String(pawns) : pawns.toFixed(1);
}

function getMoveLabel(position) {
  if (!position?.ply) {
    return "Start position";
  }

  return position.side === "black"
    ? `${position.moveNumber}...${position.san}`
    : `${position.moveNumber}.${position.san}`;
}

function getPositionDescription(position) {
  const parts = [
    getMoveLabel(position),
    `evaluation ${getEvaluationDisplayValue(position.evaluation)}`,
  ];

  if (position.severity) {
    parts.push(`${position.severity}, ${Math.round(position.lossCp)} cp loss`);
  }

  return parts.join(", ");
}

function getBarClassName(position, isSelected) {
  const classes = [
    "game-analysis-bar",
    (position.scoreCp ?? 0) >= 0
      ? "game-analysis-bar-white"
      : "game-analysis-bar-black",
  ];

  if (position.severity) {
    classes.push(`game-analysis-bar-${position.severity}`);
  }

  if (isSelected) {
    classes.push("game-analysis-bar-selected");
  }

  return classes.join(" ");
}

function GameAnalysisHistogram({
  positions,
  currentNodeId,
  scale,
  onSelectPosition,
}) {
  const chartWidth = Math.max(360, positions.length * 10 + 44);
  const plotLeft = 38;
  const plotWidth = chartWidth - plotLeft - 8;
  const step = plotWidth / Math.max(positions.length, 1);
  const barWidth = Math.max(3, Math.min(10, step - 1));
  const scaleMaxCp = getGameAnalysisScaleMaxCp(positions, scale);
  const scaleLabel = formatScaleLabel(scaleMaxCp);

  return (
    <div className="game-analysis-chart-scroll">
      <svg
        className="game-analysis-chart"
        viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
        width={chartWidth}
        height={CHART_HEIGHT}
        role="img"
        aria-label="Main-line position evaluation histogram"
      >
        <line
          className="game-analysis-grid-line"
          x1={plotLeft}
          x2={chartWidth - 8}
          y1={CHART_TOP}
          y2={CHART_TOP}
        />
        <line
          className="game-analysis-zero-line"
          x1={plotLeft}
          x2={chartWidth - 8}
          y1={CHART_BASELINE}
          y2={CHART_BASELINE}
        />
        <line
          className="game-analysis-grid-line"
          x1={plotLeft}
          x2={chartWidth - 8}
          y1={CHART_BOTTOM}
          y2={CHART_BOTTOM}
        />
        <text className="game-analysis-axis-label" x="2" y={CHART_TOP + 4}>
          +{scaleLabel}
        </text>
        <text
          className="game-analysis-axis-label"
          x="18"
          y={CHART_BASELINE + 4}
        >
          0
        </text>
        <text className="game-analysis-axis-label" x="5" y={CHART_BOTTOM + 4}>
          −{scaleLabel}
        </text>
        {positions.map((position, index) => {
          const x = plotLeft + step * (index + 0.5) - barWidth / 2;
          const normalizedScore = Math.max(
            -1,
            Math.min(1, (position.scoreCp ?? 0) / scaleMaxCp),
          );
          const evaluationY =
            CHART_BASELINE - normalizedScore * CHART_HALF_HEIGHT;
          const y = Math.min(CHART_BASELINE, evaluationY);
          const height = Math.max(1, Math.abs(evaluationY - CHART_BASELINE));
          const description = getPositionDescription(position);

          return (
            <rect
              key={position.nodeId}
              className={getBarClassName(
                position,
                position.nodeId === currentNodeId,
              )}
              x={x}
              y={y}
              width={barWidth}
              height={height}
              rx="1"
              role="button"
              tabIndex="0"
              aria-label={`Go to ${description}`}
              onClick={() => onSelectPosition(position)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectPosition(position);
                }
              }}
            >
              <title>{description}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}

export default GameAnalysisHistogram;
