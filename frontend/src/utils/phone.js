// The one mobile-number format used everywhere: +639XXXXXXXXX, a Philippine
// mobile number with the +63 country code. Mirrors backend PhilippinePhone.

export const PHONE_PLACEHOLDER = "+639171234567";
export const PHONE_MAX_LENGTH = 13;
export const PHONE_PATTERN = "^\\+639\\d{9}$";
export const PHONE_HINT = "Philippine mobile number starting with +63, like +639171234567";
export const PHONE_ERROR = "Enter a Philippine mobile number starting with +63, like +639171234567.";

const PHONE_REGEX = /^\+639\d{9}$/;

export function isValidPhone(value) {
  return PHONE_REGEX.test(value ?? "");
}

/**
 * Keeps the field in +63 form: digits only, the +63 added for you, at most 10 digits after it.
 * Typing 9171234567, pasting 09171234567 or pasting +639171234567 all give +639171234567.
 */
export function cleanPhoneInput(value) {
  let digits = (value ?? "").replace(/\D/g, "");
  if (digits.startsWith("63")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  else if (digits === "6") digits = "";
  digits = digits.slice(0, 10);
  return digits ? `+63${digits}` : "";
}
