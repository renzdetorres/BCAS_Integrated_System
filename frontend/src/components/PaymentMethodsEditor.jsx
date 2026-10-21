import { useState } from "react";
import Icon from "./ui/Icon.jsx";
import "./PaymentMethodsEditor.css";

const MAX_METHODS = 6;
const MAX_QR_BYTES = 1024 * 1024;
const EMPTY_METHOD = { name: "", accountName: "", accountNumber: "", instructions: "", qrImage: "" };

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Reads the stored list; when none has been set up yet, offers the older single account, instructions and QR code as the first method. */
export function methodsFromConfig(values) {
  try {
    const parsed = JSON.parse(values["Payment.Methods"] || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.map((method) => ({ ...EMPTY_METHOD, ...method }));
  } catch {
    // An unreadable value is treated as "none set up".
  }

  const legacy = { accountName: values["Payment.AccountName"] ?? "", instructions: values["Payment.Instructions"] ?? "", qrImage: values["Payment.QrImage"] ?? "" };
  return legacy.accountName || legacy.qrImage ? [{ ...EMPTY_METHOD, name: "QR payment", ...legacy }] : [];
}

/**
 * The payment methods applicants can choose from, each with its own account, instructions and QR code
 * (GCash, a bank, the cashier...). `methods` is the working list and `onChange` receives the new one.
 * Nothing is saved here; the settings form saves the whole list with the other settings.
 */
export default function PaymentMethodsEditor({ methods, onChange }) {
  const [problem, setProblem] = useState(null);

  function update(index, patch) {
    setProblem(null);
    onChange(methods.map((method, i) => (i === index ? { ...method, ...patch } : method)));
  }

  async function upload(index, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setProblem(`The QR code for ${methods[index].name || "this method"} must be a PNG or JPG image.`);
      return;
    }
    if (file.size > MAX_QR_BYTES) {
      setProblem(`The QR code for ${methods[index].name || "this method"} must be under 1 MB.`);
      return;
    }
    update(index, { qrImage: await readAsDataUrl(file) });
  }

  return (
    <div className="pm-editor">
      <div className="pm-head">
        <div>
          <h4>Payment methods</h4>
          <p className="form-note">The ways an applicant can pay the exam fee. They choose one, see its details, then upload their receipt.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange([...methods, { ...EMPTY_METHOD }])} disabled={methods.length >= MAX_METHODS}>
          <Icon name="plus" size={15} />
          Add payment method
        </button>
      </div>

      {problem ? (
        <p className="form-error" role="alert">
          {problem}
        </p>
      ) : null}

      {methods.length === 0 ? (
        <p className="pm-empty">No payment methods yet. Add one so applicants know how to pay.</p>
      ) : (
        <ul className="pm-list">
          {methods.map((method, index) => {
            const id = `pm-${index}`;
            return (
              <li key={index} className="pm-card">
                <div className="pm-card-head">
                  <span className="pm-card-title">{method.name.trim() || `Payment method ${index + 1}`}</span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange(methods.filter((_, i) => i !== index))} aria-label={`Remove ${method.name || `payment method ${index + 1}`}`}>
                    <Icon name="trash" size={15} />
                    Remove
                  </button>
                </div>

                <div className="form-grid">
                  <div className="form-row">
                    <label htmlFor={`${id}-name`}>
                      Name <span className="required-mark" aria-hidden="true">*</span>
                    </label>
                    <input id={`${id}-name`} type="text" maxLength={30} placeholder="e.g. GCash" value={method.name} onChange={(event) => update(index, { name: event.target.value })} />
                  </div>
                  <div className="form-row">
                    <label htmlFor={`${id}-account`}>Account name</label>
                    <input id={`${id}-account`} type="text" maxLength={200} placeholder="e.g. Baliuag College of Arts and Sciences" value={method.accountName} onChange={(event) => update(index, { accountName: event.target.value })} />
                  </div>
                </div>

                <div className="form-row">
                  <label htmlFor={`${id}-number`}>Account or mobile number</label>
                  <input id={`${id}-number`} type="text" maxLength={60} placeholder="e.g. 0917 123 4567" value={method.accountNumber} onChange={(event) => update(index, { accountNumber: event.target.value })} />
                </div>

                <div className="form-row">
                  <label htmlFor={`${id}-instructions`}>Instructions</label>
                  <textarea id={`${id}-instructions`} rows={3} maxLength={1000} placeholder="e.g. Send the exact fee, then upload a screenshot of the receipt." value={method.instructions} onChange={(event) => update(index, { instructions: event.target.value })} />
                </div>

                <div className="form-row">
                  <label htmlFor={`${id}-qr`}>QR code (optional)</label>
                  <div className="school-config-qr">
                    {method.qrImage ? <img src={method.qrImage} alt={`QR code for ${method.name || "this method"}`} /> : <span className="school-config-qr-empty">No QR code</span>}
                    <div className="school-config-qr-actions">
                      <label className="btn btn-secondary" htmlFor={`${id}-qr`}>
                        {method.qrImage ? "Replace QR code" : "Upload QR code"}
                      </label>
                      <input id={`${id}-qr`} className="admission-doc-input" type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={(event) => upload(index, event)} />
                      {method.qrImage ? (
                        <button type="button" className="btn btn-secondary" onClick={() => update(index, { qrImage: "" })}>
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <p className="form-note">PNG or JPG, under 1 MB. Each method needs a QR code, an account number or instructions.</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
