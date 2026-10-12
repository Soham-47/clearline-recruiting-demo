# Demo Prototype Task List

## Phase 0: Fail-fast provider setup

- [ ] Create and configure the recruiter Voice Agent.
- [ ] Commit the Voice Agent and record app ID/version.
- [ ] Obtain Sarvam organization and workspace IDs.
- [ ] Prove one browser voice session with live transcript callbacks.
- [ ] Confirm the Sarvam API key stays server-side.
- [ ] Confirm Chat Completion V1 access with `sarvam-105b`.
- [ ] Confirm Document AI Extract job creation and result access.

## Phase 1: Voice-first foundation

- [ ] Bootstrap the Next.js TypeScript application.
- [ ] Add `sarvamai`, `sarvam-conv-ai-sdk`, and `zod`.
- [ ] Define role, evidence, transcript, gap, assessment, and result contracts.
- [ ] Add environment validation and `.env.example`.
- [ ] Build the Stage 2 screen with fixture candidate, role, and gap context.
- [ ] Implement the Voice Agents browser connection through a server proxy.
- [ ] Add connecting/listening/speaking/muted/ended/error UI states.
- [ ] Append both voice roles to the live transcript.
- [ ] Add mute, end, retry, cleanup, and switch-to-chat actions.
- [ ] Add candidate transcript correction with original provenance retained.

### Checkpoint A: Priority experience works

- [ ] Candidate completes at least two audible turns with the recruiter Voice Agent.
- [ ] The first question is grounded in the fixture gap.
- [ ] Both speakers appear in the live transcript.
- [ ] Microphone and WebSocket are released on exit.
- [ ] Microphone failure offers chat without losing state.
- [ ] No secret appears in client code.

## Phase 2: Role and evidence intake

- [ ] Build the one-page guided flow and reset action.
- [ ] Add the fixed ML Engineer role and four editable criteria.
- [ ] Add resume upload validation.
- [ ] Add Document AI Extract submission route.
- [ ] Add bounded job-status polling and result retrieval.
- [ ] Map annotations to confidence and source references.
- [ ] Build approve/edit/reject evidence review.
- [ ] Add the visibly labeled demo-extraction fallback.

### Checkpoint B

- [ ] Criteria shown to the candidate match recruiter input.
- [ ] Candidate can approve a corrected evidence set.
- [ ] Rejected and pending items do not advance.
- [ ] Extraction is never described as credential verification.

## Phase 3: Agent-to-agent screening and voice handoff

- [ ] Write strict Stage 1 JSON schema and prompt.
- [ ] Add the Stage 1 server orchestrator.
- [ ] Validate all returned evidence IDs.
- [ ] Render exactly three recruiter-agent/Twin exchanges.
- [ ] Generate an evidence map and targeted gaps.
- [ ] Pass gap context into the Voice Agent session variables.
- [ ] Replace the fixture voice gap with the live Stage 1 gap.
- [ ] Confirm the first substantive voice question addresses that gap.

### Checkpoint C

- [ ] Twin answers cite approved evidence or say not established.
- [ ] Fixed scenario produces at least one direct follow-up gap.
- [ ] Stage 1 transcript is visible to candidate and recruiter.
- [ ] The live Voice Agent consumes the real Stage 1 handoff.

## Phase 4: Stage 2 fallback and hardening

- [ ] Build Stage 2 mode selection and gap summary.
- [ ] Implement bounded text-chat interview.
- [ ] Retain fixture voice context only as a visibly labeled recovery mode.
- [ ] Recheck voice retry and cleanup with live Stage 1 context.

### Checkpoint D

- [ ] Chat completes without microphone access.
- [ ] Voice completes at least two gap-focused audible turns.
- [ ] Voice failure preserves state and offers chat.
- [ ] Microphone and WebSocket are released on exit.

## Phase 5: Explainable result

- [ ] Write strict evaluation JSON schema and prompt.
- [ ] Add evaluation route using corrected transcript text.
- [ ] Validate criterion coverage and every evidence/turn reference.
- [ ] Render the per-criterion evidence matrix.
- [ ] Show recommendation without score or rank.
- [ ] Add recruiter `Advance` and `Hold for review` actions.
- [ ] Require human confirmation before completing the flow.

### Checkpoint E

- [ ] Every criterion has a conservative, traceable status.
- [ ] Candidate and recruiter can inspect both transcripts.
- [ ] No automatic rejection or verification claim exists.

## Phase 6: Demo hardening

- [ ] Add fixtures for each external-service recovery path.
- [ ] Add bounded loading, error, retry, and fallback states.
- [ ] Make evidence/transcript references clickable.
- [ ] Write README setup and the five-minute demo script.
- [ ] Rehearse live happy path.
- [ ] Rehearse Document AI fallback.
- [ ] Rehearse microphone-denied chat path.
- [ ] Rehearse reset from a completed flow.

## Ready to demonstrate

- [ ] One clean five-minute run succeeds.
- [ ] Sarvam Document AI and Voice Agents usage is visible.
- [ ] The Voice Agent interview is the central interactive moment.
- [ ] The agent-to-agent exchange visibly explains why the Voice Agent asks its questions.
- [ ] Candidate correction and recruiter decision boundaries are obvious.
- [ ] No key, real resume, or sensitive candidate data is committed.

