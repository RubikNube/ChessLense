import ModalShell from "./ModalShell.jsx";
import {
  modalActionRowStyle,
  modalButtonStyle,
  modalErrorStyle,
  modalFieldLabelStyle,
  modalInputStyle,
  modalPrimaryButtonStyle,
} from "./modalStyles.js";

function CreateCollectionModal({
  createCollectionTitle,
  setCreateCollectionTitle,
  createCollectionError,
  creatingCollection,
  onCreate,
  onClose,
}) {
  return (
    <ModalShell title="New collection" titleId="create-collection-title" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onCreate();
        }}
      >
        <label style={modalFieldLabelStyle}>
          Collection title
          <input
            type="text"
            value={createCollectionTitle}
            onChange={(event) => setCreateCollectionTitle(event.target.value)}
            style={modalInputStyle}
            placeholder="Opening prep"
          />
        </label>
        {!!createCollectionError && <p style={modalErrorStyle}>{createCollectionError}</p>}
        <div style={modalActionRowStyle}>
          <button
            type="button"
            style={modalButtonStyle}
            onClick={onClose}
            disabled={creatingCollection}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={modalPrimaryButtonStyle}
            disabled={creatingCollection}
          >
            {creatingCollection ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default CreateCollectionModal;
