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

function CommentsPanel({
  onClose,
  currentMoveLabel,
  currentPositionComments,
  onStartEditingComment,
  onRemoveComment,
  editedComment,
  onStartAddingComment,
  commentDraft,
  onChangeCommentDraft,
  onSaveComment,
  onCancelCommentEdit,
}) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Comments</h2>
        <button
          type="button"
          className="card-close-button"
          onClick={onClose}
          aria-label="Close Comments"
          title="Close Comments"
        >
          ×
        </button>
      </div>
      <p className="current-move-label">{currentMoveLabel}</p>
      {currentPositionComments.length > 0 ? (
        <ul className="annotation-list">
          {currentPositionComments.map((commentEntry, index) => (
            <li
              key={commentEntry.id ?? `${commentEntry.fen ?? "current"}-${index}`}
              className="annotation-item"
            >
              <div className="annotation-item-header">
                <span className="annotation-label">
                  {formatPgnCommentLabel(commentEntry)}
                </span>
                <div className="annotation-item-actions">
                  <button
                    type="button"
                    className="annotation-action-button"
                    onClick={() => onStartEditingComment(commentEntry)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="annotation-danger-button"
                    onClick={() => onRemoveComment(commentEntry.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <p>{commentEntry.comment}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="annotation-empty">
          No comments are attached to the current position yet.
        </p>
      )}
      <div className="annotation-editor">
        <div className="annotation-editor-header">
          <h3>{editedComment ? "Edit comment" : "Add comment"}</h3>
          {!editedComment && (
            <button
              type="button"
              className="annotation-action-button"
              onClick={onStartAddingComment}
            >
              New comment
            </button>
          )}
        </div>
        <textarea
          className="annotation-editor-input"
          value={commentDraft}
          onChange={(event) => {
            onChangeCommentDraft(event.target.value);
          }}
          placeholder="Write a comment for this position..."
        />
        <div className="annotation-editor-actions">
          <button
            type="button"
            className="annotation-primary-button"
            onClick={onSaveComment}
            disabled={!commentDraft.trim()}
          >
            {editedComment ? "Save changes" : "Add comment"}
          </button>
          <button
            type="button"
            className="annotation-secondary-button"
            onClick={onCancelCommentEdit}
            disabled={!commentDraft && !editedComment}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default CommentsPanel;
