const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");

const app = express();
const PORT = 3001;
const STOCKFISH_PATH = process.env.STOCKFISH_PATH || "stockfish";

app.use(cors());
app.use(express.json());

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

app.post("/api/analyze", async (req, res) => {
	const { fen, depth = 12 } = req.body || {};

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

		send("isready");
		await waitForLine(engine.stdout, "readyok");

		send(`position fen ${fen}`);
		send(`go depth ${depth}`);

		const bestMoveLine = await waitForLine(engine.stdout, (line) => line.startsWith("bestmove"), 15000);
		const combined = output.join("");

		const bestMoveMatch = bestMoveLine.match(/^bestmove\s+(\S+)/);
		const bestmove = bestMoveMatch ? bestMoveMatch[1] : null;

		let evaluation = null;
		const infoLines = combined
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.startsWith("info"));

		for (let i = infoLines.length - 1; i >= 0; i -= 1) {
			const line = infoLines[i];

			const mateMatch = line.match(/\bscore mate (-?\d+)/);
			if (mateMatch) {
				evaluation = { type: "mate", value: Number(mateMatch[1]) };
				break;
			}

			const cpMatch = line.match(/\bscore cp (-?\d+)/);
			if (cpMatch) {
				evaluation = { type: "cp", value: Number(cpMatch[1]) };
				break;
			}
		}

		send("quit");
		engine.kill();

		return res.json({
			fen,
			bestmove,
			evaluation,
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

app.listen(PORT, () => {
	console.log(`Chess engine server running on http://localhost:${PORT}`);
});
