const { spawn } = require("child_process");

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

async function analyzePosition({
	stockfishPath,
	fen,
	depth = 12,
	multipv = 1,
	searchMoves = [],
}) {
	const requestedMultiPv = normalizeMultiPv(multipv);
	const engine = spawn(stockfishPath, [], { stdio: "pipe" });
	let stderr = "";
	const output = [];

	engine.stderr.on("data", (data) => {
		stderr += data.toString();
	});

	engine.stdout.on("data", (data) => {
		output.push(data.toString());
	});

	function send(command) {
		engine.stdin.write(`${command}\n`);
	}

	try {
		send("uci");
		await waitForLine(engine.stdout, "uciok");

		send(`setoption name MultiPV value ${requestedMultiPv}`);
		send("isready");
		await waitForLine(engine.stdout, "readyok");

		send(`position fen ${fen}`);
		send(
			searchMoves.length
				? `go depth ${depth} searchmoves ${searchMoves.join(" ")}`
				: `go depth ${depth}`,
		);

		const bestMoveLine = await waitForLine(
			engine.stdout,
			(line) => line.startsWith("bestmove"),
			15000,
		);
		const combinedOutput = output.join("");
		const bestMoveMatch = bestMoveLine.match(/^bestmove\s+(\S+)/);
		const bestmove = bestMoveMatch ? bestMoveMatch[1] : null;
		const principalVariations = parsePrincipalVariations(combinedOutput, requestedMultiPv);
		const evaluation = principalVariations[0]?.evaluation ?? null;

		send("quit");
		engine.kill();

		return {
			fen,
			bestmove,
			evaluation,
			principalVariations,
			stderr,
		};
	} catch (error) {
		engine.kill();
		error.stderr = stderr;
		throw error;
	}
}

module.exports = {
	analyzePosition,
	getComparableEvaluationScore,
	normalizeMultiPv,
};
