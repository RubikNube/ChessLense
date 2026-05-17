import { defaultPieces } from "react-chessboard";
import {
  POSITION_SETUP_CLEAR_TOOL,
  POSITION_SETUP_MOVE_TOOL,
  POSITION_SETUP_PIECE_OPTIONS,
} from "../../utils/positionSetup.js";

const toolSectionStyle = {
  display: "grid",
  gap: "0.75rem",
};

const toolGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "0.5rem",
};

const metaCardStyle = {
  padding: "10px 12px",
  borderRadius: "8px",
  background: "#111827",
};

const castlingGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "0.75rem",
};

const castlingOptionStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "10px 12px",
  borderRadius: "8px",
  background: "#111827",
  color: "#e5e7eb",
};

const pieceButtonContentStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  aspectRatio: "1 / 1",
};

const pieceSvgStyle = {
  width: "2.1rem",
  height: "2.1rem",
};

function EraserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={pieceSvgStyle}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 15.5 12.5 7a2.12 2.12 0 0 1 3 0L20 11.5a2.12 2.12 0 0 1 0 3L14 20H8.5a2 2 0 0 1-1.4-.6L4 16.3a.57.57 0 0 1 0-.8Z" />
      <path d="M13.5 20H20" />
    </svg>
  );
}

function MoveIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={pieceSvgStyle}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v18" />
      <path d="m8 7 4-4 4 4" />
      <path d="m8 17 4 4 4-4" />
      <path d="M3 12h18" />
      <path d="m7 8-4 4 4 4" />
      <path d="m17 8 4 4-4 4" />
    </svg>
  );
}

function PositionSetupPanel({
  panelHeight,
  selectedTool,
  activeColor,
  castlingRights,
  error,
  onSelectTool,
  onSelectActiveColor,
  onToggleCastlingRight,
  onClearBoard,
  onResetPosition,
  onResetToStartPosition,
  onFinish,
  onCancel,
}) {
  const whitePieces = POSITION_SETUP_PIECE_OPTIONS.filter(
    ({ color }) => color === "white",
  );
  const blackPieces = POSITION_SETUP_PIECE_OPTIONS.filter(
    ({ color }) => color === "black",
  );
  const activeColorLabel = activeColor === "black" ? "Black" : "White";

  function renderToolButton({ pieceType, label }) {
    const isSelected = selectedTool === pieceType;
    const PieceSvg = defaultPieces[pieceType];

    return (
      <button
        key={pieceType}
        type="button"
        className={isSelected ? "annotation-primary-button" : "annotation-secondary-button"}
        onClick={() => onSelectTool(pieceType)}
        aria-label={`${label} (${pieceType[0] === "w" ? "white" : "black"})`}
        title={label}
      >
        <span style={pieceButtonContentStyle}>
          <PieceSvg svgStyle={pieceSvgStyle} />
        </span>
      </button>
    );
  }

  return (
    <div
      className="card training-card"
      style={panelHeight ? { height: `${panelHeight}px` } : undefined}
    >
      <div className="card-header">
        <h2>Set Up Position</h2>
        <button
          type="button"
          className="card-close-button"
          onClick={onCancel}
          aria-label="Cancel position setup"
          title="Cancel position setup"
        >
          ×
        </button>
      </div>
      <div className="training-card-body">
        <p className="current-move-label">
          Click to place pieces, right-click to remove them, or use the move action to drag
          any piece onto any square. Finish replaces the current position.
        </p>

        <div style={toolSectionStyle}>
          <div>
            <span className="annotation-label">White pieces</span>
            <div style={toolGridStyle}>{whitePieces.map(renderToolButton)}</div>
          </div>

          <div>
            <span className="annotation-label">Black pieces</span>
            <div style={toolGridStyle}>{blackPieces.map(renderToolButton)}</div>
          </div>

          <div>
            <span className="annotation-label">Square action</span>
            <div style={toolGridStyle}>
              <button
                type="button"
                className={
                  selectedTool === POSITION_SETUP_CLEAR_TOOL
                    ? "annotation-primary-button"
                    : "annotation-secondary-button"
                }
                onClick={() => onSelectTool(POSITION_SETUP_CLEAR_TOOL)}
                aria-label="Clear square"
                title="Clear square"
              >
                <span style={pieceButtonContentStyle}>
                  <EraserIcon />
                </span>
              </button>
              <button
                type="button"
                className={
                  selectedTool === POSITION_SETUP_MOVE_TOOL
                    ? "annotation-primary-button"
                    : "annotation-secondary-button"
                }
                onClick={() => onSelectTool(POSITION_SETUP_MOVE_TOOL)}
                aria-label="Move pieces by drag and drop"
                title="Move pieces by drag and drop"
              >
                <span style={pieceButtonContentStyle}>
                  <MoveIcon />
                </span>
              </button>
            </div>
          </div>

          <div>
            <span className="annotation-label">Side to move</span>
            <div className="annotation-item-actions">
              <button
                type="button"
                className={
                  activeColor === "white"
                    ? "annotation-primary-button"
                    : "annotation-secondary-button"
                }
                onClick={() => onSelectActiveColor("white")}
              >
                White
              </button>
              <button
                type="button"
                className={
                  activeColor === "black"
                    ? "annotation-primary-button"
                    : "annotation-secondary-button"
                }
                onClick={() => onSelectActiveColor("black")}
              >
                Black
              </button>
            </div>
          </div>

          <div>
            <span className="annotation-label">Castling rights</span>
            <div style={castlingGridStyle}>
              <label style={castlingOptionStyle}>
                <input
                  type="checkbox"
                  checked={!!castlingRights?.whiteKingside}
                  onChange={() => onToggleCastlingRight("whiteKingside")}
                />
                White O-O
              </label>
              <label style={castlingOptionStyle}>
                <input
                  type="checkbox"
                  checked={!!castlingRights?.whiteQueenside}
                  onChange={() => onToggleCastlingRight("whiteQueenside")}
                />
                White O-O-O
              </label>
              <label style={castlingOptionStyle}>
                <input
                  type="checkbox"
                  checked={!!castlingRights?.blackKingside}
                  onChange={() => onToggleCastlingRight("blackKingside")}
                />
                Black O-O
              </label>
              <label style={castlingOptionStyle}>
                <input
                  type="checkbox"
                  checked={!!castlingRights?.blackQueenside}
                  onChange={() => onToggleCastlingRight("blackQueenside")}
                />
                Black O-O-O
              </label>
            </div>
          </div>

          <div style={metaCardStyle}>
            <span className="annotation-label">Finish behavior</span>
            <p className="annotation-empty">
              Side to move stays <strong>{activeColorLabel}</strong>. Castling follows the
              checked boxes and en passant is cleared.
            </p>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <div style={{ marginTop: "auto", paddingTop: "16px" }} className="annotation-item-actions">
          <button
            type="button"
            className="annotation-secondary-button"
            onClick={onClearBoard}
          >
            Clear board
          </button>
          <button
            type="button"
            className="annotation-secondary-button"
            onClick={onResetPosition}
          >
            Reset position
          </button>
          <button
            type="button"
            className="annotation-secondary-button"
            onClick={onResetToStartPosition}
          >
            Reset to start position
          </button>
          <button
            type="button"
            className="annotation-secondary-button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="annotation-primary-button"
            onClick={onFinish}
          >
            Finish setup
          </button>
        </div>
      </div>
    </div>
  );
}

export default PositionSetupPanel;
