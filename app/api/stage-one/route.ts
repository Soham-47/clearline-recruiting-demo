import { NextResponse } from "next/server";
import { evidenceSchema, roleSchema } from "@/lib/contracts";
import { deriveStageOne } from "@/lib/screening";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedRole = roleSchema.parse(body.role);
    const parsedEvidence = evidenceSchema.array().parse(body.evidence);
    const { turns, gap } = deriveStageOne(parsedRole, parsedEvidence);
    return NextResponse.json({ turns, gap, source: "derived-local-exchange" });
  } catch {
    return NextResponse.json({ error: "Stage 1 could not validate the supplied role or evidence." }, { status: 400 });
  }
}
