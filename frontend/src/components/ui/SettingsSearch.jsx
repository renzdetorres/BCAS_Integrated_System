import { useId, useMemo, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import "./SettingsSearch.css";

const MAX_SUGGESTIONS = 6;
const FLASH_MS = 1800;

/**
 * Predictive search for a settings page. `entries` is the page's own list of
 * things a person might look for: { id, label, hint?, keywords?, group?, ...extra }.
 * `id` is the DOM id of the section or field to jump to. Typing narrows the list
 * as you go (every word must match the label, hint, keywords or group); picking
 * one scrolls to it and focuses it, or flashes it when it is not a field.
 * `onSelect(entry)` runs first, for pages that must reveal the target (a tab).
 */
export default function SettingsSearch({ entries, onSelect, placeholder = "Search settings" }) {
  const listId = useId();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const words = useMemo(() => query.toLowerCase().split(/\s+/).filter(Boolean), [query]);
  const suggestions = useMemo(() => rank(entries, words).slice(0, MAX_SUGGESTIONS), [entries, words]);
  const showList = isOpen && (suggestions.length > 0 || words.length > 0);
  const optionId = (index) => `${listId}-option-${index}`;

  function choose(entry) {
    setIsOpen(false);
    setQuery("");
    onSelect?.(entry);
    // Wait a frame so anything onSelect revealed (a tab) is in the DOM.
    requestAnimationFrame(() => requestAnimationFrame(() => jumpTo(entry.id)));
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (suggestions.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + step + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter") {
      if (showList && suggestions[activeIndex]) {
        event.preventDefault();
        choose(suggestions[activeIndex]);
      }
    } else if (event.key === "Escape") {
      if (isOpen || query) {
        event.preventDefault();
        setIsOpen(false);
        setQuery("");
      }
    }
  }

  return (
    <div className="settings-search">
      <label className="settings-search-field">
        <span className="visually-hidden">{placeholder}</span>
        <Icon name="search" size={18} className="settings-search-icon" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          placeholder={`${placeholder}, like "password" or "email"`}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && suggestions[activeIndex] ? optionId(activeIndex) : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onKeyDown={handleKeyDown}
        />
        {query ? (
          <button
            type="button"
            className="settings-search-clear"
            aria-label="Clear search"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuery("");
              setActiveIndex(0);
              inputRef.current?.focus();
            }}
          >
            <Icon name="x" size={16} />
          </button>
        ) : null}
      </label>

      {showList ? (
        <ul id={listId} role="listbox" className="settings-search-list" aria-label="Matching settings">
          {suggestions.length === 0 ? (
            <li className="settings-search-empty" role="presentation">
              No setting matches &ldquo;{query.trim()}&rdquo;.
            </li>
          ) : (
            suggestions.map((entry, index) => (
              <li
                key={entry.id + entry.label}
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                className={index === activeIndex ? "settings-search-option is-active" : "settings-search-option"}
                // mousedown, not click: the input's blur would close the list first.
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(entry);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="settings-search-label">{highlight(entry.label, words)}</span>
                {entry.group ? <span className="settings-search-group">{entry.group}</span> : null}
                {entry.hint ? <span className="settings-search-hint">{highlight(entry.hint, words)}</span> : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

/** Every word must appear somewhere; earlier and stronger matches in the label rank first. */
function rank(entries, words) {
  if (words.length === 0) return entries;

  const scored = [];
  for (const entry of entries) {
    const label = entry.label.toLowerCase();
    const rest = [entry.hint, entry.group, entry.keywords].filter(Boolean).join(" ").toLowerCase();
    let score = 0;
    let matchesAll = true;
    for (const word of words) {
      if (label.startsWith(word)) score += 4;
      else if (label.includes(` ${word}`)) score += 3;
      else if (label.includes(word)) score += 2;
      else if (rest.includes(word)) score += 1;
      else {
        matchesAll = false;
        break;
      }
    }
    if (matchesAll) scored.push({ entry, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((item) => item.entry);
}

function highlight(text, words) {
  if (words.length === 0) return text;
  const pattern = new RegExp(`(${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return text.split(pattern).map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="settings-search-match">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function jumpTo(id) {
  const target = document.getElementById(id);
  if (!target) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });

  const isField = ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(target.tagName);
  if (isField) target.focus({ preventScroll: true });

  const flashed = (isField && target.closest(".form-row, li")) || target;
  flashed.classList.remove("settings-search-flash");
  // Force a reflow so picking the same target twice replays the flash.
  void flashed.offsetWidth;
  flashed.classList.add("settings-search-flash");
  window.setTimeout(() => flashed.classList.remove("settings-search-flash"), FLASH_MS);
}
