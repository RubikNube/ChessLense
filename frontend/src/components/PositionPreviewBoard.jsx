import { Chess } from "chess.js";

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
  border: "1px solid rgba(148, 163, 184, 0.35)",
  width: "100%",
  aspectRatio: "1 / 1",
  backgroundColor: "#111827",
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

  return rows.map((row) => (orientation === "black" ? [...row].reverse() : row));
}

function getSquareColor(rowIndex, columnIndex) {
  return (rowIndex + columnIndex) % 2 === 0 ? "#f0d9b5" : "#b58863";
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
      color: "#f9fafb",
      textShadow:
        "0 1px 0 rgba(17, 24, 39, 0.95), 0 -1px 0 rgba(17, 24, 39, 0.95), 1px 0 0 rgba(17, 24, 39, 0.95), -1px 0 0 rgba(17, 24, 39, 0.95), 0 0 4px rgba(17, 24, 39, 0.45)",
      WebkitTextStroke: "0.35px rgba(17, 24, 39, 0.9)",
    };
  }

  return {
    color: "#111827",
    textShadow:
      "0 1px 0 rgba(255, 255, 255, 0.55), 0 0 3px rgba(255, 255, 255, 0.2)",
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
