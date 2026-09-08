// Per-module scenario records. These fill the {{...}} fields in the system
// prompt (see prompt.js) and are assembled server-side only — the learner
// never sees or sets them.
//
// Text is drawn straight from the live modules:
//   education_case_file_demo.html      -> Module 04
//   education_case_file_demo_05.html   -> Module 05
//   education_case_file_demo_06.html   -> Module 06
//   education_case_file_demo_07.html   -> Module 07
//   education_case_file_demo_08.html   -> Module 08

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
  },

  "07": {
    module_id: "Module 07",
    scenario_title: "The Suggested Grade",
    standard_name: "no-high-stakes-decisions and local-governance standard",
    scenario_summary:
      "An educator is under time pressure and an AI tool has handed them a recommendation about a specific student that follows policy or matches the usual process: a suggested essay grade, a \"low priority — no action needed\" flag on a support-intervention list, a lower-level course placement, a truancy-letter escalation, or a three-day suspension. In each version the tool's output is defensible on its face — it matches the rubric, the threshold, or the policy category. The module works three segments. Segment 1: before accepting the tool's call, the educator reviews the actual case themselves — reads the essay, pulls the file, brings it to the team, checks with a counselor, reads the full incident report — rather than adopting the recommendation because the tool has been reliable or because it is policy-compliant. Segment 2 (the pattern): reviewing it surfaces something the tool's pattern-matching could not see — a strong student having one bad day, a grade dip that starts right after a known family event, two low test scores from a documented health issue, a family already on a documented school plan, a first-ever incident with ambiguous circumstances — and the standard is that this knowledge, not the tool's output, drives the decision. Segment 3 (before it's final): the educator enters their own judgment and writes a brief note on why it differs from the tool's suggestion, so a parent, administrator, or district office can see the reasoning later. The learner picks one of five role variants (classroom teacher, school counselor, grade-level lead teacher, front-office/support staff, school administrator); the standard is identical in all five. The closing checkpoint makes three points: a recommendation matching official policy is not the same as it being the right call; feeding a tool the same information a person would have does not remove the need for human review before a decision is final; and when something about a policy-compliant recommendation feels off, the right move is to review the fuller context and document the reasoning if your judgment differs — not to accept it and not to overrule it on instinct.",
    standard_text:
      "Two paired standards. No high-stakes decisions by AI: a decision that materially affects a student — a grade, a support-intervention call, a course placement, a formal truancy escalation, a disciplinary outcome — is made by a person who has reviewed the specific case. An AI tool can suggest, flag, rank, or draft; it cannot be the thing that decides. A reliable track record, a rubric match, or a policy-category match is one input to the human's decision, not a substitute for it — \"it matches policy\" answers a different question than \"is this right for this student.\" The human review is where context the tool never had — a bad day, a known family event, a documented plan, a first-time offense, ambiguous circumstances — gets weighed. Local governance: when the person's judgment differs from the tool's output, they enter their own call and record briefly why. That note is what makes the decision reviewable by a parent, an administrator, or the district later. Overriding the tool on instinct without reviewing the case has the same flaw as accepting it without reviewing — in both, no one actually looked.",
    teaching_points: [
      "A recommendation that follows policy or matches a rubric is policy-compliant, not reviewed — \"it matches policy\" is the floor for a decision, not the decision itself.",
      "A reliable track record — the tool was right on the last thirty-five — does not transfer the decision to the tool; the high-stakes call still needs a person to review the specific case.",
      "The human review is where context the tool cannot see gets weighed, and once the person knows something the tool's pattern-matching missed — a strong student's bad day, a dip that tracks a known family event, low scores from a documented health issue, an existing school plan, a first-ever incident — that knowledge drives the decision, not the tool's output.",
      "When the person's judgment differs from the tool's, they enter their own call and write a brief note on why; that record is what makes the decision reviewable by a parent, administrator, or district office.",
      "Overriding the tool on instinct without reviewing the case is not the fix — it has the same gap as accepting the recommendation unread. Review, decide, document.",
      "Handing the decision to a colleague because it is genuinely a judgment call avoids the part of the role that is yours; consult for another read if you want one, then make the call."
    ],
    escalation_target: ESCALATION_TARGET_DEFAULT
  },

  "08": {
    module_id: "Module 08",
    scenario_title: "The Undisclosed Draft",
    standard_name: "transparency-and-disclosure standard",
    scenario_summary:
      "An educator uses an AI tool to help draft a piece of family-facing communication — a parent progress email, a meeting-summary email, a grade-level FAQ, a school-wide schedule-change announcement, or a formal policy letter under an administrator's signature. In every version they review the draft carefully and verify every factual detail against the real source (gradebook, meeting notes, school policy, board-approved policy), so the content that goes out is accurate. What they do not do is say that AI helped write it. The module works three segments. Segment 1: the communication has gone out with no disclosure, and the standard is that verifying accuracy is a separate obligation from disclosing AI assistance — a compliment (\"thank you for writing this yourself\"), the routine or logistical nature of the message, or the fact that it went out under careful review does not remove the disclosure question. Segment 2 (the question): later, someone asks a question that is a direct opening for disclosure — \"do teachers use AI for this?\", \"did you put this together yourself, or is there a template?\", \"is this an official district document?\", \"this reads differently, is this new?\", or a board member asking publicly whether the district has any AI-drafting policy — and the standard is to answer honestly (yes, AI helped; here is how it was verified) rather than deflect with a partial truth, change the subject, or, for the administrator, deny it outright. Segment 3 (going forward): rather than keep deciding message by message on feel, the educator checks what the district's actual disclosure policy requires and follows it consistently — or, if they set policy, establishes a clear written standard; stopping AI use entirely to dodge the question is an overcorrection, not the standard. The learner picks one of five role variants (classroom teacher, school counselor, grade-level lead teacher, front-office/support staff, school administrator); the standard is identical in all five. The closing checkpoint makes three points: checking the AI's work carefully does not remove the need to disclose; no one asking does not mean disclosure was unnecessary; and the right move after ad-hoc, by-feel disclosure is to find the district's actual policy and apply it consistently, not to keep winging it and not to abandon the tool.",
    standard_text:
      "One standard, two obligations that are often confused. Verifying accuracy and disclosing AI assistance are separate duties — doing the first well does not discharge the second. When AI materially helps draft a family-facing communication, the fact that it was involved is disclosed according to what the district's (and any applicable state) policy requires; the educator does not invent their own rule message by message. A parent's compliment, the routine or logistical nature of a message, a careful human review, or the communication going out under an official signature are not reasons the disclosure question goes away. \"Mention it only if someone asks\" is not a disclosure practice — it depends on the question never being asked, and when it is asked (\"did you write this yourself?\", \"is this a template?\", \"does the district have a policy?\"), the honest answer is yes, AI helped, and here is how it was checked — not a partial truth, a subject change, or a denial. When something goes out under a team's or an institution's name, the disclosure approach has to be consistent across everyone who might be asked, not left to whoever fields the question. The fix for ad-hoc, by-feel disclosure is to find and follow the district's actual policy (or, for someone who sets policy, to write a clear standard) — not to keep deciding case by case and not to stop using the tool to avoid the question.",
    teaching_points: [
      "Verifying that AI-drafted content is accurate and disclosing that AI helped write it are two separate obligations — doing the first carefully does not satisfy the second.",
      "A parent's compliment (\"thank you for writing this yourself\"), a message being routine or logistical, a careful review, or an official signature are not reasons the disclosure question goes away.",
      "\"Mention it only if asked\" is not a disclosure practice — it relies on the question never coming up, and a question that arrives weeks later does not make the original disclosure optional.",
      "When a direct question does come (\"did you write this yourself?\", \"is this a template?\", \"is this official?\", \"does the district have a policy?\"), the honest answer is yes, AI helped, and here is how it was verified — not a partial truth, a subject change, or a denial.",
      "When a communication goes out under a team's or an institution's name, disclosure has to be answered the same way by everyone who might be asked — \"whoever gets the question answers however feels natural\" is not a policy.",
      "The fix for ad-hoc, by-feel disclosure is to find and follow the district's actual policy (or, if you set policy, write a clear standard) — not to keep deciding message by message, and not to stop using AI to sidestep the question."
    ],
    escalation_target: ESCALATION_TARGET_DEFAULT
  }
};

export function getScenario(moduleId) {
  return SCENARIOS[String(moduleId)] ?? null;
}
