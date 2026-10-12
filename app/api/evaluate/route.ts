import { NextResponse } from "next/server";
import { evidenceSchema, roleSchema, stageTwoTurnSchema } from "@/lib/contracts";
import { evaluateScreening } from "@/lib/screening";
import { evidence as fixtureEvidence, role as fixtureRole } from "@/lib/demo-fixture";
import { evaluateWithSarvam } from "@/lib/sarvam";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const turns = stageTwoTurnSchema.array().parse(body.stageTwoTurns);
    const parsedRole = roleSchema.parse(body.role ?? fixtureRole);
    const parsedEvidence = evidenceSchema.array().parse(body.evidence ?? fixtureEvidence);
    const fallback = evaluateScreening(parsedRole, parsedEvidence, turns);
    if (!process.env.SARVAM_API_KEY) return NextResponse.json({
      ...fallback,
      roleTitle: parsedRole.title,
      source: "conservative-local-evaluation",
      notice: "SARVAM_API_KEY is not configured; this result uses the local conservative evaluation fallback."
    });
    try {
      const result = await evaluateWithSarvam(parsedRole, parsedEvidence, turns);
      return NextResponse.json({ ...result, roleTitle: parsedRole.title, source: "sarvam-structured-evaluation", notice: "This result uses Sarvam structured evaluation over the role, approved evidence, and transcript. Human review is still required." });
    } catch {
      return NextResponse.json({
        ...fallback,
        roleTitle: parsedRole.title,
        source: "conservative-local-evaluation",
        notice: "Sarvam evaluation was unavailable or returned unusable references; this result uses the local conservative evaluation fallback."
      });
    }
  } catch {
    return NextResponse.json({ error: "The transcript could not be evaluated." }, { status: 400 });
  }
}
