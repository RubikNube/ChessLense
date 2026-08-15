import { useEffect, useRef, useState } from "react";
import { fetchJson } from "../../utils/api.js";
import {
  buildOtbOpeningTreeExportQuery,
  buildOtbOpeningTreeQuery,
} from "../../utils/otbOpeningTree.js";
import { THEME_CSS_VARS } from "../../utils/theme.js";

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "0.75rem",
  fontSize: "0.9rem",
  color: THEME_CSS_VARS.surfaceText,
};
const headerStyle = {
  padding: "0.45rem 0.3rem",
  borderBottom: `1px solid ${THEME_CSS_VARS.border}`,
  textAlign: "right",
};
const cellStyle = {
  padding: "0.55rem 0.3rem",
  borderBottom: `1px solid ${THEME_CSS_VARS.border}`,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};
const firstCellStyle = { ...cellStyle, textAlign: "left" };
const gameCountButtonStyle = {
  border: 0,
  padding: 0,
  background: "transparent",
  color: THEME_CSS_VARS.accent,
  cursor: "pointer",
  font: "inherit",
  fontWeight: 700,
  textDecoration: "underline",
};
const controlsStyle = {
  display: "flex",
  gap: "0.5rem",
  flexWrap: "wrap",
  alignItems: "end",
  marginTop: "0.75rem",
};
const smallInputStyle = { width: "4.5rem" };

function percent(value) {
  return `${Number.isFinite(value) ? value : 0}%`;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error("Copy command failed.");
  }
}

function downloadText(text, filename) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/markdown;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function OtbPlayerOpeningTreePanel({
  scope,
  color,
  onColorChange,
  exportSettings,
  onExportSettingsChange,
  fen,
  currentMoveLabel,
  onClose,
  onHoverMove,
  onOpenGames,
  onSelectMove,
}) {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const shouldChooseInitialColorRef = useRef(true);

  useEffect(() => {
    shouldChooseInitialColorRef.current = true;
  }, [scope]);

  useEffect(() => {
    const { query, error: queryError } = buildOtbOpeningTreeQuery(
      scope,
      color,
      fen,
    );

    if (queryError) {
      setTree(null);
      setError(queryError);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    const timeoutId = window.setTimeout(async () => {
      try {
        const data = await fetchJson(`/api/otb/opening-tree?${query}`);
        if (!cancelled) {
          setTree(data);
          if (
            shouldChooseInitialColorRef.current &&
            color === "white" &&
            data?.indexing?.totalGames === 0
          ) {
            shouldChooseInitialColorRef.current = false;
            onColorChange("black");
          } else {
            shouldChooseInitialColorRef.current = false;
          }
        }
      } catch (requestError) {
        if (!cancelled) {
          setTree(null);
          setError(requestError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 100);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [scope, color, fen, onColorChange]);

  useEffect(() => {
    onHoverMove(null);
  }, [fen, color, onHoverMove]);

  useEffect(() => () => onHoverMove(null), [onHoverMove]);

  async function exportTree(mode) {
    const { query, error: queryError } = buildOtbOpeningTreeExportQuery(
      scope,
      exportSettings,
    );

    setExportError("");
    setExportStatus("");
    if (queryError) {
      setExportError(queryError);
      return;
    }

    setExporting(true);
    try {
      const data = await fetchJson(`/api/otb/opening-tree/export?${query}`);
      if (mode === "copy") {
        await copyText(data.text);
        setExportStatus("Markdown copied.");
      } else {
        downloadText(data.text, data.filename || "otb-opening-tree.md");
        setExportStatus("Markdown downloaded.");
      }
    } catch (requestError) {
      setExportError(requestError.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Player Opening Tree</h2>
        <button
          type="button"
          className="card-close-button"
          onClick={onClose}
          aria-label="Close Player Opening Tree"
        >
          ×
        </button>
      </div>
      <p>
        <strong>{scope.player}</strong> from the filtered OTB archive
      </p>
      <p className="current-move-label">{currentMoveLabel}</p>
      <div className="search-result-actions">
        {["white", "black"].map((nextColor) => (
          <button
            key={nextColor}
            type="button"
            className={
              color === nextColor
                ? "annotation-primary-button"
                : "annotation-secondary-button"
            }
            onClick={() => onColorChange(nextColor)}
          >
            As {nextColor === "white" ? "White" : "Black"}
          </button>
        ))}
      </div>
      {loading && <p>Loading and indexing matching games...</p>}
      {!loading && error && <p className="error">{error}</p>}
      {!loading && !error && tree && (
        <>
          <p className="search-result-meta">
            {tree.gamesAtPosition} games continue from this position ·{" "}
            {tree.indexing?.indexedGames ?? 0} indexed
            {tree.indexing?.skippedGames
              ? ` · ${tree.indexing.skippedGames} skipped`
              : ""}
          </p>
          {!tree.moves?.length ? (
            <p className="annotation-empty">
              No matching continuations from this position.
            </p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...headerStyle, textAlign: "left" }}>Move</th>
                  <th style={headerStyle}>Games</th>
                  <th style={headerStyle}>Freq.</th>
                  <th style={headerStyle}>W/D/L</th>
                </tr>
              </thead>
              <tbody>
                {tree.moves.map((move) => (
                  <tr
                    key={move.uci}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => onHoverMove(move)}
                    onMouseLeave={() => onHoverMove(null)}
                    onClick={() => onSelectMove(move)}
                  >
                    <td style={firstCellStyle}>
                      <strong>{move.san}</strong>
                    </td>
                    <td style={cellStyle}>
                      <button
                        type="button"
                        style={gameCountButtonStyle}
                        aria-label={`Show ${move.gameCount} database ${move.gameCount === 1 ? "game" : "games"} after ${move.san}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenGames(move);
                        }}
                      >
                        {move.gameCount}
                      </button>
                    </td>
                    <td style={cellStyle}>{percent(move.frequencyPercent)}</td>
                    <td style={cellStyle}>
                      {percent(move.playerWinPercent)}/
                      {percent(move.drawPercent)}/
                      {percent(move.playerLossPercent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
      <div style={controlsStyle}>
        <label>
          <span>Depth</span>
          <input
            className="modal-input"
            style={smallInputStyle}
            type="number"
            min="1"
            max="60"
            value={exportSettings.maxDepth}
            onChange={(event) =>
              onExportSettingsChange({
                ...exportSettings,
                maxDepth: event.target.value,
              })
            }
          />
        </label>
        <label>
          <span>Min games</span>
          <input
            className="modal-input"
            style={smallInputStyle}
            type="number"
            min="1"
            value={exportSettings.minGames}
            onChange={(event) =>
              onExportSettingsChange({
                ...exportSettings,
                minGames: event.target.value,
              })
            }
          />
        </label>
        <label>
          <span>Branches</span>
          <input
            className="modal-input"
            style={smallInputStyle}
            type="number"
            min="1"
            max="20"
            value={exportSettings.maxBranches}
            onChange={(event) =>
              onExportSettingsChange({
                ...exportSettings,
                maxBranches: event.target.value,
              })
            }
          />
        </label>
      </div>
      <div className="search-result-actions" style={{ marginTop: "0.6rem" }}>
        <button
          type="button"
          className="annotation-secondary-button"
          disabled={exporting}
          onClick={() => void exportTree("copy")}
        >
          {exporting ? "Exporting..." : "Copy Markdown"}
        </button>
        <button
          type="button"
          className="annotation-secondary-button"
          disabled={exporting}
          onClick={() => void exportTree("download")}
        >
          Download .md
        </button>
      </div>
      {exportError && <p className="error">{exportError}</p>}
      {exportStatus && <p className="search-result-meta">{exportStatus}</p>}
    </div>
  );
}

export default OtbPlayerOpeningTreePanel;
