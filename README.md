# Clearline recruiting demo

Clearline is a single-session, candidate-first screening prototype. It keeps the disclosed role criteria, candidate-approved evidence, the bounded Candidate Twin exchange, the live direct interview transcript, and the recruiter’s final action in one reviewable flow.

## Run locally

```bash
npm install
cp .env.example .env.local
# Fill SARVAM_API_KEY and SARVAM_VOICE_API_KEY in .env.local. Keep this file local and uncommitted.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use a browser that can grant microphone access. `localhost` is sufficient for local microphone permissions.

The public identifiers in `.env.example` point at the demo Voice Agent draft created for this workspace. If you use another Sarvam workspace, replace the four `NEXT_PUBLIC_*` values with its org, workspace, app, and version. `SARVAM_API_KEY` is used only for server-side Document AI and LLM calls; `SARVAM_VOICE_API_KEY` is used only by the server voice-runtime proxy. Both are never placed in browser code.

## Five-minute demo path

1. Upload a readable job posting with **Upload job posting**. The role title and four assessment criteria are derived from it.
2. Upload one or more readable candidate documents with **Upload candidate docs**. The evidence list, Candidate Twin exchange, and open question update from those files.
3. Select **Start voice interview**, allow microphone access, and answer the derived gap question. Both speakers appear in the live transcript. Use **Mute**, **End interview**, or **Retry voice** as needed.
4. If microphone access is unavailable, use the text fallback. The same gap and transcript review apply.
5. Use **Correct latest transcript** before the result is reviewed. The corrected text is marked in the transcript.
6. Scroll to Stage 1 to show why the direct question exists, then review the per-criterion evidence references and choose **Advance** or **Hold for review**.

## Integration notes

- The browser uses `sarvam-conv-ai-sdk/browser` with `ConversationAgent` and `BrowserAudioInterface`.
- `/api/sarvam/[...path]` forwards only the SDK runtime request to `apps.sarvam.ai/api/app-runtime`, adding the server-only `X-API-Key` and preserving query parameters.
- The SDK’s ephemeral signed URL and final WebSocket URL are suppressed from console output during connection setup.
- The Stage 1 exchange and evaluation are derived locally from the uploaded role, candidate evidence, and transcript. They remain conservative and do not claim authenticity or credential verification.
- Upload parsing uses Sarvam Document AI digitise for PDF/JPEG/PNG files when `SARVAM_API_KEY` is configured, followed by Sarvam structured LLM parsing for role criteria and candidate evidence. Candidate documents may be uploaded together. If the service is missing, times out, or returns unusable output, the UI labels the local text/PDF fallback explicitly.
- Evaluation uses Sarvam structured output over the disclosed role, candidate-provided evidence, and corrected transcript when the key is configured. Returned criterion, evidence, and transcript references are validated before display; malformed or ungrounded results fall back to a conservative local evaluator. No recommendation records the recruiter’s final decision.
- Before upload, the UI discloses that supported documents and extracted text are sent to Sarvam when the server key is configured. Extraction reflects what the documents say; it does not verify authenticity or credentials.

## Checks

```bash
npm run typecheck
npm run build
```

No test suite is included because the requested scope is a runnable demo and tests were not requested.
