import { useEffect, useState } from "react";
import { saveSchoolConfig } from "../api/schoolConfigApi.js";
import { ApiError } from "../api/apiClient.js";
import { loadAcademicCatalog } from "../config/academicCatalog.js";
import Card from "./ui/Card.jsx";
import "./AcademicCatalogPanel.css";
import Skeleton from "./ui/Skeleton.jsx";

const KEYS = {
  strands: "Academic.Strands",
  terms: "Academic.Terms",
  semesters: "Academic.Semesters",
  yearLevels: "Academic.YearLevels",
  programs: "Academic.Programs",
};

// Levels the age policy and scholarship rules depend on; the server refuses to remove them.
const PROTECTED_LEVELS = ["Pre-Kinder", "Kindergarten", "Grade 7", "Grade 11", "1st Year"];
const CATEGORIES = ["Elementary", "High School", "Senior High School", "College"];

/** A list of short names the admin can add to and remove from; locked entries have no remove button. */
function ChipList({ label, items, onChange, locked = [], placeholder }) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value || items.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...items, value]);
    setDraft("");
  }

  return (
    <div className="catalog-chiplist">
      <ul className="catalog-chips" aria-label={label}>
        {items.map((item) => (
          <li key={item} className="catalog-chip">
            <span>{item}</span>
            {locked.includes(item) ? (
              <span className="catalog-chip-lock" title="The age policy and scholarship rules depend on this level, so it can't be removed.">
                Required
              </span>
            ) : (
              <button type="button" className="catalog-chip-remove" aria-label={`Remove ${item}`} onClick={() => onChange(items.filter((i) => i !== item))}>
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="catalog-add">
        <input
          type="text"
          value={draft}
          maxLength={80}
          placeholder={placeholder}
          aria-label={`Add to ${label}`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn btn-secondary" onClick={add} disabled={!draft.trim()}>
          Add
        </button>
      </div>
    </div>
  );
}

/** Admin: the strands, terms, semesters, year levels and College programs the forms and filters offer. */
export default function AcademicCatalogPanel() {
  const [catalog, setCatalog] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Starts from the live lists (the saved ones with the originals filling any gap), so a category never shows up empty.
  function fromCatalog(live) {
    return {
      strands: live.strands ?? [],
      terms: live.terms ?? [],
      semesters: live.semesters ?? [],
      yearLevels: live.yearLevels ?? {},
      programs: (live.programs ?? []).map(({ code, name }) => ({ code, name })),
    };
  }

  useEffect(() => {
    let cancelled = false;
    loadAcademicCatalog().then((live) => {
      if (cancelled) return;
      if (live) setCatalog(fromCatalog(live));
      else setErrorMessage("Failed to load the academic lists.");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function update(name, value) {
    setMessage(null);
    setCatalog((prev) => ({ ...prev, [name]: value }));
  }

  async function persist(values, success) {
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      await saveSchoolConfig(values);
      const live = await loadAcademicCatalog();
      if (live) setCatalog(fromCatalog(live));
      setMessage(success);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to save the academic lists.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    return persist(
      {
        [KEYS.strands]: JSON.stringify(catalog.strands),
        [KEYS.terms]: JSON.stringify(catalog.terms),
        [KEYS.semesters]: JSON.stringify(catalog.semesters),
        [KEYS.yearLevels]: JSON.stringify(catalog.yearLevels),
        [KEYS.programs]: JSON.stringify(catalog.programs),
      },
      "Academic lists saved. New applications use them straight away."
    );
  }

  function handleReset() {
    if (!window.confirm("Put every academic list back to the school's original choices?")) return;
    return persist(
      Object.fromEntries(Object.values(KEYS).map((key) => [key, ""])),
      "The academic lists are back to their original choices."
    );
  }

  function updateProgram(index, field, value) {
    update(
      "programs",
      catalog.programs.map((program, i) => (i === index ? { ...program, [field]: field === "code" ? value.toUpperCase() : value } : program))
    );
  }

  return (
    <Card>
      <h2 className="catalog-title">Academic structure</h2>
      <p className="catalog-subtitle">
        The year levels, terms, semesters, strands and College programs applicants and staff choose from. Changes apply to new applications
        straight away; applications already filed keep what they chose.
      </p>

      {errorMessage && (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      )}
      {message && (
        <p className="form-success" role="status">
          {message}
        </p>
      )}
      {!catalog && !errorMessage && <Skeleton variant="form" />}

      {catalog && (
        <form onSubmit={handleSubmit} className="catalog-form">
          <section className="catalog-group">
            <h3>Year levels</h3>
            <p className="catalog-hint">Pre-Kinder, Kindergarten, Grade 7, Grade 11 and 1st Year are required: the age policy and scholarships use them.</p>
            {CATEGORIES.map((category) => (
              <div key={category} className="catalog-field">
                <h4>{category}</h4>
                <ChipList
                  label={`${category} levels`}
                  items={catalog.yearLevels[category] ?? []}
                  locked={PROTECTED_LEVELS}
                  placeholder="e.g. Grade 13"
                  onChange={(items) => update("yearLevels", { ...catalog.yearLevels, [category]: items })}
                />
              </div>
            ))}
          </section>

          <section className="catalog-group">
            <h3>Terms and semesters</h3>
            <div className="catalog-field">
              <h4>Academic path (High School and Senior High School)</h4>
              <ChipList label="academic paths" items={catalog.terms} placeholder="e.g. 4th Term" onChange={(items) => update("terms", items)} />
            </div>
            <div className="catalog-field">
              <h4>College semesters</h4>
              <ChipList label="semesters" items={catalog.semesters} placeholder="e.g. Midyear" onChange={(items) => update("semesters", items)} />
            </div>
          </section>

          <section className="catalog-group">
            <h3>Senior High School strands</h3>
            <ChipList label="strands" items={catalog.strands} placeholder="e.g. ICT" onChange={(items) => update("strands", items)} />
          </section>

          <section className="catalog-group">
            <h3>College programs</h3>
            <p className="catalog-hint">The code is what is saved on an application (for example BSIT). Removing a program stops new applications to it.</p>
            <ul className="catalog-programs">
              {catalog.programs.map((program, index) => (
                <li key={index} className="catalog-program">
                  <input
                    type="text"
                    className="catalog-program-code"
                    value={program.code}
                    maxLength={20}
                    placeholder="Code"
                    aria-label={`Program ${index + 1} code`}
                    onChange={(event) => updateProgram(index, "code", event.target.value)}
                  />
                  <input
                    type="text"
                    value={program.name}
                    maxLength={150}
                    placeholder="Program name"
                    aria-label={`Program ${index + 1} name`}
                    onChange={(event) => updateProgram(index, "name", event.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => update("programs", catalog.programs.filter((_, i) => i !== index))}
                    disabled={catalog.programs.length <= 1}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-secondary" onClick={() => update("programs", [...catalog.programs, { code: "", name: "" }])}>
              Add program
            </button>
          </section>

          <div className="catalog-actions">
            <button type="button" className="btn btn-secondary" onClick={handleReset} disabled={isSaving}>
              Reset to original
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save academic lists"}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
