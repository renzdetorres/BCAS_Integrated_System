import { PHONE_ERROR, PHONE_HINT, PHONE_MAX_LENGTH, PHONE_PATTERN, PHONE_PLACEHOLDER, cleanPhoneInput, isValidPhone } from "../utils/phone.js";
import { useEffect, useState } from "react";
import { getMyProfile, saveMyProfile } from "../api/profileApi.js";
import { ApiError } from "../api/apiClient.js";
import { useSession } from "../context/SessionContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
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

export default function ApplicantProfilePage() {
  const { session } = useSession();
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

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setSavedMessage(null);
    if (!isValidPhone(form.contactNumber)) {
      setErrorMessage(PHONE_ERROR);
      return;
    }
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
      setSavedMessage("Profile saved.");
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
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

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-row-group">
              <div className="form-row">
                <label htmlFor="firstName">First name</label>
                <input placeholder="e.g. Juan" id="firstName" name="firstName" type="text" required value={form.firstName} onChange={handleChange} />
              </div>
              <div className="form-row">
                <label htmlFor="lastName">Last name</label>
                <input placeholder="e.g. Dela Cruz" id="lastName" name="lastName" type="text" required value={form.lastName} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="birthDate">Birth date</label>
              <input
                id="birthDate"
                name="birthDate"
                type="date"
                required
                value={form.birthDate}
                onChange={handleChange}
              />
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
                aria-describedby="contactNumber-hint"
                required
                value={form.contactNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, contactNumber: cleanPhoneInput(event.target.value) }))}
              />
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
              />
            </div>

            <div className="form-row-group">
              <div className="form-row">
                <label htmlFor="city">City</label>
                <input placeholder="e.g. Quezon City" id="city" name="city" type="text" required value={form.city} onChange={handleChange} />
              </div>
              <div className="form-row">
                <label htmlFor="province">Province</label>
                <input placeholder="e.g. Metro Manila" id="province" name="province" type="text" required value={form.province} onChange={handleChange} />
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
                />
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
    </AppLayout>
  );
}
