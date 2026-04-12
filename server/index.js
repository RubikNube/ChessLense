const express = require("express");
const cors = require("cors");
const {
	analyzePosition,
	getComparableEvaluationScore,
	normalizeMultiPv,
} = require("./engine");
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

app.post("/api/analyze", async (req, res) => {
	const { fen, depth = 12, multipv = 1 } = req.body || {};
	const requestedMultiPv = normalizeMultiPv(multipv);

	if (!fen) {
		return res.status(400).json({ error: "fen is required" });
	}

	try {
		const analysis = await analyzePosition({
			stockfishPath: STOCKFISH_PATH,
			fen,
			depth,
			multipv: requestedMultiPv,
		});

		return res.json({
			fen: analysis.fen,
			bestmove: analysis.bestmove,
			evaluation: analysis.evaluation,
			principalVariations: analysis.principalVariations,
		});
	} catch (error) {
		return res.status(500).json({
			error: "engine_failed",
			details: error.message,
			stderr: error.stderr ?? "",
		});
	}
});

app.post("/api/analyze/compare-moves", async (req, res) => {
	const { fen, referenceMove, userMove, depth = 12 } = req.body || {};

	if (!fen) {
		return res.status(400).json({ error: "fen is required" });
	}

	if (typeof referenceMove !== "string" || !referenceMove.trim()) {
		return res.status(400).json({ error: "referenceMove is required" });
	}

	if (typeof userMove !== "string" || !userMove.trim()) {
		return res.status(400).json({ error: "userMove is required" });
	}

	try {
		const [referenceAnalysis, userAnalysis] = await Promise.all([
			analyzePosition({
				stockfishPath: STOCKFISH_PATH,
				fen,
				depth,
				multipv: 1,
				searchMoves: [referenceMove.trim()],
			}),
			analyzePosition({
				stockfishPath: STOCKFISH_PATH,
				fen,
				depth,
				multipv: 1,
				searchMoves: [userMove.trim()],
			}),
		]);
		const referenceScore = getComparableEvaluationScore(referenceAnalysis.evaluation);
		const userScore = getComparableEvaluationScore(userAnalysis.evaluation);
		const deltaCp =
			Number.isFinite(referenceScore) && Number.isFinite(userScore)
				? userScore - referenceScore
				: null;

		return res.json({
			fen,
			referenceMove: referenceMove.trim(),
			userMove: userMove.trim(),
			referenceEvaluation: referenceAnalysis.evaluation,
			userEvaluation: userAnalysis.evaluation,
			referenceScore,
			userScore,
			deltaCp,
		});
	} catch (error) {
		return res.status(500).json({
			error: "engine_failed",
			details: error.message,
			stderr: error.stderr ?? "",
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
