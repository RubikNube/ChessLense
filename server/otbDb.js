const fs = require("fs/promises");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { HttpError } = require("./httpError");

const DEFAULT_OTB_DB_PATH = path.join(__dirname, "data", "otb.sqlite");

function normalizeString(value) {
	return typeof value === "string" ? value.trim() : "";
}

async function pathExists(targetPath) {
	try {
		await fs.access(targetPath);
		return true;
	} catch {
		return false;
	}
}

function getOtbDbPath(dbPath = process.env.OTB_DB_PATH) {
	return normalizeString(dbPath) || DEFAULT_OTB_DB_PATH;
}

async function ensureOtbDbDirectory(dbPath) {
	await fs.mkdir(path.dirname(dbPath), { recursive: true });
}

function initializeOtbSchema(database) {
	database.exec(`
		CREATE TABLE IF NOT EXISTS otb_players (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			normalized_name TEXT NOT NULL,
			search_name TEXT NOT NULL,
			UNIQUE(name, normalized_name)
		);

		CREATE TABLE IF NOT EXISTS otb_games (
			id TEXT PRIMARY KEY,
			raw_pgn TEXT NOT NULL,
			source TEXT NOT NULL DEFAULT 'sqlite',
			source_file TEXT,
			event TEXT,
			site TEXT,
			round TEXT,
			result TEXT,
			variant TEXT,
			date_label TEXT,
			year INTEGER,
			created_at INTEGER,
			eco TEXT,
			eco_normalized TEXT,
			opening TEXT,
			ply_count INTEGER NOT NULL DEFAULT 0,
			move_count INTEGER NOT NULL DEFAULT 0,
			imported_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS otb_game_players (
			game_id TEXT NOT NULL REFERENCES otb_games(id) ON DELETE CASCADE,
			color TEXT NOT NULL CHECK(color IN ('white', 'black')),
			player_id INTEGER NOT NULL REFERENCES otb_players(id),
			PRIMARY KEY (game_id, color)
		);

		CREATE INDEX IF NOT EXISTS otb_players_name_idx
			ON otb_players(name COLLATE NOCASE);
		CREATE INDEX IF NOT EXISTS otb_players_search_name_idx
			ON otb_players(search_name);
		CREATE INDEX IF NOT EXISTS otb_games_year_idx
			ON otb_games(year);
		CREATE INDEX IF NOT EXISTS otb_games_created_at_idx
			ON otb_games(created_at);
		CREATE INDEX IF NOT EXISTS otb_games_result_idx
			ON otb_games(result);
		CREATE INDEX IF NOT EXISTS otb_games_eco_idx
			ON otb_games(eco_normalized);
		CREATE INDEX IF NOT EXISTS otb_games_opening_idx
			ON otb_games(opening COLLATE NOCASE);
		CREATE INDEX IF NOT EXISTS otb_games_event_idx
			ON otb_games(event COLLATE NOCASE);
		CREATE INDEX IF NOT EXISTS otb_game_players_player_color_idx
			ON otb_game_players(player_id, color);
	`);
}

function applyDatabasePragmas(database) {
	database.exec(`
		PRAGMA foreign_keys = ON;
		PRAGMA journal_mode = WAL;
		PRAGMA synchronous = NORMAL;
	`);
}

async function openOtbDatabase(options = {}) {
	const dbPath = getOtbDbPath(options.dbPath);

	if (!options.create && !(await pathExists(dbPath))) {
		throw new HttpError(
			503,
			"otb_source_not_configured",
			`OTB database not found. Set OTB_DB_PATH or import PGN files with npm run otb:import to create ${dbPath}.`,
		);
	}

	if (options.create) {
		await ensureOtbDbDirectory(dbPath);
	}

	const database = new DatabaseSync(dbPath);

	try {
		applyDatabasePragmas(database);
		initializeOtbSchema(database);
		return {
			database,
			dbPath,
		};
	} catch (error) {
		database.close();
		throw error;
	}
}

function clearOtbDatabase(database) {
	database.exec(`
		DELETE FROM otb_game_players;
		DELETE FROM otb_games;
		DELETE FROM otb_players;
	`);
}

module.exports = {
	DEFAULT_OTB_DB_PATH,
	clearOtbDatabase,
	getOtbDbPath,
	initializeOtbSchema,
	openOtbDatabase,
};
