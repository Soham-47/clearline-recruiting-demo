import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function proxy(request: Request, context: { params: { path: string[] } }) {
  const apiKey = process.env.SARVAM_VOICE_API_KEY || process.env.SARVAM_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "SARVAM_VOICE_API_KEY is not configured on the server." }, { status: 503 });

  const incoming = new URL(request.url);
  const upstream = `https://apps.sarvam.ai/api/app-runtime/${context.params.path.join("/")}${incoming.search}`;
  const headers = new Headers();
  headers.set("X-API-Key", apiKey);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const response = await fetch(upstream, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
    cache: "no-store"
  });
  const body = await response.arrayBuffer();
  return new NextResponse(body, { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
