import { z } from "zod";

export const criterionSchema = z.object({
  id: z.string(),
  label: z.string(),
  requirement: z.string()
});

export const roleSchema = z.object({
  title: z.string(),
  description: z.string(),
  criteria: z.array(criterionSchema).length(4)
});

export const evidenceSchema = z.object({
  id: z.string(),
  field: z.string(),
  value: z.string(),
  sourceDocument: z.string(),
  sourcePage: z.number(),
  confidence: z.number().min(0).max(1),
  sourceText: z.string(),
  reviewStatus: z.enum(["pending", "approved", "edited", "rejected"]),
  candidateCorrection: z.string().optional()
});

export const stageOneTurnSchema = z.object({
  id: z.string(),
  speaker: z.enum(["recruiter_agent", "candidate_twin"]),
  text: z.string(),
  criterionIds: z.array(z.string()),
  evidenceIds: z.array(z.string()),
  unsupported: z.boolean()
});

export const gapSchema = z.object({
  id: z.string(),
  criterionId: z.string(),
  reason: z.string(),
  followUpQuestion: z.string()
});

export const stageTwoTurnSchema = z.object({
  id: z.string(),
  speaker: z.enum(["recruiter_agent", "candidate"]),
  text: z.string(),
  mode: z.enum(["chat", "voice"]),
  candidateCorrected: z.boolean().optional()
});

export const assessmentSchema = z.object({
  criterionId: z.string(),
  status: z.enum(["supported", "partially_supported", "not_established"]),
  rationale: z.string(),
  evidenceRefs: z.array(z.string()),
  stage2TurnRefs: z.array(z.string())
});

export const screeningResultSchema = z.object({
  recommendation: z.enum(["advance", "needs_more_information", "likely_mismatch"]),
  summary: z.string(),
  assessments: z.array(assessmentSchema),
  unresolvedQuestions: z.array(z.string()),
  humanDecision: z.enum(["pending", "advance", "hold"])
});

export type Criterion = z.infer<typeof criterionSchema>;
export type Role = z.infer<typeof roleSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type StageOneTurn = z.infer<typeof stageOneTurnSchema>;
export type Gap = z.infer<typeof gapSchema>;
export type StageTwoTurn = z.infer<typeof stageTwoTurnSchema>;
export type ScreeningResult = z.infer<typeof screeningResultSchema>;
