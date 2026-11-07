import { useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { generatePassword } from "../../utils/passwordStrength.js";
import "./PasswordSuggest.css";

/**
 * "Suggest a strong password": makes a random password that meets every rule, hands it to the form (which
 * fills both password boxes and shows them), and, while that password is still what is in the box, offers to
 * copy it and reminds the person to keep it, because nobody can remember it from a glance.
 */
export default function PasswordSuggest({ inputId, person, password, onSuggest }) {
  const [suggested, setSuggested] = useState("");
  const [copyState, setCopyState] = useState("idle"); // idle | copied | manual
  const copiedTimer = useRef(null);
  const stillSuggested = suggested !== "" && password === suggested;

  function handleSuggest() {
    const next = generatePassword(person);
    setSuggested(next);
    setCopyState("idle");
    onSuggest(next);
  }

  async function handleCopy() {
    clearTimeout(copiedTimer.current);
    try {
      await navigator.clipboard.writeText(suggested);
      setCopyState("copied");
    } catch {
      // The browser refused clipboard access: select the password in its box so Ctrl+C (or a long press) copies it.
      const input = inputId ? document.getElementById(inputId) : null;
      input?.focus();
      input?.select();
      setCopyState("manual");
    }
    copiedTimer.current = setTimeout(() => setCopyState("idle"), 4000);
  }

  return (
    <div className="password-suggest">
      <div className="password-suggest-row">
        <button type="button" className="password-suggest-button" onClick={handleSuggest}>
          <Icon name="key" size={14} />
          Suggest a strong password
        </button>
        {stillSuggested ? (
          <button type="button" className="password-suggest-copy" onClick={handleCopy}>
            {copyState === "copied" ? "Copied" : copyState === "manual" ? "Selected: press Ctrl+C" : "Copy"}
          </button>
        ) : null}
      </div>
      <p className="password-suggest-note" role="status">
        {stillSuggested ? "Filled in below and showing. Copy it and keep it safe: you will need it to log in." : ""}
      </p>
    </div>
  );
}
