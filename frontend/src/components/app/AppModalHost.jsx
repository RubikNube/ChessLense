import BackendConnectionModal from "../modals/BackendConnectionModal.jsx";
import CreateCollectionModal from "../modals/CreateCollectionModal.jsx";
import GuessHistoryBrowserModal from "../modals/GuessHistoryBrowserModal.jsx";
import ImportPgnModal from "../modals/ImportPgnModal.jsx";
import LichessSearchModal from "../modals/LichessSearchModal.jsx";
import LichessTokenModal from "../modals/LichessTokenModal.jsx";
import ManageCollectionsModal from "../modals/ManageCollectionsModal.jsx";
import OtbOpeningTreeGamesModal from "../modals/OtbOpeningTreeGamesModal.jsx";
import OtbSearchModal from "../modals/OtbSearchModal.jsx";
import SaveStudyModal from "../modals/SaveStudyModal.jsx";
import ShortcutsModal from "../modals/ShortcutsModal.jsx";
import StudiesModal from "../modals/StudiesModal.jsx";
import ThemeSettingsModal from "../modals/ThemeSettingsModal.jsx";

function AppModalHost({ app }) {
  const {
    appliedOtbSearchFilters,
    applyThemePreset,
    backendApiBaseUrl,
    backendApiToken,
    backendConnectionError,
    buildStudyTitle,
    changeOtbPage,
    changeOtbPageSize,
    closeBackendConnectionPopup,
    closeCreateCollectionPopup,
    closeGuessHistoryBrowser,
    closeImportPgnPopup,
    closeLichessSearchPopup,
    closeLichessTokenPopup,
    closeManageCollectionsPopup,
    closeOtbSearchPopup,
    closeSaveStudyPopup,
    closeShortcutsPopup,
    closeStudiesPopup,
    closeThemeSettingsPopup,
    collections,
    collectionsLoading,
    createCollection,
    createCollectionError,
    createCollectionTitle,
    creatingCollection,
    deletingCollectionId,
    deletingStudyId,
    exploreOtbPlayerOpeningTree,
    guessHistoryBrowserError,
    guessHistoryBrowserGames,
    guessHistoryBrowserLoading,
    hasSearchedLichess,
    hasSearchedOtb,
    importLichessGame,
    importOtbGame,
    importOtbOpeningTreeGame,
    importOtbPgnFile,
    importPgn,
    importPgnError,
    importPgnValue,
    importedPgnData,
    importingOtbFile,
    lichessApiToken,
    lichessImportError,
    lichessImportingGameId,
    lichessSearchError,
    lichessSearchFilters,
    lichessSearchLoading,
    lichessSearchResults,
    loadCollections,
    loadGuessHistoryGame,
    loadGuessHistoryGames,
    loadStudies,
    loadStudy,
    loadingGuessHistoryGameKey,
    loadingStudyId,
    managingStudy,
    openCreateCollectionPopup,
    openManageCollectionsPopup,
    otbFileImportError,
    otbFileImportStatus,
    otbImportError,
    otbImportingGameId,
    otbOpeningTreeGameSelection,
    otbSearchError,
    otbSearchFilters,
    otbSearchLoading,
    otbSearchPage,
    otbSearchPagination,
    otbSearchResults,
    removeCollection,
    removeStudy,
    resetTheme,
    resolvedTheme,
    saveBackendConnection,
    saveCurrentStudy,
    saveLichessToken,
    saveStudyError,
    saveStudyTitle,
    savingStudy,
    searchLichessGames,
    searchOtbGames,
    selectedCollection,
    selectedCollectionId,
    setCreateCollectionTitle,
    setImportPgnError,
    setImportPgnValue,
    setLichessSearchError,
    setLichessSearchFilters,
    setOtbFileImportError,
    setOtbFileImportStatus,
    setOtbOpeningTreeGameSelection,
    setOtbSearchError,
    setOtbSearchFilters,
    setSaveStudyTitle,
    setSelectedCollectionId,
    shortcutEntries,
    showBackendConnectionPopup,
    showCreateCollectionPopup,
    showGuessHistoryBrowserPopup,
    showImportPgnPopup,
    showLichessSearchPopup,
    showLichessTokenPopup,
    showManageCollectionsPopup,
    showOtbSearchPopup,
    showSaveStudyPopup,
    showShortcutsPopup,
    showStudiesPopup,
    showThemeSettingsPopup,
    studies,
    studiesError,
    studiesLoading,
    themeOverrides,
    toggleStudyCollection,
    updateThemeColor,
    updatingCollectionId,
    visibleStudies,
  } = app;

  return (
    <>
      {showImportPgnPopup && (
        <ImportPgnModal
          importPgnValue={importPgnValue}
          setImportPgnValue={setImportPgnValue}
          importPgnError={importPgnError}
          setImportPgnError={setImportPgnError}
          otbFileImportError={otbFileImportError}
          setOtbFileImportError={setOtbFileImportError}
          otbFileImportStatus={otbFileImportStatus}
          setOtbFileImportStatus={setOtbFileImportStatus}
          importingOtbFile={importingOtbFile}
          onImport={importPgn}
          onImportOtbFile={importOtbPgnFile}
          onClose={closeImportPgnPopup}
        />
      )}

      {showSaveStudyPopup && (
        <SaveStudyModal
          saveStudyTitle={saveStudyTitle}
          setSaveStudyTitle={setSaveStudyTitle}
          saveStudyError={saveStudyError}
          savingStudy={savingStudy}
          placeholderTitle={buildStudyTitle(importedPgnData)}
          onSave={saveCurrentStudy}
          onClose={closeSaveStudyPopup}
        />
      )}

      {showStudiesPopup && (
        <StudiesModal
          studiesError={studiesError}
          openCreateCollectionPopup={openCreateCollectionPopup}
          collectionsLoading={collectionsLoading}
          studiesLoading={studiesLoading}
          collections={collections}
          selectedCollectionId={selectedCollectionId}
          setSelectedCollectionId={setSelectedCollectionId}
          studies={studies}
          deletingCollectionId={deletingCollectionId}
          removeCollection={removeCollection}
          selectedCollection={selectedCollection}
          visibleStudies={visibleStudies}
          loadingStudyId={loadingStudyId}
          deletingStudyId={deletingStudyId}
          openManageCollectionsPopup={openManageCollectionsPopup}
          loadStudy={loadStudy}
          removeStudy={removeStudy}
          loadStudies={loadStudies}
          loadCollections={loadCollections}
          updatingCollectionId={updatingCollectionId}
          onClose={closeStudiesPopup}
        />
      )}

      {showGuessHistoryBrowserPopup && (
        <GuessHistoryBrowserModal
          guessHistoryBrowserGames={guessHistoryBrowserGames}
          guessHistoryBrowserError={guessHistoryBrowserError}
          guessHistoryBrowserLoading={guessHistoryBrowserLoading}
          loadingGuessHistoryGameKey={loadingGuessHistoryGameKey}
          loadGuessHistoryGames={loadGuessHistoryGames}
          loadGuessHistoryGame={loadGuessHistoryGame}
          onClose={closeGuessHistoryBrowser}
        />
      )}

      {showCreateCollectionPopup && (
        <CreateCollectionModal
          createCollectionTitle={createCollectionTitle}
          setCreateCollectionTitle={setCreateCollectionTitle}
          createCollectionError={createCollectionError}
          creatingCollection={creatingCollection}
          onCreate={createCollection}
          onClose={closeCreateCollectionPopup}
        />
      )}

      {showManageCollectionsPopup && managingStudy && (
        <ManageCollectionsModal
          managingStudy={managingStudy}
          collections={collections}
          updatingCollectionId={updatingCollectionId}
          onToggleStudyCollection={toggleStudyCollection}
          onClose={closeManageCollectionsPopup}
        />
      )}

      {showLichessSearchPopup && (
        <LichessSearchModal
          filters={lichessSearchFilters}
          setFilters={setLichessSearchFilters}
          searchError={lichessSearchError}
          setSearchError={setLichessSearchError}
          importError={lichessImportError}
          searchLoading={lichessSearchLoading}
          hasSearched={hasSearchedLichess}
          results={lichessSearchResults}
          importingGameId={lichessImportingGameId}
          onSearch={searchLichessGames}
          onImport={importLichessGame}
          onClose={closeLichessSearchPopup}
        />
      )}

      {showLichessTokenPopup && (
        <LichessTokenModal
          currentToken={lichessApiToken}
          onClose={closeLichessTokenPopup}
          onSave={saveLichessToken}
        />
      )}

      {showBackendConnectionPopup && (
        <BackendConnectionModal
          currentToken={backendApiToken}
          currentUrl={backendApiBaseUrl}
          error={backendConnectionError}
          onClose={closeBackendConnectionPopup}
          onSave={saveBackendConnection}
        />
      )}

      {showOtbSearchPopup && (
        <OtbSearchModal
          filters={otbSearchFilters}
          setFilters={setOtbSearchFilters}
          page={otbSearchPage}
          pagination={otbSearchPagination}
          searchError={otbSearchError}
          setSearchError={setOtbSearchError}
          importError={otbImportError}
          searchLoading={otbSearchLoading}
          hasSearched={hasSearchedOtb}
          results={otbSearchResults}
          importingGameId={otbImportingGameId}
          canExploreOpeningTree={Boolean(
            appliedOtbSearchFilters.player && otbSearchResults.length,
          )}
          onSearch={searchOtbGames}
          onPageChange={changeOtbPage}
          onPageSizeChange={changeOtbPageSize}
          onImport={importOtbGame}
          onExploreOpeningTree={exploreOtbPlayerOpeningTree}
          onClose={closeOtbSearchPopup}
        />
      )}

      {otbOpeningTreeGameSelection && (
        <OtbOpeningTreeGamesModal
          selection={otbOpeningTreeGameSelection}
          onImport={importOtbOpeningTreeGame}
          onClose={() => setOtbOpeningTreeGameSelection(null)}
        />
      )}

      {showThemeSettingsPopup && (
        <ThemeSettingsModal
          themeOverrides={themeOverrides}
          resolvedTheme={resolvedTheme}
          onChangeThemeColor={updateThemeColor}
          onApplyThemePreset={applyThemePreset}
          onResetTheme={resetTheme}
          onClose={closeThemeSettingsPopup}
        />
      )}

      {showShortcutsPopup && (
        <ShortcutsModal
          shortcutEntries={shortcutEntries}
          onClose={closeShortcutsPopup}
        />
      )}
    </>
  );
}

export default AppModalHost;
