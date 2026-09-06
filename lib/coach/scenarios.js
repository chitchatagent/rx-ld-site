// Per-module scenario records. These fill the {{...}} fields in the system
// prompt (see prompt.js) and are assembled server-side only — the learner
// never sees or sets them.
//
// Text is drawn straight from the two live modules:
//   education_case_file_demo.html      -> Module 04
//   education_case_file_demo_05.html   -> Module 05

export const ESCALATION_TARGET_DEFAULT =
  "your district's compliance officer or Title IX coordinator";

export const SCENARIOS = {
  "04": {
    module_id: "Module 04",
    scenario_title: "The Overheard Conversation",
    standard_name: "reasonable-suspicion standard",
    scenario_summary:
      "A homeroom teacher, circulating during independent work, overhears a fragment between two students — \"…he does that every time, it's not a big deal\" — and one student goes quiet on noticing the teacher. The teacher doesn't have the whole conversation, doesn't know who \"he\" is, and the tone was resigned rather than panicked. The module works three steps: notice, and make a private low-pressure check-in later in the period; when the student says \"I don't want to talk about it,\" be honest that the counselor has to be looped in, without over-promising confidentiality; then file a prompt, factual, documented report through the official channel the same day.",
    standard_text:
      "Reasonable suspicion is not certainty. It is met by what you observed and were told — a pattern worth a private follow-up — not by a full picture you have to assemble first. The teacher's job is: notice, a private check-in, prompt factual documentation, and handoff to the right channel. Not investigation. Not confirmation. Not silence. A reluctant student does not cancel a reporting obligation that already exists.",
    teaching_points: [
      "Tone and demeanor don't set the threshold; what was seen and heard does.",
      "The private check-in is low-pressure and doesn't force disclosure.",
      "Be honest about looping in the counselor; don't promise confidentiality you can't keep.",
      "Report the same day through the official channel: exact time, what was overheard as close to verbatim as possible, and what was said in the check-in.",
      "Investigating, or waiting to gather more \"evidence\" before reporting, is not the standard — and the delay itself can be the compliance failure."
    ],
    escalation_target: ESCALATION_TARGET_DEFAULT
  },

  "05": {
    module_id: "Module 05",
    scenario_title: "The Drafted Letter",
    standard_name: "human-review standard",
    scenario_summary:
      "A front-office administrator must notify all families of a changed early-dismissal policy by end of day. They paste the old policy into an AI assistant and get a clean-reading draft in seconds, with forty backlogged emails and a line at the desk. The module works three steps: read the draft closely against the actual policy document rather than skimming for tone; on finding the draft says \"48 hours\" where the policy says \"24 hours,\" correct it and re-check the whole draft for other errors rather than patching just the one; then disclose that AI helped draft it when the message goes district-wide.",
    standard_text:
      "AI can draft fast; it cannot verify itself. The standard is: check the draft against the source material before it represents the district; when you catch a factual error, fully resolve it and re-verify the rest rather than stopping at the first one; and disclose AI involvement where your district's policy requires it. Speed is the AI's job. Accuracy and transparency are still yours.",
    teaching_points: [
      "A tone-only skim can miss a substantive factual error; review against the source document.",
      "One caught error is a prompt to re-check the whole draft, not a green light.",
      "The \"24 hours\" in the scenario is an example detail, not a real rule — the learner's own district policy is the source of truth.",
      "Disclosure plus documented human review is the standard; whether an extra approval layer is required depends on the district's specific policy."
    ],
    escalation_target: ESCALATION_TARGET_DEFAULT
  }
};

export function getScenario(moduleId) {
  return SCENARIOS[String(moduleId)] ?? null;
}
