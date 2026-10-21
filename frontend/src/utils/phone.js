// The one mobile-number format used everywhere: +639XXXXXXXXX, a Philippine
// mobile number with the +63 country code. Mirrors backend PhilippinePhone.

export const PHONE_PLACEHOLDER = "+639171234567";
export const PHONE_MAX_LENGTH = 13;
export const PHONE_PATTERN = "^\\+639\\d{9}$";
export const PHONE_HINT = "Philippine mobile number: after +63, 10 digits starting with 9, like 917 123 4567";
export const PHONE_ERROR = "Enter a Philippine mobile number: after +63, 10 digits starting with 9, like 917 123 4567.";

/** What is typed after the fixed +63: ten digits, the first being the 9 every Philippine mobile number starts with. */
export const PHONE_LOCAL_LENGTH = 10;
export const PHONE_LOCAL_PLACEHOLDER = "917 123 4567";

const PHONE_REGEX = /^\+639\d{9}$/;

export function isValidPhone(value) {
  return PHONE_REGEX.test(value ?? "");
}

/** The part after +63 (what the person types), from a stored number: "+639171234567" gives "9171234567". */
export function localPart(value) {
  return cleanPhoneInput(value).slice(3);
}

/**
 * What a PhoneInput stores for the text typed after its fixed +63. Digits only, at most ten, and the first
 * must be 9: a leading 0 (09171234567), the country code (639171234567, +639171234567) and anything else that
 * cannot start a Philippine mobile number are dropped as it is typed or pasted. Empty stays empty.
 */
export function fromLocalInput(text) {
  let digits = String(text ?? "").replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length > PHONE_LOCAL_LENGTH) digits = digits.slice(2);
  digits = digits.replace(/^0+/, "");
  if (!digits.startsWith("9")) return "";
  return `+63${digits.slice(0, PHONE_LOCAL_LENGTH)}`;
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
