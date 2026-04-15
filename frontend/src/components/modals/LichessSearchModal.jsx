import {
  LICHESS_COLOR_OPTIONS,
  LICHESS_PERF_TYPE_OPTIONS,
  formatLichessGameDate,
  formatLichessResult,
} from "../../utils/lichessSearch.js";
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

function LichessSearchModal({
  filters,
  setFilters,
  searchError,
  setSearchError,
  importError,
  searchLoading,
  hasSearched,
  results,
  importingGameId,
  onSearch,
  onImport,
  onClose,
}) {
  return (
    <ModalShell title="Search Lichess" titleId="lichess-search-title" onClose={onClose} wide>
      <p>
        Search public Lichess games by player, then narrow results with filters like
        opponent, year, color, and speed.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onSearch();
        }}
      >
        <div className="modal-form-grid">
          <label className="modal-field">
            <span>Player</span>
            <input
              className="modal-input"
              type="text"
              value={filters.player}
              onChange={(event) => {
                setFilters((currentValue) => ({
                  ...currentValue,
                  player: event.target.value,
                }));
                setSearchError("");
              }}
              placeholder="MagnusCarlsen"
              autoFocus
            />
          </label>
          <label className="modal-field">
            <span>Opponent</span>
            <input
              className="modal-input"
              type="text"
              value={filters.opponent}
              onChange={(event) => {
                setFilters((currentValue) => ({
                  ...currentValue,
                  opponent: event.target.value,
                }));
              }}
              placeholder="Optional"
            />
          </label>
          <label className="modal-field">
            <span>Year</span>
            <input
              className="modal-input"
              type="number"
              min="2013"
              max={new Date().getFullYear()}
              value={filters.year}
              onChange={(event) => {
                setFilters((currentValue) => ({
                  ...currentValue,
                  year: event.target.value,
                }));
                setSearchError("");
              }}
              placeholder="2024"
            />
          </label>
          <label className="modal-field">
            <span>Color</span>
            <select
              className="modal-input"
              value={filters.color}
              onChange={(event) => {
                setFilters((currentValue) => ({
                  ...currentValue,
                  color: event.target.value,
                }));
              }}
            >
              {LICHESS_COLOR_OPTIONS.map(({ value, label }) => (
                <option key={value || "any"} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="modal-field">
            <span>Speed / Variant</span>
            <select
              className="modal-input"
              value={filters.perfType}
              onChange={(event) => {
                setFilters((currentValue) => ({
                  ...currentValue,
                  perfType: event.target.value,
                }));
              }}
            >
              {LICHESS_PERF_TYPE_OPTIONS.map(({ value, label }) => (
                <option key={value || "any"} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="modal-field">
            <span>Max results</span>
            <input
              className="modal-input"
              type="number"
              min="1"
              max="50"
              value={filters.max}
              onChange={(event) => {
                setFilters((currentValue) => ({
                  ...currentValue,
                  max: event.target.value,
                }));
              }}
            />
          </label>
        </div>
        {searchError && <p style={modalErrorStyle}>{searchError}</p>}
        {importError && <p style={modalErrorStyle}>{importError}</p>}
        <div style={modalActionRowStyle}>
          <button
            type="button"
            style={modalButtonStyle}
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="submit"
            style={modalPrimaryButtonStyle}
            disabled={searchLoading}
          >
            {searchLoading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      <div className="search-results-section">
        <h3>Lichess results</h3>
        {searchLoading && <p>Loading games...</p>}
        {!searchLoading && !hasSearched && <p>Run a search to browse matching games.</p>}
        {!searchLoading && hasSearched && !searchError && results.length === 0 && (
          <p>No games matched those filters.</p>
        )}
        {!!results.length && (
          <ul className="search-results-list">
            {results.map((gameResult) => (
              <li key={gameResult.id} className="search-result-card">
                <div className="search-result-header">
                  <strong>
                    {formatPlayerLabel(gameResult.players.white)} vs{" "}
                    {formatPlayerLabel(gameResult.players.black)}
                  </strong>
                  <span className="search-result-score">
                    {formatLichessResult(gameResult)}
                  </span>
                </div>
                <p className="search-result-meta">
                  {formatLichessGameDate(gameResult.createdAt)} ·{" "}
                  {gameResult.perf ?? gameResult.variant ?? "Unknown"} ·{" "}
                  {gameResult.rated ? "Rated" : "Casual"}
                  {gameResult.opening ? ` · ${gameResult.opening}` : ""}
                </p>
                <div className="search-result-actions">
                  <a
                    className="pgn-link"
                    href={gameResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open on Lichess
                  </a>
                  <button
                    type="button"
                    style={modalPrimaryButtonStyle}
                    onClick={() => {
                      void onImport(gameResult.id);
                    }}
                    disabled={importingGameId === gameResult.id}
                  >
                    {importingGameId === gameResult.id ? "Importing..." : "Import PGN"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ModalShell>
  );
}

export default LichessSearchModal;
