const path = require("path");
const express = require("express");
const cors = require("cors");
const {
	analyzePosition,
	getComparableEvaluationScore,
	normalizeMultiPv,
} = require("./engine");
const { HttpError } = require("./httpError");
const {
	getGame: getLichessGame,
	getOpeningTree: getLichessOpeningTree,
	LICHESS_REQUEST_TOKEN_HEADER,
	searchGames: searchLichessGames,
} = require("./lichess");
const {
	getGame: getOtbGame,
	importPgnFile: importOtbPgnFile,
	searchGames: searchOtbGames,
} = require("./otb");
const {
	addStudyToCollection,
	createCollection,
	deleteCollection,
	getCollection,
	listCollections,
	removeStudyFromAllCollections,
	removeStudyFromCollection,
} = require("./collections");
const { deleteStudy, getStudy, listStudies, saveStudy } = require("./studies");

const PORT = 3001;
const STOCKFISH_PATH = process.env.STOCKFISH_PATH || "stockfish";
const JSON_BODY_LIMIT = "25mb";

function normalizeString(value) {
	return typeof value === "string" ? value.trim() : "";
}

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

function createApp() {
	const app = express();

	app.use(cors());
	app.use(express.json({ limit: JSON_BODY_LIMIT }));

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

	app.get("/api/lichess/opening-tree", async (req, res) => {
		try {
			const openingTree = await getLichessOpeningTree(req.query || {}, {
				requestToken: req.get(LICHESS_REQUEST_TOKEN_HEADER) ?? "",
			});

			return res.json(openingTree);
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

	app.post("/api/otb/import", async (req, res) => {
		try {
			const fileName = path.basename(normalizeString(req.body?.fileName));
			const pgn = typeof req.body?.pgn === "string" ? req.body.pgn : "";

			if (!fileName) {
				throw new HttpError(400, "invalid_import", "fileName is required.");
			}

			if (!pgn.trim()) {
				throw new HttpError(400, "invalid_import", "PGN file content is required.");
			}

			const summary = await importOtbPgnFile({
				sourceFile: fileName,
				content: pgn,
			});

			return res.status(201).json(summary);
		} catch (error) {
			return sendApiError(res, error);
		}
	});

	app.get("/api/otb/games", async (req, res) => {
		try {
			const { search, games, pagination } = await searchOtbGames(req.query || {});

			return res.json({
				search,
				games,
				pagination,
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

	app.get("/api/studies", async (_req, res) => {
		try {
			const studies = await listStudies();

			return res.json({
				studies,
			});
		} catch (error) {
			return sendApiError(res, error);
		}
	});

	app.get("/api/studies/:studyId", async (req, res) => {
		try {
			const study = await getStudy(req.params.studyId);

			return res.json(study);
		} catch (error) {
			return sendApiError(res, error);
		}
	});

	app.post("/api/studies", async (req, res) => {
		try {
			const study = await saveStudy(req.body || {});

			return res.status(201).json(study);
		} catch (error) {
			return sendApiError(res, error);
		}
	});

	app.delete("/api/studies/:studyId", async (req, res) => {
		try {
			const deletedStudy = await deleteStudy(req.params.studyId);
			await removeStudyFromAllCollections(req.params.studyId);

			return res.json(deletedStudy);
		} catch (error) {
			return sendApiError(res, error);
		}
	});

	app.get("/api/collections", async (_req, res) => {
		try {
			const collections = await listCollections();

			return res.json({
				collections,
			});
		} catch (error) {
			return sendApiError(res, error);
		}
	});

	app.get("/api/collections/:collectionId", async (req, res) => {
		try {
			const collection = await getCollection(req.params.collectionId);

			return res.json(collection);
		} catch (error) {
			return sendApiError(res, error);
		}
	});

	app.post("/api/collections", async (req, res) => {
		try {
			const collection = await createCollection(req.body || {});

			return res.status(201).json(collection);
		} catch (error) {
			return sendApiError(res, error);
		}
	});

	app.delete("/api/collections/:collectionId", async (req, res) => {
		try {
			const deletedCollection = await deleteCollection(req.params.collectionId);

			return res.json(deletedCollection);
		} catch (error) {
			return sendApiError(res, error);
		}
	});

	app.post("/api/collections/:collectionId/studies", async (req, res) => {
		try {
			const collection = await addStudyToCollection(
				req.params.collectionId,
				req.body?.studyId,
			);

			return res.json(collection);
		} catch (error) {
			return sendApiError(res, error);
		}
	});

	app.delete("/api/collections/:collectionId/studies/:studyId", async (req, res) => {
		try {
			const collection = await removeStudyFromCollection(
				req.params.collectionId,
				req.params.studyId,
			);

			return res.json(collection);
		} catch (error) {
			return sendApiError(res, error);
		}
	});

	app.use((error, _req, res, next) => {
		if (res.headersSent) {
			next(error);
			return;
		}

		if (error?.type === "entity.too.large") {
			res.status(413).json({
				error: "payload_too_large",
				details: "PGN upload is too large.",
			});
			return;
		}

		sendApiError(res, error);
	});

	return app;
}

const app = createApp();

if (require.main === module) {
	app.listen(PORT, () => {
		console.log(`Chess engine server running on http://localhost:${PORT}`);
	});
}

module.exports = {
	app,
	createApp,
};
