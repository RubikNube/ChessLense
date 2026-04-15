import ModalShell from "./ModalShell.jsx";
import {
  collectionListStyle,
  collectionRowStyle,
  modalActionRowStyle,
  modalButtonStyle,
  modalDangerButtonStyle,
  modalPrimaryButtonStyle,
  studyMetaStyle,
} from "./modalStyles.js";

function ManageCollectionsModal({
  managingStudy,
  collections,
  updatingCollectionId,
  onToggleStudyCollection,
  onClose,
}) {
  return (
    <ModalShell
      title="Study collections"
      titleId="manage-study-collections-title"
      onClose={onClose}
    >
      <p>{managingStudy.title}</p>
      {!collections.length && <p>No collections yet. Create one first.</p>}
      {!!collections.length && (
        <ul style={collectionListStyle}>
          {collections.map((collection) => {
            const isMember = collection.studyIds.includes(managingStudy.id);

            return (
              <li key={`${managingStudy.id}-${collection.id}`} style={collectionRowStyle}>
                <div>
                  <strong>{collection.title}</strong>
                  <p style={studyMetaStyle}>{collection.studyCount} studies</p>
                </div>
                <button
                  type="button"
                  style={isMember ? modalDangerButtonStyle : modalPrimaryButtonStyle}
                  onClick={() => {
                    void onToggleStudyCollection(collection, managingStudy);
                  }}
                  disabled={updatingCollectionId === collection.id}
                >
                  {updatingCollectionId === collection.id
                    ? "Saving..."
                    : isMember
                      ? "Remove"
                      : "Add"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div style={modalActionRowStyle}>
        <button
          type="button"
          style={modalButtonStyle}
          onClick={onClose}
          disabled={!!updatingCollectionId}
        >
          Close
        </button>
      </div>
    </ModalShell>
  );
}

export default ManageCollectionsModal;
