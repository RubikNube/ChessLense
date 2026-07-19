import { useEffect, useId, useMemo, useRef, useState } from "react";
import { THEME_CSS_VARS } from "../utils/theme.js";

const actionRowStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "0.75rem",
  marginTop: "1rem",
  flexWrap: "wrap",
};

const actionButtonStyle = {
  padding: "0.6rem 1rem",
  border: `1px solid ${THEME_CSS_VARS.modalBorder}`,
  borderRadius: "0.5rem",
  backgroundColor: THEME_CSS_VARS.modalSurface,
  color: THEME_CSS_VARS.modalText,
  fontWeight: 600,
  fontSize: "1rem",
  lineHeight: 1,
  minWidth: "2.75rem",
  cursor: "pointer",
  transition: "background-color 0.2s ease, transform 0.2s ease",
};

const disabledActionButtonStyle = {
  backgroundColor: THEME_CSS_VARS.modalBorder,
  color: THEME_CSS_VARS.modalTextMuted,
  borderColor: THEME_CSS_VARS.modalBorder,
  cursor: "not-allowed",
  opacity: 0.75,
};

const contextMenuStyle = {
  position: "fixed",
  zIndex: 1100,
  minWidth: "13rem",
  padding: "0.35rem",
  border: `1px solid ${THEME_CSS_VARS.modalBorder}`,
  borderRadius: "0.65rem",
  backgroundColor: THEME_CSS_VARS.modalBackground,
  boxShadow: `0 12px 30px ${THEME_CSS_VARS.shadow}`,
};

const contextMenuButtonStyle = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  border: "none",
  borderRadius: "0.45rem",
  backgroundColor: "transparent",
  color: THEME_CSS_VARS.modalText,
  textAlign: "left",
  fontWeight: 600,
  cursor: "pointer",
};

const disabledContextMenuButtonStyle = {
  ...contextMenuButtonStyle,
  color: THEME_CSS_VARS.modalTextMuted,
  cursor: "not-allowed",
};

const contextMenuSectionTitleStyle = {
  padding: "0.35rem 0.75rem 0.25rem",
  color: THEME_CSS_VARS.modalTextMuted,
  fontSize: "0.78rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const contextMenuDividerStyle = {
  height: "1px",
  margin: "0.35rem 0",
  backgroundColor: THEME_CSS_VARS.modalBorder,
};

const contextMenuMetaStyle = {
  display: "block",
  marginTop: "0.15rem",
  color: THEME_CSS_VARS.modalTextMuted,
  fontSize: "0.8rem",
  fontWeight: 500,
};

function MoveHistory({
  moveHistoryItems,
  currentMoveIndex,
  boardPanelHeight,
  canUndo,
  canRedo,
  onClose,
  onSelectMove,
  onUndo,
  onRedo,
  onGoToStart,
  onGoToEnd,
  onRevertMovesUntil,
  getVariantOptionsForMove,
  onSelectVariant,
}) {
  const moveHistoryRef = useRef(null);
  const selectedMoveRef = useRef(null);
  const commentTooltipId = useId();
  const [contextMenu, setContextMenu] = useState(null);
  const [commentTooltip, setCommentTooltip] = useState(null);
  const groupedMoveHistory = useMemo(
    () =>
      moveHistoryItems.reduce((pairs, moveEntry, index) => {
        if (moveEntry.side === "white") {
          pairs.push({
            moveNumber: moveEntry.moveNumber,
            white: moveEntry,
            whiteIndex: index,
            black: null,
            blackIndex: null,
          });
        } else {
          const lastPair = pairs[pairs.length - 1];

          if (!lastPair || lastPair.black) {
            pairs.push({
              moveNumber: moveEntry.moveNumber,
              white: null,
              whiteIndex: null,
              black: moveEntry,
              blackIndex: index,
            });
          } else {
            lastPair.black = moveEntry;
            lastPair.blackIndex = index;
          }
        }

        return pairs;
      }, []),
    [moveHistoryItems],
  );

  useEffect(() => {
    const moveHistoryElement = moveHistoryRef.current;
    const selectedMoveElement = selectedMoveRef.current;

    if (!moveHistoryElement || !selectedMoveElement) {
      return;
    }

    const containerRect = moveHistoryElement.getBoundingClientRect();
    const selectedRect = selectedMoveElement.getBoundingClientRect();
    const topOffset = selectedRect.top - containerRect.top;
    const bottomOffset = selectedRect.bottom - containerRect.bottom;

    if (topOffset < 0) {
      moveHistoryElement.scrollTop += topOffset - 8;
      return;
    }

    if (bottomOffset > 0) {
      moveHistoryElement.scrollTop += bottomOffset + 8;
    }
  }, [currentMoveIndex]);

  useEffect(() => {
    if (!contextMenu) {
      return undefined;
    }

    function closeContextMenu() {
      setContextMenu(null);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeContextMenu();
      }
    }

    window.addEventListener("pointerdown", closeContextMenu);
    window.addEventListener("resize", closeContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", closeContextMenu);
      window.removeEventListener("resize", closeContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!commentTooltip) {
      return undefined;
    }

    function hideCommentTooltip() {
      setCommentTooltip(null);
    }

    window.addEventListener("scroll", hideCommentTooltip, true);

    return () => {
      window.removeEventListener("scroll", hideCommentTooltip, true);
    };
  }, [commentTooltip]);

  const lastMoveNodeId =
    moveHistoryItems[moveHistoryItems.length - 1]?.nodeId ?? null;
  const variantOptions = contextMenu
    ? getVariantOptionsForMove(contextMenu.moveEntry.nodeId)
    : [];
  const shouldShowVariantOptions =
    variantOptions.length > 1 ||
    variantOptions.some((option) => !option.isSelected);

  function openContextMenu(event, moveEntry) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      moveEntry,
    });
  }

  function showCommentTooltip(comments, anchor) {
    if (!comments?.length || !anchor) {
      return;
    }

    const anchorRect = anchor.getBoundingClientRect();
    const shouldPlaceBelow = anchorRect.top < window.innerHeight / 2 + 8;

    setCommentTooltip({
      comments,
      left: Math.min(
        Math.max(anchorRect.left + anchorRect.width / 2, 16),
        window.innerWidth - 16,
      ),
      top: shouldPlaceBelow ? anchorRect.bottom + 8 : anchorRect.top - 8,
      placement: shouldPlaceBelow ? "below" : "above",
    });
  }

  function hideCommentTooltip() {
    setCommentTooltip(null);
  }

  return (
    <div
      className="card move-history-card"
      style={boardPanelHeight ? { height: `${boardPanelHeight}px` } : undefined}
    >
      <div className="card-header">
        <h2>Move History</h2>
        <button
          type="button"
          className="card-close-button"
          onClick={onClose}
          aria-label="Close Move History"
          title="Close Move History"
        >
          ×
        </button>
      </div>
      <div className="move-history-body">
        {!groupedMoveHistory.length && (
          <p className="annotation-empty">No moves yet.</p>
        )}
        {!!groupedMoveHistory.length && (
          <ol className="move-history" ref={moveHistoryRef}>
            {groupedMoveHistory.map(
              ({ moveNumber, white, whiteIndex, black, blackIndex }) => (
                <li
                  key={`${moveNumber}-${white?.nodeId ?? black?.nodeId ?? "row"}`}
                  className="move-row"
                >
                  <span className="move-number">{moveNumber}.</span>
                  {white ? (
                    <button
                      type="button"
                      ref={
                        whiteIndex === currentMoveIndex ? selectedMoveRef : null
                      }
                      className={`move-entry move-entry-button${whiteIndex === currentMoveIndex ? " move-entry-selected" : ""}`}
                      onClick={() => onSelectMove(white.nodeId)}
                      onContextMenu={(event) => openContextMenu(event, white)}
                      onFocus={(event) =>
                        showCommentTooltip(white.comments, event.currentTarget)
                      }
                      onBlur={hideCommentTooltip}
                      aria-describedby={
                        white.hasComments ? commentTooltipId : undefined
                      }
                    >
                      <span>{white.san}</span>
                      {(white.hasVariants || white.hasComments) && (
                        <span className="move-entry-indicators">
                          {white.hasVariants && (
                            <span
                              className="move-entry-indicator"
                              aria-hidden="true"
                            >
                              V
                            </span>
                          )}
                          {white.hasComments && (
                            <span
                              className="move-entry-indicator move-entry-comment-indicator"
                              aria-label="Show comments"
                              onMouseEnter={(event) =>
                                showCommentTooltip(
                                  white.comments,
                                  event.currentTarget,
                                )
                              }
                              onMouseLeave={hideCommentTooltip}
                            >
                              C
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  ) : (
                    <span className="move-entry move-entry-placeholder">
                      ...
                    </span>
                  )}
                  {black ? (
                    <button
                      type="button"
                      ref={
                        blackIndex === currentMoveIndex ? selectedMoveRef : null
                      }
                      className={`move-entry move-entry-button${blackIndex === currentMoveIndex ? " move-entry-selected" : ""}`}
                      onClick={() => onSelectMove(black.nodeId)}
                      onContextMenu={(event) => openContextMenu(event, black)}
                      onFocus={(event) =>
                        showCommentTooltip(black.comments, event.currentTarget)
                      }
                      onBlur={hideCommentTooltip}
                      aria-describedby={
                        black.hasComments ? commentTooltipId : undefined
                      }
                    >
                      <span>{black.san}</span>
                      {(black.hasVariants || black.hasComments) && (
                        <span className="move-entry-indicators">
                          {black.hasVariants && (
                            <span
                              className="move-entry-indicator"
                              aria-hidden="true"
                            >
                              V
                            </span>
                          )}
                          {black.hasComments && (
                            <span
                              className="move-entry-indicator move-entry-comment-indicator"
                              aria-label="Show comments"
                              onMouseEnter={(event) =>
                                showCommentTooltip(
                                  black.comments,
                                  event.currentTarget,
                                )
                              }
                              onMouseLeave={hideCommentTooltip}
                            >
                              C
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  ) : (
                    <span className="move-entry move-entry-placeholder">
                      ...
                    </span>
                  )}
                </li>
              ),
            )}
          </ol>
        )}
      </div>
      <div style={actionRowStyle}>
        <button
          type="button"
          onClick={onGoToStart}
          disabled={!canUndo}
          aria-label="Go to start"
          title="Go to start"
          style={{
            ...actionButtonStyle,
            ...(!canUndo ? disabledActionButtonStyle : {}),
          }}
        >
          ⏮
        </button>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo"
          style={{
            ...actionButtonStyle,
            ...(!canUndo ? disabledActionButtonStyle : {}),
          }}
        >
          ◀
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo"
          style={{
            ...actionButtonStyle,
            ...(!canRedo ? disabledActionButtonStyle : {}),
          }}
        >
          ▶
        </button>
        <button
          type="button"
          onClick={onGoToEnd}
          disabled={!canRedo}
          aria-label="Go to end"
          title="Go to end"
          style={{
            ...actionButtonStyle,
            ...(!canRedo ? disabledActionButtonStyle : {}),
          }}
        >
          ⏭
        </button>
      </div>
      {commentTooltip && (
        <div
          id={commentTooltipId}
          className={`move-history-comment-tooltip move-history-comment-tooltip-${commentTooltip.placement}`}
          role="tooltip"
          style={{
            left: `${commentTooltip.left}px`,
            top: `${commentTooltip.top}px`,
          }}
        >
          <span className="annotation-label">
            {commentTooltip.comments.length === 1 ? "Comment" : "Comments"}
          </span>
          <ul>
            {commentTooltip.comments.map((comment, index) => (
              <li key={`${comment}-${index}`}>{comment}</li>
            ))}
          </ul>
        </div>
      )}
      {contextMenu && (
        <div
          style={{
            ...contextMenuStyle,
            left: `${Math.min(contextMenu.x, window.innerWidth - 220)}px`,
            top: `${Math.min(contextMenu.y, window.innerHeight - 80)}px`,
          }}
          role="menu"
          aria-label={`Move actions for ${contextMenu.moveEntry.san}`}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {shouldShowVariantOptions && (
            <>
              <div style={contextMenuSectionTitleStyle}>Select variant</div>
              {variantOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="menuitem"
                  style={
                    option.isSelected
                      ? disabledContextMenuButtonStyle
                      : contextMenuButtonStyle
                  }
                  onClick={() => {
                    if (option.isSelected) {
                      return;
                    }

                    onSelectVariant(option.id);
                    setContextMenu(null);
                  }}
                  disabled={option.isSelected}
                >
                  <span>
                    {option.continuationText ||
                      option.displayText ||
                      "Current line"}
                  </span>
                  <span style={contextMenuMetaStyle}>
                    {option.isMainLine ? "Main line" : "Sideline"}
                    {option.isSelected ? " - Selected" : ""}
                  </span>
                </button>
              ))}
              <div style={contextMenuDividerStyle} />
            </>
          )}
          <button
            type="button"
            role="menuitem"
            style={
              contextMenu.moveEntry.nodeId === lastMoveNodeId
                ? disabledContextMenuButtonStyle
                : contextMenuButtonStyle
            }
            onClick={() => {
              if (contextMenu.moveEntry.nodeId === lastMoveNodeId) {
                return;
              }

              onRevertMovesUntil(contextMenu.moveEntry.nodeId);
              setContextMenu(null);
            }}
            disabled={contextMenu.moveEntry.nodeId === lastMoveNodeId}
          >
            Revert moves until here
          </button>
        </div>
      )}
    </div>
  );
}

export default MoveHistory;
