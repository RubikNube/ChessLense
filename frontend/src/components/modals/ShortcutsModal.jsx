import { getShortcutDisplayLabel } from "../../utils/appState.js";
import ModalShell from "./ModalShell.jsx";
import {
  shortcutCloseButtonStyle,
  shortcutItemStyle,
  shortcutKeyStyle,
  shortcutListStyle,
} from "./modalStyles.js";

function ShortcutsModal({ shortcutEntries, onClose }) {
  return (
    <ModalShell
      title="Keyboard Shortcuts"
      titleId="keyboard-shortcuts-title"
      onClose={onClose}
    >
      <ul style={shortcutListStyle}>
        {shortcutEntries.map(({ actionName, label, keys }) => (
          <li key={actionName} style={shortcutItemStyle}>
            <span>{label}</span>
            <kbd style={shortcutKeyStyle}>
              {keys.length
                ? keys.map(getShortcutDisplayLabel).join(" / ")
                : "Unassigned"}
            </kbd>
          </li>
        ))}
      </ul>
      <button
        type="button"
        style={shortcutCloseButtonStyle}
        onClick={onClose}
      >
        Close
      </button>
    </ModalShell>
  );
}

export default ShortcutsModal;
