import { fromLocalInput, localPart, PHONE_HINT, PHONE_LOCAL_PLACEHOLDER } from "../../utils/phone.js";
import "./PhoneInput.css";

/**
 * A Philippine mobile number field with "+63" fixed in front of it. The prefix is part of the field's look,
 * not of its text, so it can't be deleted and an empty field stays empty. The person types the 10 digits that
 * follow (they start with 9); pasting 09171234567 or +639171234567 works too.
 *
 * `value` and `onChange` use the stored form (+639171234567, or "" when empty), so forms and the server
 * see exactly what they did before. Other props (id, name, required, aria-*) go to the input itself.
 */
export default function PhoneInput({ id, value, onChange, className = "", ...rest }) {
  return (
    <div className={`phone-input ${rest["aria-invalid"] ? "is-invalid " : ""}${className}`.trim()}>
      <span className="phone-input-prefix" aria-hidden="true">
        +63
      </span>
      <input
        {...rest}
        id={id}
        className="phone-input-field"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder={PHONE_LOCAL_PLACEHOLDER}
        title={PHONE_HINT}
        value={localPart(value)}
        onChange={(event) => onChange(fromLocalInput(event.target.value))}
      />
    </div>
  );
}

// The admission form's Field wrapper marks a control invalid by cloning aria props onto it; this lets it do the same here.
PhoneInput.isFormControl = true;
