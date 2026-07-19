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

function SortableComment({
  commentEntry,
  onStartEditingComment,
  onRemoveComment,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: commentEntry.id });

  return (
    <li
      ref={setNodeRef}
      className={`annotation-item sortable-comment${isDragging ? " sortable-comment-dragging" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className="annotation-item-header">
        <span className="annotation-label">
          {formatPgnCommentLabel(commentEntry)}
        </span>
        <div className="annotation-item-actions">
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="annotation-action-button comment-drag-handle"
            aria-label="Drag to reorder comment"
            title="Drag to reorder comment"
            {...attributes}
            {...listeners}
          >
            ⠿
          </button>
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
  );
}

function CommentsPanel({
  onClose,
  currentMoveLabel,
  currentPositionComments,
  onStartEditingComment,
  onRemoveComment,
  onReorderComments,
  editedComment,
  onStartAddingComment,
  commentDraft,
  onChangeCommentDraft,
  onSaveComment,
  onCancelCommentEdit,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event) {
    if (event.over && event.active.id !== event.over.id) {
      onReorderComments(event.active.id, event.over.id);
    }
  }

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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          accessibility={{
            screenReaderInstructions: {
              draggable:
                "To reorder a comment, press Space or Enter. Use the arrow keys to choose a new position, then press Space or Enter to drop it.",
            },
          }}
        >
          <SortableContext
            items={currentPositionComments.map(
              (commentEntry) => commentEntry.id,
            )}
            strategy={verticalListSortingStrategy}
          >
            <ul className="annotation-list">
              {currentPositionComments.map((commentEntry) => (
                <SortableComment
                  key={commentEntry.id}
                  commentEntry={commentEntry}
                  onStartEditingComment={onStartEditingComment}
                  onRemoveComment={onRemoveComment}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
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
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
