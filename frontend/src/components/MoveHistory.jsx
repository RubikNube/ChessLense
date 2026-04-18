import { useEffect, useMemo, useRef, useState } from "react";

const actionRowStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "0.75rem",
  marginTop: "1rem",
  flexWrap: "wrap",
};

const actionButtonStyle = {
  padding: "0.6rem 1rem",
  border: "1px solid #d0d7de",
  borderRadius: "0.5rem",
  backgroundColor: "#f6f8fa",
  color: "#24292f",
  fontWeight: 600,
  fontSize: "1rem",
  lineHeight: 1,
  minWidth: "2.75rem",
  cursor: "pointer",
  transition: "background-color 0.2s ease, transform 0.2s ease",
};

const disabledActionButtonStyle = {
  backgroundColor: "#eaeef2",
  color: "#8c959f",
  borderColor: "#d8dee4",
  cursor: "not-allowed",
  opacity: 0.75,
};

const contextMenuStyle = {
  position: "fixed",
  zIndex: 1100,
  minWidth: "13rem",
  padding: "0.35rem",
  border: "1px solid #d0d7de",
  borderRadius: "0.65rem",
  backgroundColor: "#ffffff",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.16)",
};

const contextMenuButtonStyle = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  border: "none",
  borderRadius: "0.45rem",
  backgroundColor: "transparent",
  color: "#111827",
  textAlign: "left",
  fontWeight: 600,
  cursor: "pointer",
};

const disabledContextMenuButtonStyle = {
  ...contextMenuButtonStyle,
  color: "#9ca3af",
  cursor: "not-allowed",
};

const contextMenuSectionTitleStyle = {
  padding: "0.35rem 0.75rem 0.25rem",
  color: "#6b7280",
  fontSize: "0.78rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const contextMenuDividerStyle = {
  height: "1px",
  margin: "0.35rem 0",
  backgroundColor: "#e5e7eb",
};

const contextMenuMetaStyle = {
  display: "block",
  marginTop: "0.15rem",
  color: "#6b7280",
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
  const [contextMenu, setContextMenu] = useState(null);
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

  const lastMoveNodeId = moveHistoryItems[moveHistoryItems.length - 1]?.nodeId ?? null;
  const variantOptions = contextMenu ? getVariantOptionsForMove(contextMenu.moveEntry.nodeId) : [];
  const shouldShowVariantOptions =
    variantOptions.length > 1 || variantOptions.some((option) => !option.isSelected);

  function openContextMenu(event, moveEntry) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      moveEntry,
    });
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
        {!groupedMoveHistory.length && <p className="annotation-empty">No moves yet.</p>}
        {!!groupedMoveHistory.length && (
          <ol className="move-history" ref={moveHistoryRef}>
            {groupedMoveHistory.map(
              ({ moveNumber, white, whiteIndex, black, blackIndex }) => (
                <li key={`${moveNumber}-${white?.nodeId ?? black?.nodeId ?? "row"}`} className="move-row">
                  <span className="move-number">{moveNumber}.</span>
                  {white ? (
                    <button
                      type="button"
                      ref={whiteIndex === currentMoveIndex ? selectedMoveRef : null}
                      className={`move-entry move-entry-button${whiteIndex === currentMoveIndex ? " move-entry-selected" : ""}`}
                      onClick={() => onSelectMove(white.nodeId)}
                      onContextMenu={(event) => openContextMenu(event, white)}
                    >
                      <span>{white.san}</span>
                      {(white.hasVariants || white.hasComments) && (
                        <span className="move-entry-indicators" aria-hidden="true">
                          {white.hasVariants && <span className="move-entry-indicator">V</span>}
                          {white.hasComments && <span className="move-entry-indicator">C</span>}
                        </span>
                      )}
                    </button>
                  ) : (
                    <span className="move-entry move-entry-placeholder">...</span>
                  )}
                  {black ? (
                    <button
                      type="button"
                      ref={blackIndex === currentMoveIndex ? selectedMoveRef : null}
                      className={`move-entry move-entry-button${blackIndex === currentMoveIndex ? " move-entry-selected" : ""}`}
                      onClick={() => onSelectMove(black.nodeId)}
                      onContextMenu={(event) => openContextMenu(event, black)}
                    >
                      <span>{black.san}</span>
                      {(black.hasVariants || black.hasComments) && (
                        <span className="move-entry-indicators" aria-hidden="true">
                          {black.hasVariants && <span className="move-entry-indicator">V</span>}
                          {black.hasComments && <span className="move-entry-indicator">C</span>}
                        </span>
                      )}
                    </button>
                  ) : (
                    <span className="move-entry move-entry-placeholder">...</span>
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
          style={{ ...actionButtonStyle, ...(!canUndo ? disabledActionButtonStyle : {}) }}
        >
          ⏮
        </button>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo"
          style={{ ...actionButtonStyle, ...(!canUndo ? disabledActionButtonStyle : {}) }}
        >
          ◀
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo"
          style={{ ...actionButtonStyle, ...(!canRedo ? disabledActionButtonStyle : {}) }}
        >
          ▶
        </button>
        <button
          type="button"
          onClick={onGoToEnd}
          disabled={!canRedo}
          aria-label="Go to end"
          title="Go to end"
          style={{ ...actionButtonStyle, ...(!canRedo ? disabledActionButtonStyle : {}) }}
        >
          ⏭
        </button>
      </div>
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
                  style={option.isSelected ? disabledContextMenuButtonStyle : contextMenuButtonStyle}
                  onClick={() => {
                    if (option.isSelected) {
                      return;
                    }

                    onSelectVariant(option.id);
                    setContextMenu(null);
                  }}
                  disabled={option.isSelected}
                >
                  <span>{option.continuationText || option.displayText || "Current line"}</span>
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
