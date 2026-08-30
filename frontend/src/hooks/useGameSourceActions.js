/* Controller inputs such as React setters and imported utilities have stable identities. */
/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback } from "react";

function useGameSourceActions(context) {
  const {
    appliedOtbSearchFilters,
    applyImportedPgn,
    buildLichessSearchQuery,
    buildOtbImportPath,
    buildOtbSearchQuery,
    closeImportPgnPopup,
    fetchJson,
    formatOtbImportSummary,
    importPgnValue,
    lichessSearchFilters,
    loadConfiguredApiBaseUrl,
    normalizeApiBaseUrl,
    normalizeOtbTreeScope,
    otbSearchFilters,
    resetGame,
    saveConfiguredApiBaseUrl,
    saveConfiguredApiToken,
    saveUseLocalApiBaseUrl,
    setAppliedOtbSearchFilters,
    setBackendApiBaseUrl,
    setBackendApiToken,
    setBackendConnectionError,
    setHasSearchedLichess,
    setHasSearchedOtb,
    setImportPgnError,
    setImportingOtbFile,
    setLichessApiToken,
    setLichessImportError,
    setLichessImportingGameId,
    setLichessSearchError,
    setLichessSearchLoading,
    setLichessSearchResults,
    setOtbFileImportError,
    setOtbFileImportStatus,
    setOtbImportError,
    setOtbImportingGameId,
    setOtbOpeningTreeGameSelection,
    setOtbPlayerTreeColor,
    setOtbPlayerTreeScope,
    setOtbSearchError,
    setOtbSearchFilters,
    setOtbSearchNonce,
    setOtbSearchPage,
    setOtbSearchPagination,
    setOtbSearchResults,
    setShowBackendConnectionPopup,
    setShowComments,
    setShowImportedPgn,
    setShowLichessSearchPopup,
    setShowLichessTokenPopup,
    setShowOtbPlayerTreePanel,
    setShowOtbSearchPopup,
    setShowThemeSettingsPopup,
    validateOtbImportFile,
  } = context;

  const openLichessSearchPopup = useCallback(() => {
    setShowLichessSearchPopup(true);
    setLichessSearchError("");
    setLichessImportError("");
  }, []);

  const closeLichessSearchPopup = useCallback(() => {
    setShowLichessSearchPopup(false);
    setLichessSearchError("");
    setLichessImportError("");
    setLichessImportingGameId("");
  }, []);

  const openLichessTokenPopup = useCallback(() => {
    setShowLichessTokenPopup(true);
  }, []);

  const openBackendConnectionPopup = useCallback(() => {
    setBackendConnectionError("");
    setShowBackendConnectionPopup(true);
  }, []);

  const openThemeSettingsPopup = useCallback(() => {
    setShowThemeSettingsPopup(true);
  }, []);

  const closeThemeSettingsPopup = useCallback(() => {
    setShowThemeSettingsPopup(false);
  }, []);

  const closeBackendConnectionPopup = useCallback(() => {
    setBackendConnectionError("");
    setShowBackendConnectionPopup(false);
  }, []);

  const saveBackendConnection = useCallback(
    ({ url, token, useLocalApiRoutes = false }) => {
      const trimmedUrl = url.trim();
      const normalizedUrl = normalizeApiBaseUrl(trimmedUrl);

      if (trimmedUrl && !normalizedUrl) {
        setBackendConnectionError(
          "Enter a full http:// or https:// backend URL.",
        );
        return;
      }

      if (useLocalApiRoutes) {
        saveUseLocalApiBaseUrl();
      } else {
        saveConfiguredApiBaseUrl(normalizedUrl);
      }

      saveConfiguredApiToken(token);
      setBackendApiBaseUrl(loadConfiguredApiBaseUrl());
      setBackendApiToken(token.trim());
      setBackendConnectionError("");
      setShowBackendConnectionPopup(false);
    },
    [],
  );

  const closeLichessTokenPopup = useCallback(() => {
    setShowLichessTokenPopup(false);
  }, []);

  const saveLichessToken = useCallback((nextToken) => {
    setLichessApiToken(nextToken);
    setShowLichessTokenPopup(false);
  }, []);

  const openOtbSearchPopup = useCallback(() => {
    setShowOtbSearchPopup(true);
    setOtbSearchError("");
    setOtbImportError("");
  }, []);

  const closeOtbSearchPopup = useCallback(() => {
    setShowOtbSearchPopup(false);
    setOtbSearchError("");
    setOtbImportError("");
    setOtbImportingGameId("");
  }, []);

  function importPgn() {
    const nextError = applyImportedPgn(importPgnValue);

    if (nextError) {
      setImportPgnError(nextError);
      return;
    }

    closeImportPgnPopup();
  }

  async function importOtbPgnFile(file) {
    const validationError = validateOtbImportFile(file);

    if (validationError) {
      setOtbFileImportError(validationError);
      setOtbFileImportStatus("");
      return;
    }

    setOtbFileImportError("");
    setOtbFileImportStatus("");
    setImportingOtbFile(true);

    try {
      const pgn = await file.text();
      const summary = await fetchJson(buildOtbImportPath(file), {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: pgn,
      });
      setOtbFileImportStatus(formatOtbImportSummary(summary));
    } catch (error) {
      setOtbFileImportError(error.message);
    } finally {
      setImportingOtbFile(false);
    }
  }

  async function searchLichessGames() {
    const { query, error } = buildLichessSearchQuery(lichessSearchFilters);

    if (error) {
      setLichessSearchError(error);
      setLichessImportError("");
      setLichessSearchResults([]);
      setHasSearchedLichess(false);
      return;
    }

    setLichessSearchLoading(true);
    setLichessSearchError("");
    setLichessImportError("");
    setHasSearchedLichess(true);

    try {
      const data = await fetchJson(`/api/lichess/games?${query}`);
      setLichessSearchResults(Array.isArray(data.games) ? data.games : []);
    } catch (error) {
      setLichessSearchResults([]);
      setLichessSearchError(error.message);
    } finally {
      setLichessSearchLoading(false);
    }
  }

  async function importLichessGame(gameId) {
    setLichessImportError("");
    setLichessImportingGameId(gameId);

    try {
      const data = await fetchJson(`/api/lichess/games/${gameId}`);
      const nextError = applyImportedPgn(data.pgn);

      if (nextError) {
        setLichessImportError(nextError);
        return;
      }

      setShowImportedPgn(true);
      setShowComments(true);
      closeLichessSearchPopup();
    } catch (error) {
      setLichessImportError(error.message);
    } finally {
      setLichessImportingGameId("");
    }
  }

  async function searchOtbGames() {
    const { error } = buildOtbSearchQuery(otbSearchFilters, 1);

    if (error) {
      setOtbSearchError(error);
      setOtbImportError("");
      setOtbSearchResults([]);
      setOtbSearchPagination(null);
      setHasSearchedOtb(false);
      return;
    }

    setAppliedOtbSearchFilters(otbSearchFilters);
    setOtbSearchError("");
    setOtbImportError("");
    setHasSearchedOtb(true);
    setOtbSearchPage(1);
    setOtbSearchNonce((currentValue) => currentValue + 1);
  }

  const changeOtbPage = useCallback((nextPage) => {
    setOtbSearchError("");
    setOtbImportError("");
    setOtbSearchPage(nextPage);
  }, []);

  const changeOtbPageSize = useCallback((nextPageSize) => {
    setOtbSearchError("");
    setOtbImportError("");
    setOtbSearchFilters((currentValue) => ({
      ...currentValue,
      pageSize: nextPageSize,
    }));
    setAppliedOtbSearchFilters((currentValue) => ({
      ...currentValue,
      pageSize: nextPageSize,
    }));
    setOtbSearchPage(1);
  }, []);

  async function importOtbGame(gameId) {
    setOtbImportError("");
    setOtbImportingGameId(gameId);

    try {
      const data = await fetchJson(`/api/otb/games/${gameId}`);
      const nextError = applyImportedPgn(data.pgn);

      if (nextError) {
        setOtbImportError(nextError);
        return;
      }

      setShowImportedPgn(true);
      setShowComments(true);
      closeOtbSearchPopup();
    } catch (error) {
      setOtbImportError(error.message);
    } finally {
      setOtbImportingGameId("");
    }
  }

  async function importOtbOpeningTreeGame(gameId) {
    const data = await fetchJson(`/api/otb/games/${gameId}`);
    const nextError = applyImportedPgn(data.pgn);

    if (nextError) {
      throw new Error(nextError);
    }

    setShowImportedPgn(true);
    setShowComments(true);
    setOtbOpeningTreeGameSelection(null);
  }

  function exploreOtbPlayerOpeningTree() {
    const nextScope = normalizeOtbTreeScope(appliedOtbSearchFilters);

    if (!nextScope.player) {
      setOtbSearchError("Enter a player before opening the tree.");
      return;
    }

    resetGame();
    setOtbPlayerTreeScope(nextScope);
    setOtbPlayerTreeColor("white");
    setShowOtbPlayerTreePanel(true);
    closeOtbSearchPopup();
  }

  return {
    openLichessSearchPopup,
    closeLichessSearchPopup,
    openLichessTokenPopup,
    openBackendConnectionPopup,
    openThemeSettingsPopup,
    closeThemeSettingsPopup,
    closeBackendConnectionPopup,
    saveBackendConnection,
    closeLichessTokenPopup,
    saveLichessToken,
    openOtbSearchPopup,
    closeOtbSearchPopup,
    importPgn,
    importOtbPgnFile,
    searchLichessGames,
    importLichessGame,
    searchOtbGames,
    changeOtbPage,
    changeOtbPageSize,
    importOtbGame,
    importOtbOpeningTreeGame,
    exploreOtbPlayerOpeningTree,
  };
}

export default useGameSourceActions;
