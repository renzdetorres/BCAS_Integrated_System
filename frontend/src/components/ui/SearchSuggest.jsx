import { useEffect, useRef, useState } from "react";
import "./SearchSuggest.css";

const MAX_SUGGESTIONS = 6;

/**
 * Picks up to a few distinct suggestions that contain what the user has typed,
 * prefix matches first. Exact matches are dropped - nothing left to predict.
 */
export function buildSuggestions(values, query) {
  const needle = String(query ?? "").trim().toLowerCase();
  if (!needle) return [];
  const seen = new Set();
  const prefix = [];
  const contains = [];
  for (const raw of values) {
    const text = raw == null ? "" : String(raw).trim();
    const lower = text.toLowerCase();
    if (!text || lower === needle || seen.has(lower)) continue;
    if (lower.startsWith(needle)) prefix.push(text);
    else if (lower.includes(needle)) contains.push(text);
    else continue;
    seen.add(lower);
  }
  return [...prefix, ...contains].slice(0, MAX_SUGGESTIONS);
}

/** Bolds the part of a suggestion that matches the typed text. */
function Highlighted({ text, query }) {
  const needle = query.trim().toLowerCase();
  const index = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <strong>{text.slice(index, index + needle.length)}</strong>
      {text.slice(index + needle.length)}
    </>
  );
}

/**
 * A search input with a predictive dropdown. `suggestions` is the list for the
 * current `value`; picking one calls `onChange` (and `onSelect` if given).
 * Arrow keys move, Enter picks, Escape closes. Extra props go to the input.
 */
export default function SearchSuggest({
  value,
  onChange,
  onSelect,
  suggestions = [],
  icon = null,
  className = "",
  inputClassName = "ui-input",
  ...inputProps
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapperRef = useRef(null);
  const listId = useRef(`search-suggest-${Math.random().toString(36).slice(2, 8)}`).current;
  const visible = open && suggestions.length > 0;

  useEffect(() => {
    function handleClick(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function pick(suggestion) {
    onChange(suggestion);
    onSelect?.(suggestion);
    setOpen(false);
    setHighlight(-1);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Enter" && visible && highlight >= 0) {
      event.preventDefault();
      pick(suggestions[highlight]);
    }
  }

  return (
    <div className={`search-suggest ${className}`.trim()} ref={wrapperRef}>
      {icon}
      <input
        {...inputProps}
        type="search"
        className={inputClassName}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {visible ? (
        <ul className="search-suggest-list" id={listId} role="listbox">
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              role="option"
              aria-selected={index === highlight}
              className={index === highlight ? "search-suggest-option is-active" : "search-suggest-option"}
              // mousedown, not click: the input would blur and close the list first.
              onMouseDown={(event) => {
                event.preventDefault();
                pick(suggestion);
              }}
              onMouseEnter={() => setHighlight(index)}
            >
              <Highlighted text={suggestion} query={value} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
