function normalizeFileName(file) {
  return typeof file?.name === "string" ? file.name.trim() : "";
}

export function validateOtbImportFile(file) {
  const fileName = normalizeFileName(file);

  if (!fileName) {
    return "Choose a .pgn file to import.";
  }

  if (!fileName.toLowerCase().endsWith(".pgn")) {
    return "Select a file with the .pgn extension.";
  }

  return "";
}

function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatOtbImportSummary(summary) {
  const fileName =
    typeof summary?.fileName === "string" && summary.fileName.trim()
      ? summary.fileName.trim()
      : "selected file";
  const totalGames = Number.isFinite(summary?.totalGames) ? summary.totalGames : 0;
  const importedGames = Number.isFinite(summary?.importedGames) ? summary.importedGames : 0;
  const skippedGames = Number.isFinite(summary?.skippedGames) ? summary.skippedGames : 0;

  return `Processed ${pluralize(totalGames, "game", "games")} from ${fileName}: ${pluralize(
    importedGames,
    "imported",
    "imported",
  )}, ${pluralize(skippedGames, "duplicate skipped", "duplicates skipped")}.`;
}
