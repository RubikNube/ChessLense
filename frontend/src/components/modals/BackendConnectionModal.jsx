import { useEffect, useState } from "react";
import ModalShell from "./ModalShell.jsx";
import {
  modalActionRowStyle,
  modalButtonStyle,
  modalErrorStyle,
  modalFieldLabelStyle,
  modalInputStyle,
  modalPrimaryButtonStyle,
} from "./modalStyles.js";

function BackendConnectionModal({ currentUrl, error, onClose, onSave }) {
  const [draftUrl, setDraftUrl] = useState(currentUrl);

  useEffect(() => {
    setDraftUrl(currentUrl);
  }, [currentUrl]);

  return (
    <ModalShell
      title="Backend Connection"
      titleId="backend-connection-title"
      onClose={onClose}
    >
      <p>
        Configure the backend used for analysis, studies, collections, Lichess
        proxying, and OTB search. Leave this blank to use the current site
        origin and its <code>/api</code> routes.
      </p>
      <label style={modalFieldLabelStyle} htmlFor="backend-connection-input">
        Backend base URL
      </label>
      <input
        id="backend-connection-input"
        className="modal-input"
        style={modalInputStyle}
        type="url"
        value={draftUrl}
        onChange={(event) => setDraftUrl(event.target.value)}
        placeholder="https://your-backend.example.com"
        autoFocus
        autoComplete="url"
        spellCheck={false}
      />
      {error ? <p style={modalErrorStyle}>{error}</p> : null}
      <div style={modalActionRowStyle}>
        <button type="button" style={modalButtonStyle} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          style={modalButtonStyle}
          onClick={() => onSave("")}
        >
          Use local /api
        </button>
        <button
          type="button"
          style={modalPrimaryButtonStyle}
          onClick={() => onSave(draftUrl)}
        >
          Save backend
        </button>
      </div>
    </ModalShell>
  );
}

export default BackendConnectionModal;
