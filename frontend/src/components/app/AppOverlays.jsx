import { createPortal } from "react-dom";
import PositionPreviewBoard from "../PositionPreviewBoard.jsx";

function AppOverlays({ app }) {
  const { boardOrientation, copyNotification, trainingPreview } = app;

  return (
    <>
      {trainingPreview &&
        createPortal(
          <div
            className="training-preview-tooltip"
            role="tooltip"
            style={{
              top: `${trainingPreview.top}px`,
              left: `${trainingPreview.left}px`,
              transform: "translateY(-50%)",
            }}
          >
            <span className="annotation-label">Resulting position</span>
            <PositionPreviewBoard
              fen={trainingPreview.fen}
              orientation={boardOrientation}
            />
          </div>,
          document.body,
        )}

      {copyNotification && (
        <div className="copy-notification" role="status" aria-live="polite">
          {copyNotification}
        </div>
      )}
    </>
  );
}

export default AppOverlays;
