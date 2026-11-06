/**
 * The password rules, in the browser so people see them while they type. This mirrors
 * backend/BCAS.Api/Models/StrongPasswordAttribute.cs, which is the one that decides: change them together.
 *
 * The school's written policy (length, uppercase, lowercase, number, special character, no spaces, not the email),
 * then a check that what is left of the password, after the guessable parts are taken out, is enough: common words
 * (also with look-alike characters like p@ssw0rd, or split by symbols), number and letter runs (1234, abcd), keyboard
 * walks (qwerty, 1q2w3e), repeated characters (aaa), years (2026), and the person's own name or email.
 */

export const MIN_LENGTH = 8;

const COMMON = new Set([
  "password", "password1", "password12", "password123", "password1234", "passw0rd", "p@ssw0rd", "p@ssword", "p@ssword1",
  "12345678", "123456789", "1234567890", "123123123", "11111111", "00000000", "87654321", "12341234", "12121212",
  "qwerty123", "qwertyui", "qwertyuiop", "qwerty12", "1q2w3e4r", "1qaz2wsx", "abc12345", "abcd1234", "abcdefgh",
  "iloveyou", "iloveyou1", "letmein1", "letmein123", "welcome1", "welcome123", "admin123", "admin1234", "administrator",
  "monkey123", "dragon123", "football1", "baseball1", "superman1", "master123", "sunshine1", "princess1", "trustno1",
  "bcas1234", "bcas12345", "bcas2026", "bcas2025", "batangas1", "batangas123", "school123", "student123",
]);

const WORDS = [
  "password", "passwort", "pass", "admin", "administrator", "welcome", "letmein", "iloveyou", "qwerty", "qwertyuiop",
  "monkey", "dragon", "football", "baseball", "basketball", "superman", "batman", "master", "sunshine", "princess",
  "trustno", "login", "secret", "hello", "guest", "changeme", "default", "computer", "internet", "freedom",
  "student", "school", "college", "scholar", "scholarship", "admission", "applicant", "registrar", "evaluator",
  "bcas", "batangas", "philippines", "manila", "mabuhay", "pilipinas", "iloveu",
];

const KEYBOARD_ROWS = [
  "qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890", "qazwsxedcrfvtgbyhnujmikolp", "1q2w3e4r5t6y7u8i9o0p", "!@#$%^&*()",
];

const YEAR = /(19|20)[0-9]{2}/g;
const LOOK_ALIKES = { "@": "a", $: "s", "!": "i", 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t" };

const isLetter = (c) => /\p{L}/u.test(c);
const isDigit = (c) => c >= "0" && c <= "9";
const isLetterOrDigit = (c) => isLetter(c) || isDigit(c);
const sameKind = (a, b) => (isDigit(a) && isDigit(b)) || (isLetter(a) && isLetter(b));

/** The same characters with look-alikes turned back into letters: p@ssw0rd becomes password. */
function decode(value) {
  let out = "";
  for (const c of value.toLowerCase()) out += LOOK_ALIKES[c] ?? c;
  return out;
}

const DECODED_WORDS = WORDS.map(decode);

function mark(covered, from, to) {
  for (let i = from; i <= to; i++) covered[i] = true;
}

function markRepeats(s, covered) {
  for (let start = 0; start < s.length; ) {
    let end = start;
    while (end + 1 < s.length && s[end + 1] === s[start]) end++;
    if (end - start + 1 >= 3) mark(covered, start, end);
    start = end + 1;
  }
}

function markRuns(s, covered) {
  for (let start = 0; start < s.length - 1; start++) {
    const step = s.charCodeAt(start + 1) - s.charCodeAt(start);
    if ((step !== 1 && step !== -1) || !sameKind(s[start], s[start + 1])) continue;
    let end = start + 1;
    while (end + 1 < s.length && s.charCodeAt(end + 1) - s.charCodeAt(end) === step && sameKind(s[end], s[end + 1])) end++;
    if (end - start + 1 >= (isDigit(s[start]) ? 3 : 4)) mark(covered, start, end);
    start = end - 1;
  }
}

function markKeyboardWalks(s, covered) {
  for (const row of KEYBOARD_ROWS) {
    for (const line of [row, [...row].reverse().join("")]) {
      for (let i = 0; i + 4 <= line.length; i++) {
        const fragment = line.slice(i, i + 4);
        let at = s.indexOf(fragment);
        while (at >= 0) {
          mark(covered, at, at + 3);
          at = s.indexOf(fragment, at + 1);
        }
      }
    }
  }
}

function markYears(s, covered) {
  for (const match of s.matchAll(YEAR)) mark(covered, match.index, match.index + match[0].length - 1);
}

/** Words are found after look-alikes are decoded and with spaces and symbols ignored. */
function markWords(lower, covered, words) {
  const decoded = decode(lower);
  let text = "";
  const origin = [];
  for (let i = 0; i < decoded.length; i++) {
    if (isLetter(decoded[i])) {
      text += decoded[i];
      origin.push(i);
    }
  }
  for (const word of words) {
    if (word.length < 3) continue;
    let at = text.indexOf(word);
    while (at >= 0) {
      mark(covered, origin[at], origin[at + word.length - 1]);
      at = text.indexOf(word, at + 1);
    }
  }
}

function personalWords(email, firstName, lastName) {
  const words = [];
  const add = (text) => {
    if (!text) return;
    const letters = decode([...text].filter(isLetter).join(""));
    if (letters.length >= 3) words.push(letters);
  };
  add(firstName);
  add(lastName);
  const local = (email ?? "").split("@")[0];
  add(local);
  for (const piece of local.split(/[^A-Za-z]+/)) add(piece);
  return words;
}

/** True for a password that is on the common list, or whose own content is mostly guessable parts. */
export function isGuessable(password, { email, firstName, lastName } = {}) {
  const trimmed = password.trim();
  if (trimmed.length === 0) return false;
  if (COMMON.has(trimmed.toLowerCase()) || [...trimmed].every((c) => c === trimmed[0])) return true;

  const lower = trimmed.toLowerCase();
  const covered = new Array(lower.length).fill(false);
  markRepeats(lower, covered);
  markRuns(lower, covered);
  markKeyboardWalks(lower, covered);
  markYears(lower, covered);
  markWords(lower, covered, [...DECODED_WORDS, ...personalWords(email, firstName, lastName)]);

  const left = [];
  for (let i = 0; i < lower.length; i++) if (!covered[i] && isLetterOrDigit(lower[i])) left.push(lower[i]);
  // What is left has to be enough to carry a password: five characters, four of them different.
  return left.length < 5 || new Set(left).size < 4;
}

/** True when the password is the account's email address or its username (the part before the @), in any letter case. */
export function matchesAccount(password, email) {
  const trimmed = (email ?? "").trim();
  if (!trimmed) return false;
  const username = trimmed.split("@")[0];
  const lower = password.toLowerCase();
  return lower === trimmed.toLowerCase() || (username.length > 0 && lower === username.toLowerCase());
}

const SPECIAL = /[!-/:-@[-`{-~]/; // printable ASCII that is not a letter, a digit or a space

/**
 * The school's password policy, as the checklist shows it and in the order the server checks it:
 * 8 or more characters, an uppercase letter (A-Z), a lowercase letter (a-z), a number (0-9), a special
 * character (! @ # $ % ^ & *), no spaces, and not the same as the account's email or username. After those,
 * the server also refuses passwords that are common or simple (told only as a message, not a line here).
 * `person` is { email, firstName, lastName }; the email line only appears where the email is known.
 * Returns the lines to tick and the first thing to tell the person (null when the password is acceptable).
 */
export function checkPassword(password, person = {}) {
  const has = {
    length: password.length >= MIN_LENGTH,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: SPECIAL.test(password),
    noSpaces: !/\s/.test(password),
    notEmail: !matchesAccount(password, person.email),
  };
  const knowsEmail = Boolean((person.email ?? "").trim());

  const rules = [
    { id: "length", label: `At least ${MIN_LENGTH} characters`, met: has.length },
    { id: "upper", label: "An uppercase letter (A\u2013Z)", met: has.upper },
    { id: "lower", label: "A lowercase letter (a\u2013z)", met: has.lower },
    { id: "number", label: "A number (0\u20139)", met: has.number },
    { id: "special", label: "A special character (! @ # $ % ^ & *)", met: has.special },
    { id: "spaces", label: "No spaces", met: has.noSpaces },
    ...(knowsEmail ? [{ id: "email", label: "Not the same as your email", met: has.notEmail }] : []),
  ];

  let problem = null;
  if (!has.length) problem = `Password must be at least ${MIN_LENGTH} characters long.`;
  else if (!has.upper) problem = "Add at least one uppercase letter (A\u2013Z) to your password.";
  else if (!has.lower) problem = "Add at least one lowercase letter (a\u2013z) to your password.";
  else if (!has.number) problem = "Add at least one number (0\u20139) to your password.";
  else if (!has.special) problem = "Add at least one special character (! @ # $ % ^ & *) to your password.";
  else if (!has.noSpaces) problem = "Your password can't contain spaces.";
  else if (!has.notEmail) problem = "Your password can't be the same as your email or username.";
  else if (isGuessable(password, person)) problem = "Choose a password that is harder to guess: this one is too common or too simple.";

  return { ok: problem === null, problem, rules };
}
