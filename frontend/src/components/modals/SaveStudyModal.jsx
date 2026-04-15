import ModalShell from "./ModalShell.jsx";
import {
  modalActionRowStyle,
  modalButtonStyle,
  modalErrorStyle,
  modalFieldLabelStyle,
  modalInputStyle,
  modalPrimaryButtonStyle,
} from "./modalStyles.js";

function SaveStudyModal({
  saveStudyTitle,
  setSaveStudyTitle,
  saveStudyError,
  savingStudy,
  placeholderTitle,
  onSave,
  onClose,
}) {
  return (
    <ModalShell title="Save to Studies" titleId="save-study-title" onClose={onClose}>
      <p>Store current game, variants, and comments on server.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onSave();
        }}
      >
        <label style={modalFieldLabelStyle}>
          Study title
          <input
            type="text"
            value={saveStudyTitle}
            onChange={(event) => setSaveStudyTitle(event.target.value)}
            style={modalInputStyle}
            placeholder={placeholderTitle}
          />
        </label>
        {!!saveStudyError && <p style={modalErrorStyle}>{saveStudyError}</p>}
        <div style={modalActionRowStyle}>
          <button
            type="button"
            style={modalButtonStyle}
            onClick={onClose}
            disabled={savingStudy}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={modalPrimaryButtonStyle}
            disabled={savingStudy}
          >
            {savingStudy ? "Saving..." : "Save study"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default SaveStudyModal;
