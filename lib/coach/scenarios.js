// Per-module scenario records. These fill the {{...}} fields in the system
// prompt (see prompt.js) and are assembled server-side only — the learner
// never sees or sets them.
//
// Text is drawn straight from the live modules:
//   education_case_file_demo.html      -> Module 04
//   education_case_file_demo_05.html   -> Module 05
//   education_case_file_demo_06.html   -> Module 06

export const ESCALATION_TARGET_DEFAULT =
  "your district's compliance officer or Title IX coordinator";

// Module 04 is a mandated-reporter scenario: a suspected-abuse concern has an
// independent route that does not run through the district. Kept hedged — a
// capability, not a statutory requirement (the prompt forbids asserting one).
export const ESCALATION_TARGET_MANDATED_REPORTER =
  "your district's compliance officer or Title IX coordinator (and, for a suspected-abuse concern, your state or county child-abuse hotline, which also takes reports directly)";

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
    escalation_target: ESCALATION_TARGET_MANDATED_REPORTER
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
  },

  "06": {
    module_id: "Module 06",
    scenario_title: "The Quick Summary",
    standard_name: "vetted-tools and data-privacy standard",
    scenario_summary:
      "A staff member is under time pressure and reaches for an AI tool that is not on any approved list to do something real with student data: write report-card comments, clean up counseling notes, build a family-update template for a team, mail-merge ~200 transportation notices, or chart a semester of discipline referrals. In each version they are about to paste in student information — names, grades, attendance, a detail shared in confidence, individualized transportation plans, or named discipline records. The module works one decision: before putting student data into a tool nobody has reviewed, stop and check whether it is approved for this kind of use. It also presses on the follow-up move some learners pick — stripping the name or the single most sensitive field and proceeding anyway — and asks whether de-identification alone actually makes the data safe in a small, knowable school population. The learner picks one of five role variants (classroom teacher, school counselor, grade-level lead teacher, front-office staff, school administrator); the standard is identical in all five. The closing checkpoint makes three points: a tool colleagues already use is not the same as a vetted tool; removing a name is not always enough; and the right first move with a new tool is to check whether it is vetted, not to proceed and not to escalate reflexively.",
    standard_text:
      "Two paired standards. Vetted tools: student data goes only into tools the district has reviewed and approved for that use. \"A colleague uses it,\" \"my team trusts it,\" and \"I'm the administrator\" are not that review, and approval for one kind of data (routine student data) is not approval for a more sensitive kind (counseling, discipline, or special-education records) or a larger scale (a bulk export). Data privacy: removing a name is not the same as making information safe. In a class of eighteen or a single caseload, a specific detail, date, or pattern can still identify one student, and small aggregate cells re-identify. The safe move is to not send what can't be recalled until the tool is cleared. Speed is why people skip the check; the check is short and the exposure is permanent — you don't know where the data lands, how long it's held, or whether it trains the model.",
    teaching_points: [
      "\"People around here already use it\" is not the same as vetted — trust among a team does not stand in for a district review.",
      "Removing a student's name is not always enough: a specific detail, a small class, or a single caseload can still identify the student, and small aggregate cells re-identify.",
      "Approval is scoped to the data and the scale — a tool cleared for routine student data may not be cleared for counseling records, discipline records, special-education data, or a 200-row bulk export.",
      "Seniority is not vetting — being the administrator, or knowing \"nobody will ask,\" does not make a tool approved.",
      "When the use expands from one person to a whole team, or student data has already been exposed, the move is to check the tool and escalate — not to quietly clean it up.",
      "Data sent to an unreviewed tool cannot be recalled: its storage, retention, and training use are all unknown."
    ],
    escalation_target: ESCALATION_TARGET_DEFAULT
  }
};

export function getScenario(moduleId) {
  return SCENARIOS[String(moduleId)] ?? null;
}
