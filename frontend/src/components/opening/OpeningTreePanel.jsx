import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "../../utils/api.js";

const openingTreeHintStyle = {
  marginTop: "0.75rem",
};

const openingTreeTableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "0.75rem",
  fontSize: "0.95rem",
  color: "#020617",
};

const openingTreeHeaderCellStyle = {
  textAlign: "left",
  padding: "0.5rem 0.4rem",
  borderBottom: "1px solid #e5e7eb",
  color: "#e5e7eb",
  fontWeight: 700,
};

const openingTreeCellStyle = {
  padding: "0.6rem 0.4rem",
  borderBottom: "1px solid #f3f4f6",
  color: "#9ca3af",
};

const openingTreeNumericCellStyle = {
  ...openingTreeCellStyle,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  fontWeight: 600,
};

const openingTreeRowStyle = {
  cursor: "pointer",
};

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function formatOpeningLabel(opening) {
  if (!opening?.name) {
    return "";
  }

  return opening.eco ? `${opening.eco} ${opening.name}` : opening.name;
}

function OpeningTreePanel({
  fen,
  currentMoveLabel,
  lichessApiToken,
  onClose,
  onOpenLichessTokenPopup,
  onHoverMove,
  onSelectMove,
}) {
  const [openingTree, setOpeningTree] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");
    setOpeningTree(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        const headers = lichessApiToken
          ? { "X-Lichess-Api-Token": lichessApiToken }
          : undefined;
        const data = await fetchJson(`/api/lichess/opening-tree?fen=${encodeURIComponent(fen)}`, {
          ...(headers ? { headers } : {}),
        });

        if (!ignore) {
          setOpeningTree(data);
        }
      } catch (requestError) {
        if (!ignore) {
          setOpeningTree(null);
          setError(requestError.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }, 150);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [fen, lichessApiToken]);

  useEffect(() => {
    onHoverMove(null);
  }, [fen, onHoverMove]);

  useEffect(() => () => onHoverMove(null), [onHoverMove]);

  const openingLabel = formatOpeningLabel(openingTree?.opening);
  const tokenHintText = useMemo(() => {
    if (
      loading ||
      error ||
      !openingTree ||
      openingTree.environmentTokenConfigured ||
      !openingTree.unavailable
    ) {
      return "";
    }

    if (!openingTree.tokenConfigured) {
      return "Opening Tree needs a Lichess token. Open Help -> Lichess Token to enter one.";
    }

    if (openingTree.unavailable) {
      return "The current Lichess token was rejected. Update it via Help -> Lichess Token.";
    }

    return "";
  }, [error, loading, openingTree]);

  return (
    <div className="card">
      <div className="card-header">
        <h2>Opening Tree</h2>
        <button
          type="button"
          className="card-close-button"
          onClick={onClose}
          aria-label="Close Opening Tree"
          title="Close Opening Tree"
        >
          ×
        </button>
      </div>
      <p className="current-move-label">{currentMoveLabel}</p>
      {openingLabel && (
        <p>
          <strong>Opening:</strong> {openingLabel}
        </p>
      )}
      {!!tokenHintText && (
        <div style={openingTreeHintStyle}>
          <p className="annotation-empty">{tokenHintText}</p>
          <button
            type="button"
            className="annotation-secondary-button"
            onClick={onOpenLichessTokenPopup}
          >
            Open Lichess Token
          </button>
        </div>
      )}
      {loading && <p>Loading opening moves...</p>}
      {!loading && error && <p className="error">{error}</p>}
      {!loading && !error && openingTree?.unavailable && (
        <p className="annotation-empty">
          {openingTree.details || "Lichess opening explorer is unavailable right now."}
        </p>
      )}
      {!loading && !error && !openingTree?.unavailable && !openingTree?.moves?.length && (
        <p className="annotation-empty">
          Lichess has no opening-tree data for this position.
        </p>
      )}
      {!loading && !error && !openingTree?.unavailable && !!openingTree?.moves?.length && (
        <table style={openingTreeTableStyle}>
          <thead>
            <tr>
              <th style={openingTreeHeaderCellStyle}>Move</th>
              <th style={openingTreeHeaderCellStyle}>Games</th>
              <th style={openingTreeHeaderCellStyle}>White</th>
              <th style={openingTreeHeaderCellStyle}>Draw</th>
              <th style={openingTreeHeaderCellStyle}>Black</th>
            </tr>
          </thead>
          <tbody>
            {openingTree.moves.map((move) => (
              <tr
                key={move.uci}
                style={openingTreeRowStyle}
                onMouseEnter={() => onHoverMove(move)}
                onMouseLeave={() => onHoverMove(null)}
                onClick={() => onSelectMove(move)}
              >
                <td style={openingTreeCellStyle}>
                  <strong>{move.san}</strong>
                </td>
                <td style={openingTreeNumericCellStyle}>{move.gameCount.toLocaleString()}</td>
                <td style={openingTreeNumericCellStyle}>
                  {formatPercent(move.whitePercent)}
                </td>
                <td style={openingTreeNumericCellStyle}>
                  {formatPercent(move.drawPercent)}
                </td>
                <td style={openingTreeNumericCellStyle}>
                  {formatPercent(move.blackPercent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default OpeningTreePanel;
