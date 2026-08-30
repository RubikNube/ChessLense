/* Controller inputs such as React setters and imported utilities have stable identities. */
/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback } from "react";

function useStudyLibraryActions(context) {
  const {
    GAME_ANALYSIS_STATUS_COMPLETE,
    buildStudyTitle,
    createCollectionPayload,
    createCollectionTitle,
    createStudySavePayload,
    fetchJson,
    gameAnalysis,
    gameAnalysisAbortControllerRef,
    gameAnalysisIsCurrent,
    importedPgnData,
    managingStudy,
    normalizeCollection,
    normalizeGuessHistoryBrowseEntries,
    normalizeStudy,
    normalizeStudySummary,
    positionComments,
    resetTrainingSession,
    saveStudyTitle,
    setCollections,
    setCollectionsLoading,
    setCommentDraft,
    setCopyNotification,
    setCreateCollectionError,
    setCreateCollectionTitle,
    setCreatingCollection,
    setDeletingCollectionId,
    setDeletingStudyId,
    setEditingCommentId,
    setEngineResult,
    setEvaluationResult,
    setGameAnalysis,
    setGuessHistoryBrowserError,
    setGuessHistoryBrowserGames,
    setGuessHistoryBrowserLoading,
    setImportedPgnData,
    setLoadingGuessHistoryGameKey,
    setLoadingStudyId,
    setManagingStudy,
    setPositionComments,
    setPositionSetupError,
    setPositionSetupState,
    setSaveStudyError,
    setSaveStudyTitle,
    setSavingStudy,
    setSelectedCollectionId,
    setShowComments,
    setShowCreateCollectionPopup,
    setShowGuessHistoryBrowserPopup,
    setShowImportedPgn,
    setShowManageCollectionsPopup,
    setShowMoveHistory,
    setShowSaveStudyPopup,
    setShowStudiesPopup,
    setShowVariants,
    setStudies,
    setStudiesError,
    setStudiesLoading,
    setUpdatingCollectionId,
    setVariantTree,
    showStudiesPopup,
    variantTree,
  } = context;

  const openSaveStudyPopup = useCallback(() => {
    setSaveStudyTitle(buildStudyTitle(importedPgnData));
    setSaveStudyError("");
    setShowSaveStudyPopup(true);
  }, [importedPgnData]);

  const closeSaveStudyPopup = useCallback(() => {
    setShowSaveStudyPopup(false);
    setSaveStudyTitle("");
    setSaveStudyError("");
  }, []);

  const openCreateCollectionPopup = useCallback(() => {
    setCreateCollectionTitle("");
    setCreateCollectionError("");
    setShowCreateCollectionPopup(true);
  }, []);

  const closeCreateCollectionPopup = useCallback(() => {
    setShowCreateCollectionPopup(false);
    setCreateCollectionTitle("");
    setCreateCollectionError("");
  }, []);

  const openManageCollectionsPopup = useCallback((study) => {
    setManagingStudy(study);
    setStudiesError("");
    setShowManageCollectionsPopup(true);
  }, []);

  const closeManageCollectionsPopup = useCallback(() => {
    setManagingStudy(null);
    setUpdatingCollectionId("");
    setShowManageCollectionsPopup(false);
  }, []);

  const closeStudiesPopup = useCallback(() => {
    setShowStudiesPopup(false);
    setStudiesError("");
    setLoadingStudyId("");
    setDeletingStudyId("");
    setSelectedCollectionId("");
    closeManageCollectionsPopup();
  }, [closeManageCollectionsPopup]);

  const loadCollections = useCallback(async () => {
    setCollectionsLoading(true);
    setStudiesError("");

    try {
      const data = await fetchJson("/api/collections");
      setCollections(
        (Array.isArray(data.collections) ? data.collections : [])
          .map((collection) => normalizeCollection(collection))
          .filter(Boolean),
      );
    } catch (error) {
      setCollections([]);
      setStudiesError(error.message);
    } finally {
      setCollectionsLoading(false);
    }
  }, []);

  const loadStudies = useCallback(async () => {
    setStudiesLoading(true);
    setStudiesError("");

    try {
      const data = await fetchJson("/api/studies");
      setStudies(
        (Array.isArray(data.studies) ? data.studies : [])
          .map((study) => normalizeStudySummary(study))
          .filter(Boolean),
      );
    } catch (error) {
      setStudies([]);
      setStudiesError(error.message);
    } finally {
      setStudiesLoading(false);
    }
  }, []);

  const openStudiesPopup = useCallback(() => {
    setShowStudiesPopup(true);
    void loadStudies();
    void loadCollections();
  }, [loadCollections, loadStudies]);

  const loadGuessHistoryGames = useCallback(async () => {
    setGuessHistoryBrowserLoading(true);
    setGuessHistoryBrowserError("");

    try {
      const data = await fetchJson("/api/guess-history/games");
      setGuessHistoryBrowserGames(
        normalizeGuessHistoryBrowseEntries(data.games),
      );
    } catch (error) {
      setGuessHistoryBrowserGames([]);
      setGuessHistoryBrowserError(error.message);
    } finally {
      setGuessHistoryBrowserLoading(false);
    }
  }, []);

  const openGuessHistoryBrowser = useCallback(() => {
    setShowGuessHistoryBrowserPopup(true);
    void loadGuessHistoryGames();
  }, [loadGuessHistoryGames]);

  const closeGuessHistoryBrowser = useCallback(() => {
    setShowGuessHistoryBrowserPopup(false);
    setGuessHistoryBrowserError("");
    setLoadingGuessHistoryGameKey("");
  }, []);

  const applyStudyToWorkspace = useCallback(
    (studyValue) => {
      const study = normalizeStudy(studyValue);

      if (!study) {
        return "Saved study is invalid.";
      }

      resetTrainingSession();
      gameAnalysisAbortControllerRef.current?.abort();
      gameAnalysisAbortControllerRef.current = null;
      setVariantTree(study.variantTree);
      setEngineResult(null);
      setEvaluationResult(null);
      setImportedPgnData(study.importedPgnData);
      setPositionComments(study.positionComments);
      setGameAnalysis(study.gameAnalysis);
      setEditingCommentId(null);
      setCommentDraft("");
      setPositionSetupState(null);
      setPositionSetupError("");
      setShowMoveHistory(true);
      setShowComments(true);
      setShowVariants(true);
      setShowImportedPgn(!!study.importedPgnData);
      return "";
    },
    [resetTrainingSession],
  );

  const saveCurrentStudy = useCallback(async () => {
    setSavingStudy(true);
    setSaveStudyError("");

    try {
      const savedStudy = await fetchJson("/api/studies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          createStudySavePayload({
            title: saveStudyTitle,
            variantTree,
            importedPgnData,
            positionComments,
            gameAnalysis:
              gameAnalysis?.status === GAME_ANALYSIS_STATUS_COMPLETE &&
              gameAnalysisIsCurrent
                ? gameAnalysis
                : null,
          }),
        ),
      });
      setCopyNotification(`Saved study "${savedStudy.title}".`);
      closeSaveStudyPopup();

      if (showStudiesPopup) {
        await loadStudies();
      }
    } catch (error) {
      setSaveStudyError(error.message);
    } finally {
      setSavingStudy(false);
    }
  }, [
    closeSaveStudyPopup,
    importedPgnData,
    gameAnalysis,
    gameAnalysisIsCurrent,
    loadStudies,
    positionComments,
    saveStudyTitle,
    setCopyNotification,
    showStudiesPopup,
    variantTree,
  ]);

  const loadStudy = useCallback(
    async (studyId) => {
      setLoadingStudyId(studyId);
      setStudiesError("");

      try {
        const study = await fetchJson(`/api/studies/${studyId}`);
        const error = applyStudyToWorkspace(study);

        if (error) {
          setStudiesError(error);
          return;
        }

        setCopyNotification(`Loaded study "${study.title}".`);
        closeStudiesPopup();
      } catch (error) {
        setStudiesError(error.message);
      } finally {
        setLoadingStudyId("");
      }
    },
    [applyStudyToWorkspace, closeStudiesPopup, setCopyNotification],
  );

  const removeStudy = useCallback(
    async (study) => {
      if (!study?.id) {
        return;
      }

      const studyTitle = study.title ?? "Untitled study";

      if (
        typeof window !== "undefined" &&
        !window.confirm(`Delete study "${studyTitle}"? This cannot be undone.`)
      ) {
        return;
      }

      setDeletingStudyId(study.id);
      setStudiesError("");

      try {
        await fetchJson(`/api/studies/${study.id}`, {
          method: "DELETE",
        });
        setStudies((currentStudies) =>
          currentStudies.filter((currentStudy) => currentStudy.id !== study.id),
        );
        setCollections((currentCollections) =>
          currentCollections.map((collection) =>
            normalizeCollection({
              ...collection,
              studyIds: collection.studyIds.filter(
                (currentStudyId) => currentStudyId !== study.id,
              ),
            }),
          ),
        );
        if (managingStudy?.id === study.id) {
          closeManageCollectionsPopup();
        }
        setCopyNotification(`Deleted study "${studyTitle}".`);
      } catch (error) {
        setStudiesError(error.message);
      } finally {
        setDeletingStudyId("");
      }
    },
    [closeManageCollectionsPopup, managingStudy, setCopyNotification],
  );

  const createCollection = useCallback(async () => {
    setCreatingCollection(true);
    setCreateCollectionError("");

    try {
      const createdCollection = normalizeCollection(
        await fetchJson("/api/collections", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createCollectionPayload(createCollectionTitle)),
        }),
      );

      if (!createdCollection) {
        throw new Error("Created collection is invalid.");
      }

      setCollections((currentCollections) =>
        [createdCollection, ...currentCollections].sort(
          (leftCollection, rightCollection) =>
            rightCollection.updatedAt.localeCompare(leftCollection.updatedAt),
        ),
      );
      setSelectedCollectionId(createdCollection.id);
      closeCreateCollectionPopup();
    } catch (error) {
      setCreateCollectionError(error.message);
    } finally {
      setCreatingCollection(false);
    }
  }, [closeCreateCollectionPopup, createCollectionTitle]);

  const removeCollection = useCallback(
    async (collection) => {
      if (!collection?.id) {
        return;
      }

      if (
        typeof window !== "undefined" &&
        !window.confirm(`Delete collection "${collection.title}"?`)
      ) {
        return;
      }

      setDeletingCollectionId(collection.id);
      setStudiesError("");

      try {
        await fetchJson(`/api/collections/${collection.id}`, {
          method: "DELETE",
        });
        setCollections((currentCollections) =>
          currentCollections.filter(
            (currentCollection) => currentCollection.id !== collection.id,
          ),
        );
        setSelectedCollectionId((currentCollectionId) =>
          currentCollectionId === collection.id ? "" : currentCollectionId,
        );
        setCopyNotification(`Deleted collection "${collection.title}".`);
      } catch (error) {
        setStudiesError(error.message);
      } finally {
        setDeletingCollectionId("");
      }
    },
    [setCopyNotification],
  );

  const toggleStudyCollection = useCallback(async (collection, study) => {
    if (!collection?.id || !study?.id) {
      return;
    }

    const isMember = collection.studyIds.includes(study.id);
    setUpdatingCollectionId(collection.id);
    setStudiesError("");

    try {
      const updatedCollection = normalizeCollection(
        await fetchJson(
          isMember
            ? `/api/collections/${collection.id}/studies/${study.id}`
            : `/api/collections/${collection.id}/studies`,
          isMember
            ? {
                method: "DELETE",
              }
            : {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  studyId: study.id,
                }),
              },
        ),
      );

      if (!updatedCollection) {
        throw new Error("Updated collection is invalid.");
      }

      setCollections((currentCollections) =>
        currentCollections
          .map((currentCollection) =>
            currentCollection.id === updatedCollection.id
              ? updatedCollection
              : currentCollection,
          )
          .sort((leftCollection, rightCollection) =>
            rightCollection.updatedAt.localeCompare(leftCollection.updatedAt),
          ),
      );
    } catch (error) {
      setStudiesError(error.message);
    } finally {
      setUpdatingCollectionId("");
    }
  }, []);

  return {
    openSaveStudyPopup,
    closeSaveStudyPopup,
    openCreateCollectionPopup,
    closeCreateCollectionPopup,
    openManageCollectionsPopup,
    closeManageCollectionsPopup,
    closeStudiesPopup,
    loadCollections,
    loadStudies,
    openStudiesPopup,
    loadGuessHistoryGames,
    openGuessHistoryBrowser,
    closeGuessHistoryBrowser,
    saveCurrentStudy,
    loadStudy,
    removeStudy,
    createCollection,
    removeCollection,
    toggleStudyCollection,
  };
}

export default useStudyLibraryActions;
