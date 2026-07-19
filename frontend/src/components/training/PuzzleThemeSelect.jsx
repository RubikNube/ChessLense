import { useEffect, useMemo, useRef, useState } from "react";
import InfoTip from "../InfoTip.jsx";
import ModalShell from "../modals/ModalShell.jsx";
import {
  filterLichessPuzzleThemeOptions,
  getLichessPuzzleThemeOption,
} from "../../utils/lichessPuzzles.js";
import { LICHESS_PUZZLE_THEME_OPTIONS } from "../../utils/lichessPuzzleThemes.js";
import { THEME_CSS_VARS } from "../../utils/theme.js";

const dropdownRootStyle = {
  position: "relative",
};

const fieldHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.45rem",
  marginBottom: "0.35rem",
};

const infoButtonStyle = {
  padding: 0,
  border: "none",
  background: "transparent",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const dropdownToggleStyle = {
  width: "100%",
  minHeight: 40,
  borderRadius: 8,
  border: `1px solid ${THEME_CSS_VARS.border}`,
  backgroundColor: THEME_CSS_VARS.surfaceAlt,
  color: THEME_CSS_VARS.surfaceText,
  padding: "0.65rem 0.75rem",
  font: "inherit",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
  textAlign: "left",
  cursor: "pointer",
};

const dropdownMenuStyle = {
  position: "absolute",
  top: "calc(100% + 0.35rem)",
  left: 0,
  right: 0,
  zIndex: 10,
  borderRadius: 10,
  border: `1px solid ${THEME_CSS_VARS.border}`,
  backgroundColor: THEME_CSS_VARS.surface,
  boxShadow: `0 10px 30px ${THEME_CSS_VARS.shadowStrong}`,
  padding: "0.75rem",
  display: "grid",
  gap: "0.75rem",
};

const dropdownSearchStyle = {
  width: "100%",
  minHeight: 40,
  borderRadius: 8,
  border: `1px solid ${THEME_CSS_VARS.border}`,
  backgroundColor: THEME_CSS_VARS.surfaceAlt,
  color: THEME_CSS_VARS.surfaceText,
  padding: "0.65rem 0.75rem",
  font: "inherit",
};

const dropdownOptionsStyle = {
  display: "grid",
  gap: "0.5rem",
  maxHeight: 260,
  overflowY: "auto",
};

const optionButtonStyle = {
  width: "100%",
  borderRadius: 8,
  border: `1px solid ${THEME_CSS_VARS.border}`,
  backgroundColor: THEME_CSS_VARS.surfaceAlt,
  color: THEME_CSS_VARS.surfaceText,
  padding: "0.65rem 0.75rem",
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
  display: "grid",
  gap: "0.2rem",
};

const truncatedThemeLabelStyle = {
  display: "block",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const selectedThemeLabelStyle = {
  ...truncatedThemeLabelStyle,
  flex: "1 1 auto",
};

const helperTextStyle = {
  margin: "0.45rem 0 0",
  color: THEME_CSS_VARS.surfaceTextMuted,
  fontSize: "0.9rem",
  lineHeight: 1.4,
};

const glossaryListStyle = {
  listStyle: "none",
  padding: 0,
  margin: "1rem 0 0",
  display: "grid",
  gap: "0.75rem",
};

const glossaryItemStyle = {
  border: `1px solid ${THEME_CSS_VARS.modalBorder}`,
  borderRadius: "0.65rem",
  padding: "0.9rem",
  backgroundColor: THEME_CSS_VARS.modalSurface,
};

const glossaryItemTitleStyle = {
  margin: 0,
  color: THEME_CSS_VARS.modalText,
};

const glossaryItemDescriptionStyle = {
  margin: "0.4rem 0 0",
  color: THEME_CSS_VARS.modalTextMuted,
  lineHeight: 1.5,
};

const glossaryCloseButtonStyle = {
  marginTop: "1.25rem",
  padding: "0.65rem 1rem",
  border: `1px solid ${THEME_CSS_VARS.modalBorder}`,
  borderRadius: "0.5rem",
  backgroundColor: THEME_CSS_VARS.modalSurface,
  color: THEME_CSS_VARS.modalText,
  cursor: "pointer",
  fontWeight: 600,
};

const ANY_THEME_OPTION = {
  value: "",
  label: "Any theme",
  description: "Clear the theme filter and use difficulty and color only.",
};

function TruncatedThemeLabel({ label, style, strong = false }) {
  const labelRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const labelElement = labelRef.current;

    if (!labelElement) {
      return undefined;
    }

    function updateTruncation() {
      setIsTruncated(labelElement.scrollWidth > labelElement.clientWidth);
    }

    updateTruncation();

    if (typeof ResizeObserver === "function") {
      const resizeObserver = new ResizeObserver(updateTruncation);
      resizeObserver.observe(labelElement);

      return () => {
        resizeObserver.disconnect();
      };
    }

    window.addEventListener("resize", updateTruncation);

    return () => {
      window.removeEventListener("resize", updateTruncation);
    };
  }, [label]);

  const Element = strong ? "strong" : "span";

  return (
    <Element
      ref={labelRef}
      style={style}
      title={isTruncated ? label : undefined}
    >
      {label}
    </Element>
  );
}

function PuzzleThemeSelect({ value, onChange }) {
  const rootRef = useRef(null);
  const searchInputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const selectedOption = useMemo(
    () => getLichessPuzzleThemeOption(value),
    [value],
  );
  const filteredOptions = useMemo(
    () => filterLichessPuzzleThemeOptions(searchValue),
    [searchValue],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    searchInputRef.current?.focus();

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setSearchValue("");
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSearchValue("");
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleSelect(nextValue) {
    onChange(nextValue);
    setSearchValue("");
    setIsOpen(false);
  }

  function handleToggle() {
    setIsOpen((currentValue) => {
      const nextIsOpen = !currentValue;

      if (!nextIsOpen) {
        setSearchValue("");
      }

      return nextIsOpen;
    });
  }

  function handleOpenGlossary() {
    setIsOpen(false);
    setSearchValue("");
    setIsGlossaryOpen(true);
  }

  return (
    <div style={dropdownRootStyle} ref={rootRef}>
      <div style={fieldHeaderStyle}>
        <span className="annotation-label">Theme</span>
        <button
          type="button"
          style={infoButtonStyle}
          onClick={handleOpenGlossary}
          aria-label="Open puzzle theme descriptions"
        >
          <InfoTip
            text="Open the full puzzle theme glossary."
            ariaLabel="Open puzzle theme descriptions"
          />
        </button>
      </div>
      <button
        type="button"
        style={dropdownToggleStyle}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <TruncatedThemeLabel
          label={selectedOption?.label ?? "Any theme"}
          style={selectedThemeLabelStyle}
        />
        <span aria-hidden="true">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div style={dropdownMenuStyle}>
          <input
            ref={searchInputRef}
            type="text"
            style={dropdownSearchStyle}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Filter themes..."
            spellCheck={false}
          />
          <div
            style={dropdownOptionsStyle}
            role="listbox"
            aria-label="Puzzle themes"
          >
            <button
              type="button"
              style={optionButtonStyle}
              onClick={() => handleSelect("")}
              aria-selected={!selectedOption}
            >
              <TruncatedThemeLabel
                label="Any theme"
                style={truncatedThemeLabelStyle}
                strong
              />
            </button>
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  style={optionButtonStyle}
                  onClick={() => handleSelect(option.value)}
                  aria-selected={option.value === selectedOption?.value}
                >
                  <TruncatedThemeLabel
                    label={option.label}
                    style={truncatedThemeLabelStyle}
                    strong
                  />
                </button>
              ))
            ) : (
              <p style={helperTextStyle}>No puzzle themes match that filter.</p>
            )}
          </div>
        </div>
      )}
      {isGlossaryOpen && (
        <ModalShell
          title="Puzzle Theme Glossary"
          titleId="puzzle-theme-glossary-title"
          onClose={() => setIsGlossaryOpen(false)}
          showCloseButton
          wide
        >
          <ul style={glossaryListStyle}>
            {[ANY_THEME_OPTION, ...LICHESS_PUZZLE_THEME_OPTIONS].map(
              (option) => (
                <li key={option.value || "any-theme"} style={glossaryItemStyle}>
                  <h3 style={glossaryItemTitleStyle}>{option.label}</h3>
                  <p style={glossaryItemDescriptionStyle}>
                    {option.description}
                  </p>
                </li>
              ),
            )}
          </ul>
          <button
            type="button"
            style={glossaryCloseButtonStyle}
            onClick={() => setIsGlossaryOpen(false)}
          >
            Close
          </button>
        </ModalShell>
      )}
    </div>
  );
}

export default PuzzleThemeSelect;
