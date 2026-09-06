// Lightweight, NON-BLOCKING pattern checks (design doc §7 and §9).
// Nothing here changes the model call or refuses a request — it only sets
// flags for review, and masks two obvious PII shapes before a turn is logged.

const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const PHONE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;

// "name-like" shapes: a role word next to a capitalised given name, or a
// capitalised name next to a disclosure verb. Deliberately loose — this is a
// tripwire for "is the don't-enter-student-info notice being ignored", not a
// precise NER.
const NAME_NEAR_ROLE =
  /\b(?:student|kid|child|pupil|teacher|parent|mom|mother|dad|father|sister|brother|boy|girl|aide|counselor)\s+(?:named\s+|called\s+)?[A-Z][a-z]{2,}\b/;
const NAME_NEAR_DISCLOSURE =
  /\b[A-Z][a-z]{2,}(?:'s)?\s+(?:told me|said to me|came to me|disclosed|confided|admitted)\b/;

export function piiFlags(text) {
  const hits = [];
  if (EMAIL.test(text)) hits.push("email");
  if (PHONE.test(text)) hits.push("phone");
  if (NAME_NEAR_ROLE.test(text) || NAME_NEAR_DISCLOSURE.test(text)) hits.push("name_like");
  return hits;
}

// Obvious prompt-injection / persona / extraction shapes.
const INJECTION = [
  /ignore (?:the |all )?(?:above|previous|prior|earlier|preceding)/i,
  /disregard (?:the |all )?(?:above|previous|prior|instructions|rules)/i,
  /you are now\b/i,
  /new (?:instructions|system prompt|rules)\b/i,
  /(?:^|\n)\s*system\s*:/i,
  /\bdeveloper (?:mode|message|note)\b/i,
  /(?:print|show|reveal|repeat|output|share) (?:me )?(?:everything|all text|your|the) (?:instructions|system prompt|prompt|rules)/i,
  /what (?:are|were) your (?:instructions|rules|system prompt)/i,
  /\b(?:pretend|act as|roleplay|role[- ]play|imagine you are|you are a)\b/i,
  /\bDAN\b|jailbreak|do anything now/i
];

export function manipulationSuspected(text) {
  return INJECTION.some((re) => re.test(text));
}

const ROLEPLAY = /\b(?:pretend|act as|roleplay|role[- ]play|imagine you are|play the (?:role|part) of)\b/i;
const EXTRACTION =
  /(?:print|show|reveal|repeat|output|share|give me) (?:me )?(?:everything|all text|your|the) (?:instructions|system prompt|prompt|rules)|what (?:are|were) your (?:instructions|rules)/i;

export function roleplayAttempt(text) {
  return ROLEPLAY.test(text);
}
export function extractionAttempt(text) {
  return EXTRACTION.test(text);
}

// Applied to learner text BEFORE it is written to the log store. Email and
// phone only — name-like text is flagged, not mangled (design doc §9).
export function maskPii(text) {
  return text.replace(new RegExp(EMAIL, "g"), "[email]").replace(new RegExp(PHONE, "g"), "[phone]");
}
