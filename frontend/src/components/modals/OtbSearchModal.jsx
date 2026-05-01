import {
  OTB_COLOR_OPTIONS,
  OTB_PAGE_SIZE_OPTIONS,
  OTB_RESULT_OPTIONS,
  formatOtbGameDate,
  formatOtbMoveCount,
  formatOtbResult,
  getOtbPageWindow,
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
  page,
  pagination,
  searchError,
  setSearchError,
  importError,
  searchLoading,
  hasSearched,
  results,
  importingGameId,
  onSearch,
  onPageChange,
  onPageSizeChange,
  onImport,
  onClose,
}) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const totalResults = Number.isInteger(pagination?.totalResults) ? pagination.totalResults : 0;
  const totalPages = Number.isInteger(pagination?.totalPages) ? pagination.totalPages : 1;
  const pageSize = Number.isInteger(pagination?.pageSize)
    ? pagination.pageSize
    : Number(filters.pageSize) || 25;
  const firstResultIndex = results.length > 0 ? (safePage - 1) * pageSize + 1 : 0;
  const lastResultIndex = results.length > 0 ? firstResultIndex + results.length - 1 : 0;
  const visiblePages = getOtbPageWindow(safePage, totalPages);

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
            <span>Results per page</span>
            <select
              className="modal-input"
              value={filters.pageSize}
              onChange={(event) => {
                onPageSizeChange(event.target.value);
                setSearchError("");
              }}
            >
              {OTB_PAGE_SIZE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
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
          <>
            <p className="search-result-meta">
              Showing {firstResultIndex}-{lastResultIndex} of {totalResults} results · Page{" "}
              {safePage} of {totalPages}
            </p>
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
                  onClick={() => onPageChange(1)}
                  disabled={searchLoading || safePage === 1}
                >
                  First
                </button>
                <button
                  type="button"
                  style={modalButtonStyle}
                  onClick={() => onPageChange(safePage - 1)}
                  disabled={searchLoading || !pagination?.hasPreviousPage}
                >
                  Previous
                </button>
                {visiblePages.map((item, index) =>
                  typeof item === "number" ? (
                    <button
                      key={item}
                      type="button"
                      style={item === safePage ? modalPrimaryButtonStyle : modalButtonStyle}
                      onClick={() => onPageChange(item)}
                      disabled={searchLoading || item === safePage}
                      aria-current={item === safePage ? "page" : undefined}
                    >
                      {item}
                    </button>
                  ) : (
                    <span
                      key={`${item}-${index}`}
                      style={{
                        padding: "0.65rem 0.25rem",
                        color: "#6b7280",
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
                  onClick={() => onPageChange(safePage + 1)}
                  disabled={searchLoading || !pagination?.hasNextPage}
                >
                  Next
                </button>
                <button
                  type="button"
                  style={modalButtonStyle}
                  onClick={() => onPageChange(totalPages)}
                  disabled={searchLoading || safePage === totalPages}
                >
                  Last
                </button>
              </div>
              <span className="search-result-meta">
                Page {safePage} / {totalPages}
              </span>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}

export default OtbSearchModal;
