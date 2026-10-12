"use client";

import { FormEvent, useEffect, useRef, useState, type ChangeEvent } from "react";
import type { AgentState, ConversationAgent } from "sarvam-conv-ai-sdk/browser";
import { buildChatReply, evidence as fixtureEvidence, gap as fixtureGap, initialResult, role as fixtureRole, stageOneTurns } from "@/lib/demo-fixture";
import type { Evidence, Role, ScreeningResult, StageOneTurn, StageTwoTurn } from "@/lib/contracts";
import { buildInitialResult } from "@/lib/screening";

type VoiceStatus = "idle" | "connecting" | "listening" | "speaking" | "muted" | "ended" | "error";

const voiceLabels: Record<VoiceStatus, string> = {
  idle: "Ready when you are",
  connecting: "Connecting to the recruiter",
  listening: "Listening for your answer",
  speaking: "Recruiter is speaking",
  muted: "Microphone muted",
  ended: "Interview ended",
  error: "Voice needs attention"
};

function Icon({ name }: { name: "mic" | "phone" | "mute" | "arrow" | "check" | "spark" }) {
  const paths = {
    mic: <><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/></>,
    phone: <><path d="M7 3.8 4.8 5.3a2 2 0 0 0-.8 2.4 17 17 0 0 0 10.3 10.3 2 2 0 0 0 2.4-.8l1.5-2.2-3.2-2.2-1.5 1.6a12 12 0 0 1-5.9-5.9l1.6-1.5L7 3.8Z"/></>,
    mute: <><path d="M9 9v3a3 3 0 0 0 5.2 2M15 9V6a3 3 0 0 0-5.6-1.5M5 10a7 7 0 0 0 11.8 5.1M12 17v5M8 22h8M3 3l18 18"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
    spark: <><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z"/><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z"/></>
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function formatVoiceState(state: AgentState | string): VoiceStatus {
  const value = String(state).toUpperCase();
  if (value.includes("CONNECT")) return "connecting";
  if (value.includes("SPEAK")) return "speaking";
  if (value.includes("LISTEN")) return "listening";
  if (value.includes("ERROR")) return "error";
  return "listening";
}

export default function Home() {
  const [activeStep, setActiveStep] = useState(2);
  const [currentRole, setCurrentRole] = useState<Role>(fixtureRole);
  const [evidence, setEvidence] = useState<Evidence[]>(fixtureEvidence);
  const [stageOne, setStageOne] = useState<StageOneTurn[]>(stageOneTurns);
  const [currentGap, setCurrentGap] = useState(fixtureGap);
  const [stageTwo, setStageTwo] = useState<StageTwoTurn[]>([]);
  const [result, setResult] = useState<ScreeningResult>(initialResult);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [voiceError, setVoiceError] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [candidateSpeaking, setCandidateSpeaking] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [correction, setCorrection] = useState("");
  const [correctionTurnId, setCorrectionTurnId] = useState<string | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [candidateName, setCandidateName] = useState("Aarav Mehta");
  const [uploadNote, setUploadNote] = useState("Prepared demo extraction loaded");
  const [roleUploadNote, setRoleUploadNote] = useState("Prepared role fixture loaded");
  const [evaluationNote, setEvaluationNote] = useState("The prepared result is a local demo fixture until a transcript is reviewed.");
  const agentRef = useRef<ConversationAgent | null>(null);
  const evaluatedTurnsRef = useRef("");
  const lastMicLevelUpdateRef = useRef(0);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

  const approvedCount = evidence.filter((item) => item.reviewStatus === "approved" || item.reviewStatus === "edited").length;
  useEffect(() => () => { void agentRef.current?.stop().catch(() => undefined); }, []);

  useEffect(() => {
    const lastTurn = stageTwo[stageTwo.length - 1];
    const interviewComplete = voiceStatus === "ended" && stageTwo.some((turn) => turn.mode === "voice");
    const chatComplete = lastTurn?.mode === "chat" && lastTurn.speaker === "recruiter_agent";
    const fingerprint = JSON.stringify(stageTwo);
    if ((!interviewComplete && !chatComplete) || fingerprint === evaluatedTurnsRef.current) return;
    evaluatedTurnsRef.current = fingerprint;
    void fetch("/api/evaluate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ stageTwoTurns: stageTwo, role: currentRole, evidence }) })
      .then(async (response) => { if (response.ok) { const data = await response.json(); setResult(data); setEvaluationNote(data.notice ?? "Evaluation source unavailable."); } })
      .catch(() => undefined);
  }, [stageTwo, voiceStatus, currentRole, evidence]);

  const stopVoice = async (status: VoiceStatus = "ended") => {
    const agent = agentRef.current;
    agentRef.current = null;
    try { await agent?.stop(); } finally { setVoiceStatus(status); setIsMuted(false); setMicLevel(0); setCandidateSpeaking(false); }
  };

  const appendVoiceTurn = (speaker: StageTwoTurn["speaker"], text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setStageTwo((turns) => {
      const last = turns[turns.length - 1];
      if (last?.speaker === speaker && last.text === clean) return turns;
      return [...turns, { id: `s2-${Date.now()}-${turns.length}`, speaker, text: clean, mode: "voice", candidateCorrected: false }];
    });
  };

  const startVoice = async () => {
    setVoiceError("");
    setVoiceStatus("connecting");
    setActiveStep(2);
    try {
      const orgId = process.env.NEXT_PUBLIC_SARVAM_ORG_ID;
      const workspaceId = process.env.NEXT_PUBLIC_SARVAM_WORKSPACE_ID;
      const appId = process.env.NEXT_PUBLIC_SARVAM_VOICE_AGENT_ID;
      if (!orgId || !workspaceId || !appId) throw new Error("Add the public Sarvam Voice Agent identifiers to .env.local first.");
      const { ConversationAgent, BrowserAudioInterface, InteractionType, Role } = await import("sarvam-conv-ai-sdk/browser");
      const audio = new BrowserAudioInterface(16000);
      const agent = new ConversationAgent({
        apiKey: "",
        baseUrl: "/api/sarvam/",
        config: {
          org_id: orgId,
          workspace_id: workspaceId,
          app_id: appId,
          version: process.env.NEXT_PUBLIC_SARVAM_VOICE_AGENT_VERSION ? Number(process.env.NEXT_PUBLIC_SARVAM_VOICE_AGENT_VERSION) : undefined,
          user_identifier: "clearline-demo-candidate",
          user_identifier_type: "custom",
          interaction_type: InteractionType.CALL,
          input_sample_rate: 16000,
          output_sample_rate: 16000,
          initial_language_name: "English" as any,
          initial_bot_message: currentGap.followUpQuestion,
          agent_variables: {
            candidate_name: candidateName,
            role_title: currentRole.title,
            criteria_summary: currentRole.criteria.map((item) => item.label).join(", "),
            stage_one_gap: currentGap.reason,
            stage_one_follow_up: currentGap.followUpQuestion
          }
        },
        audioInterface: audio,
          stateCallback: (state) => {
            const nextStatus = formatVoiceState(state);
            if (nextStatus === "speaking") appendVoiceTurn("recruiter_agent", currentGap.followUpQuestion);
            setVoiceStatus(nextStatus);
          },
        audioLevelCallback: ({ direction, rms }) => {
          if (direction === "input" && performance.now() - lastMicLevelUpdateRef.current > 100) {
            lastMicLevelUpdateRef.current = performance.now();
            setMicLevel(rms);
          }
        },
        eventCallback: async (event) => {
          const eventType = String(event.type);
          if (eventType.includes("USER_SPEECH_START")) setCandidateSpeaking(true);
          if (eventType.includes("USER_SPEECH_END")) setCandidateSpeaking(false);
        },
        textCallback: async (message) => {
          appendVoiceTurn("recruiter_agent", message.text);
        },
        transcriptCallback: async (message) => {
          appendVoiceTurn(message.role === Role.USER ? "candidate" : "recruiter_agent", message.content);
        },
        endCallback: async () => { agentRef.current = null; setVoiceStatus("ended"); setIsMuted(false); setMicLevel(0); setCandidateSpeaking(false); }
      });
      agentRef.current = agent;
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        if (typeof args[0] === "string" && (args[0].includes("Got signed URL") || args[0].includes("Final WebSocket URL"))) return;
        originalLog(...args);
      };
      try { await agent.start(); } finally { console.log = originalLog; }
    } catch (error) {
      await stopVoice("error");
      setVoiceError(error instanceof Error ? error.message : "The microphone or voice connection could not start.");
    }
  };

  const toggleMute = () => {
    const agent = agentRef.current;
    if (!agent) return;
    if (agent.isMuted()) { agent.unmute(); setIsMuted(false); setVoiceStatus("listening"); }
    else { agent.mute(); setIsMuted(true); setVoiceStatus("muted"); }
  };

  const submitChat = async (event: FormEvent) => {
    event.preventDefault();
    const text = chatDraft.trim();
    if (!text) return;
    const candidateTurn: StageTwoTurn = { id: `s2-chat-${Date.now()}`, speaker: "candidate", text, mode: "chat", candidateCorrected: false };
    const recruiterTurn: StageTwoTurn = { id: `s2-chat-${Date.now()}-reply`, speaker: "recruiter_agent", text: buildChatReply(text), mode: "chat" };
    const next = [...stageTwo, candidateTurn, recruiterTurn];
    setStageTwo(next);
    setChatDraft("");
    setActiveStep(2);
  };

  const focusChat = () => {
    setActiveStep(2);
    requestAnimationFrame(() => chatInputRef.current?.focus());
  };

  const saveCorrection = () => {
    if (!correction.trim()) return;
    const targetTurnId = correctionTurnId ?? lastCandidateTurn?.id;
    setStageTwo((turns) => turns.map((turn) => turn.id === targetTurnId ? { ...turn, text: correction.trim(), candidateCorrected: true } : turn));
    setCorrection("");
    setCorrectionTurnId(null);
    setShowCorrection(false);
  };

  const refreshStageOne = async (nextRole: Role, nextEvidence: Evidence[]) => {
    const response = await fetch("/api/stage-one", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: nextRole, evidence: nextEvidence }) });
    if (!response.ok) return;
    const data = await response.json();
    setStageOne(data.turns);
    setCurrentGap(data.gap);
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>, kind: "role" | "candidate") => {
    const files = [...(event.target.files ?? [])];
    if (!files.length) return;
    const body = new FormData();
    files.forEach((file) => body.append("files", file));
    body.append("kind", kind);
    if (kind === "candidate") setUploadNote("Reviewing candidate documents…");
    else setRoleUploadNote("Reading job posting…");
    const response = await fetch("/api/documents/extract", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) { if (kind === "candidate") setUploadNote(data.error ?? "Could not read this document."); else setRoleUploadNote(data.error ?? "Could not read this job posting."); return; }
    if (kind === "role") {
      setCurrentRole(data.role);
      setResult(buildInitialResult(data.role, evidence));
      setRoleUploadNote(data.notice);
      await refreshStageOne(data.role, evidence);
    } else {
      setEvidence(data.evidence);
      setResult(buildInitialResult(currentRole, data.evidence));
      setCandidateName(data.candidateName || "Candidate");
      setUploadNote(data.notice);
      await refreshStageOne(currentRole, data.evidence);
    }
    setActiveStep(1);
  };

  const reset = async () => {
    await stopVoice("idle");
    evaluatedTurnsRef.current = "";
    setCurrentRole(fixtureRole); setEvidence(fixtureEvidence); setStageOne(stageOneTurns); setCurrentGap(fixtureGap); setStageTwo([]); setResult(initialResult); setVoiceError(""); setCandidateName("Aarav Mehta"); setUploadNote("Prepared demo extraction loaded"); setRoleUploadNote("Prepared role fixture loaded"); setEvaluationNote("The prepared result is a local demo fixture until a transcript is reviewed."); setActiveStep(2); setShowCorrection(false); setCorrectionTurnId(null);
  };

  const decide = (decision: "advance" | "hold") => setResult((current) => ({ ...current, humanDecision: decision }));
  const voiceActive = ["connecting", "listening", "speaking", "muted"].includes(voiceStatus);
  const lastCandidateTurn = [...stageTwo].reverse().find((turn) => turn.speaker === "candidate");

  const voiceHelper = voiceActive
    ? candidateSpeaking
      ? "Hearing you — keep answering."
      : voiceStatus === "listening" && micLevel < 0.01
        ? "Microphone connected. Speak for a few seconds so the recruiter can respond."
        : "Speak naturally. The transcript will appear below."
    : "Use headphones if you can. Your transcript stays reviewable.";

  return <div className="shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">C</span><span>clearline</span></div>
      <div className="topbar-meta"><span className="live-dot" aria-hidden="true"/><span>Private demo workspace</span><span className="mono">ML-ENG / 01</span></div>
    </header>
    <main className="main">
      <section className="hero">
        <div><div className="eyebrow">Candidate-first screening</div><h1>Make the next question visible.</h1><p>A two-stage screen that keeps the evidence, the unknowns, and the human decision in the same frame.</p></div>
        <div className="hero-side"><strong>5 min</strong><span>guided demo · one candidate</span></div>
      </section>

      <nav className="flow" aria-label="Screening stages">
        {[{ n: 1, title: "Evidence", note: "Candidate review" }, { n: 2, title: "Twin exchange", note: "3 bounded turns" }, { n: 3, title: "Direct interview", note: "Voice first" }, { n: 4, title: "Recruiter review", note: "Human decision" }].map((item) => <button type="button" key={item.n} className={`flow-step ${activeStep === item.n ? "current" : ""} ${activeStep > item.n ? "complete" : ""}`} onClick={() => setActiveStep(item.n)}><span className="flow-num">{activeStep > item.n ? <Icon name="check"/> : item.n}</span><span><strong>{item.title}</strong><small>{item.note}</small></span></button>)}
      </nav>

      <div className="layout">
        <section>
          <div className="card voice-card">
            <div className="panel-head"><div><div className="eyebrow">Stage 2 · direct candidate interview</div><h2 className="panel-title">Resolve the open question</h2><p className="panel-kicker">The voice agent receives the gap from Stage 1 and asks for one concrete answer.</p></div><span className={`tag ${voiceStatus === "error" ? "coral" : voiceActive ? "amber" : ""}`}>{voiceActive ? "LIVE PATH" : "SARVAM VOICE"}</span></div>
            <div className="voice-stage">
              <div className="gap-callout"><div className="gap-icon"><Icon name="spark"/></div><div><strong>Stage 1 gap · {currentRole.criteria.find((criterion) => criterion.id === currentGap.criterionId)?.label || currentRole.criteria[0].label}</strong><p>{currentGap.reason}</p></div></div>
              <div className={`voice-center ${voiceStatus}`}><div className={`voice-orb ${voiceActive ? "active" : ""} ${voiceStatus === "error" ? "error" : ""}`} aria-hidden="true"><Icon name={voiceStatus === "muted" ? "mute" : voiceActive ? "mic" : voiceStatus === "ended" ? "check" : "phone"}/></div><p className="voice-status" role="status">{voiceLabels[voiceStatus]}</p><p className="voice-helper">{voiceError || voiceHelper}</p><div className="controls"><button type="button" className="button primary" onClick={voiceActive ? () => void stopVoice() : startVoice} disabled={voiceStatus === "connecting"}>{voiceActive ? <><Icon name="phone"/> End interview</> : <><Icon name="mic"/> {voiceStatus === "error" ? "Retry voice" : "Start voice interview"}</>}</button><button type="button" className="button secondary" onClick={toggleMute} disabled={!voiceActive}>{isMuted ? <><Icon name="mic"/> Unmute</> : <><Icon name="mute"/> Mute</>}</button><button type="button" className="button quiet" onClick={focusChat}>Focus text fallback</button></div><p className="voice-note">Voice evaluates the corrected transcript and evidence, never accent or delivery.</p></div>
            </div>
            <div className="transcript"><div className="section-label"><span>Live transcript</span><span>{stageTwo.length ? `${stageTwo.length} turns` : "waiting for first turn"}</span></div>{stageTwo.length ? <div className="transcript-list">{stageTwo.map((turn) => <div className={`turn ${turn.speaker === "candidate" ? "user" : ""}`} key={turn.id}><div className="turn-avatar">{turn.speaker === "candidate" ? "YOU" : "C"}</div><div className="turn-bubble"><span className="turn-meta">{turn.speaker === "candidate" ? "Candidate" : "Recruiter agent"} · {turn.mode}{turn.candidateCorrected ? " · corrected" : ""}</span><p>{turn.text}</p></div></div>)}</div> : <div className="transcript-empty">Your answer and the recruiter’s follow-up will appear here. Start voice or use the chat fallback below.</div>}{lastCandidateTurn && <div className="correction">{showCorrection ? <><label htmlFor="correction">Correct the latest candidate transcript before review</label><textarea id="correction" value={correction} onChange={(event) => setCorrection(event.target.value)} placeholder="Type the words as you intended them…"/><div className="correction-row"><button type="button" className="button quiet" onClick={() => setShowCorrection(false)}>Cancel</button><button type="button" className="button secondary" onClick={saveCorrection}>Save correction</button></div></> : <button type="button" className="button quiet" onClick={() => { setCorrection(lastCandidateTurn.text); setShowCorrection(true); }}>Correct latest transcript</button>}</div>}</div>
          </div>
          <form className="card chat-form" onSubmit={submitChat}><div><div className="eyebrow">Text fallback</div><strong>Prefer to type?</strong><p className="panel-kicker">Chat uses the same gap and produces the same reviewable transcript.</p></div><div className="chat-form-row"><label htmlFor="chat-draft" className="sr-only">Your answer</label><textarea ref={chatInputRef} id="chat-draft" value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder={currentGap.followUpQuestion}/><button className="button secondary" type="submit">Send answer <Icon name="arrow"/></button></div></form>
        </section>

        <aside className="side-stack">
          <section className="card"><div className="panel-head"><div><div className="eyebrow">Role context</div><h2 className="panel-title">What is being assessed</h2></div><span className="tag">{roleUploadNote.includes("Parsed") ? "UPLOADED" : "DISCLOSED"}</span></div><div className="role-body"><div className="role-title"><h2>{currentRole.title}</h2><span className="mono" style={{ color: "var(--subtle)", fontSize: 10 }}>01 ROLE</span></div><p>{currentRole.description}</p><div className="criteria">{currentRole.criteria.map((criterion, index) => <div className="criterion" key={criterion.id}><span className="criterion-index">0{index + 1}</span><span><strong>{criterion.label}</strong><span>{criterion.requirement}</span></span></div>)}</div></div><div className="sidebar-actions"><label className="button secondary" htmlFor="role-upload">Upload job posting<input id="role-upload" className="sr-only" type="file" accept=".pdf,.txt,.md,.markdown,.jpg,.jpeg,.png,image/jpeg,image/png" onChange={(event) => void handleUpload(event, "role")}/></label><button type="button" className="button quiet" onClick={reset}>Reset demo</button></div><p className="review-note">{roleUploadNote} Uploading supported PDFs, JPEGs, and PNGs sends the document to Sarvam Document AI when configured; structured parsing sends extracted text to Sarvam LLM.</p></section>
          <section className="card evidence-card"><div className="panel-head"><div><div className="eyebrow">Source-linked evidence</div><h2 className="panel-title">Candidate review</h2></div><span className="tag">{uploadNote.includes("Prepared") ? "FIXTURE" : "UPLOADED"}</span></div><div className="evidence-list">{evidence.slice(0, 4).map((item) => <div className="evidence-item" key={item.id}><span className="evidence-bar"/><div className="evidence-copy"><strong>{item.field}</strong><p>{item.value}</p><div className="evidence-source">{item.sourceDocument} · p.{item.sourcePage}</div></div><span className="confidence">{Math.round(item.confidence * 100)}%</span></div>)}</div><p className="review-note">{uploadNote}. Extraction reflects what the document says; it does not verify authenticity or credentials. Uploading supported PDFs, JPEGs, and PNGs sends the document to Sarvam Document AI when configured; structured parsing sends extracted text to Sarvam LLM.</p><div className="sidebar-actions"><label className="button secondary" htmlFor="resume-upload">Upload candidate docs<input id="resume-upload" className="sr-only" type="file" accept=".pdf,.txt,.md,.markdown,.jpg,.jpeg,.png,image/jpeg,image/png" multiple onChange={(event) => void handleUpload(event, "candidate")}/></label><small>{candidateName} · PDF, TXT, MD, JPEG, or PNG</small></div></section>
        </aside>
      </div>

      <section className="card stage-one"><div className="panel-head"><div><div className="eyebrow">Stage 1 · recruiter agent ↔ candidate Twin</div><h2 className="panel-title">Why this became the next question</h2><p className="panel-kicker">The Twin can only cite approved evidence. Unknowns become direct follow-ups.</p></div><span className="tag amber">3 BOUNDED TURNS</span></div><div className="exchange">{stageOne.map((turn) => <div className="exchange-row" key={turn.id}><span className="exchange-speaker">{turn.speaker === "candidate_twin" ? "Candidate Twin" : "Recruiter agent"}</span><div><p className={`exchange-text ${turn.unsupported ? "unsupported" : ""}`}>{turn.text}</p>{turn.evidenceIds.map((id) => <span className="exchange-ref" key={id}>{id}</span>)}{turn.unsupported && <span className="tag amber" style={{ marginLeft: 3 }}>NOT ESTABLISHED</span>}</div></div>)}</div></section>

      <section className="card review-card"><div className="panel-head"><div><div className="eyebrow">Recruiter review</div><h2 className="panel-title">Traceable outcome</h2><p className="panel-kicker">Review evidence and transcript references, then make the final call yourself.</p></div><span className={`tag ${result.recommendation === "advance" ? "" : "amber"}`}>{result.recommendation.replaceAll("_", " ").toUpperCase()}</span></div><div className="review-grid">{result.assessments.map((assessment) => { const criterion = currentRole.criteria.find((item) => item.id === assessment.criterionId); return <div className="assessment" key={assessment.criterionId}><span className={`tag ${assessment.status === "supported" ? "" : "amber"}`}>{assessment.status.replaceAll("_", " ")}</span><h3>{criterion?.label}</h3><p>{assessment.rationale}</p><div style={{ marginTop: 8 }}>{assessment.evidenceRefs.map((ref) => <span className="exchange-ref" key={ref}>{ref}</span>)}{assessment.stage2TurnRefs.map((ref) => <span className="exchange-ref" key={ref}>{ref}</span>)}</div></div>; })}</div><div className="result-footer"><div><p>{result.summary}</p><p style={{ marginTop: 6 }}>{evaluationNote}</p>{result.humanDecision !== "pending" && <div className="decision-state">Human decision recorded: {result.humanDecision === "advance" ? "Advance" : "Hold for review"}</div>}</div><div className="decision-actions"><button type="button" className="button secondary" onClick={() => decide("hold")} disabled={result.humanDecision === "hold"}>Hold for review</button><button type="button" className="button primary" onClick={() => decide("advance")} disabled={result.humanDecision === "advance"}>Advance</button></div></div></section>

      <footer className="footer"><span>Clearline demo · candidate claims remain candidate-provided until a separate human process verifies them.</span><span className="mono">SARVAM / VOICE AGENTS</span></footer>
    </main>
  </div>;
}
