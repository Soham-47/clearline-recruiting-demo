# Implementation Plan: Transparent Agent-Assisted Recruiting Demo

## 1. Objective

Build one repeatable, judge-ready screening demo for a single SWE or ML/AI role. Stage 2, the candidate's live conversation with the recruiter Voice Agent, is the primary product experience and the first implementation milestone. The demo must visibly prove four things:

1. The candidate answers targeted screening questions through a working Sarvam Voice Agents call with a visible transcript.
2. Candidate documents become reviewable, source-linked evidence.
3. A recruiter agent interviews an evidence-constrained Candidate Twin and hands its unresolved gaps to the Voice Agent.
4. The recruiter receives an explainable recommendation and remains the final decision-maker.

This is a working prototype, not a production recruiting system. The implementation should optimize for one reliable five-minute demonstration rather than accounts, persistence, scale, or broad configurability. If time runs short, preserve the live voice interview, transcript, and safe handoff before improving document ingestion or visual polish.

## 2. Scope decisions

### Included

- One fixed sample role with editable title, job description, and four criteria.
- One resume upload; cover letter upload is supported only if it comes nearly free with the same extraction path.
- Sarvam Document AI extraction with a prepared sample fallback.
- Candidate review, correction, rejection, and approval of extracted evidence.
- A bounded three-question Stage 1 recruiter-agent-to-Twin exchange.
- Gap generation from the Stage 1 evidence map.
- Stage 2 direct candidate interview by chat or browser voice.
- Sarvam Voice Agents for the browser voice conversation.
- Live transcript display and candidate correction before final evaluation.
- Per-criterion evidence status and one of three recommendations: `advance`, `needs_more_information`, or `likely_mismatch`.
- Human recruiter confirmation as the final screen action.

### Excluded

- User accounts, authentication, teams, permissions, and multi-tenancy.
- Persistent database storage or cross-session history.
- Candidate sourcing, ATS integration, scheduling, email, and notifications.
- Multiple simultaneous candidates or roles.
- Telephony, phone-number verification, campaigns, and outbound calls.
- Background checks or claims that documents are authentic.
- Candidate ranking, numeric fit scores, automatic rejection, and hiring decisions.
- Video, appearance analysis, accent scoring, emotion scoring, or vocal-trait analysis.
- Production compliance, retention, audit, security, and fairness programs.

## 3. Product flow

```text
Recruiter defines role and criteria
              |
              v
Candidate uploads resume -> Document AI Extract -> candidate reviews evidence
              |
              v
Recruiter Agent <-> Candidate Twin (3 bounded turns)
              |
              v
Evidence map + unresolved gaps
              |
              v
Candidate chooses Chat or Voice Agent interview
              |
              v
Candidate reviews/corrects Stage 2 transcript
              |
              v
Structured criterion assessment + recommendation
              |
              v
Human recruiter confirms the next action
```

## 3.1 Delivery order: voice-first vertical slice

The product still begins with role and evidence intake, but implementation begins at Stage 2 because realtime browser voice is the highest-risk and highest-value capability.

```text
Committed recruiter Voice Agent
        |
        v
Browser voice call using fixture role + fixture gap
        |
        v
Live transcript + mute/end/cleanup + transcript correction
        |
        v
Role and Document AI evidence intake
        |
        v
Stage 1 Twin exchange generates the real gap
        |
        v
Replace fixture voice context with the real Stage 1 handoff
        |
        v
Final evidence-linked evaluation
```

This order creates a demoable product early. Until Stage 1 exists, the voice call receives one clearly identified fixture gap; the fixture is removed from the live path as soon as the handoff is connected.

## 4. Technical architecture

### Stack

- **Application:** Next.js with TypeScript and the App Router.
- **UI:** React components and one small global stylesheet; no component framework is required.
- **Server integration:** Next.js route handlers keep the Sarvam API key off the client.
- **Model APIs:** `sarvamai` JavaScript SDK using Chat Completion V1 with `sarvam-105b` and strict structured outputs.
- **Document intake:** Sarvam Document AI `extract`, followed by status polling and result retrieval.
- **Voice:** `sarvam-conv-ai-sdk/browser` with `ConversationAgent` and `BrowserAudioInterface`.
- **Validation:** Zod schemas at every model/API boundary.
- **State:** One client-side reducer holding the active demo session. No database.
- **Styling:** Responsive two-column desktop layout that collapses to one column.

### Required environment variables

```text
SARVAM_API_KEY
NEXT_PUBLIC_SARVAM_ORG_ID
NEXT_PUBLIC_SARVAM_WORKSPACE_ID
NEXT_PUBLIC_SARVAM_VOICE_AGENT_ID
NEXT_PUBLIC_SARVAM_VOICE_AGENT_VERSION
```

Only public identifiers are exposed through `NEXT_PUBLIC_*`. `SARVAM_API_KEY` remains server-side and must never appear in browser JavaScript, logs, fixtures, or committed files.

### Application boundary

The browser owns display state and the current demo session. Server routes own document upload, Chat Completion calls, signed Voice Agents connection requests, output validation, and provider error normalization. The app does not attempt to recreate Sarvam's STT, TTS, or turn-taking loop.

### Proposed file map

```text
app/
  api/
    documents/extract/route.ts
    documents/status/[jobId]/route.ts
    stage-one/route.ts
    evaluate/route.ts
    sarvam/[...path]/route.ts
  globals.css
  layout.tsx
  page.tsx
components/
  RoleSetup.tsx
  EvidenceReview.tsx
  StageOneExchange.tsx
  CandidateInterview.tsx
  VoiceInterview.tsx
  EvaluationPanel.tsx
lib/
  contracts.ts
  demo-fixture.ts
  prompts.ts
  sarvam.ts
  session-reducer.ts
.env.example
README.md
```

Keep this map flexible. Merge a component into `page.tsx` if it remains small; split only where state or integration logic becomes hard to follow.

## 5. Core data contracts

Define these contracts before UI or API work so every stage passes explicit, inspectable data.

### Role

- `title`
- `description`
- `criteria[]`: `{ id, label, requirement }`

Limit the demo to four criteria. The initial fixture should cover technical depth, relevant project evidence, practical ownership, and communication of tradeoffs.

### Evidence item

- `id`
- `field`
- `value`
- `sourceDocument`
- `sourcePage`
- `confidence`
- `sourceText`
- `reviewStatus`: `pending | approved | edited | rejected`
- `candidateCorrection?`

An approved edited value must retain the original extraction so the UI can show what changed.

### Stage 1 turn

- `id`
- `speaker`: `recruiter_agent | candidate_twin`
- `text`
- `criterionIds[]`
- `evidenceIds[]`
- `unsupported`: boolean

### Gap

- `id`
- `criterionId`
- `reason`
- `followUpQuestion`

### Stage 2 turn

- `id`
- `speaker`: `recruiter_agent | candidate`
- `text`
- `mode`: `chat | voice`
- `candidateCorrected`: boolean

### Criterion assessment

- `criterionId`
- `status`: `supported | partially_supported | not_established`
- `rationale`
- `evidenceRefs[]`
- `stage2TurnRefs[]`

### Screening result

- `recommendation`: `advance | needs_more_information | likely_mismatch`
- `summary`
- `assessments[]`
- `unresolvedQuestions[]`
- `humanDecision`: `pending | advance | hold`

## 6. Spec-by-spec implementation

## Spec 0: Provider and account preflight

**Purpose:** Fail early on the integrations that cannot be simulated convincingly at the end.

**Work:**

- Create a blank Sarvam Voice Agent through the connected Voice Agents MCP.
- Configure English, a conversational voice, the interview prompt, and agent variables for role title, criteria summary, Stage 1 gaps, and candidate name.
- Commit the Voice Agent and capture its app ID and version.
- Locate the Sarvam organization and workspace IDs required by the browser SDK.
- Verify one browser voice session can connect on localhost and return both user and agent transcript callbacks.
- Verify the server proxy pattern signs the WebSocket connection without exposing the API key.
- After voice succeeds, confirm the Sarvam API MCP/SDK can access Chat Completion V1 and Document AI with the configured key.

**Acceptance criteria:**

- A committed Voice Agent exists and a browser session connects with microphone input.
- The session produces audible agent output and transcript callbacks for both speakers.
- No API key is present in browser network payloads or client bundles.
- A Chat Completion request returns a valid response.
- A Document AI request can be created, or the precise account/access error is known.

**Fallback decision:**

- If Document AI is blocked, use the prepared extraction fixture but keep the upload/review UI and label the extraction as demo data.
- If the managed voice connection is blocked after 15 minutes, use direct Sarvam STT/TTS only for the demo voice path; do not build both paths.
- If neither voice path works, stop and report the blocker because voice is an agreed MVP requirement.

**Dependencies:** None.

**Likely files/services:** Sarvam Voice Agents workspace, `.env.local`, `.env.example`, a temporary provider smoke-check script that is deleted after use.

## Spec 1: Bootstrap and demo shell

**Purpose:** Establish one runnable full-stack application and the guided six-step experience.

**Work:**

- Create the Next.js TypeScript app.
- Install only `sarvamai`, `sarvam-conv-ai-sdk`, and `zod` beyond framework dependencies.
- Add environment validation and a safe provider client factory.
- Build one page with a progress header: Role, Evidence, Twin Interview, Candidate Interview, Result.
- Add a reset button that returns to the fixed demo fixture.
- Display clear loading, retryable error, and fallback-data banners.

**Acceptance criteria:**

- The app starts with one command and renders without provider calls.
- Missing environment variables produce a readable server-side setup error.
- The API key is referenced only in server code.
- A user can move through the visual steps using fixture state.

**Verification:** Run the type checker/build and manually exercise the stepper and reset action.

**Dependencies:** Spec 0 for final environment names; UI shell can begin while preflight is being resolved.

**Likely files:** `package.json`, `.env.example`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `lib/contracts.ts`, `lib/session-reducer.ts`.

## Spec 2: Voice-first Stage 2 proof

**Purpose:** Produce the first demoable milestone before building document or Twin orchestration.

**Work:**

- Build the Stage 2 screen immediately after the application shell.
- Seed one fixture candidate, role, criterion summary, and unresolved gap.
- Start the committed Sarvam Voice Agent only after an explicit candidate click.
- Show connecting, listening, speaking, muted, ended, and error states.
- Stream both speakers into a visible transcript.
- Add mute, end-call, retry, and switch-to-chat actions.
- Release the microphone and WebSocket on end, error, or unmount.
- Let the candidate correct their own transcript turns while preserving the original text.

**Acceptance criteria:**

- A candidate can complete at least two audible turns with the Voice Agent.
- The first agent question is grounded in the supplied fixture gap.
- Both sides appear in the transcript as the call happens.
- Transcript correction, mute, end-call, and cleanup work.
- Voice failure offers chat without losing the transcript or fixture context.

**Verification:** Complete one fixture-backed voice interview from a fresh browser session, deny microphone permission once, retry, and confirm the microphone is released after ending.

**Dependencies:** Specs 0 and 1.

**Likely files:** `components/CandidateInterview.tsx`, `components/VoiceInterview.tsx`, `app/api/sarvam/[...path]/route.ts`, `lib/demo-fixture.ts`, `lib/session-reducer.ts`.

## Checkpoint A: Voice-first proof works

- A candidate can start and finish a live browser voice session.
- At least two audible turns and both transcript roles are visible.
- Candidate transcript correction works while original text is retained.
- Mute, end-call, error recovery, microphone release, and WebSocket cleanup work.
- The API key is absent from browser code and network payloads.

## Spec 3: Fixed role and transparent criteria

**Purpose:** Give both agents and both users the same disclosed evaluation target.

**Work:**

- Seed one ML engineer role with a concise description and four criteria.
- Allow the recruiter to edit the role description and criterion text.
- Require each criterion to be non-empty and job-related.
- Show the exact criteria in the candidate view before document approval.
- Do not add weights or an aggregate score.

**Acceptance criteria:**

- Recruiter edits immediately become the criteria used downstream.
- Candidate can see all criteria before approving evidence.
- The flow cannot proceed with zero or blank criteria.

**Verification:** Edit a criterion, advance, and confirm the changed text appears in Stage 1 context and the final assessment fixture.

**Dependencies:** Spec 1. It can be added after the voice-first checkpoint.

**Likely files:** `lib/demo-fixture.ts`, `components/RoleSetup.tsx`, `lib/session-reducer.ts`.

## Spec 4: Document extraction and candidate approval

**Purpose:** Turn a resume into explicit candidate-controlled evidence rather than treating the raw document as truth.

**Work:**

- Accept one PDF, PNG, or JPEG and reject unsupported or oversized files before upload.
- Submit the file to Document AI Extract with a small schema: candidate name, skills, work experience, projects, education, and achievements.
- Poll job status with a fixed timeout and bounded retries.
- Map `result` plus mirrored `annotations` into evidence items with confidence and source references.
- Show each extracted item with approve, edit, or reject controls.
- Keep a prepared extraction for the sample resume behind a visible “Use demo extraction” recovery action.
- Do not send rejected or pending evidence into Stage 1.

**Acceptance criteria:**

- A successful extraction becomes a list of reviewable evidence items.
- Each retained item shows its document source and confidence when supplied by Sarvam.
- Candidate correction preserves the original extracted value.
- Stage 1 receives approved evidence only.
- The UI says “candidate-provided” or “document-extracted,” never “verified.”

**Verification:** Upload the sample resume, reject one item, edit one item, approve the rest, and inspect the Stage 1 request payload.

**Dependencies:** Specs 1 and 3.

**Likely files:** `app/api/documents/extract/route.ts`, `app/api/documents/status/[jobId]/route.ts`, `components/EvidenceReview.tsx`, `lib/contracts.ts`, `lib/demo-fixture.ts`, `lib/sarvam.ts`.

## Checkpoint B: Intake works

- The fixed role is visible to recruiter and candidate.
- A resume produces candidate-reviewable evidence through the live API or an explicitly labeled fixture.
- Only approved evidence advances.
- The browser never receives the Sarvam API key.

## Spec 5: Stage 1 recruiter-agent-to-Twin exchange

**Purpose:** Produce the visible agent-to-agent “wow” moment without creating uncontrolled autonomous agents.

**Work:**

- Implement Stage 1 as one server-side orchestrator call, not two persistent autonomous runtimes.
- Ask Sarvam Chat Completion for a strict JSON response containing exactly three paired recruiter questions and Twin answers, followed by gaps.
- Instruct the recruiter role to probe role criteria and contradictory or thin evidence.
- Instruct the Twin role to use only approved evidence IDs, cite them in each answer, and respond “not established” where evidence is absent.
- Validate that every cited evidence ID exists in the approved set; downgrade invalid citations to unsupported and expose a warning.
- Render the paired exchange as a transcript with clearly different recruiter-agent and Candidate-Twin identities.

**Acceptance criteria:**

- Exactly three focused question/answer pairs are displayed.
- Every Twin claim cites one or more approved evidence items or is marked unsupported.
- No rejected or pending evidence appears in the response.
- At least one gap is produced in the fixed demo scenario.
- Malformed model output never renders as a trusted recommendation.

**Verification:** Run the fixed scenario twice, inspect citations, and confirm an intentionally missing criterion becomes a gap.

**Dependencies:** Spec 4.

**Likely files:** `app/api/stage-one/route.ts`, `lib/prompts.ts`, `lib/contracts.ts`, `components/StageOneExchange.tsx`.

## Spec 6: Stage 1 handoff into the recruiter Voice Agent

**Purpose:** Ensure the direct candidate interview follows from the agent-to-agent findings rather than starting a generic interview.

**Work:**

- Convert Stage 1 gaps into a compact text block and two or three targeted follow-up questions.
- Start each voice session with agent variables containing candidate name, role title, criteria summary, gap summary, and follow-up questions.
- Configure the recruiter Voice Agent to identify itself as AI, ask one question at a time, stay under roughly 30 spoken words per turn, accept uncertainty, and never score accent, fluency, tone, or emotion.
- Tell the agent to conclude after the targeted gaps are covered or after five substantive candidate answers.
- Add an opening disclosure that the call is transcribed for screening and can be completed by chat instead.

**Acceptance criteria:**

- The first substantive voice/chat question addresses a Stage 1 gap.
- The voice agent is transparent about being AI and about transcription.
- The agent does not ask for protected or irrelevant personal information.
- The agent ends within the bounded demo length.

**Verification:** Start a session with a distinctive gap and confirm the first question references it.

**Dependencies:** Specs 0, 2, and 5. Replace the fixture gap used in Spec 2 with live Stage 1 output.

**Likely files/services:** Sarvam Voice Agent configuration, `lib/prompts.ts`, `lib/contracts.ts`.

## Spec 7: Stage 2 text interview

**Purpose:** Guarantee an accessible, reliable route through the candidate interview even when microphone or realtime voice is unavailable.

**Work:**

- Render the Stage 1 gap summary before the interview.
- Let the candidate choose chat or voice, with chat always available.
- For chat, use the same question set and recruiter-agent policy as voice.
- Keep the text interview bounded to the unresolved questions.
- Append every direct answer to a Stage 2 transcript tagged as candidate-provided.

**Acceptance criteria:**

- Candidate can complete Stage 2 without microphone access.
- Chat asks questions derived from the current gaps.
- Transcript distinguishes recruiter-agent text from direct candidate answers.
- Candidate can finish or return to correct an answer before evaluation.

**Verification:** Deny microphone permission, switch to chat, and complete the flow.

**Dependencies:** Specs 5 and 6. The switch-to-chat shell already exists from Spec 2.

**Likely files:** `components/CandidateInterview.tsx`, `app/api/evaluate/route.ts` or a small chat route if multi-turn server chat is retained, `lib/session-reducer.ts`.

## Spec 8: Harden the Stage 2 browser voice interview

**Purpose:** Replace the fixture context from Spec 2 with the real Stage 1 handoff and harden the priority experience.

**Work:**

- Pass committed agent ID/version and Stage 1 context as session variables.
- Confirm the first substantive question is derived from the real Stage 1 gap.
- Remove fixture context from the normal live path while retaining it only as a visibly labeled recovery mode.
- Recheck cleanup, retry, transcript correction, and chat switching with the integrated context.

**Acceptance criteria:**

- The live voice interview starts with the actual Stage 1 gap and candidate/role variables.
- Candidate and agent can exchange at least two audible, gap-focused turns.
- Ending, retrying, or switching modes preserves the integrated session state.
- Candidate corrections remain attached to the original transcript text.

**Verification:** Run Stage 1, start voice, confirm its first question reflects the generated gap, complete the call, and correct one transcript turn.

**Dependencies:** Specs 2, 5, 6, and 7.

**Likely files:** `components/VoiceInterview.tsx`, `components/CandidateInterview.tsx`, `app/api/sarvam/[...path]/route.ts`, `lib/session-reducer.ts`.

## Checkpoint C: Both interview stages work

- Stage 1 visibly probes approved evidence and produces gaps.
- Stage 2 chat completes from those gaps.
- Stage 2 voice completes from those gaps with live transcript callbacks.
- Candidate can correct direct-answer transcripts.
- Losing voice connectivity does not destroy the session.

## Spec 9: Evidence-linked evaluation

**Purpose:** Produce an understandable recommendation without an opaque fit score.

**Work:**

- Send the role criteria, approved evidence, Stage 1 transcript, corrected Stage 2 transcript, and valid references to one structured Chat Completion request.
- Require one assessment per criterion with status, concise rationale, and source IDs.
- Require the recommendation enum and unresolved questions.
- Validate every returned reference against the supplied evidence and transcript IDs.
- If references are invalid, show the affected criterion as `not_established` rather than retrying indefinitely.
- Display a criterion matrix with evidence, direct candidate answer, gap, and rationale.

**Acceptance criteria:**

- Every criterion has exactly one assessment.
- Every supporting claim links to a visible evidence item or transcript turn.
- Unknown information remains `not_established`.
- The page displays no numeric score or rank.
- Candidate and recruiter can inspect both full transcripts.

**Verification:** Remove evidence for one criterion and confirm it cannot be marked supported without a direct Stage 2 answer.

**Dependencies:** Specs 5, 7, and 8.

**Likely files:** `app/api/evaluate/route.ts`, `components/EvaluationPanel.tsx`, `lib/prompts.ts`, `lib/contracts.ts`.

## Spec 10: Human decision boundary

**Purpose:** Make the recruiter visibly responsible for the actual next action.

**Work:**

- Label the model output “Screening recommendation.”
- Add recruiter actions `Advance` and `Hold for review` only after the explanation is visible.
- Require the recruiter to confirm the action.
- Never expose a candidate-facing automatic rejection state.
- Include a short disclaimer that the recommendation is based on supplied evidence and direct answers, not verified credentials or predicted job performance.

**Acceptance criteria:**

- Recommendation alone does not change the candidate state.
- A human action is required to finish the flow.
- The UI never says the system hired, rejected, verified, or ranked the candidate.

**Verification:** Reach the result and confirm no decision occurs until the recruiter acts.

**Dependencies:** Spec 9.

**Likely files:** `components/EvaluationPanel.tsx`, `lib/session-reducer.ts`.

## Spec 11: Demo resilience and presentation polish

**Purpose:** Make the prototype repeatable under buildathon conditions.

**Work:**

- Add fixed sample role, resume extraction, Stage 1 response, Stage 2 transcript, and final evaluation fixtures.
- Each provider failure gets a local recovery action; fixture use must be clearly labeled.
- Add concise loading states for document processing and model evaluation.
- Add a single Reset Demo control.
- Make source chips clickable so a judge can trace recommendation to evidence quickly.
- Add a README with environment setup, Voice Agent IDs, run command, demo script, live/fallback behavior, and known limitations.
- Do one clean-start rehearsal in a fresh browser session.

**Acceptance criteria:**

- The complete demo can be rehearsed in under five minutes.
- A provider timeout cannot strand the UI on a spinner.
- Fixture fallback is visible and never presented as a live provider result.
- Reset returns the app to a known starting state.
- README setup is sufficient for another developer to run the demo.

**Verification:** Rehearse happy path, Document AI fallback, microphone-denied chat path, and reset.

**Dependencies:** Specs 1 through 10.

**Likely files:** `lib/demo-fixture.ts`, UI components, `README.md`.

## Checkpoint D: Demo complete

- One five-minute end-to-end scenario works from role to human decision.
- Live Sarvam services are visibly used where available.
- Both agent stages and both Stage 2 modalities are demonstrable.
- Evidence and transcript provenance are inspectable.
- The flow fails safely and recovers without a restart.
- No API key or sensitive sample data is committed.

## 7. Implementation order and time budget

The original one-hour goal is aggressive for a live document pipeline plus a realtime voice integration. The smallest credible schedule assumes dependencies install cleanly and Voice Agent account IDs are already available.

| Time | Work | Stop condition |
|---|---|---|
| 0–10 min | Spec 0 Voice Agent preflight, commit, IDs, and proxy proof | Browser voice connection is possible |
| 10–25 min | Specs 1–2 shell and fixture-backed Stage 2 voice slice | Two audible turns and live transcript work |
| 25–33 min | Specs 3–4 role and Document AI evidence review | Live or labeled fixture evidence is approved |
| 33–43 min | Specs 5–6 Stage 1 exchange and real gap handoff | Voice receives the generated gap |
| 43–50 min | Specs 7–8 chat fallback and integrated voice hardening | Both Stage 2 modes preserve session state |
| 50–57 min | Specs 9–10 evaluation and human action | Criterion result is traceable |
| 57–60 min | Spec 11 reset and one rehearsal | Five-minute story completes |

If any phase exceeds its window, preserve the voice-first slice. Use the explicit fixture fallback for Document AI, Stage 1 output, or evaluation before cutting live voice, transcript visibility/correction, safe cleanup, or the human decision boundary.

## 8. Prompt specifications

### Stage 1 orchestrator prompt

- Inputs: criteria and approved evidence only.
- Produce exactly three recruiter/Twin pairs.
- Recruiter questions one criterion or contradiction at a time.
- Twin answers cite supplied evidence IDs and never adds external facts.
- Missing support is stated as `not established`.
- Output strict JSON matching the Stage 1 schema.

### Voice recruiter prompt

- State AI identity and transcription use.
- Explain that the call clarifies gaps from a document-based screening.
- Ask one short question at a time and stop for the answer.
- Probe only supplied gaps and job-related criteria.
- Accept “I don't know” or a request to use chat.
- Do not infer fit from vocal delivery.
- Do not ask about age, family, health, religion, caste, ethnicity, gender, disability, or other protected traits.
- Close after gaps are addressed or the bounded turn limit is reached.

### Evaluation prompt

- Inputs: criteria, approved evidence, Stage 1 transcript, and corrected Stage 2 transcript.
- Assess supplied evidence, not personality or predicted performance.
- One assessment per criterion.
- Cite IDs for every support claim.
- Preserve uncertainty.
- Output strict JSON matching the result schema.

## 9. Failure handling matrix

| Failure | User-visible behavior | Recovery |
|---|---|---|
| Unsupported/large document | Explain accepted formats and size | Choose another file or sample resume |
| Document job timeout/failure | Stop polling and show provider status | Retry once or use labeled demo extraction |
| Chat Completion malformed output | Show evaluation unavailable | Retry once; then use labeled fixture |
| Invalid model citation | Mark claim unsupported | Continue with conservative result |
| Microphone denied/missing | Explain browser permission issue | Switch to chat |
| Voice WebSocket failure | Preserve transcript and Stage 1 context | Start a new voice session or switch to chat |
| Candidate corrects transcript | Preserve original and corrected text | Evaluate corrected text only |
| Missing evidence | Show `not established` | Ask in Stage 2; never invent support |
| Provider rate limit | Show brief retry state | One bounded retry, then labeled fallback |

## 10. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Voice account lacks required IDs/access | High | Validate first; obtain org/workspace/app/version before UI work |
| Voice proxy contract differs from SDK expectation | High | Prove localhost session during Spec 0 and keep proxy isolated |
| Document AI job latency disrupts demo | Medium | Poll with timeout and offer prepared, visibly labeled extraction |
| Twin hallucinates candidate claims | High | Evidence allowlist, ID validation, conservative unsupported state |
| Voice transcript mishears technical terms | Medium | Candidate correction before evaluation and chat alternative |
| Evaluation looks like an objective hiring score | High | No score/rank; show evidence, gaps, uncertainty, and human action |
| Sensitive candidate data leaks | High | Synthetic demo documents, server-only key, no database, no logs of file content |
| One-hour scope collapses into setup work | High | Fixed fixture, single role, single page, no auth/database/deployment work |

## 11. Demo script

1. Recruiter shows the ML Engineer role and four transparent criteria.
2. Candidate uploads the sample resume and corrects one extracted project detail.
3. Candidate rejects one unsupported extraction and approves the remaining evidence.
4. Stage 1 visibly runs: recruiter agent probes a missing production-ownership claim; Twin cites a project but flags deployment ownership as not established.
5. The gap becomes the first Stage 2 question.
6. Candidate chooses voice, answers two short questions, and the transcript appears live.
7. Candidate corrects one technical term in the transcript.
8. Recruiter opens the result and traces each criterion to resume evidence or a direct answer.
9. The system recommends `needs_more_information` or `advance`; recruiter makes the final action.

## 12. Definition of done

- The fixed scenario completes from role setup through human action.
- Document evidence is candidate-reviewed and visibly source-linked.
- Stage 1 shows three recruiter-agent/Twin question-answer pairs.
- Stage 2 works in chat and voice, and voice uses Sarvam Voice Agents.
- The corrected Stage 2 transcript is used for evaluation.
- Every criterion ends as supported, partially supported, or not established with valid references.
- No automatic rejection, rank, numeric fit score, voice-trait analysis, or claim of document verification exists.
- The API key is server-side only.
- Provider failures have bounded, labeled recovery paths.
- The demo resets and can be repeated in under five minutes.

## 13. Open decisions before implementation

These should be resolved during Spec 0 and should not block initial scaffolding:

- Exact synthetic resume file and ML Engineer role copy.
- Organization ID and workspace ID for the browser Voice Agents SDK.
- Which committed Sarvam voice to use; select one English/Hinglish conversational voice from the workspace catalogue.
- Maximum accepted document size in the app, at or below Sarvam's provider limit.
- Whether the buildathon demo runs locally or over HTTPS on a temporary host; voice works on localhost, but a public demo needs HTTPS.

