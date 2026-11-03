import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Mic, MicOff, PhoneCall, PhoneOff, Send, Volume2, VolumeX } from "lucide-react";
import { api, json, type Drive, type Report } from "./api";
import { requestCoachSpeech } from './coach-voice-audio';
import { cancelSpeechRecognition, type RecognitionLike as Recognition } from './speech-recognition';
import { PlacementOfficerAvatar } from "./placement-officer-avatar";
import { canAccessPlacementCoach } from "./placement-coach-access";
import { useAuth } from "./auth";
import { CoachTopNav } from "./coach-top-nav";
import "./placement-officer-call.css";

type Message = { speaker: "officer" | "student"; text: string };
export function LivePlacementOfficerCall() {
  const [params] = useSearchParams();
  const atsMode = params.get('mode') === 'ats';
  const guidanceMode = params.get('mode') === 'guidance';
  const standalone = atsMode || guidanceMode;
  const sourcePage = params.get('source') || 'portal';
  const pageContext = new URLSearchParams({source:sourcePage,drive_id:params.get('drive') || '',plan_id:params.get('plan') || '',report_session_id:params.get('report_session_id') || ''});
  const requestedReturn = params.get('returnTo') || '';
  const returnPath = /^\/(?!\/)[^\\]*$/.test(requestedReturn) && !requestedReturn.startsWith('/placement/call') ? requestedReturn : '/';
  const { identity } = useAuth();
  const driveId = params.get("drive") || "general";
  const [messages, setMessages] = useState<Message[]>([]);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [context, setContext] = useState<{ company: string; role: string; score: number | null; weak: string[] } | null>(null);
  const roleId = params.get("roleId") || context?.role || params.get("role") || "general";
  const storageKey = identity?.student.id && context ? `voicedots_coach_${[identity.student.id, driveId, roleId, ...(atsMode ? ['ats'] : guidanceMode ? ['guidance',sourcePage,params.get('plan') || '',params.get('report_session_id') || ''] : [])].map(value => encodeURIComponent(value).replace(/_/g, "%5F")).join("_")}` : null;
  const [active, setActive] = useState(false);
  const [thinking, setThinking] = useState(false);
  const turnGeneration = useRef(0);
  const [coachAccess, setCoachAccess] = useState<boolean | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [preparingVoice, setPreparingVoice] = useState(false);
  const [voiceAnalyser, setVoiceAnalyser] = useState<AnalyserNode | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSource = useRef<MediaElementAudioSourceNode | null>(null);
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState(false);
  const [input, setInput] = useState("");
  const [interim, setInterim] = useState("");
  const [notice, setNotice] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const audio = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);
  const speechRequest = useRef<AbortController | null>(null);
  const speechEpoch = useRef(0);

  function stopVoice() {
    speechEpoch.current += 1;
    speechRequest.current?.abort();
    speechRequest.current = null;
    if (audio.current) {
      audio.current.onplaying = null;
      audio.current.onended = null;
      audio.current.onerror = null;
      audio.current.pause();
      audio.current.removeAttribute("src");
      audio.current.load();
      audio.current = null;
    }
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
    audioSource.current?.disconnect();
    audioSource.current = null;
    if (mounted.current) { setSpeaking(false); setPreparingVoice(false); }
  }

  function stopListening() {
    if (recognition.current) {
      recognition.current.onend = null;
      recognition.current.onresult = null;
      recognition.current.onerror = null;
      cancelSpeechRecognition(recognition.current);
    }
    recognition.current = null;
    setListening(false);
    setInterim("");
  }
  function stopCall() {
    turnGeneration.current += 1;
    setThinking(false);
    stopListening();
    stopVoice();
    setSpeaking(false);
    setActive(false);
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recognition.current) {
        recognition.current.onend = null;
        recognition.current.onerror = null;
        recognition.current.onresult = null;
        cancelSpeechRecognition(recognition.current);
      }
      stopVoice();
      void audioContext.current?.close().catch(() => {});
      audioContext.current = null;
      analyserRef.current = null;
    };
  }, []);
  useEffect(() => {
    let restored: Message[] = [];
    try {
      const value: unknown = storageKey ? JSON.parse(localStorage.getItem(storageKey) || "[]") : [];
      if (Array.isArray(value)) restored = value.filter((item): item is Message => !!item && (item.speaker === "officer" || item.speaker === "student") && typeof item.text === "string").slice(-100);
    } catch { setNotice("Saved history is unavailable. You can still use this call."); }
    setMessages(restored);
    setHydratedKey(storageKey);
  }, [storageKey]);
  useEffect(() => {
    if (!storageKey || hydratedKey !== storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-100))); }
    catch { setNotice("Your browser could not save this conversation."); }
  }, [messages, storageKey, hydratedKey]);
  useEffect(() => {
    transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [messages, interim]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setCoachAccess(null);
      setContext(null);
      if (guidanceMode) {
        try {
          const page = await api<{company_name?:string;role_title?:string}>(`/api/student/coach/officer/page-context?${pageContext}`);
          if (cancelled) return;
          setContext({company:page.company_name || 'Your preparation',role:page.role_title || 'Personalized guidance',score:null,weak:[]});
          setCoachAccess(true);
        } catch (cause) {
          if (!cancelled) { setCoachAccess(false); setNotice(cause instanceof Error ? cause.message : 'Page context is unavailable. Please return and retry.'); }
        }
        return;
      }
      if (atsMode) {
        try {
          const assessment = await api<{company_name?:string;role_title?:string;ats_fit_score?:number|null;ats_status?:string}>(`/api/student/drives/${encodeURIComponent(driveId)}/ats-fit`);
          if (cancelled) return;
          setContext({company:assessment.company_name || 'Selected company',role:assessment.role_title || 'Selected role',score:assessment.ats_status === 'evaluated' ? assessment.ats_fit_score ?? null : null,weak:[]});
          setCoachAccess(true);
        } catch (cause) {
          if (!cancelled) { setCoachAccess(false); setNotice(cause instanceof Error ? cause.message : 'Your ATS context could not be loaded. Return to ATS Fit and retry.'); }
        }
        return;
      }
      const results = await Promise.allSettled([api<Drive[]>("/api/student/drives"), api<{ reports?: Report[] }>("/api/student/reports")]);
      if (cancelled) return;
      const drives = results[0].status === "fulfilled" ? results[0].value : [];
      const drive = drives.find(item => item.id === driveId);
      const reports = results[1].status === "fulfilled" ? results[1].value.reports || [] : [];
      setCoachAccess(canAccessPlacementCoach(drive, reports));
      const report = reports.filter(item => item.drive_id === driveId && item.report).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.report;
      const score = report?.overall_score;
      setContext({ company: drive?.company_name || params.get("company") || "your target company", role: drive?.role_title || params.get("role") || "your target role", score: typeof score === "number" && Number.isFinite(score) ? Math.min(100, Math.max(0, Math.round(score))) : null, weak: report?.priority_improvement_areas?.map(item => item.focus || "").filter(Boolean).slice(0, 3) || [] });
      if (results.some(result => result.status === "rejected")) setNotice("Some placement details could not be loaded. Guidance may be general.");
    }
    void load();
    return () => { cancelled = true; };
  }, [driveId, params, atsMode, guidanceMode]);

  async function speak(text: string) {
    stopVoice();
    if (muted) return;
    const epoch = speechEpoch.current;
    // Resume during the initiating gesture, before waiting for server audio.
    try {
      if (!audioContext.current || audioContext.current.state === "closed") {
        audioContext.current = new AudioContext();
        const analyser = audioContext.current.createAnalyser();
        analyser.fftSize = 256;
        analyser.connect(audioContext.current.destination);
        analyserRef.current = analyser;
        setVoiceAnalyser(analyser);
      }
      await audioContext.current.resume();
    } catch { /* Audio playback can continue without amplitude analysis. */ }
    if (!mounted.current || epoch !== speechEpoch.current) return;
    const controller = new AbortController();
    speechRequest.current = controller;
    setPreparingVoice(true);
    try {
      const blob = await requestCoachSpeech(text, controller.signal);
      if (!mounted.current || epoch !== speechEpoch.current) return;
      const url = URL.createObjectURL(blob);
      audioUrl.current = url;
      const player = new Audio(url);
      player.playbackRate = 1.08;
      audio.current = player;
      if (audioContext.current?.state === "running") {
        // The analyser follows the exact audio sent to the speakers.
        const analyser = analyserRef.current || audioContext.current.createAnalyser();
        if (!analyserRef.current) {
          analyser.fftSize = 256;
          analyser.connect(audioContext.current.destination);
          analyserRef.current = analyser;
          setVoiceAnalyser(analyser);
        }
        const source = audioContext.current.createMediaElementSource(player);
        source.connect(analyser);
        audioSource.current = source;
      }
      player.onplaying = () => { if (mounted.current && epoch === speechEpoch.current) { setPreparingVoice(false); setSpeaking(true); } };
      player.onended = () => { if (epoch === speechEpoch.current) stopVoice(); };
      player.onerror = () => { if (epoch === speechEpoch.current) { stopVoice(); setNotice("Voice playback is unavailable. You can continue using the transcript."); } };
      await player.play();
    } catch (cause) {
      if (mounted.current && epoch === speechEpoch.current && !controller.signal.aborted) {
        stopVoice();
        setNotice(cause instanceof Error ? cause.message : "Coach voice is unavailable. You can continue using the transcript.");
      }
    }
  }
  async function reply(text: string) {
    const question = text.trim().slice(0, 2000);
    if (!question || !active || !context || thinking) return;
    stopListening();
    await coachTurn(question);
  }
  async function coachTurn(message: string) {
    const generation=++turnGeneration.current;
    setThinking(true);
    stopVoice();
    try {
      const result=await api<{reply:string;degraded:boolean}>('/api/student/coach/officer/conversation', {method:'POST',...json({drive_id:params.get('drive') || '',mode:guidanceMode?'guidance':atsMode?'ats':'interview',source:sourcePage,plan_id:params.get('plan') || '',report_session_id:params.get('report_session_id') || '',message,history:messages.slice(-24)}),timeoutMs:35000});
      if(!mounted.current||generation!==turnGeneration.current)return;
      setMessages(previous=>[...previous,...(message?[{speaker:'student' as const,text:message}]:[]),{speaker:'officer' as const,text:result.reply}].slice(-100));
      setInput('');
      if(result.degraded)setNotice('Detailed coaching is temporarily unavailable. Your conversation history is retained.');
      void speak(result.reply);
    }catch(error){if(mounted.current&&generation===turnGeneration.current)setNotice((error as Error).message);}
    finally{if(mounted.current&&generation===turnGeneration.current)setThinking(false);}
  }
  async function startCall() {
    if (!context || !coachAccess || thinking) return;
    setActive(true);
    await coachTurn('');
  }
  function listen() {
    if (listening) { stopListening(); return; }
    const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Constructor) { setNotice("Voice input is unavailable in this browser. Type your message below."); return; }
    stopVoice();
    setSpeaking(false);
    const instance = new Constructor();
    instance.lang = "en-IN";
    instance.continuous = false;
    instance.interimResults = true;
    instance.onresult = event => {
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        if (!result) continue;
        const transcript = result[0]?.transcript?.trim();
        if (!transcript) continue;
        if (result.isFinal) { void reply(transcript); break; }
        setInterim(transcript);
      }
    };
    instance.onerror = event => { if (mounted.current) setNotice(event.error === "not-allowed" ? "Microphone permission was denied. You can type instead." : "Voice input stopped. Try again or type your message."); };
    instance.onend = () => { if (mounted.current) { setListening(false); setInterim(""); } recognition.current = null; };
    recognition.current = instance;
    try { instance.start(); setListening(true); }
    catch { stopListening(); setNotice("The microphone could not start. Try typing instead."); }
  }
  function submit(event: FormEvent) { event.preventDefault(); reply(input); }
  const navigationParams = new URLSearchParams(params);
  navigationParams.delete("screen");
  const query = navigationParams.toString();
  if (coachAccess === false && standalone) return <section className="officer-call"><h1>AI Coach context is unavailable</h1><p role="alert">{notice}</p><Link className="button secondary" to={guidanceMode ? returnPath : `/ats-fit?drive=${encodeURIComponent(driveId)}`}>Back to your page</Link></section>;
  if (coachAccess === false) return <section className="officer-call">{!standalone && <CoachTopNav activeTab="call"/>}<header className="officer-call-heading"><div><h1>AI coaching unlocks after your first interview</h1><p>Complete your first interview for this placement drive. Coaching will then remain available during later attempts and after drive completion.</p></div></header><Link className="button secondary" to="/placements">Back to placement drives</Link></section>;
  return <section className="officer-call">
    {!standalone && <CoachTopNav activeTab="call" />}
    <header className="officer-call-heading"><div><p>YOUR CAMPUS PLACEMENT COMPANION</p><h1>{guidanceMode ? "Talk to your AI Coach" : atsMode ? "Discuss your ATS Fit with AI Coach" : "Talk to your placement officer"}</h1><span>{context ? `${context.company} · ${context.role}` : "Loading placement context…"}</span></div><span className="officer-ai-badge">{atsMode && context?.score != null ? `ATS Fit ${context.score}%` : "AI voice guidance"}</span></header>
    {notice && <p className="officer-notice" role="status">{notice}</p>}
    <div className="officer-call-grid">
      <section className={`officer-stage ${speaking ? "is-speaking" : ""}`} aria-label="Placement officer">
        <span className="officer-status" role="status">{!active ? "Ready when you are" : thinking ? standalone ? "Reviewing your page context…" : "Reviewing your interview…" : preparingVoice ? "Preparing officer voice…" : speaking ? "Officer speaking" : listening ? "Listening to you" : "Your turn"}</span>
        <PlacementOfficerAvatar speaking={speaking} analyser={voiceAnalyser} />
        <h2>Dr. Rajesh</h2><p>Head of Campus Placements · AI persona</p>
        <div className="officer-wave" aria-hidden="true">{Array.from({ length: 15 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 0.09}s` }} />)}</div>
        <p className="officer-stage-caption">A little guidance. A clearer next step.</p>
        <div className="officer-controls">
          {!active ? <button className="button primary" disabled={!context || !storageKey || hydratedKey !== storageKey} onClick={startCall}><PhoneCall size={18} /> Start call</button> : <><button className="button secondary" onClick={listen} aria-pressed={listening}>{listening ? <MicOff size={18} /> : <Mic size={18} />}{listening ? "Stop listening" : "Speak"}</button><button className="officer-end button" onClick={stopCall}><PhoneOff size={18} /> End call</button></>}
          <button className="button secondary" aria-label={muted ? "Enable officer voice" : "Mute officer voice"} aria-pressed={muted} onClick={() => { setMuted(!muted); if (!muted) stopVoice(); }}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        </div>
      </section>
      <section className="officer-conversation" aria-label="Call conversation"><header><h2>Live conversation</h2><span>Saved for this opportunity</span></header>
        <div className="officer-transcript" ref={transcript} role="log" tabIndex={0} aria-label="Conversation history" aria-live="polite" aria-relevant="additions"><p className="officer-intro">{guidanceMode ? "Discuss this page using your available records. Coaching provides guidance and does not change your plans or eligibility." : atsMode ? "Discuss your resume, ATS score and gaps against the selected job description. No interview is required for ATS guidance." : "Discuss your interview assessment and prepare for your next attempt with evidence-based guidance."}</p>{messages.map((message, index) => <article key={index} className={`officer-message ${message.speaker}`}><b>{message.speaker === "officer" ? "Placement officer" : "You"}</b><p>{message.text}</p></article>)}{interim && <p className="officer-interim">Listening: {interim}</p>}</div>
        <div className="officer-prompts">{(guidanceMode ? ["Help me understand this page", "What should I focus on?", "Explain my available feedback", "Suggest my next step"] : atsMode ? ["Explain my ATS score", "Which requirements need evidence?", "Improve my resume for this role", "What should I prepare first?"] : ["Library resources", "Faculty guidance", "Alumni mentorship", "Schedule my next attempt"]).map(prompt => <button key={prompt} disabled={!active} onClick={() => reply(prompt)}>{prompt}</button>)}</div>
        <form onSubmit={submit}><label className="sr-only" htmlFor="officer-message">Your message to the placement officer</label><input id="officer-message" value={input} maxLength={2000} disabled={!active} onChange={event => setInput(event.target.value)} placeholder={active ? "Ask your placement officer…" : "Start a call to join the conversation"} /><button className="button primary" aria-label="Send message" disabled={!active || !input.trim()}><Send size={18} /></button></form>
      </section>
    </div>
    {guidanceMode ? <footer className="officer-next"><Link className="button secondary" to={returnPath}>Back to your page</Link><span>Guidance based on your available page records.</span></footer> : atsMode ? <footer className="officer-next"><Link className="button secondary" to={`/ats-fit?drive=${encodeURIComponent(driveId)}`}>Back to ATS Fit</Link><span>Guidance uses your current resume and the selected job requirements.</span></footer> : <footer className="officer-next"><Link className="button secondary" to={`/placement/plan?${query}`}>Open learning plan</Link><Link className="button secondary" to={`/placement/reattempt?${query}`}>Schedule re-attempt</Link><span>Confirm availability and bookings in the scheduling screen.</span></footer>}
  </section>;
}
