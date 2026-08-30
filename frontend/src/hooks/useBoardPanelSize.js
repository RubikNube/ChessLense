import { useEffect, useRef, useState } from "react";

function useBoardPanelSize(resizeKey) {
  const boardPanelRef = useRef(null);
  const [boardPanelHeight, setBoardPanelHeight] = useState(0);

  useEffect(() => {
    const boardPanelElement = boardPanelRef.current;
    if (!boardPanelElement) return undefined;

    function updateBoardPanelHeight() {
      setBoardPanelHeight(boardPanelElement.getBoundingClientRect().height);
    }

    updateBoardPanelHeight();
    if (typeof ResizeObserver !== "function") {
      window.addEventListener("resize", updateBoardPanelHeight);
      return () => window.removeEventListener("resize", updateBoardPanelHeight);
    }

    const resizeObserver = new ResizeObserver(updateBoardPanelHeight);
    resizeObserver.observe(boardPanelElement);
    return () => resizeObserver.disconnect();
  }, [resizeKey]);

  return { boardPanelRef, boardPanelHeight };
}

export default useBoardPanelSize;
