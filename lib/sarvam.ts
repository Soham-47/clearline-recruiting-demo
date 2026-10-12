import { Buffer } from "node:buffer";
import { inflateRawSync } from "node:zlib";
import { z } from "zod";
import { evidenceSchema, roleSchema, screeningResultSchema, type Evidence, type Role, type ScreeningResult, type StageTwoTurn } from "./contracts";

const SARVAM_API = "https://api.sarvam.ai";
const DOCUMENT_MAX_WAIT_MS = 20_000;
const DOCUMENT_POLL_MS = 1_000;

const roleOutputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  criteria: z.array(z.object({ label: z.string().min(1), requirement: z.string().min(1) })).length(4)
});

const candidateOutputSchema = z.object({
  candidateName: z.string().min(1),
  evidence: z.array(z.object({
    field: z.string().min(1),
    value: z.string().min(1),
    sourceDocument: z.string().min(1),
    sourcePage: z.number().int().min(1),
    confidence: z.number().min(0).max(1),
    sourceText: z.string().min(1)
  }))
});

type JsonRecord = Record<string, unknown>;

function authHeaders(contentType?: string): Headers {
  const headers = new Headers({ "api-subscription-key": process.env.SARVAM_API_KEY ?? "" });
  if (contentType) headers.set("content-type", contentType);
  return headers;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readJson(response: Response): Promise<JsonRecord> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error("Sarvam request failed.");
    error.name = `SarvamHttp${response.status}`;
    throw error;
  }
  return body as JsonRecord;
}

function textFromDocumentOutput(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(textFromDocumentOutput).filter(Boolean).join("\n").trim();
  if (!value || typeof value !== "object") return "";
  const record = value as JsonRecord;
  for (const key of ["text", "content", "markdown", "md", "output"]) {
    const text = textFromDocumentOutput(record[key]);
    if (text) return text;
  }
  return Object.values(record).map(textFromDocumentOutput).filter(Boolean).join("\n").trim();
}

function markdownFromZip(archive: Buffer): string {
  const minimum = Math.max(0, archive.length - 65_557);
  let end = -1;
  for (let offset = archive.length - 22; offset >= minimum; offset -= 1) {
    if (archive.readUInt32LE(offset) === 0x06054b50) { end = offset; break; }
  }
  if (end < 0) throw new Error("Sarvam document archive is invalid.");
  const count = archive.readUInt16LE(end + 10);
  let offset = archive.readUInt32LE(end + 16);
  const markdown: string[] = [];
  for (let index = 0; index < count; index += 1) {
    if (archive.readUInt32LE(offset) !== 0x02014b50) throw new Error("Sarvam document archive is invalid.");
    const method = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const uncompressedSize = archive.readUInt32LE(offset + 24);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const localOffset = archive.readUInt32LE(offset + 42);
    const name = archive.toString("utf8", offset + 46, offset + 46 + nameLength);
    if (name.toLowerCase().endsWith(".md")) {
      if (uncompressedSize > 1_000_000) throw new Error("Sarvam document output is too large.");
      const localNameLength = archive.readUInt16LE(localOffset + 26);
      const localExtraLength = archive.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = archive.subarray(start, start + compressedSize);
      const contents = method === 8 ? inflateRawSync(compressed) : method === 0 ? compressed : null;
      if (!contents) throw new Error("Sarvam document archive compression is unsupported.");
      markdown.push(contents.toString("utf8").trim());
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return markdown.filter(Boolean).join("\n\n");
}

export async function digitiseDocument(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("language", "en-IN");
  form.append("output_format", "md");
  form.append("content_type", "printed");
  form.append("model", "sarvam-vision-v1");

  const created = await readJson(await fetch(`${SARVAM_API}/doc-ai/v1/job/digitise`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
    cache: "no-store"
  }));
  const jobId = typeof created.job_id === "string" ? created.job_id : "";
  if (!jobId) throw new Error("Sarvam did not return a document job.");

  const deadline = Date.now() + DOCUMENT_MAX_WAIT_MS;
  let status = "pending";
  while (Date.now() < deadline) {
    const current = await readJson(await fetch(`${SARVAM_API}/doc-ai/v1/job/${encodeURIComponent(jobId)}/status`, {
      headers: authHeaders(),
      cache: "no-store"
    }));
    status = typeof current.status === "string" ? current.status.toLowerCase() : "";
    if (["completed", "partially_completed", "failed", "rejected"].includes(status)) break;
    await wait(DOCUMENT_POLL_MS);
  }
  if (!['completed', 'partially_completed'].includes(status)) throw new Error("Sarvam document processing did not complete.");

  const download = await readJson(await fetch(`${SARVAM_API}/doc-ai/v1/job/${encodeURIComponent(jobId)}/download-url`, {
    headers: authHeaders(),
    cache: "no-store"
  }));
  const url = typeof download.url === "string" ? download.url : "";
  if (!url) throw new Error("Sarvam did not return a document download URL.");
  const downloadHeaders = new Headers();
  if (download.headers && typeof download.headers === "object") {
    for (const [key, value] of Object.entries(download.headers as JsonRecord)) {
      if (typeof value === "string") downloadHeaders.set(key, value);
    }
  }
  const output = await fetch(url, { method: typeof download.method === "string" ? download.method : "GET", headers: downloadHeaders, cache: "no-store" });
  if (!output.ok) throw new Error("Sarvam document output could not be downloaded.");
  const contentType = output.headers.get("content-type") ?? "";
  const bytes = Buffer.from(await output.arrayBuffer());
  const body = contentType.includes("json") ? JSON.parse(bytes.toString("utf8")) : null;
  const isZip = contentType.includes("zip") || (bytes.length >= 4 && bytes.readUInt32LE(0) === 0x04034b50);
  const text = body ? textFromDocumentOutput(body) : isZip
    ? markdownFromZip(bytes)
    : bytes.toString("utf8").trim();
  if (!text) throw new Error("Sarvam returned an empty document.");
  return text.slice(0, 60_000);
}

async function completeJson<T>(messages: Array<{ role: "system" | "user"; content: string }>, schema: z.ZodType<T>): Promise<T> {
  const response = await readJson(await fetch(`${SARVAM_API}/v1/chat/completions`, {
    method: "POST",
    headers: authHeaders("application/json"),
    body: JSON.stringify({
      model: "sarvam-105b-conversations",
      messages,
      temperature: 0.1,
      max_tokens: 1800,
      reasoning_effort: "low",
      response_format: { type: "json_object" }
    }),
    cache: "no-store"
  }));
  const choices = Array.isArray(response.choices) ? response.choices : [];
  const content = choices[0] && typeof choices[0] === "object"
    ? (choices[0] as JsonRecord).message && typeof (choices[0] as JsonRecord).message === "object"
      ? ((choices[0] as JsonRecord).message as JsonRecord).content
      : undefined
    : undefined;
  if (typeof content !== "string") throw new Error("Sarvam returned no structured content.");
  const json = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return schema.parse(JSON.parse(json));
}

export async function parseRoleWithSarvam(name: string, text: string): Promise<Role> {
  const output = await completeJson([
    { role: "system", content: "Extract a recruiting role from the supplied job posting. Return only JSON. Use exactly four concrete, job-related criteria. Do not invent requirements." },
    { role: "user", content: JSON.stringify({ document: name, text: text.slice(0, 40_000), output: "title, description, criteria: [{label, requirement}]" }) }
  ], roleOutputSchema);
  return roleSchema.parse({
    title: output.title.slice(0, 120),
    description: output.description.slice(0, 260),
    criteria: output.criteria.map((criterion, index) => ({
      id: ["technical-depth", "project-evidence", "ownership", "communication"][index],
      label: criterion.label.slice(0, 100),
      requirement: criterion.requirement.slice(0, 180)
    }))
  });
}

export async function parseCandidateWithSarvam(documents: Array<{ name: string; text: string }>): Promise<{ candidateName: string; evidence: Evidence[] }> {
  const output = await completeJson([
    { role: "system", content: 'Extract only candidate-provided claims. Return exactly this JSON shape: {"candidateName":"string","evidence":[{"field":"string","value":"string","sourceDocument":"exact supplied name","sourcePage":1,"confidence":0.8,"sourceText":"exact supporting quote"}]}. candidateName must be a string. evidence must be an array, not grouped fields. sourcePage must be an integer starting at 1 (use 1 if unknown). confidence must be a number from 0 to 1. Use an empty evidence array if no claims are present. Do not verify credentials or infer missing facts.' },
    { role: "user", content: JSON.stringify({ documents: documents.map((document) => ({ name: document.name, text: document.text.slice(0, 24_000) })), output: "Return only the exact JSON shape from the system message. Every evidence item must have all six named fields." }) }
  ], candidateOutputSchema);
  const allowedNames = new Set(documents.map((document) => document.name));
  const fallbackName = documents[0]?.name ?? "Candidate";
  const evidence = output.evidence.map((item, index) => evidenceSchema.parse({
    id: `ev-${index + 1}`,
    field: item.field.slice(0, 100),
    value: item.value.slice(0, 280),
    sourceDocument: allowedNames.has(item.sourceDocument) ? item.sourceDocument : fallbackName,
    sourcePage: item.sourcePage,
    confidence: item.confidence,
    sourceText: item.sourceText.slice(0, 500),
    reviewStatus: "approved"
  }));
  return { candidateName: output.candidateName.slice(0, 100), evidence };
}

function hasConcreteDirectAnswer(turns: StageTwoTurn[], refs: string[]): boolean {
  const signal = /\b(built|created|implemented|designed|shipped|led|owned|migrated|launched|reduced|increased|improved|saved|measured|result|outcome|impact)\b/i;
  return refs.some((ref) => {
    const turn = turns.find((item) => item.id === ref);
    return turn?.speaker === "candidate" && signal.test(turn.text);
  });
}

export async function evaluateWithSarvam(role: Role, evidence: Evidence[], turns: StageTwoTurn[]): Promise<ScreeningResult> {
  const approvedEvidence = evidence.filter((item) => item.reviewStatus === "approved" || item.reviewStatus === "edited");
  const output = await completeJson([
    { role: "system", content: "Evaluate a candidate conservatively against every disclosed role criterion. Use only supplied evidence and candidate transcript turns. Return only JSON matching the requested fields. Cite only existing evidence and turn IDs. Never use answer length, voice quality, accent, emotion, authenticity, or an automatic hiring decision." },
    { role: "user", content: JSON.stringify({ role, evidence: approvedEvidence, stageTwoTurns: turns, output: "recommendation, summary, assessments: [{criterionId, status, rationale, evidenceRefs, stage2TurnRefs}], unresolvedQuestions" }) }
  ], z.object({
    recommendation: screeningResultSchema.shape.recommendation,
    summary: z.string().min(1),
    assessments: screeningResultSchema.shape.assessments,
    unresolvedQuestions: z.array(z.string())
  }));

  const criterionIds = new Set(role.criteria.map((criterion) => criterion.id));
  const evidenceIds = new Set(approvedEvidence.map((item) => item.id));
  const turnIds = new Set(turns.map((turn) => turn.id));
  if (output.assessments.length !== role.criteria.length || new Set(output.assessments.map((item) => item.criterionId)).size !== role.criteria.length || output.assessments.some((item) => !criterionIds.has(item.criterionId))) throw new Error("Sarvam returned an invalid criterion reference.");
  if (output.assessments.some((item) => item.evidenceRefs.some((ref) => !evidenceIds.has(ref)) || item.stage2TurnRefs.some((ref) => !turnIds.has(ref)))) throw new Error("Sarvam returned an invalid evidence reference.");
  if (output.recommendation === "advance" && !output.assessments.some((item) => item.status === "supported" && hasConcreteDirectAnswer(turns, item.stage2TurnRefs))) throw new Error("Sarvam returned an ungrounded advance recommendation.");
  return screeningResultSchema.parse({ ...output, humanDecision: "pending" });
}
