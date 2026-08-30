import { Chess } from "chess.js";
import {
  TRAINING_COMPUTER_PLAY_SOURCE_INITIAL,
  TRAINING_SIDE_BLACK,
  TRAINING_SIDE_WHITE,
} from "./training.js";

export function wait(delayMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

export function getPgnHeaderValue(importedPgnData, headerName) {
  if (!importedPgnData?.headers?.length || typeof headerName !== "string") {
    return "";
  }

  const matchingHeader = importedPgnData.headers.find(
    ({ name }) =>
      typeof name === "string" &&
      name.toLowerCase() === headerName.toLowerCase(),
  );

  return typeof matchingHeader?.value === "string"
    ? matchingHeader.value.trim()
    : "";
}

export function getCurrentMoveLabel(moveHistory) {
  if (!Array.isArray(moveHistory) || moveHistory.length === 0) {
    return "Game introduction";
  }

  const lastMove = moveHistory[moveHistory.length - 1];
  const moveNumber = Math.floor((moveHistory.length - 1) / 2) + 1;
  const isBlackMove = moveHistory.length % 2 === 0;

  return isBlackMove
    ? `${moveNumber}... ${lastMove}`
    : `${moveNumber}. ${lastMove}`;
}

export function buildPositionCommentContext(fen, moveHistory) {
  const normalizedMoveHistory = Array.isArray(moveHistory) ? moveHistory : [];
  const ply = normalizedMoveHistory.length;

  if (ply === 0) {
    return { fen, ply: 0, moveNumber: 0, side: null, san: null };
  }

  return {
    fen,
    ply,
    moveNumber: Math.floor((ply - 1) / 2) + 1,
    side: ply % 2 === 0 ? "black" : "white",
    san: normalizedMoveHistory[ply - 1] ?? null,
  };
}

export function parseUciMove(uciMove) {
  if (typeof uciMove !== "string") {
    return null;
  }

  const match = uciMove.trim().match(/^([a-h][1-8])([a-h][1-8])([nbrq])?$/i);
  if (!match) {
    return null;
  }

  return {
    from: match[1].toLowerCase(),
    to: match[2].toLowerCase(),
    ...(match[3] ? { promotion: match[3].toLowerCase() } : {}),
  };
}

export function formatMoveAsUci(move) {
  if (!move || typeof move !== "object") {
    return "";
  }
  return `${move.from ?? ""}${move.to ?? ""}${move.promotion ?? ""}`;
}

export function buildEngineVariantPreview(fen, uciMoves) {
  const previewGame = new Chess(fen);
  const moveObjects = [];
  const sanMoves = [];
  const formattedMoves = [];
  let previousMoveSide = null;

  for (const uciMove of Array.isArray(uciMoves) ? uciMoves : []) {
    const parsedMove = parseUciMove(uciMove);
    if (!parsedMove) break;

    const moveNumber = previewGame.moveNumber();
    const movingSide = previewGame.turn();
    let appliedMove = null;
    try {
      appliedMove = previewGame.move(parsedMove);
    } catch {
      break;
    }
    if (!appliedMove) break;

    moveObjects.push(parsedMove);
    sanMoves.push(appliedMove.san);
    formattedMoves.push(
      movingSide === "w"
        ? `${moveNumber}. ${appliedMove.san}`
        : previousMoveSide === "w"
          ? appliedMove.san
          : `${moveNumber}... ${appliedMove.san}`,
    );
    previousMoveSide = movingSide;
  }

  return { moveObjects, sanMoves, displayText: formattedMoves.join(" ") };
}

export function formatUciMoveAsSan(fen, uciMove) {
  return (
    buildEngineVariantPreview(fen, [uciMove]).sanMoves[0] ?? uciMove ?? "n/a"
  );
}

export function getTrainingSideForTurn(turn) {
  return turn === "b" ? TRAINING_SIDE_BLACK : TRAINING_SIDE_WHITE;
}

export function getComputerPlaySourceLabel(startFrom) {
  return startFrom === TRAINING_COMPUTER_PLAY_SOURCE_INITIAL
    ? "initial position"
    : "current position";
}

export function getComputerPlayOutcomeText(game, playerSide) {
  if (!(game instanceof Chess) || !game.isGameOver()) return "";
  if (game.isCheckmate()) {
    const winnerSide =
      game.turn() === "w" ? TRAINING_SIDE_BLACK : TRAINING_SIDE_WHITE;
    return winnerSide === playerSide
      ? "You won by checkmate."
      : "Computer won by checkmate.";
  }
  if (game.isStalemate()) return "Draw by stalemate.";
  if (game.isThreefoldRepetition()) return "Draw by repetition.";
  if (game.isInsufficientMaterial()) return "Draw by insufficient material.";
  if (game.isDraw()) return "Game drawn.";
  return "Game over.";
}

export function getLastMoveFromGame(game) {
  if (!(game instanceof Chess)) return null;
  const verboseHistory = game.history({ verbose: true });
  return verboseHistory.at(-1) ?? null;
}
