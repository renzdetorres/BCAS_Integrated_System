// The one mobile-number format used everywhere: 09XXXXXXXXX, exactly 11
// digits starting with 09. Mirrors backend PhilippinePhone.

export const PHONE_PATTERN = "^09\d{9}$";
export const PHONE_HINT = "11 digits starting with 09, like 09171234567";
export const PHONE_ERROR = "Enter a mobile number with 11 digits starting with 09, like 09171234567.";

const PHONE_REGEX = /^09\d{9}$/;

export function isValidPhone(value) {
  return PHONE_REGEX.test(value ?? "");
}

/** Keeps digits only and stops at 11, so the field can only ever hold the right shape. */
export function cleanPhoneInput(value) {
  return (value ?? "").replace(/\D/g, "").slice(0, 11);
}
