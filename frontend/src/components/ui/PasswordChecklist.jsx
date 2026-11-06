import Icon from "./Icon.jsx";
import { checkPassword } from "../../utils/passwordStrength.js";
import "./PasswordChecklist.css";

/**
 * What a new password needs, ticking off as the person types. The server also refuses common or simple
 * passwords; that is told in the message on submit, not as a line here.
 * `person` is { email, firstName, lastName } where the form has them: a password built from those is refused.
 */
export default function PasswordChecklist({ id, password, person }) {
  const { rules } = checkPassword(password, person);
  const started = password.length > 0;

  return (
    <ul id={id} className="password-rules" aria-label="Password requirements">
      {rules.map((rule) => {
        const state = !started ? "" : rule.met ? " is-met" : " is-unmet";
        return (
          <li key={rule.id} className={`password-rule${state}`}>
            <span className="password-rule-mark" aria-hidden="true">
              {started && rule.met ? <Icon name="check" size={12} /> : null}
            </span>
            <span>
              {rule.label}
              {started ? <span className="visually-hidden">{rule.met ? ", done" : ", not done yet"}</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
