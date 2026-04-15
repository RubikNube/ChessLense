import { shortcutOverlayStyle, shortcutModalStyle, wideModalStyle } from "./modalStyles.js";

function ModalShell({
  title,
  titleId,
  onClose,
  wide = false,
  children,
}) {
  return (
    <div style={shortcutOverlayStyle} onClick={onClose} role="presentation">
      <div
        style={wide ? wideModalStyle : shortcutModalStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        {title ? <h2 id={titleId}>{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}

export default ModalShell;
