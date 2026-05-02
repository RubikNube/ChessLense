export const BOARD_SOUND_EVENT_MOVE = "move";
export const BOARD_SOUND_EVENT_CAPTURE = "capture";
export const BOARD_SOUND_EVENT_CHECK = "check";
export const BOARD_SOUND_EVENT_GAME_END = "game-end";

export function getBoardSoundEvent(move, game) {
  if (
    !move ||
    typeof move !== "object" ||
    !game ||
    typeof game.isCheck !== "function" ||
    typeof game.isGameOver !== "function"
  ) {
    return null;
  }

  if (game.isGameOver()) {
    return BOARD_SOUND_EVENT_GAME_END;
  }

  if (game.isCheck()) {
    return BOARD_SOUND_EVENT_CHECK;
  }

  if (move.captured) {
    return BOARD_SOUND_EVENT_CAPTURE;
  }

  return BOARD_SOUND_EVENT_MOVE;
}
