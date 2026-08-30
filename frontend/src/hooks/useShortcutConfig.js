import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_SHORTCUT_CONFIG,
  DEFAULT_SHORTCUT_CONFIG_SIGNATURE,
  SHORTCUT_ACTION_ORDER,
  normalizeShortcutConfig,
} from "../utils/appState.js";

function useShortcutConfig() {
  const [shortcutConfig, setShortcutConfig] = useState(DEFAULT_SHORTCUT_CONFIG);
  const signatureRef = useRef(DEFAULT_SHORTCUT_CONFIG_SIGNATURE);

  useEffect(() => {
    let ignore = false;

    async function loadShortcuts() {
      try {
        const response = await fetch(
          new URL("../shortcuts.json", import.meta.url),
          {
            cache: "no-store",
          },
        );
        if (!response.ok) throw new Error("Failed to load shortcuts");

        const normalizedConfig = normalizeShortcutConfig(await response.json());
        const nextSignature = JSON.stringify(normalizedConfig);
        if (!ignore && nextSignature !== signatureRef.current) {
          signatureRef.current = nextSignature;
          setShortcutConfig(normalizedConfig);
        }
      } catch {
        if (
          !ignore &&
          signatureRef.current !== DEFAULT_SHORTCUT_CONFIG_SIGNATURE
        ) {
          signatureRef.current = DEFAULT_SHORTCUT_CONFIG_SIGNATURE;
          setShortcutConfig(DEFAULT_SHORTCUT_CONFIG);
        }
      }
    }

    void loadShortcuts();
    const intervalId = window.setInterval(loadShortcuts, 2000);
    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const shortcutEntries = useMemo(
    () =>
      SHORTCUT_ACTION_ORDER.map((actionName) => ({
        actionName,
        ...shortcutConfig[actionName],
      })),
    [shortcutConfig],
  );

  return { shortcutConfig, shortcutEntries };
}

export default useShortcutConfig;
