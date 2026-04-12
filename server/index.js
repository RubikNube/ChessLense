const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const { HttpError } = require("./httpError");
const { getGame: getLichessGame, searchGames: searchLichessGames } = require("./lichess");
const { getGame: getOtbGame, searchGames: searchOtbGames } = require("./otb");

const app = express();
const PORT = 3001;
const STOCKFISH_PATH = process.env.STOCKFISH_PATH || "stockfish";

app.use(cors());
app.use(express.json());

function sendApiError(res, error) {
	if (error instanceof HttpError) {
		return res.status(error.status).json({
			error: error.code,
			details: error.message,
		});
	}

	return res.status(500).json({
		error: "internal_error",
		details: error.message,
	});
}

function waitForLine(stream, matcher, timeoutMs = 5000) {
	return new Promise((resolve, reject) => {
		let buffer = "";

		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error(`Timeout waiting for: ${matcher}`));
		}, timeoutMs);

		function onData(data) {
			buffer += data.toString();
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const rawLine of lines) {
				const line = rawLine.trim();
				if (typeof matcher === "string" ? line.includes(matcher) : matcher(line)) {
					cleanup();
					resolve(line);
					return;
				}
			}
		}

		function cleanup() {
			clearTimeout(timeout);
			stream.off("data", onData);
		}

		stream.on("data", onData);
	});
}

function normalizeMultiPv(value) {
	const parsedValue = Number.parseInt(value, 10);

	if (!Number.isInteger(parsedValue) || parsedValue < 1) {
		return 1;
	}

	return Math.min(parsedValue, 3);
}

function parseEvaluationFromInfoLine(line) {
	const mateMatch = line.match(/\bscore mate (-?\d+)/);
	if (mateMatch) {
		return { type: "mate", value: Number(mateMatch[1]) };
	}

	const cpMatch = line.match(/\bscore cp (-?\d+)/);
	if (cpMatch) {
		return { type: "cp", value: Number(cpMatch[1]) };
	}

	return null;
}

function parsePrincipalVariations(output, requestedMultiPv) {
	const variationByIndex = new Map();
	const infoLines = output
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.startsWith("info"));

	infoLines.forEach((line) => {
		const evaluation = parseEvaluationFromInfoLine(line);
		const pvMatch = line.match(/\bpv\s+(.+)$/);

		if (!evaluation || !pvMatch) {
			return;
		}

		const multiPvMatch = line.match(/\bmultipv\s+(\d+)/);
		const multiPvIndex = multiPvMatch ? Number(multiPvMatch[1]) : 1;

		if (multiPvIndex < 1 || multiPvIndex > requestedMultiPv) {
			return;
		}

		const moves = pvMatch[1].trim().split(/\s+/).filter(Boolean);

		if (!moves.length) {
			return;
		}

		variationByIndex.set(multiPvIndex, {
			multipv: multiPvIndex,
			evaluation,
			moves,
			bestmove: moves[0] ?? null,
		});
	});

	return Array.from(variationByIndex.values()).sort((left, right) => left.multipv - right.multipv);
}

app.post("/api/analyze", async (req, res) => {
	const { fen, depth = 12, multipv = 1 } = req.body || {};
	const requestedMultiPv = normalizeMultiPv(multipv);

	if (!fen) {
		return res.status(400).json({ error: "fen is required" });
	}

	const engine = spawn(STOCKFISH_PATH, [], { stdio: "pipe" });

	let stderr = "";
	engine.stderr.on("data", (data) => {
		stderr += data.toString();
	});

	const output = [];
	engine.stdout.on("data", (data) => {
		output.push(data.toString());
	});

	function send(cmd) {
		engine.stdin.write(`${cmd}\n`);
	}

	try {
		send("uci");
		await waitForLine(engine.stdout, "uciok");

		send(`setoption name MultiPV value ${requestedMultiPv}`);
		send("isready");
		await waitForLine(engine.stdout, "readyok");

		send(`position fen ${fen}`);
		send(`go depth ${depth}`);

		const bestMoveLine = await waitForLine(engine.stdout, (line) => line.startsWith("bestmove"), 15000);
		const combined = output.join("");

		const bestMoveMatch = bestMoveLine.match(/^bestmove\s+(\S+)/);
		const bestmove = bestMoveMatch ? bestMoveMatch[1] : null;
		const principalVariations = parsePrincipalVariations(combined, requestedMultiPv);
		const evaluation = principalVariations[0]?.evaluation ?? null;

		send("quit");
		engine.kill();

		return res.json({
			fen,
			bestmove,
			evaluation,
			principalVariations,
		});
	} catch (error) {
		engine.kill();
		return res.status(500).json({
			error: "engine_failed",
			details: error.message,
			stderr,
		});
	}
});

app.get("/api/lichess/games", async (req, res) => {
	try {
		const { search, games } = await searchLichessGames(req.query || {});

		return res.json({
			search,
			games,
		});
	} catch (error) {
		return sendApiError(res, error);
	}
});

app.get("/api/lichess/games/:gameId", async (req, res) => {
	try {
		const game = await getLichessGame(req.params.gameId);

		return res.json(game);
	} catch (error) {
		return sendApiError(res, error);
	}
});

app.get("/api/otb/games", async (req, res) => {
	try {
		const { search, games } = await searchOtbGames(req.query || {});

		return res.json({
			search,
			games,
		});
	} catch (error) {
		return sendApiError(res, error);
	}
});

app.get("/api/otb/games/:gameId", async (req, res) => {
	try {
		const game = await getOtbGame(req.params.gameId);

		return res.json(game);
	} catch (error) {
		return sendApiError(res, error);
	}
});

app.listen(PORT, () => {
	console.log(`Chess engine server running on http://localhost:${PORT}`);
});
