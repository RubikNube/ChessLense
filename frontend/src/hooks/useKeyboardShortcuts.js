import { useEffect } from "react";
import { matchesShortcut } from "../utils/appState.js";

function useKeyboardShortcuts({
  shortcutConfig,
  modalState,
  actions,
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.defaultPrevented) {
        return;
      }

      if (modalState.showImportPgnPopup) {
        if (event.key === "Escape") {
          event.preventDefault();
          actions.closeImportPgnPopup();
        }

        return;
      }

      if (modalState.showSaveStudyPopup) {
        if (event.key === "Escape") {
          event.preventDefault();
          actions.closeSaveStudyPopup();
        }

        return;
      }

      if (modalState.showCreateCollectionPopup) {
        if (event.key === "Escape") {
          event.preventDefault();
          actions.closeCreateCollectionPopup();
        }

        return;
      }

      if (modalState.showManageCollectionsPopup) {
        if (event.key === "Escape") {
          event.preventDefault();
          actions.closeManageCollectionsPopup();
        }

        return;
      }

      if (modalState.showStudiesPopup) {
        if (event.key === "Escape") {
          event.preventDefault();
          actions.closeStudiesPopup();
        }

        return;
      }

      if (modalState.showLichessSearchPopup) {
        if (event.key === "Escape") {
          event.preventDefault();
          actions.closeLichessSearchPopup();
        }

        return;
      }

      if (modalState.showLichessTokenPopup) {
        if (event.key === "Escape") {
          event.preventDefault();
          actions.closeLichessTokenPopup();
        }

        return;
      }

      if (modalState.showOtbSearchPopup) {
        if (event.key === "Escape") {
          event.preventDefault();
          actions.closeOtbSearchPopup();
        }

        return;
      }

      if (modalState.showShortcutsPopup) {
        if (matchesShortcut(event, shortcutConfig.closeShortcutsPopup.keys)) {
          event.preventDefault();
          actions.closeShortcutsPopup();
        }

        return;
      }

      const target = event.target;

      if (target instanceof HTMLElement) {
        const tagName = target.tagName;

        if (
          target.isContentEditable ||
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          tagName === "SELECT"
        ) {
          return;
        }
      }

      if (matchesShortcut(event, shortcutConfig.openShortcutsPopup.keys)) {
        event.preventDefault();
        actions.setOpenMenu(null);
        actions.openShortcutsPopup();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.goToStart.keys)) {
        event.preventDefault();
        actions.goToStart();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.undoMove.keys)) {
        event.preventDefault();
        actions.undoMove();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.redoMove.keys)) {
        event.preventDefault();
        actions.redoMove();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.jumpToMainVariant.keys)) {
        event.preventDefault();
        actions.jumpToMainVariant();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.jumpBackToSideline.keys)) {
        event.preventDefault();
        actions.jumpBackToSideline();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.goToEnd.keys)) {
        event.preventDefault();
        actions.goToEnd();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.flipBoard.keys)) {
        event.preventDefault();
        actions.toggleBoardOrientation();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.toggleMoveHistory.keys)) {
        event.preventDefault();
        actions.toggleMoveHistory();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.toggleOpeningTreePanel.keys)) {
        event.preventDefault();
        actions.toggleOpeningTreePanel();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.toggleReplayTrainingPanel.keys)) {
        event.preventDefault();
        actions.toggleReplayTrainingPanel();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.toggleGuessTrainingPanel.keys)) {
        event.preventDefault();
        actions.toggleGuessTrainingPanel();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.togglePlayComputerPanel.keys)) {
        event.preventDefault();
        actions.togglePlayComputerPanel();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.toggleEngineWindow.keys)) {
        event.preventDefault();
        actions.toggleEngineWindow();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.toggleComments.keys)) {
        event.preventDefault();
        actions.toggleComments();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.toggleImportedPgn.keys)) {
        event.preventDefault();
        actions.toggleImportedPgn();
        return;
      }

      if (matchesShortcut(event, shortcutConfig.toggleVariants.keys)) {
        event.preventDefault();
        actions.toggleVariants();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [actions, modalState, shortcutConfig]);
}

export default useKeyboardShortcuts;
