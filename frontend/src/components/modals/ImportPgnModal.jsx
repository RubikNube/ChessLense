import { useEffect, useRef } from "react";
import ModalShell from "./ModalShell.jsx";
import {
  importPgnTextAreaStyle,
  modalActionRowStyle,
  modalButtonStyle,
  modalErrorStyle,
  modalInputStyle,
  modalPrimaryButtonStyle,
  modalSuccessStyle,
} from "./modalStyles.js";

function ImportPgnModal({
  importPgnValue,
  setImportPgnValue,
  importPgnError,
  setImportPgnError,
  otbFileImportError,
  setOtbFileImportError,
  otbFileImportStatus,
  setOtbFileImportStatus,
  importingOtbFile,
  onImport,
  onImportOtbFile,
  onClose,
}) {
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!otbFileImportStatus || !fileInputRef.current) {
      return;
    }

    fileInputRef.current.value = "";
  }, [otbFileImportStatus]);

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
      <div
        style={{
          marginTop: "1.5rem",
          paddingTop: "1rem",
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <p>Or choose one local .pgn file to import its games into the OTB database.</p>
        <input
          ref={fileInputRef}
          style={modalInputStyle}
          type="file"
          accept=".pgn"
          aria-label="PGN file"
          onChange={() => {
            setOtbFileImportError("");
            setOtbFileImportStatus("");
          }}
        />
        {otbFileImportError && <p style={modalErrorStyle}>{otbFileImportError}</p>}
        {otbFileImportStatus && <p style={modalSuccessStyle}>{otbFileImportStatus}</p>}
        <div style={modalActionRowStyle}>
          <button
            type="button"
            style={modalPrimaryButtonStyle}
            onClick={() => onImportOtbFile(fileInputRef.current?.files?.[0] ?? null)}
            disabled={importingOtbFile}
          >
            {importingOtbFile ? "Importing..." : "Import File to OTB DB"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export default ImportPgnModal;
