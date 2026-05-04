import { Chess, DEFAULT_POSITION } from "chess.js";
import { parse } from "chess.js/src/pgn.js";
import { createEmptyVariantTree, createVariantTreeFromParsedPgn } from "./variantTree.js";

const HEADER_PATTERN = /\[\s*([A-Za-z0-9_]+)\s+"((?:\\.|[^"\\])*)"\s*\]/g;

function unescapePgnHeaderValue(value) {
  return value.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function extractHeaderEntries(rawPgn) {
  const headers = [];

  for (const match of rawPgn.matchAll(HEADER_PATTERN)) {
    headers.push({
      name: match[1],
      value: unescapePgnHeaderValue(match[2]),
    });
  }

  return headers;
}

function scanPgnText(rawPgn) {
  const comments = [];
  const variationSnippets = [];
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;
  let insideQuotedHeaderValue = false;
  let commentStart = -1;
  let variationStart = -1;
  let commentInVariation = false;

  for (let index = 0; index < rawPgn.length; index += 1) {
    const character = rawPgn[index];
    const previousCharacter = index > 0 ? rawPgn[index - 1] : "";

    if (braceDepth > 0) {
      if (character === "}") {
        const text = rawPgn.slice(commentStart, index).trim();

        if (text) {
          comments.push({
            text,
            inVariation: commentInVariation,
          });
        }

        braceDepth = 0;
        commentStart = -1;
      }

      continue;
    }

    if (bracketDepth > 0) {
      if (character === '"' && previousCharacter !== "\\") {
        insideQuotedHeaderValue = !insideQuotedHeaderValue;
      } else if (character === "]" && !insideQuotedHeaderValue) {
        bracketDepth = 0;
      }

      continue;
    }

    if (character === "[") {
      bracketDepth = 1;
      insideQuotedHeaderValue = false;
      continue;
    }

    if (character === "{") {
      braceDepth = 1;
      commentStart = index + 1;
      commentInVariation = parenDepth > 0;
      continue;
    }

    if (character === "(") {
      if (parenDepth === 0) {
        variationStart = index + 1;
      }

      parenDepth += 1;
      continue;
    }

    if (character === ")" && parenDepth > 0) {
      parenDepth -= 1;

      if (parenDepth === 0 && variationStart !== -1) {
        const text = rawPgn.slice(variationStart, index).trim();

        if (text) {
          variationSnippets.push(text);
        }

        variationStart = -1;
      }
    }
  }

  return {
    comments,
    variationSnippets,
  };
}

function getInitialFenFromGame(game) {
  if (!(game instanceof Chess)) {
    return DEFAULT_POSITION;
  }

  if (!game.history().length) {
    return game.fen();
  }

  const replay = new Chess();

  replay.loadPgn(game.pgn());

  while (replay.undo()) {
    // Walk back to the imported starting position, including custom FEN setups.
  }

  return replay.fen();
}

function buildCommentContextMap(game) {
  const contextMap = new Map();
  const replay = new Chess(getInitialFenFromGame(game));
  contextMap.set(replay.fen(), {
    ply: 0,
    moveNumber: 0,
    side: null,
    san: null,
  });

  const moves = game.history({ verbose: true });

  moves.forEach((move, index) => {
    replay.move(move);
    contextMap.set(replay.fen(), {
      ply: index + 1,
      moveNumber: Math.floor(index / 2) + 1,
      side: index % 2 === 0 ? "white" : "black",
      san: move.san,
    });
  });

  return contextMap;
}

function buildMainlineComments(game) {
  if (typeof game.getComments !== "function") {
    return [];
  }

  const contextMap = buildCommentContextMap(game);

  return game.getComments().map(({ fen, comment }) => {
    const context = contextMap.get(fen) ?? {
      ply: null,
      moveNumber: null,
      side: null,
      san: null,
    };

    return {
      fen,
      comment,
      ply: context.ply,
      moveNumber: context.moveNumber,
      side: context.side,
      san: context.san,
    };
  });
}

function sanitizeMovetextToken(token) {
  if (!token) {
    return token;
  }

  if (/^\$\d+$/.test(token)) {
    return "";
  }

  return token.replace(/(?:\?\?|\?!|!\?|!!|[!?])+$/g, "");
}

function sanitizePgnForChessJs(rawPgn) {
  let sanitized = "";
  let tokenBuffer = "";
  let braceDepth = 0;
  let bracketDepth = 0;
  let insideQuotedHeaderValue = false;

  function flushToken() {
    if (!tokenBuffer) {
      return;
    }

    sanitized += sanitizeMovetextToken(tokenBuffer);
    tokenBuffer = "";
  }

  for (let index = 0; index < rawPgn.length; index += 1) {
    const character = rawPgn[index];
    const previousCharacter = index > 0 ? rawPgn[index - 1] : "";

    if (braceDepth > 0) {
      sanitized += character;

      if (character === "}") {
        braceDepth = 0;
      }

      continue;
    }

    if (bracketDepth > 0) {
      sanitized += character;

      if (character === '"' && previousCharacter !== "\\") {
        insideQuotedHeaderValue = !insideQuotedHeaderValue;
      } else if (character === "]" && !insideQuotedHeaderValue) {
        bracketDepth = 0;
      }

      continue;
    }

    if (character === "{") {
      flushToken();
      braceDepth = 1;
      sanitized += character;
      continue;
    }

    if (character === "[") {
      flushToken();
      bracketDepth = 1;
      insideQuotedHeaderValue = false;
      sanitized += character;
      continue;
    }

    if (/\s/.test(character) || character === "(" || character === ")") {
      flushToken();
      sanitized += character;
      continue;
    }

    tokenBuffer += character;
  }

  flushToken();

  return sanitized.replace(/\}\s+\{/g, "\n");
}

function normalizeHeaderEntry(entry) {
  if (
    !entry ||
    typeof entry !== "object" ||
    typeof entry.name !== "string" ||
    !entry.name.trim() ||
    typeof entry.value !== "string"
  ) {
    return null;
  }

  return {
    name: entry.name.trim(),
    value: entry.value,
  };
}

function normalizeMainlineComment(entry) {
  if (
    !entry ||
    typeof entry !== "object" ||
    typeof entry.comment !== "string" ||
    !entry.comment.trim()
  ) {
    return null;
  }

  const ply =
    Number.isInteger(entry.ply) && entry.ply >= 0 ? entry.ply : null;
  const moveNumber =
    Number.isInteger(entry.moveNumber) && entry.moveNumber >= 0
      ? entry.moveNumber
      : null;
  const side =
    entry.side === "white" || entry.side === "black" ? entry.side : null;
  const san = typeof entry.san === "string" && entry.san.trim() ? entry.san : null;
  const fen = typeof entry.fen === "string" && entry.fen.trim() ? entry.fen : null;

  return {
    comment: entry.comment.trim(),
    fen,
    ply,
    moveNumber,
    side,
    san,
  };
}

function normalizeAdditionalComment(entry) {
  if (
    !entry ||
    typeof entry !== "object" ||
    typeof entry.text !== "string" ||
    !entry.text.trim()
  ) {
    return null;
  }

  return {
    text: entry.text.trim(),
    inVariation: entry.inVariation === true,
  };
}

export function normalizeImportedPgnData(data) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const headers = Array.isArray(data.headers)
    ? data.headers.map(normalizeHeaderEntry).filter(Boolean)
    : [];
  const mainlineComments = Array.isArray(data.mainlineComments)
    ? data.mainlineComments.map(normalizeMainlineComment).filter(Boolean)
    : [];
  const additionalComments = Array.isArray(data.additionalComments)
    ? data.additionalComments.map(normalizeAdditionalComment).filter(Boolean)
    : [];
  const variationSnippets = Array.isArray(data.variationSnippets)
    ? data.variationSnippets.filter(
        (snippet) => typeof snippet === "string" && snippet.trim().length > 0,
      )
    : [];
  const rawPgn = typeof data.rawPgn === "string" ? data.rawPgn : "";

  if (
    !rawPgn &&
    !headers.length &&
    !mainlineComments.length &&
    !additionalComments.length &&
    !variationSnippets.length
  ) {
    return null;
  }

  return {
    rawPgn,
    headers,
    mainlineComments,
    additionalComments,
    variationSnippets,
  };
}

export function parseAnnotatedPgn(pgn, options = {}) {
  const { allowEmpty = true } = options;

  if (typeof pgn !== "string" || !pgn.trim()) {
    return allowEmpty
      ? {
          game: new Chess(),
          importedPgnData: null,
          variantTree: createEmptyVariantTree(),
          error: null,
        }
      : {
          game: null,
          importedPgnData: null,
          variantTree: null,
          error: "Paste a PGN to import.",
        };
  }

  const trimmedPgn = pgn.trim();
  const game = new Chess();

  try {
    const sanitizedPgn = sanitizePgnForChessJs(trimmedPgn);
    const parsedPgn = parse(sanitizedPgn);
    const didLoad = game.loadPgn(sanitizedPgn);

    if (didLoad === false) {
      return {
        game: null,
        importedPgnData: null,
        variantTree: null,
        error: "Invalid PGN. Please check the notation and try again.",
      };
    }

    const headerEntries = extractHeaderEntries(trimmedPgn);
    const { comments: rawComments, variationSnippets } = scanPgnText(trimmedPgn);
    const mainlineComments = buildMainlineComments(game);
    const additionalComments = rawComments.filter(
      ({ text, inVariation }) =>
        inVariation ||
        !mainlineComments.some((commentEntry) =>
          commentEntry.comment.includes(text),
        ),
    );

    return {
      game,
      importedPgnData: normalizeImportedPgnData({
        rawPgn: trimmedPgn,
        headers: headerEntries,
        mainlineComments,
        additionalComments,
        variationSnippets,
      }),
      variantTree: createVariantTreeFromParsedPgn(parsedPgn),
      error: null,
    };
  } catch {
    return {
      game: null,
      importedPgnData: null,
      variantTree: null,
      error: "Invalid PGN. Please check the notation and try again.",
    };
  }
}
