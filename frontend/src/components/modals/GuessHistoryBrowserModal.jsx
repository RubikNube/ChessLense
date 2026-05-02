import ModalShell from "./ModalShell.jsx";
import {
  modalActionRowStyle,
  modalButtonStyle,
  modalErrorStyle,
  modalPrimaryButtonStyle,
  studyHeaderStyle,
  studyListItemStyle,
  studyListStyle,
  studyMetaStyle,
} from "./modalStyles.js";

function formatTimestamp(timestamp) {
  const parsedTimestamp = new Date(timestamp);

  if (Number.isNaN(parsedTimestamp.getTime())) {
    return "Unknown";
  }

  return parsedTimestamp.toLocaleString();
}

function getGameTitle(game) {
  if (!game || typeof game !== "object") {
    return "Saved Guess history";
  }

  if (game.white && game.black) {
    return `${game.white} vs ${game.black}`;
  }

  return game.white || game.black || game.event || "Saved Guess history";
}

function getGameSummaryText(entry) {
  if (!entry || typeof entry !== "object") {
    return "";
  }

  const parts = [];

  if (entry.game?.event) {
    parts.push(entry.game.event);
  }

  parts.push(`${entry.runCount} saved run${entry.runCount === 1 ? "" : "s"}`);
  parts.push(`Latest: ${entry.latestSummary.totalScore}/${entry.latestSummary.parScore}`);
  parts.push(entry.latestSummary.evaluation.label);

  return parts.join(" · ");
}

function GuessHistoryBrowserModal({
  guessHistoryBrowserGames,
  guessHistoryBrowserError,
  guessHistoryBrowserLoading,
  loadingGuessHistoryGameKey,
  loadGuessHistoryGames,
  loadGuessHistoryGame,
  onClose,
}) {
  return (
    <ModalShell
      title="Guess The Move History"
      titleId="guess-history-browser-title"
      onClose={onClose}
      wide
    >
      <p>Browse games that already have Guess The Move history and load one into the board.</p>
      {!!guessHistoryBrowserError && <p style={modalErrorStyle}>{guessHistoryBrowserError}</p>}
      {guessHistoryBrowserLoading && <p>Loading saved Guess-history games...</p>}
      {!guessHistoryBrowserLoading && !guessHistoryBrowserGames.length && !guessHistoryBrowserError && (
        <p>No Guess The Move history has been saved yet.</p>
      )}
      {!!guessHistoryBrowserGames.length && (
        <ul style={studyListStyle}>
          {guessHistoryBrowserGames.map((entry) => (
            <li key={entry.gameKey} style={studyListItemStyle}>
              <div style={studyHeaderStyle}>
                <div>
                  <strong>{getGameTitle(entry.game)}</strong>
                  <p style={studyMetaStyle}>{getGameSummaryText(entry)}</p>
                  <p style={studyMetaStyle}>
                    Updated {formatTimestamp(entry.updatedAt)} · Latest run{" "}
                    {formatTimestamp(entry.latestEntry.completedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  style={modalPrimaryButtonStyle}
                  onClick={() => {
                    void loadGuessHistoryGame(entry);
                  }}
                  disabled={
                    guessHistoryBrowserLoading || loadingGuessHistoryGameKey === entry.gameKey
                  }
                >
                  {loadingGuessHistoryGameKey === entry.gameKey ? "Loading..." : "Load game"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div style={modalActionRowStyle}>
        <button
          type="button"
          style={modalButtonStyle}
          onClick={() => {
            void loadGuessHistoryGames();
          }}
          disabled={guessHistoryBrowserLoading || !!loadingGuessHistoryGameKey}
        >
          Refresh
        </button>
        <button
          type="button"
          style={modalButtonStyle}
          onClick={onClose}
          disabled={guessHistoryBrowserLoading || !!loadingGuessHistoryGameKey}
        >
          Close
        </button>
      </div>
    </ModalShell>
  );
}

export default GuessHistoryBrowserModal;
