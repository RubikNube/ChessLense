import {
  OTB_COLOR_OPTIONS,
  OTB_RESULT_OPTIONS,
  formatOtbGameDate,
  formatOtbMoveCount,
  formatOtbResult,
} from "../../utils/otbSearch.js";
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

function OtbSearchModal({
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
    <ModalShell title="Search OTB Master Games" titleId="otb-search-title" onClose={onClose} wide>
      <p>
        Search a local archive of historical master-game PGNs by player, opponent,
        player color, event, year range, result, ECO range, or opening. Leave player
        color on <strong>Ignore player color</strong> to match both player/opponent
        orderings. Import PGN files into the OTB SQLite database with the app&apos;s
        <strong>Import PGN</strong> popup for single files, or use
        <code>cd server && npm run otb:import -- /path/to/master-pgn-archive</code>
        for archive-sized imports.
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
              placeholder="Morphy"
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
                setSearchError("");
              }}
              placeholder="Anderssen"
            />
          </label>
          <label className="modal-field">
            <span>Player color</span>
            <select
              className="modal-input"
              value={filters.color}
              onChange={(event) => {
                setFilters((currentValue) => ({
                  ...currentValue,
                  color: event.target.value,
                }));
                setSearchError("");
              }}
            >
              {OTB_COLOR_OPTIONS.map(({ value, label }) => (
                <option key={value || "any"} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="modal-field">
            <span>Event</span>
            <input
              className="modal-input"
              type="text"
              value={filters.event}
              onChange={(event) => {
                setFilters((currentValue) => ({
                  ...currentValue,
                  event: event.target.value,
                }));
              }}
              placeholder="London"
            />
          </label>
          <label className="modal-field">
            <span>From year</span>
            <input
              className="modal-input"
              type="number"
              min="1000"
              max={new Date().getFullYear()}
              value={filters.yearFrom}
              onChange={(event) => {
                setFilters((currentValue) => ({
                  ...currentValue,
                  yearFrom: event.target.value,
                }));
                setSearchError("");
              }}
              placeholder="1851"
            />
          </label>
          <label className="modal-field">
            <span>To year</span>
            <input
              className="modal-input"
              type="number"
              min="1000"
              max={new Date().getFullYear()}
              value={filters.yearTo}
              onChange={(event) => {
                setFilters((currentValue) => ({
                  ...currentValue,
                  yearTo: event.target.value,
                }));
                setSearchError("");
              }}
              placeholder="1900"
            />
          </label>
          <label className="modal-field">
            <span>Result</span>
            <select
              className="modal-input"
              value={filters.result}
              onChange={(event) => {
                setFilters((currentValue) => ({
                  ...currentValue,
                  result: event.target.value,
                }));
              }}
            >
              {OTB_RESULT_OPTIONS.map(({ value, label }) => (
                <option key={value || "any"} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="modal-field">
            <span>ECO from</span>
            <input
              className="modal-input"
              type="text"
              value={filters.ecoFrom}
              onChange={(event) => {
                setFilters((currentValue) => ({
                  ...currentValue,
                  ecoFrom: event.target.value,
                }));
              }}
              placeholder="C20"
            />
          </label>
          <label className="modal-field">
            <span>ECO to</span>
            <input
              className="modal-input"
              type="text"
              value={filters.ecoTo}
              onChange={(event) => {
                setFilters((currentValue) => ({
                  ...currentValue,
                  ecoTo: event.target.value,
                }));
              }}
              placeholder="C99"
            />
          </label>
          <label className="modal-field">
            <span>Opening</span>
            <input
              className="modal-input"
              type="text"
              value={filters.opening}
              onChange={(event) => {
                setFilters((currentValue) => ({
                  ...currentValue,
                  opening: event.target.value,
                }));
              }}
              placeholder="Italian"
            />
          </label>
          <label className="modal-field">
            <span>Max results</span>
            <input
              className="modal-input"
              type="number"
              min="1"
              max="100"
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
        <h3>OTB results</h3>
        {searchLoading && <p>Loading games...</p>}
        {!searchLoading && !hasSearched && (
          <p>Run a search to browse matching historical games.</p>
        )}
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
                    {formatOtbResult(gameResult)}
                  </span>
                </div>
                <p className="search-result-meta">
                  {formatOtbGameDate(gameResult)}
                  {gameResult.event ? ` · ${gameResult.event}` : ""}
                  {gameResult.site ? ` · ${gameResult.site}` : ""}
                </p>
                <p className="search-result-meta">
                  {gameResult.round ? `Round ${gameResult.round} · ` : ""}
                  {formatOtbMoveCount(gameResult)}
                </p>
                <p className="search-result-meta">
                  {gameResult.opening || gameResult.eco
                    ? `${gameResult.opening ?? "Opening unknown"}${gameResult.eco ? ` (${gameResult.eco})` : ""}`
                    : "Opening unknown"}
                  {gameResult.sourceFile ? ` · ${gameResult.sourceFile}` : ""}
                </p>
                <div className="search-result-actions">
                  <span className="search-result-source">Local PGN archive</span>
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

export default OtbSearchModal;
