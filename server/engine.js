const { spawn } = require("child_process");

function createAbortError() {
	const error = new Error("Engine analysis was cancelled.");
	error.name = "AbortError";
	error.code = "ABORT_ERR";
	return error;
}

function waitForLine(stream, matcher, timeoutMs = 5000, signal) {
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
				if (
					typeof matcher === "string" ? line.includes(matcher) : matcher(line)
				) {
					cleanup();
					resolve(line);
					return;
				}
			}
		}

		function cleanup() {
			clearTimeout(timeout);
			stream.off("data", onData);
			signal?.removeEventListener("abort", onAbort);
		}

		function onAbort() {
			cleanup();
			reject(createAbortError());
		}

		if (signal?.aborted) {
			onAbort();
			return;
		}

		stream.on("data", onData);
		signal?.addEventListener("abort", onAbort, { once: true });
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

	return Array.from(variationByIndex.values()).sort(
		(left, right) => left.multipv - right.multipv,
	);
}

function getComparableEvaluationScore(evaluation) {
	if (!evaluation || typeof evaluation !== "object") {
		return null;
	}

	if (evaluation.type === "cp" && typeof evaluation.value === "number") {
		return evaluation.value;
	}

	if (evaluation.type === "mate" && typeof evaluation.value === "number") {
		const distance = Math.max(0, Math.abs(evaluation.value));
		const baseScore = 100000 - distance;
		return evaluation.value >= 0 ? baseScore : -baseScore;
	}

	return null;
}

function createEngineProcessError(error, stockfishPath) {
	if (error?.code === "ENOENT") {
		const resolvedError = new Error(
			`Stockfish executable not found at "${stockfishPath}". Install Stockfish or set STOCKFISH_PATH.`,
		);
		resolvedError.code = error.code;
		return resolvedError;
	}

	return error;
}

async function createEngineSession({ stockfishPath, signal } = {}) {
	const engine = spawn(stockfishPath, [], { stdio: "pipe" });
	let stderr = "";
	const output = [];
	let closed = false;
	const engineError = new Promise((_, reject) => {
		engine.once("error", (error) => {
			reject(createEngineProcessError(error, stockfishPath));
		});
	});

	engine.stderr.on("data", (data) => {
		stderr += data.toString();
	});
	engine.stdin.on("error", () => {
		// Process startup and cancellation errors are surfaced through engineError.
	});

	engine.stdout.on("data", (data) => {
		output.push(data.toString());
	});

	function send(command) {
		if (closed || engine.stdin.destroyed) {
			throw new Error("Stockfish session is closed.");
		}
		engine.stdin.write(`${command}\n`);
	}

	function close() {
		if (closed) {
			return;
		}

		closed = true;
		signal?.removeEventListener("abort", onAbort);
		if (!engine.stdin.destroyed) {
			engine.stdin.write("quit\n");
		}
		engine.kill();
	}

	function onAbort() {
		close();
	}

	signal?.addEventListener("abort", onAbort, { once: true });

	try {
		const uciReadyPromise = waitForLine(engine.stdout, "uciok", 5000, signal);
		send("uci");
		await Promise.race([uciReadyPromise, engineError]);

		const engineReadyPromise = waitForLine(
			engine.stdout,
			"readyok",
			5000,
			signal,
		);
		send("isready");
		await Promise.race([engineReadyPromise, engineError]);

		return {
			async analyze({ fen, depth = 12, multipv = 1, searchMoves = [] }) {
				if (signal?.aborted) {
					throw createAbortError();
				}

				const requestedMultiPv = normalizeMultiPv(multipv);
				output.length = 0;
				send(`setoption name MultiPV value ${requestedMultiPv}`);
				send(`position fen ${fen}`);
				const bestMovePromise = waitForLine(
					engine.stdout,
					(line) => line.startsWith("bestmove"),
					15000,
					signal,
				);
				send(
					searchMoves.length
						? `go depth ${depth} searchmoves ${searchMoves.join(" ")}`
						: `go depth ${depth}`,
				);

				const bestMoveLine = await Promise.race([bestMovePromise, engineError]);
				const bestMoveMatch = bestMoveLine.match(/^bestmove\s+(\S+)/);
				const bestmove = bestMoveMatch ? bestMoveMatch[1] : null;
				const principalVariations = parsePrincipalVariations(
					output.join(""),
					requestedMultiPv,
				);

				return {
					fen,
					bestmove,
					evaluation: principalVariations[0]?.evaluation ?? null,
					principalVariations,
					stderr,
				};
			},
			close,
			getStderr: () => stderr,
		};
	} catch (error) {
		close();
		error.stderr = typeof error.stderr === "string" ? error.stderr : stderr;
		throw error;
	}
}

async function analyzePosition({
	stockfishPath,
	fen,
	depth = 12,
	multipv = 1,
	searchMoves = [],
	signal,
}) {
	const session = await createEngineSession({ stockfishPath, signal });

	try {
		return await session.analyze({
			fen,
			depth,
			multipv,
			searchMoves,
		});
	} catch (error) {
		error.stderr =
			typeof error.stderr === "string" ? error.stderr : session.getStderr();
		throw error;
	} finally {
		session.close();
	}
}

module.exports = {
	analyzePosition,
	createEngineSession,
	getComparableEvaluationScore,
	normalizeMultiPv,
};
