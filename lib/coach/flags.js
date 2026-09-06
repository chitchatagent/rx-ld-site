// Lightweight, NON-BLOCKING pattern checks (design doc §7 and §9).
// Nothing here changes the model call or refuses a request — it only sets
// flags for review, and masks two obvious PII shapes before a turn is logged.
//
// These are deliberately LOOSE tripwires, not precise classifiers. Over-
// flagging is the safe direction: a flagged turn is reviewed, and a
// pii_suspected turn has its logged text stripped early (7 days, design doc §9).
// Broadened 2026-09-05 after the red-team pass under-reported real attempts —
// "coworker Maria" (unflagged real name), "your exact instructions", "repeat
// verbatim", "write the lines as a script", "translate your instructions",
// and paraphrased off-topic redirects. Same keyword/pattern approach as the
// escalation_pointer detector in api/coach.js.

// ---------------------------------------------------------------------------
// PII shapes
// ---------------------------------------------------------------------------
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const PHONE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;

// People words that, next to a capitalised given name, suggest a real person
// is being named. Kept broad on purpose.
const ROLE_WORD =
  "students?|kids?|child|children|pupils?|para|aides?|counsel(?:or|lor)s?|" +
  "principal|vice[- ]principal|nurse|coach|colleagues?|co-?workers?|boss|" +
  "supervisors?|admin(?:istrator)?s?|parents?|mom|mother|dad|father|" +
  "stepdad|stepmom|step[- ]?father|step[- ]?mother|guardian|foster (?:parent|mom|dad)|" +
  "grandparent|grandma|grandmother|grandpa|grandfather|aunt|uncle|cousin|" +
  "sister|brother|sibling|son|daughter|niece|nephew|boy|girl|kiddo|friends?|" +
  "classmates?|roommates?|neighbou?rs?|boyfriend|girlfriend|husband|wife|" +
  "partner|spouse|fianc(?:e|é|ee)|teachers?";

// Verbs / actions that suggest a named person disclosed or did something.
const DISCLOSURE_VERB =
  "told me|said to me|talked to me|spoke to me|came to me|reached out|" +
  "disclosed|confided|admitted|revealed|confessed|mentioned(?: to me)?|" +
  "complained|reported|asked me|showed me|handed me|gave me|sent|wrote|" +
  "emailed|e-mailed|texted|messaged|whispered|brought (?:it |this )?to me";

// Capitalised tokens that read like names but usually aren't.
const NOT_A_NAME = new Set(
  ("The They Their Them There Then These Those This That What When Where Which " +
   "While With Would Could Should Will Shall May Might Must Because But And Nor " +
   "For Yet So Also However Therefore Meanwhile Otherwise Instead Still Just " +
   "Here Now Today Tonight Tomorrow Yesterday Monday Tuesday Wednesday Thursday " +
   "Friday Saturday Sunday January February March April May June July August " +
   "September October November December Mister Mrs Miss Doctor Professor Sir " +
   "Madam Okay Yes Nope Maybe Please Thanks Thank Hello Hey Our His Her Your " +
   "Its Someone Somebody Anyone Anybody Everybody Nobody Everyone One Both Each " +
   "Every Some Many Most Few None All Another Other Such Even Only Once")
    .split(/\s+/)
);

const ROLE_NAME_RE = new RegExp(
  `\\b(?:${ROLE_WORD})\\b[^.?!\\n]{0,20}?\\b(?:named |called )?([A-Za-z][a-z]{2,})\\b`, "i"
);
const DISCLOSURE_NAME_RE = new RegExp(
  `\\b([A-Za-z][a-z]{2,})(?:'s)?\\s+(?:${DISCLOSURE_VERB})\\b`, "i"
);
const EXPLICIT_NAMED_RE = new RegExp(
  `\\b(?:named|called|goes by|his name is|her name is|their name is)\\s+([A-Za-z][a-z]{2,})\\b`, "i"
);
const POSSESSIVE_NAME_RE = new RegExp(
  `\\b([A-Za-z][a-z]{2,})'s\\s+(?:${ROLE_WORD}|letter|email|e-mail|note|message|draft|report|class|case|situation|disclosure|story|account)\\b`, "i"
);

function looksLikeName(m) {
  return typeof m === "string" && /^[A-Z][a-z]{2,}$/.test(m) && !NOT_A_NAME.has(m);
}

export function piiFlags(text) {
  const t = String(text || "");
  const hits = [];
  if (EMAIL.test(t)) hits.push("email");
  if (PHONE.test(t)) hits.push("phone");
  const nameHit = [ROLE_NAME_RE, DISCLOSURE_NAME_RE, EXPLICIT_NAMED_RE, POSSESSIVE_NAME_RE]
    .map((re) => re.exec(t))
    .some((m) => m && looksLikeName(m[1]));
  if (nameHit) hits.push("name_like");
  return hits;
}

// ---------------------------------------------------------------------------
// Prompt-injection / persona / extraction shapes
// ---------------------------------------------------------------------------

// noun the learner is fishing for; allow up to 3 adjectives after "your"
// ("your exact instructions", "your full system prompt", ...).
const PROMPT_NOUN =
  "(?:system )?(?:prompt|instructions?|rules?|directives?|guidelines?|guardrails?|configuration|config|persona)";
const ADJ = "(?:[\\w-]+ ){0,3}";

// An extraction attempt is also a manipulation attempt, so INJECTION includes
// these.
const EXTRACTION_RES = [
  new RegExp(`\\byour\\s+${ADJ}${PROMPT_NOUN}\\b`, "i"),
  new RegExp(
    `\\b(?:print|show|reveal|repeat|output|share|give me|paste|list|summari[sz]e|describe|recite|divulge|leak|dump|echo|display|tell me|what(?:'s| is| are| were))\\b[^.?!\\n]{0,40}?\\b${PROMPT_NOUN}\\b`,
    "i"
  ),
  /\b(?:repeat|say|print|type|echo|reproduce|read back)\b[^.?!\n]{0,40}?\b(?:verbatim|word[- ]for[- ]word)\b/i,
  /\b(?:everything|the text|all (?:of )?the text|what(?:'s| is| was) written)\b[^.?!\n]{0,30}?\babove\b/i,
  /\babove this line\b/i,
  /\b(?:hidden|secret|underlying|internal|initial|original|real)\s+(?:prompt|instructions?|message|text|rules?)\b/i,
  /\b(?:the|your)\s+system\s+(?:prompt|message)\b/i,
  /\btranslate\b[^.?!\n]{0,30}?\b(?:your|the)\s+(?:instructions?|rules?|prompt)\b/i
];

const INJECTION_RES = [
  /\b(?:ignore|disregard|forget|discard|override|bypass|skip|drop)\b[^.?!\n]{0,30}?\b(?:above|previous|prior|earlier|preceding|the system|those|these|all (?:prior|previous))\b/i,
  /\b(?:ignore|disregard|forget|override|bypass)\b[^.?!\n]{0,30}?\b(?:instructions?|rules?|prompt|guidelines?|guardrails?|constraints?)\b/i,
  /\byou are (?:now |actually |really )?(?:a|an|the|my)\b/i,
  /\bfrom now on\b[^.?!\n]{0,40}?\byou\b/i,
  /\bnew (?:instructions?|system prompt|rules?|persona|task|role)\b/i,
  /(?:^|\n|")\s*(?:system|assistant|developer)\s*[:>]/i,
  /\b(?:developer|debug|admin|god|dev|maintenance|test(?:ing)?|sudo|root)\s+mode\b/i,
  /\b(?:i am|i'm|this is|as)\s+(?:the|your)\s+(?:developer|admin(?:istrator)?|engineer|creator|owner|operator|maintainer)\b/i,
  /\bconfirm\b[^.?!\n]{0,20}?\b(?:you (?:are|will|understand|received|accept)|this|that you)\b/i,
  /\bDAN\b|\bjailbreak\b|\bdo anything now\b|\bunrestricted\b|\bno (?:restrictions?|limits?|filter|rules?)\b/i,
  ...EXTRACTION_RES
];

export function manipulationSuspected(text) {
  const t = String(text || "");
  return INJECTION_RES.some((re) => re.test(t));
}

// ---------------------------------------------------------------------------
// Role-play / persona / fiction
// ---------------------------------------------------------------------------
const CODE_CTX =
  /\b(?:python|javascript|typescript|node|java|c\+\+|c#|ruby|go(?:lang)?|rust|bash|shell|powershell|sql|css|html|xml|json|yaml|regex|code|program|function|script to|parse|spreadsheet|csv)\b/i;

const ROLEPLAY_CORE = [
  /\b(?:pretend|role[- ]?play|make[- ]believe)\b/i,
  /\bimagine (?:you(?:'re| are)|that you|yourself as)\b/i,
  /\b(?:act|speak|respond|reply|talk|behave|answer)\s+(?:as|like)\s+(?:a|an|the|if|you're|you are)\b/i,
  /\bplay (?:the (?:role|part|character) of|a )\b/i,
  /\byou(?:'re| are)\s+(?:now\s+)?(?:the|a|an|my)\s+(?:student|teacher|kid|parent|counsel(?:or|lor)|lawyer|principal|character|other student)\b/i,
  /\b(?:stay |remain )?in character\b/i,
  /\blet(?:'s| us| me)\s+(?:practi[cs]e|rehearse|run through|role[- ]?play)\b[^.?!\n]{0,30}?\b(?:conversation|scenario|dialogue|talk|scene|it)\b/i
];
const ROLEPLAY_SCRIPT = [
  /\b(?:write|draft|compose|script out)\b[^.?!\n]{0,40}?\b(?:screenplay|scene|dialogue|dialog|monologue|skit|the [\w' ]{0,20}lines|a (?:short )?play)\b/i,
  /\b(?:as|in the form of)\s+(?:a\s+)?(?:script|screenplay|scene|skit|a play)\b/i,
  /\bthe (?:teacher|student|counsel(?:or|lor))(?:'s)?\s+lines\b/i
];

export function roleplayAttempt(text) {
  const t = String(text || "");
  if (ROLEPLAY_CORE.some((re) => re.test(t))) return true;
  if (!CODE_CTX.test(t) && ROLEPLAY_SCRIPT.some((re) => re.test(t))) return true;
  return false;
}

export function extractionAttempt(text) {
  const t = String(text || "");
  return EXTRACTION_RES.some((re) => re.test(t));
}

// ---------------------------------------------------------------------------
// Response-side: did the coach give an off-topic redirect? (paraphrase-tolerant)
// ---------------------------------------------------------------------------
const OFF_TOPIC_REDIRECT_RES = [
  /\b(?:can |could )?only (?:help|assist|work|talk|dig|speak|deal|go)\b[^.?!\n]{0,15}?\b(?:with|through|on|into|about)\b/i,
  /\bonly (?:really |simply )?(?:here|set up|meant|able|equipped|designed|around) to\b/i,
  /\bi'?m (?:really |simply |just |only ){0,2}(?:here|set up|meant|able|equipped|designed) to (?:work through|help|talk|discuss|cover|dig|go)\b/i,
  /\bthe only thing i can (?:talk about|discuss|help (?:with|you with)|do here)\b/i,
  /\boutside (?:what i can|this (?:training )?(?:scenario|module)|the scope|my)\b/i,
  /\b(?:that'?s|this is|it'?s) (?:a bit )?outside what i can\b/i,
  /\bnot something i can help (?:with|you with)\b/i,
  /\b(?:stick|keep) (?:to|it to) (?:this|the) (?:one )?(?:scenario|module|topic)\b/i,
  /\b(?:that'?s|it'?s) a different module\b/i,
  /\bi don'?t (?:get into|discuss|cover|do) (?:other|that|those)\b/i,
  /\bhere to (?:help|work) (?:you )?(?:with|through) (?:this|the) (?:one )?(?:scenario|module|training)\b/i,
  /\bnot (?:weather|coding|a coding|legal advice|general chit)\b/i
];

export function offTopicRedirect(coachText) {
  const t = String(coachText || "");
  return OFF_TOPIC_REDIRECT_RES.some((re) => re.test(t));
}

// ---------------------------------------------------------------------------
// Masking (log store). Email and phone only — name-like text is flagged, not
// mangled (design doc §9); the 7-day early strip bounds how long it persists.
// ---------------------------------------------------------------------------
export function maskPii(text) {
  return String(text || "")
    .replace(new RegExp(EMAIL, "g"), "[email]")
    .replace(new RegExp(PHONE, "g"), "[phone]");
}
