import { getCollectionsForStudy } from "../../utils/collections.js";
import ModalShell from "./ModalShell.jsx";
import {
  collectionListStyle,
  collectionRowStyle,
  collectionSelectButtonStyle,
  collectionTagListStyle,
  collectionTagStyle,
  modalActionRowStyle,
  modalButtonStyle,
  modalDangerButtonStyle,
  modalErrorStyle,
  modalPrimaryButtonStyle,
  studyHeaderStyle,
  studyListItemStyle,
  studyListStyle,
  studyMetaStyle,
} from "./modalStyles.js";

function formatStudyTimestamp(timestamp) {
  const parsedTimestamp = new Date(timestamp);

  if (Number.isNaN(parsedTimestamp.getTime())) {
    return "Unknown";
  }

  return parsedTimestamp.toLocaleString();
}

function getStudySummaryText(study) {
  if (!study || typeof study !== "object") {
    return "";
  }

  const summary = study.summary ?? {};
  const parts = [];

  if (summary.white || summary.black) {
    parts.push(
      summary.white && summary.black
        ? `${summary.white} vs ${summary.black}`
        : summary.white || summary.black,
    );
  }

  if (summary.event) {
    parts.push(summary.event);
  }

  parts.push(`${summary.commentCount ?? 0} comments`);
  parts.push(`${summary.maxPly ?? 0} plies`);

  return parts.join(" · ");
}

const studyActionsStyle = {
  display: "grid",
  gap: "0.5rem",
};

function StudiesModal({
  studiesError,
  openCreateCollectionPopup,
  collectionsLoading,
  studiesLoading,
  collections,
  selectedCollectionId,
  setSelectedCollectionId,
  studies,
  deletingCollectionId,
  removeCollection,
  selectedCollection,
  visibleStudies,
  loadingStudyId,
  deletingStudyId,
  openManageCollectionsPopup,
  loadStudy,
  removeStudy,
  loadStudies,
  loadCollections,
  updatingCollectionId,
  onClose,
}) {
  return (
    <ModalShell title="Studies" titleId="studies-title" onClose={onClose} wide>
      <p>Browse saved studies and load one into current board.</p>
      {!!studiesError && <p style={modalErrorStyle}>{studiesError}</p>}
      <div style={modalActionRowStyle}>
        <button
          type="button"
          style={modalPrimaryButtonStyle}
          onClick={openCreateCollectionPopup}
          disabled={collectionsLoading || studiesLoading}
        >
          New collection
        </button>
      </div>
      <h3>Collections</h3>
      {collectionsLoading && <p>Loading collections...</p>}
      {!collectionsLoading && !collections.length && (
        <p>No collections yet. Create one to group studies.</p>
      )}
      {!!collections.length && (
        <ul style={collectionListStyle}>
          <li style={collectionRowStyle}>
            <button
              type="button"
              style={{
                ...collectionSelectButtonStyle,
                ...(!selectedCollectionId ? modalPrimaryButtonStyle : {}),
              }}
              onClick={() => setSelectedCollectionId("")}
            >
              All studies ({studies.length})
            </button>
          </li>
          {collections.map((collection) => (
            <li key={collection.id} style={collectionRowStyle}>
              <button
                type="button"
                style={{
                  ...collectionSelectButtonStyle,
                  ...(selectedCollectionId === collection.id
                    ? modalPrimaryButtonStyle
                    : {}),
                }}
                onClick={() => setSelectedCollectionId(collection.id)}
                disabled={deletingCollectionId === collection.id}
              >
                {collection.title} ({collection.studyCount})
              </button>
              <button
                type="button"
                style={modalDangerButtonStyle}
                onClick={() => {
                  void removeCollection(collection);
                }}
                disabled={deletingCollectionId === collection.id}
              >
                {deletingCollectionId === collection.id ? "Removing..." : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <h3 style={{ marginTop: "1.25rem" }}>
        {selectedCollection ? `Studies in ${selectedCollection.title}` : "All studies"}
      </h3>
      {studiesLoading && <p>Loading studies...</p>}
      {!studiesLoading && !visibleStudies.length && !studiesError && (
        <p>No studies saved yet.</p>
      )}
      {!!visibleStudies.length && (
        <ul style={studyListStyle}>
          {visibleStudies.map((study) => {
            const studyCollections = getCollectionsForStudy(collections, study.id);

            return (
              <li key={study.id} style={studyListItemStyle}>
                <div style={studyHeaderStyle}>
                  <div>
                    <strong>{study.title}</strong>
                    <p style={studyMetaStyle}>{getStudySummaryText(study)}</p>
                    <p style={studyMetaStyle}>
                      Updated {formatStudyTimestamp(study.updatedAt)}
                    </p>
                    <div style={collectionTagListStyle}>
                      {studyCollections.length ? (
                        studyCollections.map((collection) => (
                          <span key={`${study.id}-${collection.id}`} style={collectionTagStyle}>
                            {collection.title}
                          </span>
                        ))
                      ) : (
                        <span style={collectionTagStyle}>No collections</span>
                      )}
                    </div>
                  </div>
                  <div style={studyActionsStyle}>
                    <button
                      type="button"
                      style={modalButtonStyle}
                      onClick={() => openManageCollectionsPopup(study)}
                      disabled={deletingStudyId === study.id || loadingStudyId === study.id}
                    >
                      Collections
                    </button>
                    <button
                      type="button"
                      style={modalPrimaryButtonStyle}
                      onClick={() => {
                        void loadStudy(study.id);
                      }}
                      disabled={loadingStudyId === study.id || deletingStudyId === study.id}
                    >
                      {loadingStudyId === study.id ? "Loading..." : "Load"}
                    </button>
                    <button
                      type="button"
                      style={modalDangerButtonStyle}
                      onClick={() => {
                        void removeStudy(study);
                      }}
                      disabled={loadingStudyId === study.id || deletingStudyId === study.id}
                    >
                      {deletingStudyId === study.id ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div style={modalActionRowStyle}>
        <button
          type="button"
          style={modalButtonStyle}
          onClick={() => {
            void loadStudies();
            void loadCollections();
          }}
          disabled={studiesLoading || collectionsLoading}
        >
          Refresh
        </button>
        <button
          type="button"
          style={modalButtonStyle}
          onClick={onClose}
          disabled={
            studiesLoading ||
            collectionsLoading ||
            !!loadingStudyId ||
            !!deletingStudyId ||
            !!deletingCollectionId ||
            !!updatingCollectionId
          }
        >
          Close
        </button>
      </div>
    </ModalShell>
  );
}

export default StudiesModal;
