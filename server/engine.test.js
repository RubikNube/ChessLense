const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { createEngineSession } = require("./engine");

async function createFakeStockfish({ answerGo = true } = {}) {
	const rootDir = await fs.mkdtemp(
		path.join(os.tmpdir(), "chesslense-engine-"),
	);
	const executablePath = path.join(rootDir, "fake-stockfish");
	const source = `#!/bin/sh
analysis_count=0
while IFS= read -r line; do
  case "$line" in
    uci)
      printf 'id name Fake Stockfish\\nuciok\\n'
      ;;
    isready)
      printf 'readyok\\n'
      ;;
    go\\ *)
      if [ "${answerGo}" = "true" ]; then
        analysis_count=$((analysis_count + 1))
        score=$((analysis_count * 10))
        printf 'info depth 1 multipv 1 score cp %s pv e2e4\\nbestmove e2e4\\n' "$score"
      fi
      ;;
    quit)
      exit 0
      ;;
  esac
done
`;

	await fs.writeFile(executablePath, source, { mode: 0o755 });
	return { rootDir, executablePath };
}

test("a Stockfish session analyzes multiple positions without respawning", async () => {
	const fixture = await createFakeStockfish();
	let session;

	try {
		session = await createEngineSession({
			stockfishPath: fixture.executablePath,
		});
		const first = await session.analyze({ fen: "first", depth: 1 });
		const second = await session.analyze({ fen: "second", depth: 1 });

		assert.deepEqual(first.evaluation, { type: "cp", value: 10 });
		assert.equal(first.bestmove, "e2e4");
		assert.deepEqual(second.evaluation, { type: "cp", value: 20 });
	} finally {
		session?.close();
		await fs.rm(fixture.rootDir, { recursive: true, force: true });
	}
});

test("aborting a Stockfish session rejects active analysis and stops the process", async () => {
	const fixture = await createFakeStockfish({ answerGo: false });
	const abortController = new AbortController();
	let session;

	try {
		session = await createEngineSession({
			stockfishPath: fixture.executablePath,
			signal: abortController.signal,
		});
		const analysisPromise = session.analyze({ fen: "first", depth: 1 });
		abortController.abort();

		await assert.rejects(
			analysisPromise,
			(error) => error.name === "AbortError" && error.code === "ABORT_ERR",
		);
	} finally {
		session?.close();
		await fs.rm(fixture.rootDir, { recursive: true, force: true });
	}
});
