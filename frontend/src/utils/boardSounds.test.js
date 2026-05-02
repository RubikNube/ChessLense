import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  BOARD_SOUND_EVENT_CAPTURE,
  BOARD_SOUND_EVENT_CHECK,
  BOARD_SOUND_EVENT_GAME_END,
  BOARD_SOUND_EVENT_MOVE,
  getBoardSoundEvent,
} from "./boardSounds.js";

function applyMoveSequence(moves) {
  const game = new Chess();
  let appliedMove = null;

  for (const move of moves) {
    appliedMove = game.move(move);
  }

  return {
    game,
    move: appliedMove,
  };
}

describe("board sounds", () => {
  it("returns the standard move sound for quiet moves", () => {
    const { game, move } = applyMoveSequence(["e4"]);

    expect(getBoardSoundEvent(move, game)).toBe(BOARD_SOUND_EVENT_MOVE);
  });

  it("returns the capture sound for capturing moves", () => {
    const { game, move } = applyMoveSequence(["e4", "d5", "exd5"]);

    expect(getBoardSoundEvent(move, game)).toBe(BOARD_SOUND_EVENT_CAPTURE);
  });

  it("returns the check sound when the move gives check", () => {
    const { game, move } = applyMoveSequence(["e4", "e6", "Bc4", "d5", "exd5", "exd5", "Bb5+"]);

    expect(getBoardSoundEvent(move, game)).toBe(BOARD_SOUND_EVENT_CHECK);
  });

  it("prefers the game-end sound over check or capture", () => {
    const { game, move } = applyMoveSequence(["f3", "e5", "g4", "Qh4#"]);

    expect(getBoardSoundEvent(move, game)).toBe(BOARD_SOUND_EVENT_GAME_END);
  });

  it("returns null when the move context is incomplete", () => {
    expect(getBoardSoundEvent(null, null)).toBeNull();
  });
});
