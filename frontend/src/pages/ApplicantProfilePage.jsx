import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import Toggle from "../components/ui/Toggle.jsx";
import { inputClasses, labelClasses, primaryButtonClasses } from "../lib/formStyles.js";
import { changeMyPassword, getMyProfile, saveMyProfile } from "../api/profileApi.js";
import { getMyNotificationPreferences, setMyNotificationPreference } from "../api/notificationPreferencesApi.js";
import { ApiError } from "../api/apiClient.js";
import { useSession } from "../context/SessionContext.jsx";

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

  return (
    <AppShell>
      <h1 className="text-2xl font-extrabold text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">Manage your profile, password, and notification preferences.</p>

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-400">Loading...</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-lg font-bold text-slate-900">Profile</h2>
            <p className="mt-1 text-sm text-slate-500">
              {hasExistingProfile
                ? "You can update your profile at any time."
                : "Complete your profile before submitting an application."}
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClasses} htmlFor="firstName">
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    className={inputClasses}
                    value={form.firstName}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className={labelClasses} htmlFor="lastName">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    className={inputClasses}
                    value={form.lastName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses} htmlFor="birthDate">
                  Birth date
                </label>
                <input
                  id="birthDate"
                  name="birthDate"
                  type="date"
                  required
                  className={inputClasses}
                  value={form.birthDate}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className={labelClasses} htmlFor="contactNumber">
                  Contact number
                </label>
                <input
                  id="contactNumber"
                  name="contactNumber"
                  type="tel"
                  required
                  className={inputClasses}
                  value={form.contactNumber}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className={labelClasses} htmlFor="addressLine">
                  Address
                </label>
                <input
                  id="addressLine"
                  name="addressLine"
                  type="text"
                  placeholder="Street, barangay"
                  required
                  className={inputClasses}
                  value={form.addressLine}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClasses} htmlFor="city">
                    City
                  </label>
                  <input id="city" name="city" type="text" required className={inputClasses} value={form.city} onChange={handleChange} />
                </div>
                <div>
                  <label className={labelClasses} htmlFor="province">
                    Province
                  </label>
                  <input
                    id="province"
                    name="province"
                    type="text"
                    required
                    className={inputClasses}
                    value={form.province}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className={labelClasses} htmlFor="postalCode">
                    Postal code
                  </label>
                  <input
                    id="postalCode"
                    name="postalCode"
                    type="text"
                    required
                    className={inputClasses}
                    value={form.postalCode}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses} htmlFor="isBcasian">
                  BCASian status
                </label>
                <select id="isBcasian" name="isBcasian" className={inputClasses} value={form.isBcasian} onChange={handleChange}>
                  <option value="no">Not a BCASian</option>
                  <option value="yes">BCASian</option>
                </select>
              </div>

              {savedMessage && (
                <p className="text-sm font-medium text-status-green" role="status">
                  {savedMessage}
                </p>
              )}
              {errorMessage && (
                <p className="text-sm font-medium text-status-red" role="alert">
                  {errorMessage}
                </p>
              )}

              <button type="submit" disabled={isSubmitting} className={primaryButtonClasses}>
                {isSubmitting ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </Card>

          <div className="space-y-6">
            <Card>
              <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
              <p className="mt-1 text-sm text-slate-500">Enter your current password and choose a new one.</p>

              <form onSubmit={handlePasswordSubmit} noValidate className="mt-4 space-y-4">
                <div>
                  <label className={labelClasses} htmlFor="currentPassword">
                    Current password
                  </label>
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                    className={inputClasses}
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                  />
                </div>

                <div>
                  <label className={labelClasses} htmlFor="newPassword">
                    New password
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className={inputClasses}
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                  />
                </div>

                <div>
                  <label className={labelClasses} htmlFor="confirmNewPassword">
                    Confirm new password
                  </label>
                  <input
                    id="confirmNewPassword"
                    name="confirmNewPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className={inputClasses}
                    value={passwordForm.confirmNewPassword}
                    onChange={handlePasswordChange}
                  />
                </div>

                {passwordSaved && (
                  <p className="text-sm font-medium text-status-green" role="status">
                    {passwordSaved}
                  </p>
                )}
                {passwordError && (
                  <p className="text-sm font-medium text-status-red" role="alert">
                    {passwordError}
                  </p>
                )}

                <button type="submit" disabled={isChangingPassword} className={primaryButtonClasses}>
                  {isChangingPassword ? "Changing password..." : "Change Password"}
                </button>
              </form>
            </Card>

            <Card>
              <h2 className="text-lg font-bold text-slate-900">Notification Preferences</h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose which updates you'd like emailed to you. Turning one off stops just that type of email — you
                can turn it back on anytime.
              </p>

              {preferencesError && (
                <p className="mt-2 text-sm font-medium text-status-red" role="alert">
                  {preferencesError}
                </p>
              )}

              {isLoadingPreferences ? (
                <p className="mt-4 text-sm text-slate-400">Loading...</p>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {preferences.map((preference) => (
                    <div
                      key={preference.notificationType}
                      className={pendingPreferenceType === preference.notificationType ? "pointer-events-none opacity-60" : ""}
                    >
                      <Toggle
                        label={preference.displayName}
                        checked={preference.isEnabled}
                        onChange={() => handlePreferenceToggle(preference)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
