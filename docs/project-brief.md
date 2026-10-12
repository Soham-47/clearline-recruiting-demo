# Project brief: transparent agent-assisted recruiting

## Project definition

Build a demo of a transparent, two-stage first-shortlisting workflow for early-stage startup hiring, initially focused on software engineering and ML/AI roles. Sarvam Document AI parses candidate-provided resumes and cover letters into source-linked evidence for the candidate to review and approve. First, a recruiter agent interviews the candidate’s evidence-based Twin using that approved material. Then the candidate speaks directly with the recruiter agent to clarify or validate gaps from that exchange. Stage 2 offers both chat and a voice call; Sarvam Voice Agents can run the candidate-facing voice conversation, including STT, TTS, and turn-taking. Voice is optional. The recruiter agent makes an evidence-linked recommendation; the human recruiter decides. Both sides can inspect the criteria, transcripts, evidence, and gaps.

## Problem statement

Candidates and recruiters experience first screening as inconsistent and opaque: candidates often cannot tell what mattered or why they were screened out, while recruiters receive uneven evidence and make comparisons without a consistent, visible rubric. The product tests whether an agent-mediated, evidence-linked exchange can make early screening more understandable and consistent without claiming to verify a candidate’s ability or automate hiring decisions.

## Users and needs

- **Candidates:** Understand the role criteria, provide context beyond a resume, correct or add evidence, see the full transcript, and understand which requirements their evidence did or did not address.
- **Recruiters at early-stage startups:** Turn a job description into explicit criteria, ask consistent follow-up questions, compare candidate-provided evidence against those criteria, and review a concise recommendation with its supporting evidence.
- **Buildathon judges:** See the two-agent interaction and verify that the recommendation is traceable to the disclosed criteria and conversation.

## Primary user journey

1. Recruiter creates one SWE or ML/AI role and sets disclosed, job-related screening criteria.
2. Candidate provides a resume and optionally a cover letter. Document AI extracts structured claims with source references and confidence; the candidate reviews/corrects the extraction and approves the evidence set and criteria before sharing it.
3. **Stage 1 — Twin-to-agent:** the recruiter agent asks the candidate’s Twin a bounded set of role-specific questions. The Twin answers only from approved evidence, cites its sources, and marks unsupported criteria as unknown.
4. The recruiter agent prepares an initial evidence map and identifies gaps or claims that need validation.
5. **Stage 2 — candidate-to-agent:** the candidate sees the Stage 1 transcript and gap summary, then answers targeted questions directly to the recruiter agent by chat or a Voice Agents-powered voice call. In voice mode, STT transcribes answers for candidate review/correction and TTS reads questions aloud.
6. Recruiter reviews both stages, with Twin-supplied evidence clearly distinguished from the candidate’s direct answers, and a recommendation: **advance**, **needs more information**, or **likely mismatch**.
7. Candidate can inspect both transcripts, criteria, evidence, and explanation. The recruiter makes any final decision.

## Smallest useful MVP

One end-to-end, two-stage demo for a single SWE or ML/AI opening. It should include:

- Recruiter entry of a role description and a short, explicit set of job-related screening criteria.
- Candidate-approved evidence extracted from a resume (and optionally a cover letter) using Sarvam Document AI, plus a bounded Stage 1 exchange between the candidate Twin and recruiter agent. Show the source document and extraction confidence/source references where available.
- Stage 2 where the candidate answers a targeted follow-up directly, with both chat and voice available. Prefer Sarvam Voice Agents for the voice call if account access and web integration are ready; show the STT transcript and allow the candidate to correct it before evaluation.
- Separate provenance for Twin responses, source evidence, and candidate-direct answers.
- Complete transcripts for both stages, visible to candidate and recruiter.
- A recruiter result that maps each criterion to evidence found, evidence missing, or uncertainty, with references to the relevant profile content or answer.
- A recommendation, with human recruiter review required before any hiring decision.

The demo may use a fixed sample role and candidate data to keep the one-hour build feasible, provided the UI makes the scenario and evidence visible.

## Essential versus optional

**Essential for the demo:** role criteria, candidate-approved evidence, Twin-to-agent Stage 1, candidate-to-agent Stage 2 with chat and voice options, STT/TTS in voice mode, a visible/correctable transcript, source-linked evidence/gaps, full two-stage transcript, and recruiter-owned final decision. Document AI parsing of the demo resume is preferred to make evidence intake visible; the demo may use a prepared extraction if live API setup threatens the one-hour limit.

**Optional:** parsing additional document types (including verification/supporting documents), live cover-letter extraction, full-duplex streaming voice, broader multilingual coverage, multiple roles, telephony, ATS integrations, sourcing, notifications, real user accounts, analytics, and production-grade workflow administration. Stage 2 voice input/output is in MVP scope; streaming is not required. Document parsing extracts what a document says; it does not establish authenticity, verify employment/education, or replace a background check.

## Technical assumptions and constraints

- **Near-term target:** a working Sarvam campus buildathon demo in about one hour. This is not a production-ready launch target.
- **Provider:** Sarvam is the intended model provider. Use Chat Completion for the Twin-to-agent exchange, chat turns, and structured evaluations. For Stage 2 voice calls, use Sarvam Voice Agents to coordinate speech recognition, the LLM, speech synthesis, and turn-taking if the required web/API integration is available; keep chat as an alternative. The app owns workflow state and evidence review. The voice runtime does not replace the Stage 1 Twin-to-agent exchange.
- **Document intake:** Use Sarvam Document AI Extract for schema-based resume/cover-letter fields and Digitise when full document text is more useful. Keep extracted claims linked to source annotations and confidence, let the candidate review/correct them, and treat all supplied verification documents as unverified claims until a separate human verification process checks them.
- **Model and access:** API key access, model availability, rate limits, current pricing, retention settings, and response quality for structured recruiting explanations must be checked before implementation. The stated approximately **$100 API budget** is a cap, not a verified usage estimate.
- **Infrastructure:** language/framework are undecided. A small hosted web app and backend are sufficient for the demo; HPC or Modal is not assumed necessary. Keep the API key on the server and out of browser code.
- **Evidence discipline:** distinguish candidate-provided claims from verified facts. Do not let an agent invent credentials or fill evidence gaps with confident guesses. Show “not established” when the supplied material does not answer a criterion.
- **Decision boundary:** the system provides a screening recommendation only. It does not make or execute rejection decisions.
- **Privacy and fairness:** use only job-related criteria; do not score appearance, accent, emotion, or other sensitive/proxy signals. Obtain consent for sharing candidate materials, minimize stored personal data, and define deletion and retention before any real hiring use.

Sarvam references: [API reference](https://docs.sarvam.ai/api-reference/introduction), [developer quickstart](https://docs.sarvam.ai/api/getting-started/quickstart), [Document AI Extract API](https://docs.sarvam.ai/api-reference/doc-ai/job/extract), [Voice Agents runtime](https://docs.sarvam.ai/conversations/build/run-time), and [Voice Agents introduction](https://docs.sarvam.ai/conversations/introduction). API capabilities, account access, and pricing can change; verify current details at implementation time.

## Performance, reliability, and cost constraints

- Optimize the demo for one complete, repeatable scenario rather than throughput or scale.
- Keep Stage 1 and Stage 2 bounded to a small number of questions, use explicit structured criteria, and provide a visible failure state if a model/API is unavailable or returns unusable output. Stage 2 must support chat as an alternative to voice, and candidates can review/correct STT output.
- Avoid repeated model calls where a single call can produce the needed structured explanation; measure actual token use and spend against the approximately $100 cap.
- A demo run should not require HPC or a continuously running background agent. The candidate can submit each answer, by chat or voice, and trigger the next step.
- Production service levels, concurrency, latency targets, and retention durations remain undefined and must be set before a real pilot.

## Measurable success criteria

### Buildathon demo

1. A judge can complete or observe one recruiter-to-candidate screening flow for an SWE or ML/AI role.
2. The demo shows both stages: a Twin-to-recruiter-agent evidence exchange followed by a direct candidate-to-recruiter-agent response, available by chat and voice.
3. The voice path uses Sarvam Voice Agents (or direct Sarvam STT/TTS as a fallback) and displays a candidate-correctable transcript; the chat path remains usable without audio.
4. The demo displays both transcripts and the recruiter’s criteria beside the outcome, with Twin claims and candidate-direct answers visibly distinguished.
5. Every criterion in the fixed demo scenario is marked with cited evidence, a gap, or uncertainty; the recommendation does not rely on an unexplained score.
6. The candidate-facing view exposes the criteria and both transcripts, plus an understandable explanation of what was and was not established.
7. The recruiter must take the final action; no candidate is automatically rejected.
8. API usage for the demo remains within the available credit budget.

### Validation before production

- Recruiters can apply the same disclosed criteria consistently across comparable candidate evidence.
- Candidates can correctly explain why the system produced its recommendation and can correct inaccurate profile details.
- A representative pilot shows that recommendations are useful to recruiters without creating unacceptable false exclusions or group disparities. Define the sample, metrics, and acceptable thresholds before claiming this.
- Security, consent, deletion, retention, accessibility, and applicable hiring-law requirements are reviewed before processing real applicants.

## Explicit non-goals

- Production readiness in one hour.
- Automated decisions about a candidate’s speaking style, accent, emotion, or other vocal characteristics.
- Recording a reusable interview, generating an avatar, or making a candidate agent impersonate a candidate.
- Automated rejection, autonomous hiring, or an unreviewable ranking of applicants.
- Universal support for every role, company, geography, or hiring process.
- Video and analysis of voice traits, accent, emotion, or appearance are out of scope. Voice may be used only as an optional input/output channel.
- Sourcing candidates, managing the full recruiting pipeline, or integrating with an ATS in the MVP.

## Failure modes and risks

- **Unreliable candidate proxy:** a candidate Twin may overstate, omit, or misrepresent supplied experience. Require source references, label its answers as Twin-generated, and let the candidate review its profile and Stage 1 exchange.
- **Misheard direct answers (if voice is added):** STT may mis-transcribe names, technical terms, accents, or code-mixed speech. Show the transcript for candidate correction before using it in the evaluation; offer chat fallback.
- **Voice-induced bias (if voice is added):** recruiters or models may infer fit from vocal delivery rather than job-related answer content. Evaluate the corrected transcript and evidence only; do not score voice characteristics.
- **Hallucinated explanations:** a model may invent evidence or claim a requirement is met without support. Mark uncertainty explicitly and inspect citations against the original evidence.
- **Vague or biased criteria:** a recruiter can encode arbitrary requirements or proxies. Keep criteria explicit and job-related; human review and later auditing are necessary.
- **False confidence from a score:** recruiters may treat a recommendation as objective truth. Avoid a single opaque score and present evidence, gaps, and uncertainty together.
- **Unequal candidate access:** candidates differ in writing ability, language, disability, and available portfolio material. The demo does not establish equitable outcomes; candidate response options and accessibility need validation.
- **Privacy exposure:** resumes and answers contain personal data. Consent, access control, retention, deletion, and provider data handling need a production design.
- **Document overclaim:** extraction confidence and source references help review fields but do not prove a document is genuine or its claims are true. Avoid representing resume, cover-letter, or verification-document parsing as credential verification; collect sensitive verification documents only when necessary and with explicit consent.
- **Provider/API failure:** rate limits, latency, unavailable models, malformed outputs, or changing model behavior can break a demo or produce inconsistent results. Keep the flow small and provide a retry/manual fallback.
- **Overclaiming validity:** a transparent explanation is not evidence that the screening recommendation predicts job performance. Validate against recruiter outcomes and candidate impact before production use.

## Project dependencies

- Sarvam developer API access and a server-side API key; current Document AI endpoint/model access, Voice Agents web/API access, and credit limits need verification.
- A minimal UI for recruiter role setup, candidate-approved evidence, both conversation stages, transcript, and recommendation.
- Backend orchestration for the selected Sarvam service(s), with constrained inputs/outputs and private credentials.
- A small storage choice for the demo; persistent storage is optional if a single-session sample scenario is enough. If Voice Agents does not expose the transcript/session details needed by the app, a direct STT/TTS integration may be needed to preserve the review flow.
- A fixed role rubric and sample candidate evidence for the demo.
- Before a real pilot: privacy/consent and deletion design, security review, accessibility review, and a plan to evaluate screening quality and disparate impact.

## Open questions

- Does the buildathon require use of Sarvam Cowork/Indus itself, or is a direct Sarvam developer API integration sufficient?
- Does the buildathon require the managed Voice Agents platform, or are direct Chat Completion, STT, and TTS APIs acceptable as a fallback?
- Will the demo parse a live resume/cover letter with Document AI, or use a prepared extraction for the fixed sample candidate?
- Who defines the role criteria, and how does the candidate review them before sharing information?
- Who chooses Stage 2 chat or voice—the recruiter, the candidate, or both—and can a candidate switch modes?
- Is Stage 2 required for every candidate, or triggered only when Stage 1 finds gaps that need direct validation?
- What should happen when the candidate disputes a criterion or the evidence is incomplete?
- Which recruiter and candidate pilot users can evaluate whether the exchange is useful and understandable?
- What privacy, retention, and deletion terms apply to the Sarvam API configuration and to the application’s own storage?
- What framework, hosting environment, and buildathon presentation requirements apply?

## Completion definition

The brief is complete when the team can use it to build a one-hour demo that visibly demonstrates resume-derived, candidate-approved evidence; a Twin-to-agent pre-screen; and a candidate-to-agent follow-up with both chat and voice options, both transcripts, evidence-linked criteria, and a recruiter-owned recommendation. Use Sarvam Document AI for document parsing and Sarvam Voice Agents for the Stage 2 voice path when access and integration permit; neither parsing nor model output authenticates credentials or replaces human hiring decisions. Production remains a separate milestone requiring validation of quality, fairness, privacy, security, and operational behavior.
