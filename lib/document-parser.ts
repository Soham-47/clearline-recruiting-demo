import type { Evidence, Role } from "./contracts";

const defaultCriteria = [
  ["technical-depth", "Technical depth", "Can explain the systems, tools, and tradeoffs called for by the role."],
  ["project-evidence", "Relevant delivery", "Has shipped work related to the role with a clear outcome."],
  ["ownership", "Practical ownership", "Can take a problem from an ambiguous brief to a working iteration."],
  ["communication", "Tradeoff communication", "Explains constraints, risks, and next steps clearly."]
] as const;

export async function readDocument(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (file.type.startsWith("text/") || /\.(txt|md|markdown|csv|json)$/.test(name)) {
    return new TextDecoder().decode(bytes).replace(/\0/g, " ").trim();
  }
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const raw = new TextDecoder("latin1").decode(bytes);
    return [...raw.matchAll(/\(([^()]*)\)/g)]
      .map((match) => match[1].replace(/\\([\\()])/g, "$1").replace(/\\n/g, "\n"))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return "";
}

function linesOf(text: string): string[] {
  return text.split(/\r?\n|(?<=\.)\s+(?=[A-Z][a-z]+\s*:)/).map((line) => line.replace(/^[-*•]\s*/, "").trim()).filter(Boolean);
}

export function parseRole(name: string, text: string): Role {
  const lines = linesOf(text);
  const title = lines.find((line) => /^(role|position|job title|title)\s*:/i.test(line))?.replace(/^[^:]+:\s*/i, "")
    || lines[0]
    || name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  const description = lines.find((line) => line.length > 45 && !/^(role|position|job title|title)\s*:/i.test(line))
    || `Role requirements supplied in ${name}.`;
  const bullets = lines.filter((line) => line.length > 18 && !/^([\w ]+):\s*$/.test(line));
  return {
    title: title.slice(0, 120),
    description: description.slice(0, 260),
    criteria: defaultCriteria.map(([id, label, requirement], index) => ({
      id,
      label,
      requirement: bullets[index + 1]?.slice(0, 180) || requirement
    }))
  };
}

function addEvidence(items: Evidence[], file: File, field: string, value: string, sourceText: string, confidence: number, index: number) {
  if (!value.trim()) return;
  items.push({
    id: `ev-${index + 1}`,
    field,
    value: value.trim().slice(0, 280),
    sourceDocument: file.name,
    sourcePage: 1,
    confidence,
    sourceText: sourceText.trim().slice(0, 500),
    reviewStatus: "approved"
  });
}

export function parseCandidate(file: File, text: string, offset = 0): { candidateName: string; evidence: Evidence[] } {
  const lines = linesOf(text);
  const candidateName = lines.find((line) => /^(name|candidate)\s*:/i.test(line))?.replace(/^[^:]+:\s*/i, "")
    || lines.find((line) => /^[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z.'-]+){1,3}$/.test(line))
    || file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  const items: Evidence[] = [];
  const roleLine = lines.find((line) => /(engineer|developer|designer|manager|analyst|scientist|consultant)\s*(at|,|\||$)/i.test(line));
  const projectLine = lines.find((line) => /(built|created|shipped|developed|implemented|project|launched)/i.test(line));
  const outcomeLine = lines.find((line) => /(\d+\s*%|reduced|increased|improved|saved|grew|impact|result)/i.test(line));
  const skillsLine = lines.find((line) => /^(skills|technologies|tools|stack)\s*:/i.test(line));
  addEvidence(items, file, "Current role", roleLine || lines[1] || "", roleLine || lines[1] || "", 0.84, offset);
  addEvidence(items, file, "Relevant project", projectLine || lines.slice(1, 3).join(" "), projectLine || lines.slice(1, 3).join(" "), 0.8, offset + items.length);
  addEvidence(items, file, "Outcome", outcomeLine || "", outcomeLine || "", 0.74, offset + items.length);
  addEvidence(items, file, "Skills and tools", skillsLine?.replace(/^[^:]+:\s*/i, "") || "", skillsLine || "", 0.76, offset + items.length);
  if (!items.length) addEvidence(items, file, "Document summary", text, text, 0.62, offset);
  return { candidateName: candidateName.trim().slice(0, 100), evidence: items };
}
