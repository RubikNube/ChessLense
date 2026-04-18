import { useEffect, useState } from "react";
import ModalShell from "./ModalShell.jsx";
import {
  modalActionRowStyle,
  modalButtonStyle,
  modalFieldLabelStyle,
  modalInputStyle,
  modalPrimaryButtonStyle,
} from "./modalStyles.js";

function LichessTokenModal({ currentToken, onClose, onSave }) {
  const [draftToken, setDraftToken] = useState(currentToken);

  useEffect(() => {
    setDraftToken(currentToken);
  }, [currentToken]);

  return (
    <ModalShell title="Lichess Token" titleId="lichess-token-title" onClose={onClose}>
      <p>
        Use a Lichess API token for Opening Tree requests when the server environment does
        not provide <code>LICHESS_API_TOKEN</code>. The token stays only in this app
        session and is not persisted.
      </p>
      <label style={modalFieldLabelStyle} htmlFor="lichess-token-input">
        API token
      </label>
      <input
        id="lichess-token-input"
        className="modal-input"
        style={modalInputStyle}
        type="password"
        value={draftToken}
        onChange={(event) => setDraftToken(event.target.value)}
        placeholder="Paste Lichess API token"
        autoFocus
        autoComplete="off"
        spellCheck={false}
      />
      <div style={modalActionRowStyle}>
        <button type="button" style={modalButtonStyle} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          style={modalButtonStyle}
          onClick={() => setDraftToken("")}
        >
          Clear
        </button>
        <button
          type="button"
          style={modalPrimaryButtonStyle}
          onClick={() => onSave(draftToken.trim())}
        >
          Save token
        </button>
      </div>
    </ModalShell>
  );
}

export default LichessTokenModal;
