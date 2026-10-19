import { PHONE_ERROR, PHONE_HINT, PHONE_MAX_LENGTH, PHONE_PATTERN, PHONE_PLACEHOLDER, cleanPhoneInput, isValidPhone } from "../utils/phone.js";
import { useEffect, useRef, useState } from "react";
import { getMyProfile, saveMyProfile } from "../api/profileApi.js";
import { ApiError } from "../api/apiClient.js";
import { useSession } from "../context/SessionContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import { useToast } from "../context/ToastContext.jsx";
import "./ApplicantProfilePage.css";

function emptyForm(session) {
  return {
    firstName: session.firstName ?? "",
    lastName: session.lastName ?? "",
    birthDate: "",
    contactNumber: "",
    addressLine: "",
    city: "",
    province: "",
    postalCode: "",
    isBcasian: "no",
  };
}

function toForm(profile) {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    birthDate: profile.birthDate,
    contactNumber: cleanPhoneInput(profile.contactNumber),
    addressLine: profile.addressLine,
    city: profile.city,
    province: profile.province,
    postalCode: profile.postalCode,
    isBcasian: profile.isBcasian ? "yes" : "no",
  };
}

// Every field must have data before the profile can be saved.
const REQUIRED_MESSAGES = {
  firstName: "Enter your first name.",
  lastName: "Enter your last name.",
  birthDate: "Pick your birth date.",
  contactNumber: "Enter your contact number.",
  addressLine: "Enter your street and barangay.",
  city: "Enter your city.",
  province: "Enter your province.",
  postalCode: "Enter your postal code.",
};
const FIELD_ORDER = Object.keys(REQUIRED_MESSAGES);

function validateProfile(form) {
  const errors = {};
  for (const field of FIELD_ORDER) {
    if (!String(form[field] ?? "").trim()) errors[field] = REQUIRED_MESSAGES[field];
  }
  if (!errors.birthDate) {
    const born = new Date(`${form.birthDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(born.getTime()) || born.getFullYear() < 1900) errors.birthDate = "Enter a valid birth date.";
    else if (born >= today) errors.birthDate = "Your birth date must be in the past.";
  }
  if (!errors.contactNumber && !isValidPhone(form.contactNumber)) errors.contactNumber = PHONE_ERROR;
  return errors;
}

export default function ApplicantProfilePage() {
  const { session } = useSession();
  const { showToast } = useToast();
  const formRef = useRef(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [form, setForm] = useState(() => emptyForm(session));
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [savedMessage, setSavedMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getMyProfile()
      .then((profile) => {
        if (cancelled) return;
        if (profile) {
          setForm(toForm(profile));
          setHasExistingProfile(true);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load profile.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function changeField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const { [name]: _cleared, ...rest } = prev;
      return rest;
    });
  }

  function handleChange(event) {
    changeField(event.target.name, event.target.value);
  }

  // Props that tie a field to its inline error: red border, announced message, focus target.
  function errorProps(name, extraDescribedBy) {
    const describedBy = [fieldErrors[name] ? `${name}-error` : null, extraDescribedBy].filter(Boolean).join(" ");
    return { "aria-invalid": fieldErrors[name] ? "true" : undefined, "aria-describedby": describedBy || undefined };
  }

  function fieldError(name) {
    return fieldErrors[name] ? (
      <p className="profile-field-error" id={`${name}-error`} role="alert">
        {fieldErrors[name]}
      </p>
    ) : null;
  }

  // Step 1: check every field, then ask before anything is saved.
  function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setSavedMessage(null);
    const errors = validateProfile(form);
    setFieldErrors(errors);
    const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
    if (firstInvalid) {
      setErrorMessage("Please complete the highlighted fields before saving.");
      formRef.current?.querySelector(`#${firstInvalid}`)?.focus();
      return;
    }
    setConfirming(true);
  }

  // Step 2: the applicant confirmed.
  async function saveProfile() {
    setIsSubmitting(true);

    try {
      const saved = await saveMyProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        birthDate: form.birthDate,
        contactNumber: form.contactNumber.trim(),
        addressLine: form.addressLine.trim(),
        city: form.city.trim(),
        province: form.province.trim(),
        postalCode: form.postalCode.trim(),
        isBcasian: form.isBcasian === "yes",
      });
      setForm(toForm(saved));
      setHasExistingProfile(true);
      setSavedMessage("Your profile was saved successfully.");
      showToast("Your profile was saved successfully.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
      setConfirming(false);
    }
  }

  if (isLoading) {
    return (
      <AppLayout title="My Profile">
        <Card>Loading...</Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="My Profile">
      <div className="settings-layout">
      <div className="settings-content">
      <Card className="profile-card">
          <h2>Profile Details</h2>
          <p className="profile-subtitle">
            {hasExistingProfile
              ? "You can update your profile at any time."
              : "Complete your profile before submitting an application."}
          </p>

          {savedMessage && (
            <p className="form-success" role="status">
              {savedMessage}
            </p>
          )}
          {errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}

          <form ref={formRef} onSubmit={handleSubmit} noValidate>
            <div className="form-row-group">
              <div className="form-row">
                <label htmlFor="firstName">First name</label>
                <input placeholder="e.g. Juan" id="firstName" name="firstName" type="text" required value={form.firstName} onChange={handleChange} {...errorProps("firstName")} />
                {fieldError("firstName")}
              </div>
              <div className="form-row">
                <label htmlFor="lastName">Last name</label>
                <input placeholder="e.g. Dela Cruz" id="lastName" name="lastName" type="text" required value={form.lastName} onChange={handleChange} {...errorProps("lastName")} />
                {fieldError("lastName")}
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="birthDate">Birth date</label>
              <input
                id="birthDate"
                name="birthDate"
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
                value={form.birthDate}
                onChange={handleChange}
                {...errorProps("birthDate")}
              />
              {fieldError("birthDate")}
            </div>

            <div className="form-row">
              <label htmlFor="contactNumber">Contact number</label>
              <input placeholder={PHONE_PLACEHOLDER}
                id="contactNumber"
                name="contactNumber"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={PHONE_MAX_LENGTH}
                pattern={PHONE_PATTERN}
                title={PHONE_HINT}
                required
                value={form.contactNumber}
                onChange={(event) => changeField("contactNumber", cleanPhoneInput(event.target.value))}
                {...errorProps("contactNumber", "contactNumber-hint")}
              />
              {fieldError("contactNumber")}
              <p className="form-note" id="contactNumber-hint">
                {PHONE_HINT}.
              </p>
            </div>

            <div className="form-row">
              <label htmlFor="addressLine">Address</label>
              <input
                id="addressLine"
                name="addressLine"
                type="text"
                placeholder="Street, barangay"
                required
                value={form.addressLine}
                onChange={handleChange}
                {...errorProps("addressLine")}
              />
              {fieldError("addressLine")}
            </div>

            <div className="form-row-group">
              <div className="form-row">
                <label htmlFor="city">City</label>
                <input placeholder="e.g. Quezon City" id="city" name="city" type="text" required value={form.city} onChange={handleChange} {...errorProps("city")} />
                {fieldError("city")}
              </div>
              <div className="form-row">
                <label htmlFor="province">Province</label>
                <input placeholder="e.g. Metro Manila" id="province" name="province" type="text" required value={form.province} onChange={handleChange} {...errorProps("province")} />
                {fieldError("province")}
              </div>
              <div className="form-row">
                <label htmlFor="postalCode">Postal code</label>
                <input placeholder="e.g. 1100"
                  id="postalCode"
                  name="postalCode"
                  type="text"
                  required
                  value={form.postalCode}
                  onChange={handleChange}
                  {...errorProps("postalCode")}
                />
                {fieldError("postalCode")}
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="isBcasian">BCASian status</label>
              <select id="isBcasian" name="isBcasian" value={form.isBcasian} onChange={handleChange}>
                <option value="no">Not a BCASian</option>
                <option value="yes">BCASian</option>
              </select>
            </div>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Profile"}
            </button>
          </form>
      </Card>
      </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title={hasExistingProfile ? "Save your changes?" : "Save your profile?"}
        message={
          hasExistingProfile
            ? "Your profile will be updated with these details. Applications you file from now on will use them."
            : "Please check that your name, birth date, contact number and address are correct. You can update them later."
        }
        confirmLabel="Yes, save profile"
        cancelLabel="Go back"
        isSubmitting={isSubmitting}
        onConfirm={saveProfile}
        onCancel={() => setConfirming(false)}
      />
    </AppLayout>
  );
}
