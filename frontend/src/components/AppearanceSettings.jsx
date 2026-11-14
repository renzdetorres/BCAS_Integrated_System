import { useAppearance } from "../context/AppearanceContext.jsx";
import { APPEARANCE_OPTIONS, DEFAULT_APPEARANCE } from "../utils/appearance.js";
import Card from "./ui/Card.jsx";
import "./AppearanceSettings.css";

/** What each colour-scheme option looks like, drawn from the same colours the theme uses. */
function SchemeSwatch({ value }) {
  return <span className={`appearance-swatch appearance-swatch-${value}`} aria-hidden="true" />;
}

function ChoiceGroup({ legend, name, options, selected, onChange, layout = "row", renderLead, renderLabel }) {
  return (
    <fieldset className="appearance-group">
      <legend>{legend}</legend>
      <div className={`appearance-options appearance-options-${layout}`}>
        {options.map((option) => (
          <label key={option.value} className="appearance-option">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="appearance-option-body">
              {renderLead ? renderLead(option) : null}
              <span className="appearance-option-label">{renderLabel ? renderLabel(option) : option.label}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Appearance and layout choices, kept in this browser and applied the moment they are picked.
 * Shown in the applicant's Settings and on the Appearance page every other role opens from the
 * account menu, so everyone reaches the same controls.
 */
export default function AppearanceSettings({ id = "appearance" }) {
  const { appearance, setAppearance, reset } = useAppearance();
  const isDefault = Object.keys(DEFAULT_APPEARANCE).every((key) => appearance[key] === DEFAULT_APPEARANCE[key]);

  return (
    <Card id={id} className="appearance-card">
      <div className="appearance-heading">
        <div>
          <h2>Appearance and layout</h2>
          <p className="appearance-subtitle">Changes apply right away and are saved on this device.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={reset} disabled={isDefault}>
          Reset to defaults
        </button>
      </div>

      <section className="appearance-section" aria-labelledby={`${id}-appearance`}>
        <h3 id={`${id}-appearance`}>Appearance</h3>
        <ChoiceGroup
          legend="Color Scheme"
          name={`${id}-scheme`}
          options={APPEARANCE_OPTIONS.scheme}
          selected={appearance.scheme}
          onChange={(scheme) => setAppearance({ scheme })}
          renderLead={(option) => <SchemeSwatch value={option.value} />}
        />
        <ChoiceGroup
          legend="Color Temperature"
          name={`${id}-temperature`}
          options={APPEARANCE_OPTIONS.temperature}
          selected={appearance.temperature}
          onChange={(temperature) => setAppearance({ temperature })}
          renderLead={(option) => <span className={`appearance-dot appearance-dot-${option.value}`} aria-hidden="true" />}
        />
        <ChoiceGroup
          legend="Contrast"
          name={`${id}-contrast`}
          options={APPEARANCE_OPTIONS.contrast}
          selected={appearance.contrast}
          onChange={(contrast) => setAppearance({ contrast })}
        />
      </section>

      <section className="appearance-section" aria-labelledby={`${id}-typography`}>
        <h3 id={`${id}-typography`}>Typography</h3>
        <ChoiceGroup
          legend="Font Size"
          name={`${id}-font`}
          options={APPEARANCE_OPTIONS.fontSize}
          selected={appearance.fontSize}
          onChange={(fontSize) => setAppearance({ fontSize })}
          renderLead={(option) => (
            <span className="appearance-aa" style={{ "--aa": `${Math.round(18 * option.factor)}px` }} aria-hidden="true">
              Aa
            </span>
          )}
        />
      </section>

      <section className="appearance-section" aria-labelledby={`${id}-layout`}>
        <h3 id={`${id}-layout`}>Layout</h3>
        <ChoiceGroup
          legend="Scale"
          name={`${id}-scale`}
          layout="list"
          options={APPEARANCE_OPTIONS.scale}
          selected={appearance.scale}
          onChange={(scale) => setAppearance({ scale })}
          renderLabel={(option) => `${option.label} — ${option.percent}%`}
        />
      </section>
    </Card>
  );
}
