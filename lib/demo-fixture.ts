import type { Evidence, Gap, Role, ScreeningResult, StageOneTurn } from "./contracts";

export const role: Role = {
  title: "ML Engineer",
  description: "Build reliable retrieval and evaluation loops for AI products used by real people.",
  criteria: [
    { id: "technical-depth", label: "Technical depth", requirement: "Can reason about model, data, and system tradeoffs." },
    { id: "project-evidence", label: "Project evidence", requirement: "Has shipped a relevant ML or AI project with measurable outcomes." },
    { id: "ownership", label: "Practical ownership", requirement: "Can take a problem from an ambiguous brief to a working iteration." },
    { id: "communication", label: "Tradeoff communication", requirement: "Explains constraints, risks, and next steps clearly." }
  ]
};

export const evidence: Evidence[] = [
  { id: "ev-1", field: "Current role", value: "ML Engineer at Northstar Labs", sourceDocument: "Aarav-Mehta-Resume.pdf", sourcePage: 1, confidence: 0.98, sourceText: "ML Engineer · Northstar Labs · 2022–present", reviewStatus: "approved" },
  { id: "ev-2", field: "Relevant project", value: "Built a retrieval augmented generation assistant for support teams", sourceDocument: "Aarav-Mehta-Resume.pdf", sourcePage: 1, confidence: 0.94, sourceText: "Built a RAG assistant that indexed 180k internal support articles and reduced first response time by 31%.", reviewStatus: "approved" },
  { id: "ev-3", field: "Outcome", value: "Reduced first response time by 31%", sourceDocument: "Aarav-Mehta-Resume.pdf", sourcePage: 1, confidence: 0.91, sourceText: "...reduced first response time by 31%.", reviewStatus: "approved" },
  { id: "ev-4", field: "Ownership signal", value: "Designed the evaluation harness and weekly error review", sourceDocument: "Aarav-Mehta-Resume.pdf", sourcePage: 2, confidence: 0.86, sourceText: "Owned the evaluation harness and facilitated weekly error reviews with support operations.", reviewStatus: "approved" },
  { id: "ev-5", field: "Unknown", value: "Evaluation quality improvement method is not established", sourceDocument: "Aarav-Mehta-Resume.pdf", sourcePage: 1, confidence: 0.7, sourceText: "No detail in the supplied resume about which quality metrics changed or how retrieval errors were reduced.", reviewStatus: "approved" }
];

export const stageOneTurns: StageOneTurn[] = [
  { id: "s1-1", speaker: "recruiter_agent", text: "What evidence shows that Aarav can ship an AI system with measurable impact?", criterionIds: ["project-evidence"], evidenceIds: [], unsupported: false },
  { id: "s1-2", speaker: "candidate_twin", text: "Aarav built a retrieval augmented generation assistant that indexed 180k support articles and reduced first response time by 31%. Source: resume, page 1.", criterionIds: ["project-evidence"], evidenceIds: ["ev-2", "ev-3"], unsupported: false },
  { id: "s1-3", speaker: "recruiter_agent", text: "How did he evaluate and improve answer quality over time?", criterionIds: ["technical-depth", "ownership"], evidenceIds: [], unsupported: false },
  { id: "s1-4", speaker: "candidate_twin", text: "The resume says Aarav owned an evaluation harness and weekly error reviews, but it does not establish which quality metrics improved or how retrieval errors were reduced.", criterionIds: ["technical-depth", "ownership"], evidenceIds: ["ev-4", "ev-5"], unsupported: true },
  { id: "s1-5", speaker: "recruiter_agent", text: "We need one direct answer about the evaluation loop before a recruiter can assess this criterion.", criterionIds: ["technical-depth"], evidenceIds: ["ev-5"], unsupported: true }
];

export const gap: Gap = {
  id: "gap-eval-loop",
  criterionId: "technical-depth",
  reason: "The approved resume establishes an evaluation harness, but not the quality metric, baseline, or improvement loop.",
  followUpQuestion: "In that RAG assistant, what did you measure, what was the baseline, and which change improved retrieval or answer quality?"
};

export const initialResult: ScreeningResult = {
  recommendation: "needs_more_information",
  summary: "The evidence supports relevant delivery and ownership. The technical depth criterion needs the candidate’s direct explanation of the evaluation loop before a human recruiter decides.",
  assessments: [
    { criterionId: "technical-depth", status: "partially_supported", rationale: "An evaluation harness is mentioned, but the quality metric and improvement loop are not established until the candidate answers the follow-up.", evidenceRefs: ["ev-4", "ev-5"], stage2TurnRefs: [] },
    { criterionId: "project-evidence", status: "supported", rationale: "The resume describes a RAG assistant, its scale, and a 31% first response time reduction.", evidenceRefs: ["ev-2", "ev-3"], stage2TurnRefs: [] },
    { criterionId: "ownership", status: "supported", rationale: "The candidate-owned evaluation harness and recurring error reviews are explicitly stated in the supplied resume.", evidenceRefs: ["ev-4"], stage2TurnRefs: [] },
    { criterionId: "communication", status: "not_established", rationale: "Communication of tradeoffs is best assessed from the direct response; the resume alone does not establish it.", evidenceRefs: [], stage2TurnRefs: [] }
  ],
  unresolvedQuestions: [gap.followUpQuestion],
  humanDecision: "pending"
};

export function buildChatReply(answer: string): string {
  if (!answer.trim()) return "Please share one concrete example so I can record it accurately.";
  return "Thank you. I’ve captured that answer for recruiter review. One quick follow-up: which metric moved first, and how did you know the change helped?";
}
