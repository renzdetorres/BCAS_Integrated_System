/**
 * The password rules, in the browser so people see them while they type. This mirrors
 * backend/BCAS.Api/Models/StrongPasswordAttribute.cs, which is the one that decides: change them together.
 *
 * A password is refused when what is left of it, after the guessable parts are taken out, is not enough:
 * common words (also with look-alike characters like p@ssw0rd, or split by spaces and symbols), number and letter
 * runs (1234, abcd), keyboard walks (qwerty, 1q2w3e), repeated characters (aaa), years (2026), and the person's
 * own name or email. It also needs a letter and a number or symbol.
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

/**
 * The three things the checklist ticks, and the first thing to tell the person when any rule is not met
 * (the "not too common or simple" rule is checked too, and is only ever shown as a message).
 * `person` is { email, firstName, lastName }: a password built from those is refused.
 */
export function checkPassword(password, person = {}) {
  const hasLetter = [...password].some(isLetter);
  const hasNumberOrSymbol = [...password].some((c) => !isLetter(c) && !/\s/.test(c));
  const guessable = isGuessable(password, person);
  const rules = [
    { id: "length", label: `At least ${MIN_LENGTH} characters`, met: password.length >= MIN_LENGTH },
    { id: "letter", label: "A letter", met: hasLetter },
    { id: "number", label: "A number or a symbol", met: hasNumberOrSymbol },
  ];

  let problem = null;
  if (password.length < MIN_LENGTH) problem = `Password must be at least ${MIN_LENGTH} characters long.`;
  else if (guessable) problem = "Choose a password that is harder to guess: this one is too common or too simple.";
  else if (!hasLetter) problem = "Add at least one letter to your password.";
  else if (!hasNumberOrSymbol) problem = "Add at least one number or symbol to your password.";

  return { ok: problem === null, problem, rules };
}
