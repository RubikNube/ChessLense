import { useCallback, useEffect, useState } from "react";
import { buildPositionSetupFen } from "../utils/positionSetup.js";

function useFenClipboard({ fen, positionSetupState, setPositionSetupError }) {
  const [copyNotification, setCopyNotification] = useState("");

  const copyFenToClipboard = useCallback(async () => {
    let fenToCopy = fen;
    if (positionSetupState) {
      const result = buildPositionSetupFen(
        positionSetupState.position,
        positionSetupState.activeColor,
        positionSetupState.castlingRights,
      );
      if (result.error) {
        setPositionSetupError(result.error);
        return;
      }
      fenToCopy = result.fen;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fenToCopy);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = fenToCopy;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (!copied) throw new Error("Copy command failed");
      }
      setCopyNotification("FEN copied to clipboard.");
    } catch (error) {
      console.error("Failed to copy FEN to clipboard:", error);
    }
  }, [fen, positionSetupState, setPositionSetupError]);

  useEffect(() => {
    if (!copyNotification) return undefined;
    const timeoutId = window.setTimeout(() => setCopyNotification(""), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [copyNotification]);

  return { copyFenToClipboard, copyNotification, setCopyNotification };
}

export default useFenClipboard;
