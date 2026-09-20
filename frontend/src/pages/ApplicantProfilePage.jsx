import { useEffect, useState } from "react";
import { changeMyPassword, getMyProfile, saveMyProfile } from "../api/profileApi.js";
import { getMyNotificationPreferences, setMyNotificationPreference } from "../api/notificationPreferencesApi.js";
import { ApiError } from "../api/apiClient.js";
import { useSession } from "../context/SessionContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import "./ApplicantProfilePage.css";

const initialPasswordForm = { currentPassword: "", newPassword: "", confirmNewPassword: "" };

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

  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSaved, setPasswordSaved] = useState(null);

  const [preferences, setPreferences] = useState([]);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [preferencesError, setPreferencesError] = useState(null);
  const [pendingPreferenceType, setPendingPreferenceType] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getMyNotificationPreferences()
      .then((data) => {
        if (!cancelled) setPreferences(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setPreferencesError(error instanceof ApiError ? error.message : "Failed to load notification preferences.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPreferences(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePreferenceToggle(preference) {
    setPendingPreferenceType(preference.notificationType);
    setPreferencesError(null);
    try {
      const updated = await setMyNotificationPreference(preference.notificationType, !preference.isEnabled);
      setPreferences((prev) => prev.map((p) => (p.notificationType === updated.notificationType ? updated : p)));
    } catch (error) {
      setPreferencesError(error instanceof ApiError ? error.message : "Failed to update notification preference.");
    } finally {
      setPendingPreferenceType(null);
    }
  }

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

  function handlePasswordChange(event) {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSaved(null);

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changeMyPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm(initialPasswordForm);
      setPasswordSaved("Password changed.");
    } catch (error) {
      setPasswordError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  if (isLoading) {
    return (
      <AppLayout title="Settings">
        <Card>Loading...</Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Settings">
      <Card className="profile-card">
          <h2>Profile</h2>
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
      </Card>

      <Card className="profile-card">
          <h2>Change Password</h2>
          <p className="profile-subtitle">Enter your current password and choose a new one.</p>

          {passwordSaved && (
            <p className="form-success" role="status">
              {passwordSaved}
            </p>
          )}
          {passwordError && (
            <p className="form-error" role="alert">
              {passwordError}
            </p>
          )}

          <form onSubmit={handlePasswordSubmit} noValidate>
            <div className="form-row">
              <label htmlFor="currentPassword">Current password</label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
              />
            </div>

            <div className="form-row">
              <label htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
              />
            </div>

            <div className="form-row">
              <label htmlFor="confirmNewPassword">Confirm new password</label>
              <input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={passwordForm.confirmNewPassword}
                onChange={handlePasswordChange}
              />
            </div>

            <button type="submit" disabled={isChangingPassword}>
              {isChangingPassword ? "Changing password..." : "Change Password"}
            </button>
          </form>
      </Card>

      <Card className="profile-card">
          <h2>Notification Preferences</h2>
          <p className="profile-subtitle">
            Choose which updates you'd like emailed to you. Turning one off stops just that type of email - you can
            turn it back on anytime.
          </p>

          {preferencesError && (
            <p className="form-error" role="alert">
              {preferencesError}
            </p>
          )}

          {isLoadingPreferences ? (
            <p>Loading...</p>
          ) : (
            <ul className="notification-preference-list">
              {preferences.map((preference) => (
                <li key={preference.notificationType} className="notification-preference-row">
                  <span className="notification-preference-name">{preference.displayName}</span>
                  <button
                    type="button"
                    className={preference.isEnabled ? "preference-toggle-on" : "preference-toggle-off"}
                    onClick={() => handlePreferenceToggle(preference)}
                    disabled={pendingPreferenceType === preference.notificationType}
                    role="switch"
                    aria-checked={preference.isEnabled}
                  >
                    {pendingPreferenceType === preference.notificationType
                      ? "Saving..."
                      : preference.isEnabled
                        ? "On"
                        : "Off"}
                  </button>
                </li>
              ))}
            </ul>
          )}
      </Card>
    </AppLayout>
  );
}
