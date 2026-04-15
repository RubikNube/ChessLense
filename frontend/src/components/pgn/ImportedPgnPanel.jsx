function formatPgnCommentLabel(comment) {
  if (!comment || typeof comment !== "object") {
    return "Annotation";
  }

  if (comment.ply === 0) {
    return "Game introduction";
  }

  if (
    typeof comment.moveNumber === "number" &&
    comment.moveNumber > 0 &&
    typeof comment.san === "string" &&
    comment.san
  ) {
    return comment.side === "black"
      ? `${comment.moveNumber}... ${comment.san}`
      : `${comment.moveNumber}. ${comment.san}`;
  }

  return "Annotation";
}

function isLinkValue(value) {
  return /^https?:\/\//i.test(value);
}

function ImportedPgnPanel({
  onClose,
  importedPgnData,
  importedMainlineComments,
}) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Imported PGN</h2>
        <button
          type="button"
          className="card-close-button"
          onClick={onClose}
          aria-label="Close Imported PGN"
          title="Close Imported PGN"
        >
          ×
        </button>
      </div>
      {!!importedPgnData.headers.length && (
        <dl className="pgn-metadata-list">
          {importedPgnData.headers.map(({ name, value }) => (
            <div key={`${name}-${value}`} className="pgn-metadata-row">
              <dt>{name}</dt>
              <dd>
                {isLinkValue(value) ? (
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pgn-link"
                  >
                    {value}
                  </a>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {!!importedMainlineComments.length && (
        <div className="annotation-section">
          <h3>All Main Line Notes</h3>
          <ul className="annotation-list">
            {importedMainlineComments.map((commentEntry, index) => (
              <li
                key={commentEntry.id ?? `${commentEntry.fen ?? "mainline"}-${index}`}
                className="annotation-item"
              >
                <span className="annotation-label">
                  {formatPgnCommentLabel(commentEntry)}
                </span>
                <p>{commentEntry.comment}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!importedPgnData.additionalComments.length && (
        <div className="annotation-section">
          <h3>Additional Notes</h3>
          <ul className="annotation-list">
            {importedPgnData.additionalComments.map((commentEntry, index) => (
              <li key={`${commentEntry.text}-${index}`} className="annotation-item">
                <span className="annotation-label">
                  {commentEntry.inVariation ? "Variation note" : "General note"}
                </span>
                <p>{commentEntry.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!importedPgnData.variationSnippets.length && (
        <details className="annotation-section">
          <summary>
            Variation snippets ({importedPgnData.variationSnippets.length})
          </summary>
          <ul className="variation-list">
            {importedPgnData.variationSnippets.map((snippet, index) => (
              <li key={`${snippet}-${index}`}>
                <code>{snippet}</code>
              </li>
            ))}
          </ul>
        </details>
      )}

      <details className="annotation-section">
        <summary>Raw imported PGN</summary>
        <code>{importedPgnData.rawPgn}</code>
      </details>
    </div>
  );
}

export default ImportedPgnPanel;
