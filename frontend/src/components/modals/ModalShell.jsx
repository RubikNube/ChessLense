import { useEffect } from "react";
import {
  modalHeaderStyle,
  modalIconCloseButtonStyle,
  modalTitleStyle,
  shortcutOverlayStyle,
  shortcutModalStyle,
  wideModalStyle,
} from "./modalStyles.js";

function ModalShell({
  title,
  titleId,
  onClose,
  showCloseButton = false,
  wide = false,
  children,
}) {
  useEffect(() => {
    if (typeof onClose !== "function") {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div style={shortcutOverlayStyle} onClick={onClose} role="presentation">
      <div
        style={wide ? wideModalStyle : shortcutModalStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        {title || showCloseButton ? (
          <div style={modalHeaderStyle}>
            {title ? <h2 id={titleId} style={modalTitleStyle}>{title}</h2> : <span />}
            {showCloseButton ? (
              <button
                type="button"
                style={modalIconCloseButtonStyle}
                onClick={onClose}
                aria-label="Close dialog"
              >
                x
              </button>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export default ModalShell;
