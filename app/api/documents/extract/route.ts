import { NextResponse } from "next/server";
import { parseCandidate, parseRole, readDocument } from "@/lib/document-parser";
import type { Evidence } from "@/lib/contracts";
import { digitiseDocument, parseCandidateWithSarvam, parseRoleWithSarvam } from "@/lib/sarvam";

export const runtime = "nodejs";

function supportsSarvamDigitise(file: File): boolean {
  return file.type === "application/pdf" || file.type === "image/jpeg" || file.type === "image/png" || /\.(pdf|jpe?g|png)$/i.test(file.name);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const kind = formData.get("kind") === "role" ? "role" : "candidate";
    const entries = [...formData.getAll("files"), ...formData.getAll("file")].filter((entry): entry is File => entry instanceof File);
    if (!entries.length) return NextResponse.json({ error: kind === "role" ? "Upload a job posting." : "Upload a resume or relevant document." }, { status: 400 });
    if (entries.some((file) => file.size > 8_000_000)) return NextResponse.json({ error: "Keep each demo document under 8 MB." }, { status: 413 });

    const useSarvam = Boolean(process.env.SARVAM_API_KEY);
    const documents = [] as Array<{ file: File; text: string; digitised: boolean }>;
    let sarvamDocumentFailure = false;
    for (const file of entries) {
      let text = "";
      let digitised = false;
      if (useSarvam && supportsSarvamDigitise(file)) {
        try {
          text = await digitiseDocument(file);
          digitised = true;
        } catch (error) {
          console.error("Sarvam Document AI failed", error instanceof Error ? error.name : "UnknownError");
          sarvamDocumentFailure = true;
        }
      }
      if (!text) text = await readDocument(file);
      documents.push({ file, text, digitised });
    }
    const readable = documents.filter((document) => document.text);
    if (!readable.length) return NextResponse.json({ error: "The supplied document did not contain readable text. Sarvam image OCR requires a configured server key." }, { status: 415 });

    if (kind === "role") {
      const document = readable[0];
      let role = parseRole(document.file.name, document.text);
      let parserSource = "local-text-fallback";
      if (useSarvam) {
        try {
          role = await parseRoleWithSarvam(document.file.name, document.text);
          parserSource = "sarvam-structured-llm";
        } catch (error) {
          console.error("Sarvam role parsing failed", error instanceof Error ? error.name : "UnknownError");
          sarvamDocumentFailure = true;
        }
      }
      const source = parserSource === "sarvam-structured-llm" && document.digitised ? "sarvam-document-ai-and-llm" : parserSource;
      const notice = source === "sarvam-document-ai-and-llm"
        ? `Parsed ${document.file.name} with Sarvam Document AI and structured LLM output. Review the role criteria before the interview.`
        : useSarvam && sarvamDocumentFailure
          ? `Sarvam was unavailable for ${document.file.name}; used the local text fallback. Review the role criteria before the interview.`
          : `Parsed ${document.file.name} locally for this demo. Review the role criteria before the interview.`;
      return NextResponse.json({ role, source, notice });
    }

    let candidateName = "Candidate";
    let evidence: Evidence[] | undefined;
    let source = "local-text-fallback";
    if (useSarvam) {
      try {
        const parsed = await parseCandidateWithSarvam(readable.map(({ file, text }) => ({ name: file.name, text })));
        candidateName = parsed.candidateName || candidateName;
        evidence = parsed.evidence;
        source = readable.some((document) => document.digitised) ? "sarvam-document-ai-and-llm" : "sarvam-structured-llm";
      } catch (error) {
        console.error("Sarvam candidate parsing failed", error instanceof Error ? error.name : "UnknownError");
        sarvamDocumentFailure = true;
      }
    }
    if (!evidence) {
      evidence = readable.flatMap(({ file, text }, index) => {
        const parsed = parseCandidate(file, text, index * 10);
        candidateName = parsed.candidateName || candidateName;
        return parsed.evidence;
      }).map((item, index) => ({ ...item, id: `ev-${index + 1}` }));
    }
    const skipped = documents.length - readable.length;
    const notice = source === "sarvam-document-ai-and-llm"
      ? `Parsed ${readable.map(({ file }) => file.name).join(", ")} with Sarvam Document AI and structured LLM output. Review the extracted evidence before the interview.`
      : source === "sarvam-structured-llm"
        ? `Parsed ${readable.map(({ file }) => file.name).join(", ")} with structured Sarvam LLM output. Review the extracted evidence before the interview.`
        : useSarvam && sarvamDocumentFailure
          ? `Sarvam was unavailable; used the local text fallback for ${readable.map(({ file }) => file.name).join(", ")}. Review the extracted evidence before the interview.`
          : `Parsed ${readable.map(({ file }) => file.name).join(", ")} locally for this demo${skipped ? `; skipped ${skipped} unreadable file${skipped === 1 ? "" : "s"}` : ""}. Review the extracted evidence before the interview.`;
    return NextResponse.json({
      candidateName,
      evidence,
      source,
      notice
    });
  } catch {
    return NextResponse.json({ error: "The document could not be read." }, { status: 400 });
  }
}
