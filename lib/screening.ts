import type { Evidence, Gap, Role, ScreeningResult, StageOneTurn, StageTwoTurn } from "./contracts";

function approvedEvidence(evidence: Evidence[]): Evidence[] {
  return evidence.filter((item) => item.reviewStatus === "approved" || item.reviewStatus === "edited");
}

export function deriveStageOne(role: Role, evidence: Evidence[]): { turns: StageOneTurn[]; gap: Gap } {
  const target = role.criteria[0];
  const references = approvedEvidence(evidence).slice(0, 2);
  const summary = references.map((item) => `${item.value} (source: ${item.sourceDocument}, page ${item.sourcePage})`).join(" ");
  const gap: Gap = {
    id: `gap-${target.id}`,
    criterionId: target.id,
    reason: references.length
      ? `The supplied documents provide signals for ${target.label}, but do not establish a concrete example, tradeoff, or measured result for this requirement.`
      : `The supplied documents do not yet establish evidence for ${target.label}.`,
    followUpQuestion: `For the ${target.label} requirement, what did you personally do, what changed, and how did you measure the result?`
  };
  return {
    gap,
    turns: [
      { id: "s1-1", speaker: "recruiter_agent", text: `What evidence from the supplied documents relates to ${target.label}?`, criterionIds: [target.id], evidenceIds: [], unsupported: false },
      { id: "s1-2", speaker: "candidate_twin", text: summary || "No approved evidence was found in the supplied documents.", criterionIds: [target.id], evidenceIds: references.map((item) => item.id), unsupported: !references.length },
      { id: "s1-3", speaker: "recruiter_agent", text: `What is still unclear about ${target.label}?`, criterionIds: [target.id], evidenceIds: [], unsupported: false },
      { id: "s1-4", speaker: "candidate_twin", text: gap.reason, criterionIds: [target.id], evidenceIds: references.map((item) => item.id), unsupported: true },
      { id: "s1-5", speaker: "recruiter_agent", text: "We need one direct answer before a recruiter can assess this criterion.", criterionIds: [target.id], evidenceIds: references.map((item) => item.id), unsupported: true }
    ]
  };
}

export function buildInitialResult(role: Role, evidence: Evidence[]): ScreeningResult {
  const primary = role.criteria[0];
  const refs = approvedEvidence(evidence).slice(0, 2).map((item) => item.id);
  return {
    recommendation: "needs_more_information",
    summary: `The supplied documents provide initial signals for ${role.title}. A direct answer is needed before a human recruiter decides.`,
    assessments: role.criteria.map((criterion, index) => ({
      criterionId: criterion.id,
      status: index === 0 && refs.length ? "partially_supported" : "not_established",
      rationale: index === 0 && refs.length ? `The supplied documents contain evidence related to ${criterion.label}, but the direct example and result are not established.` : `The supplied documents do not establish ${criterion.label} yet.`,
      evidenceRefs: index === 0 ? refs : [],
      stage2TurnRefs: []
    })),
    unresolvedQuestions: [`For the ${primary.label} requirement, what did you personally do, what changed, and how did you measure the result?`],
    humanDecision: "pending"
  };
}

export function evaluateScreening(role: Role, evidence: Evidence[], turns: StageTwoTurn[]): ScreeningResult {
  const result = buildInitialResult(role, evidence);
  const answerRefs = turns.filter((turn) => turn.speaker === "candidate").map((turn) => turn.id);
  const primary = role.criteria[0];
  const approved = approvedEvidence(evidence);
  const answerText = turns.filter((turn) => turn.speaker === "candidate").map((turn) => turn.text).join(" ");
  const concreteAnswer = turns.some((turn) => turn.speaker === "candidate"
    && /\b(i|we)\b.*\b(built|created|implemented|designed|shipped|led|owned|migrated|launched)\b/i.test(turn.text)
    && /\b(result|outcome|impact|reduced|increased|improved|saved|measured|percent|%)\b/i.test(turn.text));
  const contextWords = `${role.title} ${primary.label} ${primary.requirement}`.toLowerCase().match(/[a-z][a-z0-9]{4,}/g) ?? [];
  const evidenceWords = approved.flatMap((item) => item.value.toLowerCase().match(/[a-z][a-z0-9]{4,}/g) ?? []);
  const groundedInContext = [...contextWords, ...evidenceWords].some((word) => answerText.toLowerCase().includes(word));
  if (!concreteAnswer || !groundedInContext) return result;
  result.recommendation = "advance";
  result.summary = `The supplied documents and direct transcript provide a concrete signal for ${role.title}. A human recruiter should review the references and choose the next action.`;
  result.unresolvedQuestions = [];
  result.assessments = result.assessments.map((assessment, index) => index === 0
    ? { ...assessment, status: "supported", rationale: `The direct transcript adds a concrete explanation for ${role.criteria[index].label}.`, stage2TurnRefs: answerRefs }
    : assessment);
  return result;
}
