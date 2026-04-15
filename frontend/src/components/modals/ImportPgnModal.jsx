import ModalShell from "./ModalShell.jsx";
import {
  importPgnTextAreaStyle,
  modalActionRowStyle,
  modalButtonStyle,
  modalErrorStyle,
  modalPrimaryButtonStyle,
} from "./modalStyles.js";

function ImportPgnModal({
  importPgnValue,
  setImportPgnValue,
  importPgnError,
  setImportPgnError,
  onImport,
  onClose,
}) {
  return (
    <ModalShell title="Import PGN" titleId="import-pgn-title" onClose={onClose}>
      <p>Paste a PGN game score to load it on the board.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onImport();
        }}
      >
        <textarea
          style={importPgnTextAreaStyle}
          value={importPgnValue}
          onChange={(event) => {
            setImportPgnValue(event.target.value);
            setImportPgnError("");
          }}
          aria-label="PGN text"
          placeholder={'[Event "Casual Game"]\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6'}
          autoFocus
          spellCheck={false}
        />
        {importPgnError && <p style={modalErrorStyle}>{importPgnError}</p>}
        <div style={modalActionRowStyle}>
          <button
            type="button"
            style={modalButtonStyle}
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" style={modalPrimaryButtonStyle}>
            Import
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default ImportPgnModal;
