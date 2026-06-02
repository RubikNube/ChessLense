import { Chess } from "chess.js";
import { THEME_CSS_VARS } from "../utils/theme.js";

const PIECE_SYMBOLS = {
  wp: "\u2659",
  wn: "\u2658",
  wb: "\u2657",
  wr: "\u2656",
  wq: "\u2655",
  wk: "\u2654",
  bp: "\u265F",
  bn: "\u265E",
  bb: "\u265D",
  br: "\u265C",
  bq: "\u265B",
  bk: "\u265A",
};

const boardStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(8, 1fr)",
  gridTemplateRows: "repeat(8, 1fr)",
  borderRadius: "0.5rem",
  overflow: "hidden",
  border: `1px solid ${THEME_CSS_VARS.border}`,
  width: "100%",
  aspectRatio: "1 / 1",
  backgroundColor: THEME_CSS_VARS.surfaceAlt,
};

const squareStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1rem",
  lineHeight: 1,
  userSelect: "none",
  aspectRatio: "1 / 1",
  minHeight: 0,
};

function getOrientedBoardRows(boardRows, orientation) {
  const rows = orientation === "black" ? [...boardRows].reverse() : boardRows;

  return rows.map((row) =>
    orientation === "black" ? [...row].reverse() : row,
  );
}

function getSquareColor(rowIndex, columnIndex) {
  return (rowIndex + columnIndex) % 2 === 0
    ? THEME_CSS_VARS.boardLightSquare
    : THEME_CSS_VARS.boardDarkSquare;
}

function getPieceStyle(square) {
  if (!square) {
    return {
      color: "transparent",
      textShadow: "none",
    };
  }

  if (square.color === "w") {
    return {
      color: THEME_CSS_VARS.boardWhitePiece,
      textShadow: `0 1px 0 ${THEME_CSS_VARS.boardWhitePieceShadowStrong}, 0 -1px 0 ${THEME_CSS_VARS.boardWhitePieceShadowStrong}, 1px 0 0 ${THEME_CSS_VARS.boardWhitePieceShadowStrong}, -1px 0 0 ${THEME_CSS_VARS.boardWhitePieceShadowStrong}, 0 0 4px ${THEME_CSS_VARS.boardWhitePieceShadowSoft}`,
      WebkitTextStroke: `0.35px ${THEME_CSS_VARS.boardWhitePieceStroke}`,
    };
  }

  return {
    color: THEME_CSS_VARS.boardBlackPiece,
    textShadow: `0 1px 0 ${THEME_CSS_VARS.boardBlackPieceShadowStrong}, 0 0 3px ${THEME_CSS_VARS.boardBlackPieceShadowSoft}`,
  };
}

function PositionPreviewBoard({ fen, orientation = "white" }) {
  const game = new Chess(fen);
  const boardRows = getOrientedBoardRows(game.board(), orientation);

  return (
    <div style={boardStyle} aria-hidden="true">
      {boardRows.flatMap((row, rowIndex) =>
        row.map((square, columnIndex) => (
          <div
            key={`${rowIndex}-${columnIndex}`}
            style={{
              ...squareStyle,
              backgroundColor: getSquareColor(rowIndex, columnIndex),
              ...getPieceStyle(square),
            }}
          >
            {square ? PIECE_SYMBOLS[`${square.color}${square.type}`] : ""}
          </div>
        )),
      )}
    </div>
  );
}

export default PositionPreviewBoard;
