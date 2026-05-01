#!/usr/bin/env node

const { importPgnDirectory } = require("../otb");

function parseArgs(argv) {
	const options = {
		dbPath: "",
		reset: false,
		rootDir: "",
	};

	for (let index = 0; index < argv.length; index += 1) {
		const currentArgument = argv[index];

		if (currentArgument === "--reset") {
			options.reset = true;
			continue;
		}

		if (currentArgument === "--db") {
			options.dbPath = argv[index + 1] ?? "";
			index += 1;
			continue;
		}

		if (!options.rootDir) {
			options.rootDir = currentArgument;
			continue;
		}

		throw new Error(`Unknown argument: ${currentArgument}`);
	}

	return options;
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	const result = await importPgnDirectory(options);

	console.log(`Imported ${result.importedGames} OTB games into ${result.dbPath}.`);
	console.log(
		`Processed ${result.totalGames} games from ${result.fileCount} PGN files under ${result.rootDir}.`,
	);

	if (result.skippedGames > 0) {
		console.log(`Skipped ${result.skippedGames} duplicate games.`);
	}
}

main().catch((error) => {
	console.error(error?.message || String(error));
	process.exitCode = 1;
});
