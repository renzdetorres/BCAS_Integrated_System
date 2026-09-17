import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyProfile, saveMyProfile } from "../api/profileApi.js";
import { ApiError } from "../api/apiClient.js";
import { useSession } from "../context/SessionContext.jsx";
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
    contactNumber: profile.contactNumber,
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
      <main className="profile-page">
        <div className="profile-card">Loading...</div>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <div className="profile-card">
        <Link className="profile-back-link" to="/portal">
          &larr; Back to dashboard
        </Link>
        <h1>My Profile</h1>
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
              <input id="firstName" name="firstName" type="text" required value={form.firstName} onChange={handleChange} />
            </div>
            <div className="form-row">
              <label htmlFor="lastName">Last name</label>
              <input id="lastName" name="lastName" type="text" required value={form.lastName} onChange={handleChange} />
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
            <input
              id="contactNumber"
              name="contactNumber"
              type="tel"
              required
              value={form.contactNumber}
              onChange={handleChange}
            />
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
              <input id="city" name="city" type="text" required value={form.city} onChange={handleChange} />
            </div>
            <div className="form-row">
              <label htmlFor="province">Province</label>
              <input id="province" name="province" type="text" required value={form.province} onChange={handleChange} />
            </div>
            <div className="form-row">
              <label htmlFor="postalCode">Postal code</label>
              <input
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
      </div>
    </main>
  );
}
