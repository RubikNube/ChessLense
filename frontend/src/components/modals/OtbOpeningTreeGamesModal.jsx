import { useEffect, useState } from "react";
import { fetchJson } from "../../utils/api.js";
import { buildOtbOpeningTreeGamesQuery } from "../../utils/otbOpeningTree.js";
import {
  formatOtbGameDate,
  formatOtbMoveCount,
  formatOtbResult,
  getOtbPageWindow,
} from "../../utils/otbSearch.js";
import { THEME_CSS_VARS } from "../../utils/theme.js";
import ModalShell from "./ModalShell.jsx";
import {
  modalActionRowStyle,
  modalButtonStyle,
  modalErrorStyle,
  modalPrimaryButtonStyle,
} from "./modalStyles.js";

function formatPlayerLabel(player) {
  const prefix = player?.title ? `${player.title} ` : "";
  const rating = Number.isFinite(player?.rating) ? ` (${player.rating})` : "";

  return `${prefix}${player?.name ?? "Anonymous"}${rating}`;
}

function OtbOpeningTreeGamesModal({ selection, onImport, onClose }) {
  const [page, setPage] = useState(1);
  const [games, setGames] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importingGameId, setImportingGameId] = useState("");
  const move = selection?.move;

  useEffect(() => {
    setPage(1);
  }, [selection]);

  useEffect(() => {
    const { query, error: queryError } = buildOtbOpeningTreeGamesQuery(
      selection?.scope,
      selection?.color,
      selection?.fen,
      move?.uci,
      page,
    );

    if (queryError) {
      setGames([]);
      setPagination(null);
      setError(queryError);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    async function loadGames() {
      try {
        const data = await fetchJson(`/api/otb/opening-tree/games?${query}`);

        if (cancelled) {
          return;
        }

        setGames(Array.isArray(data.games) ? data.games : []);
        setPagination(
          data?.pagination && typeof data.pagination === "object"
            ? data.pagination
            : null,
        );

        if (
          Number.isInteger(data?.pagination?.page) &&
          data.pagination.page !== page
        ) {
          setPage(data.pagination.page);
        }
      } catch (requestError) {
        if (!cancelled) {
          setGames([]);
          setPagination(null);
          setError(requestError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadGames();

    return () => {
      cancelled = true;
    };
  }, [move?.uci, page, selection]);

  async function importGame(gameId) {
    setImportingGameId(gameId);
    setError("");

    try {
      await onImport(gameId);
    } catch (importError) {
      setError(importError.message);
    } finally {
      setImportingGameId("");
    }
  }

  const safePage = Number.isInteger(pagination?.page) ? pagination.page : page;
  const totalResults = Number.isInteger(pagination?.totalResults)
    ? pagination.totalResults
    : 0;
  const totalPages = Number.isInteger(pagination?.totalPages)
    ? pagination.totalPages
    : 1;
  const visiblePages = getOtbPageWindow(safePage, totalPages);
  const firstResult = games.length ? (safePage - 1) * 25 + 1 : 0;
  const lastResult = games.length ? firstResult + games.length - 1 : 0;

  return (
    <ModalShell
      title={`Games after ${move?.san ?? "selected move"}`}
      titleId="otb-opening-tree-games-title"
      onClose={onClose}
      showCloseButton
      wide
    >
      <p>
        <strong>{selection?.scope?.player}</strong> as {selection?.color} ·{" "}
        {selection?.currentMoveLabel} → <strong>{move?.san}</strong>
      </p>
      {loading && <p>Loading matching games...</p>}
      {error && <p style={modalErrorStyle}>{error}</p>}
      {!loading && !error && games.length === 0 && (
        <p>No database games matched this continuation.</p>
      )}
      {!loading && games.length > 0 && (
        <>
          <p className="search-result-meta">
            Showing {firstResult}-{lastResult} of {totalResults} results · Page{" "}
            {safePage} of {totalPages}
          </p>
          <ul className="search-results-list">
            {games.map((game) => (
              <li key={game.id} className="search-result-card">
                <div className="search-result-header">
                  <strong>
                    {formatPlayerLabel(game.players.white)} vs{" "}
                    {formatPlayerLabel(game.players.black)}
                  </strong>
                  <span className="search-result-score">
                    {formatOtbResult(game)}
                  </span>
                </div>
                <p className="search-result-meta">
                  {formatOtbGameDate(game)}
                  {game.event ? ` · ${game.event}` : ""}
                  {game.site ? ` · ${game.site}` : ""}
                </p>
                <p className="search-result-meta">
                  {game.round ? `Round ${game.round} · ` : ""}
                  {formatOtbMoveCount(game)}
                </p>
                <p className="search-result-meta">
                  {game.opening || game.eco
                    ? `${game.opening ?? "Opening unknown"}${game.eco ? ` (${game.eco})` : ""}`
                    : "Opening unknown"}
                  {game.sourceFile ? ` · ${game.sourceFile}` : ""}
                </p>
                <div className="search-result-actions">
                  <span className="search-result-source">
                    Local PGN archive
                  </span>
                  <button
                    type="button"
                    style={modalPrimaryButtonStyle}
                    onClick={() => void importGame(game.id)}
                    disabled={Boolean(importingGameId)}
                  >
                    {importingGameId === game.id
                      ? "Importing..."
                      : "Import PGN"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div
            style={{
              ...modalActionRowStyle,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                style={modalButtonStyle}
                onClick={() => setPage(1)}
                disabled={loading || safePage === 1}
              >
                First
              </button>
              <button
                type="button"
                style={modalButtonStyle}
                onClick={() => setPage(safePage - 1)}
                disabled={loading || !pagination?.hasPreviousPage}
              >
                Previous
              </button>
              {visiblePages.map((item, index) =>
                typeof item === "number" ? (
                  <button
                    key={item}
                    type="button"
                    style={
                      item === safePage
                        ? modalPrimaryButtonStyle
                        : modalButtonStyle
                    }
                    onClick={() => setPage(item)}
                    disabled={loading || item === safePage}
                    aria-current={item === safePage ? "page" : undefined}
                  >
                    {item}
                  </button>
                ) : (
                  <span
                    key={`${item}-${index}`}
                    style={{
                      padding: "0.65rem 0.25rem",
                      color: THEME_CSS_VARS.modalTextMuted,
                      fontWeight: 600,
                    }}
                  >
                    ...
                  </span>
                ),
              )}
              <button
                type="button"
                style={modalButtonStyle}
                onClick={() => setPage(safePage + 1)}
                disabled={loading || !pagination?.hasNextPage}
              >
                Next
              </button>
              <button
                type="button"
                style={modalButtonStyle}
                onClick={() => setPage(totalPages)}
                disabled={loading || safePage === totalPages}
              >
                Last
              </button>
            </div>
            <button type="button" style={modalButtonStyle} onClick={onClose}>
              Close
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}

export default OtbOpeningTreeGamesModal;
