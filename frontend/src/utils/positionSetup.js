import { Chess } from "chess.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];
const VALID_SQUARE_PATTERN = /^[a-h][1-8]$/;
const VALID_PIECE_TYPE_PATTERN = /^[wb][KQRBNP]$/;
const INVALID_FEN_PREFIX = "Invalid FEN: ";

export const POSITION_SETUP_CLEAR_TOOL = "clear";
export const POSITION_SETUP_MOVE_TOOL = "move";
export const DEFAULT_POSITION_SETUP_TOOL = "wP";
export const DEFAULT_POSITION_SETUP_CASTLING_RIGHTS = {
  whiteKingside: false,
  whiteQueenside: false,
  blackKingside: false,
  blackQueenside: false,
};
export const POSITION_SETUP_PIECE_OPTIONS = [
  { pieceType: "wK", color: "white", label: "King" },
  { pieceType: "wQ", color: "white", label: "Queen" },
  { pieceType: "wR", color: "white", label: "Rook" },
  { pieceType: "wB", color: "white", label: "Bishop" },
  { pieceType: "wN", color: "white", label: "Knight" },
  { pieceType: "wP", color: "white", label: "Pawn" },
  { pieceType: "bK", color: "black", label: "King" },
  { pieceType: "bQ", color: "black", label: "Queen" },
  { pieceType: "bR", color: "black", label: "Rook" },
  { pieceType: "bB", color: "black", label: "Bishop" },
  { pieceType: "bN", color: "black", label: "Knight" },
  { pieceType: "bP", color: "black", label: "Pawn" },
];

function normalizeCastlingRights(castlingRights) {
  return {
    whiteKingside: !!castlingRights?.whiteKingside,
    whiteQueenside: !!castlingRights?.whiteQueenside,
    blackKingside: !!castlingRights?.blackKingside,
    blackQueenside: !!castlingRights?.blackQueenside,
  };
}

function normalizeActiveColor(activeColor) {
  return activeColor === "black" ? "black" : "white";
}

function convertFenCharToPieceType(pieceChar) {
  return pieceChar === pieceChar.toUpperCase()
    ? `w${pieceChar}`
    : `b${pieceChar.toUpperCase()}`;
}

function convertPieceTypeToFenChar(pieceType) {
  const code = pieceType[1];
  return pieceType[0] === "w" ? code : code.toLowerCase();
}

function isValidSquare(square) {
  return typeof square === "string" && VALID_SQUARE_PATTERN.test(square);
}

function isValidPieceType(pieceType) {
  return typeof pieceType === "string" && VALID_PIECE_TYPE_PATTERN.test(pieceType);
}

function parseFenPlacement(placement) {
  const position = {};
  const fenRanks = typeof placement === "string" ? placement.split("/") : [];

  if (fenRanks.length !== 8) {
    return position;
  }

  fenRanks.forEach((fenRank, rankIndex) => {
    let fileIndex = 0;

    for (const token of fenRank) {
      const emptySquareCount = Number.parseInt(token, 10);

      if (Number.isInteger(emptySquareCount)) {
        fileIndex += emptySquareCount;
        continue;
      }

      if (fileIndex >= FILES.length) {
        break;
      }

      position[`${FILES[fileIndex]}${RANKS[rankIndex]}`] = {
        pieceType: convertFenCharToPieceType(token),
      };
      fileIndex += 1;
    }
  });

  return position;
}

function buildFenPlacement(position) {
  return RANKS.map((rank) => {
    let row = "";
    let emptySquareCount = 0;

    FILES.forEach((file) => {
      const square = `${file}${rank}`;
      const pieceType = position[square]?.pieceType ?? null;

      if (!pieceType) {
        emptySquareCount += 1;
        return;
      }

      if (emptySquareCount > 0) {
        row += `${emptySquareCount}`;
        emptySquareCount = 0;
      }

      row += convertPieceTypeToFenChar(pieceType);
    });

    if (emptySquareCount > 0) {
      row += `${emptySquareCount}`;
    }

    return row;
  }).join("/");
}

function parseCastlingRights(castlingField) {
  if (typeof castlingField !== "string" || castlingField === "-") {
    return { ...DEFAULT_POSITION_SETUP_CASTLING_RIGHTS };
  }

  return {
    whiteKingside: castlingField.includes("K"),
    whiteQueenside: castlingField.includes("Q"),
    blackKingside: castlingField.includes("k"),
    blackQueenside: castlingField.includes("q"),
  };
}

function buildCastlingRights(castlingRights) {
  const normalizedCastlingRights = normalizeCastlingRights(castlingRights);
  const castlingText = [
    normalizedCastlingRights.whiteKingside ? "K" : "",
    normalizedCastlingRights.whiteQueenside ? "Q" : "",
    normalizedCastlingRights.blackKingside ? "k" : "",
    normalizedCastlingRights.blackQueenside ? "q" : "",
  ].join("");

  return castlingText || "-";
}

function normalizeValidationError(error) {
  const message = error instanceof Error ? error.message : "Invalid position setup.";

  if (message.startsWith(INVALID_FEN_PREFIX)) {
    return `Cannot finish setup: ${message.slice(INVALID_FEN_PREFIX.length)}.`;
  }

  return "Cannot finish setup: invalid position.";
}

export function createPositionSetupDraft(fen) {
  const [placement = "", activeColor = "w", castlingField = "-"] =
    typeof fen === "string" ? fen.trim().split(/\s+/) : [];

  return {
    initialFen: typeof fen === "string" && fen.trim() ? fen.trim() : new Chess().fen(),
    position: parseFenPlacement(placement),
    activeColor: activeColor === "b" ? "black" : "white",
    castlingRights: parseCastlingRights(castlingField),
    selectedTool: DEFAULT_POSITION_SETUP_TOOL,
  };
}

export function applyPositionSetupTool(position, square, selectedTool) {
  if (!isValidSquare(square)) {
    return position ?? {};
  }

  const nextPosition = { ...(position ?? {}) };

  if (selectedTool === POSITION_SETUP_CLEAR_TOOL) {
    delete nextPosition[square];
    return nextPosition;
  }

  if (!isValidPieceType(selectedTool)) {
    return nextPosition;
  }

  nextPosition[square] = { pieceType: selectedTool };
  return nextPosition;
}

export function movePositionSetupPiece(position, sourceSquare, targetSquare) {
  if (!isValidSquare(sourceSquare) || !isValidSquare(targetSquare)) {
    return position ?? {};
  }

  const sourcePiece = position?.[sourceSquare];

  if (!sourcePiece?.pieceType || !isValidPieceType(sourcePiece.pieceType)) {
    return position ?? {};
  }

  const nextPosition = { ...(position ?? {}) };
  delete nextPosition[sourceSquare];
  nextPosition[targetSquare] = {
    pieceType: sourcePiece.pieceType,
  };
  return nextPosition;
}

export function buildPositionSetupFen(position, activeColor, castlingRights) {
  const normalizedPosition = {};

  for (const [square, piece] of Object.entries(position ?? {})) {
    if (!isValidSquare(square) || !isValidPieceType(piece?.pieceType)) {
      return {
        fen: "",
        error: "Cannot finish setup: invalid board data.",
      };
    }

    normalizedPosition[square] = {
      pieceType: piece.pieceType,
    };
  }

  const fen = `${buildFenPlacement(normalizedPosition)} ${
    normalizeActiveColor(activeColor) === "black" ? "b" : "w"
  } ${buildCastlingRights(castlingRights)} - 0 1`;

  try {
    const game = new Chess(fen);
    return {
      fen: game.fen(),
      error: "",
    };
  } catch (error) {
    return {
      fen: "",
      error: normalizeValidationError(error),
    };
  }
}
