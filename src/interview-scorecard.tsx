import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  FileText,
  MessageCircle,
  MessageSquare,
  Sparkles,
  Star,
  Target,
  Volume2,
  VolumeX,
  PhoneCall,
} from 'lucide-react';
import { api, ApiError, json, type CandidateSatisfaction, type InterviewReportView } from './api';
import { requestCoachSpeech } from './coach-voice-audio';
import { useAuth } from './auth';
import { coachCallPath } from './coach-call-link';
import { reportCompetencies } from './report-competencies';

import { PlacementOfficerAvatar } from './placement-officer-avatar';
import './journey-screens.css';
import './interview-scorecard.css';
import './scorecard-light-theme.css';
import './scorecard-feedback.css';
import './result-stat-cards.css';

const INSTITUTION_SCORE_THRESHOLD = 75;

const feedbackQuestions = [
  ['question_relevance', 'The questions were relevant to my role.'],
  ['conversation_quality', 'The conversation felt natural and clear.'],
  ['assessment_fairness', 'The assessment felt fair.'],
  ['feedback_usefulness', 'The feedback is useful for my next steps.'],
  ['audio_experience', 'The audio and response timing worked well.'],
  ['overall_experience', 'Overall, I was satisfied with the interview.'],
] as const;

export function InterviewScorecard({ view, sessionId, role, company }: { view: InterviewReportView; sessionId: string; role?: string; company?: string|null; assessedAt?: string; durationSeconds?: number }) {
  const { identity } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [openingPlan, setOpeningPlan] = useState(false);
  const [planError, setPlanError] = useState('');
  const [callDriveId, setCallDriveId] = useState(searchParams.get('drive') || '');
  useEffect(() => {
    let active = true;
    setCallDriveId('');
    api<{ reports?: import('./api').Report[] }>('/api/student/reports').then(result => {
      if (active) {
        const report=result.reports?.find(item=>item.session_id===sessionId);
        setCallDriveId(report?.drive_id || '');
        setCompanyName(report?.company_name || 'Placement interview');
      }
    }).catch(() => {
      if (active) setPlanError('We couldn’t identify this report’s placement drive. Refresh the report or open Progress from your placement card.');
    });
    return () => { active = false; };
  }, [sessionId]);
  const callParams = new URLSearchParams();
  if (callDriveId) callParams.set('drive', callDriveId);
  // Score calculations
  const rawScore = view.overall_score;
  const overallScore = rawScore != null ? Math.round(Math.max(0, Math.min(100, rawScore))) : 0;
  const isBelowThreshold = rawScore != null && overallScore < INSTITUTION_SCORE_THRESHOLD;

  // AI Coach conversation pop-up offered automatically when student scores below institution threshold
  const [showCoachPopup, setShowCoachPopup] = useState<boolean>(isBelowThreshold);
  const [coachIntro, setCoachIntro] = useState(true);
  // Step Pagination: 1: Diagnosis, 2: Goals & Availability, 3: Focus Areas, 4: Daily Schedule (Default 4 to show roadmap immediately)
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(4);
  const [activeScheduleDay, setActiveScheduleDay] = useState<string>('1-3');
  const [selectedDailyTime, setSelectedDailyTime] = useState<string>('2h');
  const [selectedTimeline, setSelectedTimeline] = useState<string>('14 Days');
  // Offer the popup immediately; paid speech starts only after Play voice.
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(true);
  const [isCoachSpeaking, setIsCoachSpeaking] = useState<boolean>(false);
  const [showSatisfactionDrawer, setShowSatisfactionDrawer] = useState<boolean>(false);
  const [discussionInput, setDiscussionInput] = useState<string>('');
  const [customDialogue, setCustomDialogue] = useState<string | null>(null);

  // Candidate satisfaction survey states
  const [satisfaction, setSatisfaction] = useState(view.candidate_satisfaction);
  const [feedbackRatings, setFeedbackRatings] = useState<Record<string, number>>(satisfaction?.ratings ?? {});
  const [recommend, setRecommend] = useState(satisfaction?.recommendation_score != null);
  const [recommendation, setRecommendation] = useState(satisfaction?.recommendation_score ?? 5);
  const [comments, setComments] = useState(satisfaction?.comments ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Extract candidate profile details
  const candidateName = view.candidate_info?.full_name || 'Student';
  const candidateDept = view.candidate_info?.department || view.candidate_info?.program || 'Program not provided';
  const candidateInitial = candidateName ? candidateName.trim().charAt(0).toUpperCase() : 'A';
  const studentFirstName = candidateName.split(/\s+/)[0] || 'Student';
  const roleTitle = role || 'Your target role';
  const [companyName,setCompanyName] = useState(company || 'Placement interview');

  // Competency map
  const allCompetencies = reportCompetencies(view);
  const competencies = allCompetencies.filter((item):item is typeof item & {score:number}=>item.score!==null);
  const [discussionBusy,setDiscussionBusy] = useState(false);
  const [discussionError,setDiscussionError] = useState('');
  const [discussionHistory,setDiscussionHistory] = useState<Array<{speaker:'student'|'officer';text:string}>>([]);
  const discussionRequest = useRef<AbortController|null>(null);
  useEffect(()=>()=>{discussionRequest.current?.abort();},[sessionId]);
  const [scheduleDataByDays,setScheduleDataByDays]=useState<Record<string,{track:string;topic:string;technical:string;communication:string}>>({});
  useEffect(()=>{
    let active=true;
    setScheduleDataByDays({});
    if(callDriveId) void api<{daily_schedule?:{activity?:string;focus?:string;duration?:string}[]}>(`/api/student/coach/improvement-journey?drive_id=${encodeURIComponent(callDriveId)}`).then(result=>{
      if(!active)return;
      const tasks=result.daily_schedule||[];
      const first=tasks[0];
      if(first)setScheduleDataByDays({'1-3':{track:first.focus||'Saved learning plan',topic:first.activity||'',technical:tasks[1]?.activity||'',communication:tasks[2]?.activity||''}});
    }).catch(()=>{ /* Missing plan stays explicitly unavailable; never substitute sample tasks. */ });
    return()=>{active=false;};
  },[callDriveId]);
  const currentDayPlan = scheduleDataByDays[activeScheduleDay] || scheduleDataByDays['1-3'] || {track:'No saved learning plan',topic:'Create your plan with AI Coach to see scheduled activities.',technical:'No exercise scheduled',communication:'No practice scheduled'};
  // Question stats
  const totalQuestions = view.question_reviews?.length ?? 0;
  const answeredQuestions = view.question_reviews?.filter(q => Boolean(q.answer) || Boolean((q as any).user_answer) || (q.word_count != null && q.word_count > 0)).length ?? 0;
  const notAttemptedQuestions = Math.max(0, totalQuestions - answeredQuestions);


  const coachAudio = useRef<HTMLAudioElement | null>(null);
  const coachAudioUrl = useRef<string | null>(null);
  const coachSpeechRequest = useRef<AbortController | null>(null);
  const [coachVoiceError, setCoachVoiceError] = useState('');
  const [coachVoiceLoading, setCoachVoiceLoading] = useState(false);
  const coachAudioText = useRef('');

  function stopCoachVoice() {
    coachSpeechRequest.current?.abort();
    coachSpeechRequest.current = null;
    if (coachAudio.current) {
      coachAudio.current.onplaying = null;
      coachAudio.current.onended = null;
      coachAudio.current.onerror = null;
      coachAudio.current.pause();
      coachAudio.current = null;
    }
    if (coachAudioUrl.current) URL.revokeObjectURL(coachAudioUrl.current);
    coachAudioUrl.current = null;
    coachAudioText.current = '';
    setCoachVoiceLoading(false);
    setIsCoachSpeaking(false);
  }

  // Use the same canonical male voice as Dr. Rajesh's coach call.
  async function speakCoachText(text: string, userInitiated = false) {
    // Retry cached audio directly within the click gesture when autoplay was blocked.
    if (userInitiated && coachAudio.current && coachAudioText.current === text) {
      setCoachVoiceError('');
      try {
        await coachAudio.current.play();
      } catch {
        setCoachVoiceError('Audio could not play. Check your browser sound settings and select Play voice again.');
      }
      return;
    }
    stopCoachVoice();
    if (isVoiceMuted && !userInitiated) return;
    setCoachVoiceError('');
    setCoachVoiceLoading(true);
    const controller = new AbortController();
    coachSpeechRequest.current = controller;
    try {
      const blob = await requestCoachSpeech(text, controller.signal, identity?.student.id || '');
      if (controller.signal.aborted) return;
      if (!blob.size) throw new Error('Empty coach audio');
      const url = URL.createObjectURL(blob);
      coachAudioUrl.current = url;
      const player = new Audio(url);
      coachAudio.current = player;
      coachAudioText.current = text;
      player.muted = false;
      player.volume = 1;
      player.playbackRate = 1.08;
      player.onplaying = () => setIsCoachSpeaking(true);
      player.onended = stopCoachVoice;
      player.onerror = () => {
        stopCoachVoice();
        setCoachVoiceError('Voice is unavailable. You can continue reading the conversation.');
      };
      await player.play();
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof DOMException && cause.name === 'NotAllowedError') {
        setCoachVoiceError('Select Play voice to hear Dr. Rajesh. Your browser needs a click before playing sound.');
        return;
      }
      stopCoachVoice();
      setCoachVoiceError(cause instanceof Error ? cause.message : 'Voice is unavailable. You can continue reading the conversation.');
    } finally {
      if (!controller.signal.aborted) setCoachVoiceLoading(false);
    }
  }

  useEffect(() => () => stopCoachVoice(), []);

  // Live discussion handler when student interacts or asks Dr. Rajesh
  const handleDiscussionPrompt = async (promptText: string) => {
    if (!promptText.trim() || discussionRequest.current) return false;
    const controller = new AbortController();
    discussionRequest.current = controller;
    setDiscussionBusy(true);
    setDiscussionError('');
    stopCoachVoice();
    try {
      const result = await api<{reply:string;degraded?:boolean}>('/api/student/coach/officer/conversation', {
        ...json({mode:'guidance',drive_id:callDriveId,report_session_id:sessionId,
          source:`/reports/${sessionId}`,message:promptText,history:discussionHistory}),
        signal:controller.signal,timeoutMs:35000,
      });
      if (controller.signal.aborted) return false;
      const reply = result.reply?.trim();
      if (!reply) throw new Error('The coach returned no reply. Please retry.');
      setCustomDialogue(reply);
      setDiscussionHistory(history=>[...history,{speaker:'student' as const,text:promptText},{speaker:'officer' as const,text:reply}].slice(-24));
      if (result.degraded) setDiscussionError('Detailed coaching is temporarily unavailable. Please retry shortly.');
      void speakCoachText(reply);
      return true;
    } catch (cause) {
      if (!controller.signal.aborted) setDiscussionError(cause instanceof Error ? cause.message : 'Coaching is unavailable. Please retry.');
      return false;
    } finally {
      if (discussionRequest.current === controller) {
        discussionRequest.current = null;
        setDiscussionBusy(false);
      }
    }
  };

  const defaultDialogueForStep: Record<number, string> = {
    1: `I've reviewed your interview for ${roleTitle}. Your overall score is ${overallScore}/100. ${competencies.length ? `Let's focus on ${[...competencies].sort((a,b)=>a.score-b.score).slice(0,2).map(item=>`${item.name} (${item.score}/100)`).join(' and ')}.` : 'Let’s review the available answer feedback together.'} This is preparation guidance; your placement team manages eligibility.`,
    2: `To reach placement readiness, how much time can you commit daily, and what is your preparation timeline? We can choose a realistic schedule around your availability.`,
    3: `Let's use your interview evidence and the requirements for ${roleTitle} to choose focused exercises, topic revision and practice explanations. We can review the saved learning plan and adjust it to your availability.`,
    4: `Let's review your saved learning schedule and adjust it to your goals and availability. If no schedule is saved yet, we can discuss what would work for you.`,
  };

  const introDialogue = `Hi ${studentFirstName}! I'm Dr. Rajesh, your AI Coach. I've reviewed your ${companyName} interview for ${roleTitle}. Your score is ${overallScore} out of 100. ${competencies.length ? `Your priority areas include ${[...competencies].sort((a,b)=>a.score-b.score).slice(0,2).map(item=>`${item.name}, ${item.score} out of 100`).join(' and ')}.` : ''} I can help you improve and prepare for your next attempt. We can create a personalized improvement plan based on your weak areas. Would you like to start now?`;
  const currentDialogue = customDialogue || (coachIntro ? introDialogue : defaultDialogueForStep[activeStep]);

  useEffect(() => {
    if (showCoachPopup && !isVoiceMuted) {
      const timer = setTimeout(() => {
        speakCoachText(currentDialogue);
      }, 350);
      return () => { clearTimeout(timer); stopCoachVoice(); };
    }
  }, [showCoachPopup, activeStep, coachIntro]);

  async function saveFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ratings: Record<string, number | string> = Object.fromEntries(
      feedbackQuestions.map(([key]) => [key, Number(form.get(key))])
    );
    if (recommend) ratings.recommendation_score = recommendation;
    if (comments.trim()) ratings.comments = comments.trim();
    setBusy(true);
    setError('');
    try {
      setSatisfaction(
        await api<CandidateSatisfaction>(
          `/api/interview/${encodeURIComponent(sessionId)}/evaluation/satisfaction`,
          json(ratings)
        )
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your feedback could not be saved. Please retry.');
    } finally {
      setBusy(false);
    }
  }

  if (rawScore == null) return <section className="s2-screen-wrapper"><h2>Assessment not available yet</h2><p>Your result will appear once processing is complete and the placement team releases it.</p><Link className="button secondary" to="/reports">Back to reports</Link></section>;
  return (
    <div className="s2-screen-wrapper">
      {/* Interview result heading */}
      <div className="s2-top-screen-indicator">
        <div className="s2-screen-badge">
          <span className="s2-screen-number">2</span>
          <span className="s2-screen-title">
            Interview Result
          </span>
        </div>
        <div className="s2-header-right">
          <span className="s2-company-text">
            <span className="s2-company-dot" />
            {companyName} · {roleTitle}
          </span>
        </div>
      </div>

      {/* Main Score Card with exact UI format & colors */}
      <section className="journey-card s2-main-card">
        {/* Card Header */}
        <div className="s2-header-row">
          <div className="s2-title-group">
            <h2>Interview Completed</h2>
            <p>Here is your overall performance in this interview.</p>
          </div>
        </div>

        {/* 2-Column Upper Grid: Semicircular Arc Gauge & Competency Breakdown */}
        <div className="s2-grid">
          {/* Left: Semicircular Speedometer Arc Gauge */}
          <div className="s2-gauge-box">
            <div className="s2-arc-gauge-container">
              <svg viewBox="0 0 200 200" className="s2-arc-gauge-svg" role="img" aria-label={`Overall interview score: ${overallScore} out of 100`}>
                <defs>
                  <linearGradient id="scorecardRedArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F87171" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                  <linearGradient id="scorecardGreenArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#34D399" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>
                {/* Background semicircle track */}
                <path
                  d="M 47 153 A 75 75 0 1 1 153 153"
                  fill="none"
                  stroke={overallScore < INSTITUTION_SCORE_THRESHOLD ? '#FEE2E2' : '#D1FAE5'}
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                {/* Progress semicircle arc */}
                <path
                  d="M 47 153 A 75 75 0 1 1 153 153"
                  fill="none"
                  stroke={overallScore < INSTITUTION_SCORE_THRESHOLD ? 'url(#scorecardRedArcGrad)' : 'url(#scorecardGreenArcGrad)'}
                  strokeWidth="14"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray="100"
                  strokeDashoffset={100 - overallScore}
                  className="s2-arc-gauge-progress"
                />
              </svg>
              <div className="s2-arc-gauge-center">
                <span className="s2-arc-score-num">{overallScore}</span>
                <span className="s2-arc-score-denom">/ 100</span>
              </div>
            </div>

            {/* Status Pill Badge under arc */}
            <div
              className={`s2-gauge-status-badge ${overallScore >= 75
                  ? 'status-ready'
                  : overallScore >= 60
                    ? 'status-moderate'
                    : 'status-needs-improvement'
                }`}
            >
              <AlertCircle size={15} />
              <span>
                {overallScore >= 75
                  ? 'Placement Ready'
                  : overallScore >= 60
                    ? 'Moderate Competency'
                    : 'Needs Improvement'}
              </span>
            </div>
          </div>

          {/* Right: Competency-wise Score */}
          <div className="s2-comp-section">
            <h3 className="s2-comp-title">Competency-wise Score</h3>
            {!allCompetencies.length && <p className="scorecard-empty-note">Detailed competency scores are not available for this assessment yet.</p>}
            <div className="s2-comp-rows-container">
              {allCompetencies.map((comp) => {
                const isHigh = comp.score !== null && comp.score >= 50;
                const pct = comp.score === null ? 0 : Math.round(comp.score);
                return (
                  <div key={comp.name} className="s2-comp-row-item" data-assessed={comp.score !== null}>
                    <div className="s2-comp-label-wrap">
                      <span className={`s2-comp-bullet-icon ${isHigh ? 'dot-green' : 'dot-coral'}`}>
                        {isHigh ? <Check size={11} strokeWidth={3} /> : <span className="s2-bullet-inner-dot" />}
                      </span>
                      <span className="s2-comp-text-name">{comp.name}</span>
                    </div>
                    <div className="s2-comp-bar-container">
                      <div className="s2-comp-bar-bg">
                        <div
                          className={`s2-comp-bar-fill ${isHigh ? 'bar-green' : 'bar-coral'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="s2-comp-val-label">
                        {comp.score === null ? 'Not assessed' : `${comp.score}/${comp.max}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Grid: 3 Stat Cards on Left, Motivational Action Box on Right */}
        <div className="s2-bottom-grid">
          {/* Left: 3 Stat Cards (Blue, Green, Purple) */}
          <div className="s2-metrics-cluster">
            {/* 1. Total Questions (Blue) */}
            <div className="s2-stat-card card-blue">
              <div className="s2-stat-icon-wrap icon-blue">
                <FileText size={17} />
              </div>
              <div className="s2-stat-content">
                <strong className="s2-stat-number">{totalQuestions}</strong>
                <span className="s2-stat-label">Total Questions</span>
              </div>
            </div>

            {/* 2. Answered (Green) */}
            <div className="s2-stat-card card-green">
              <div className="s2-stat-icon-wrap icon-green">
                <CheckCircle2 size={17} />
              </div>
              <div className="s2-stat-content">
                <strong className="s2-stat-number">{answeredQuestions}</strong>
                <span className="s2-stat-label">Answered</span>
              </div>
            </div>

            {/* 3. Not Attempted (Purple) */}
            <div className="s2-stat-card card-purple">
              <div className="s2-stat-icon-wrap icon-purple">
                <Clock size={17} />
              </div>
              <div className="s2-stat-content">
                <strong className="s2-stat-number">{notAttemptedQuestions}</strong>
                <span className="s2-stat-label">Not Attempted</span>
              </div>
            </div>
          </div>

          {/* Right: Motivational Action Card */}
          <div className="s2-action-box">
            <div className="s2-action-copy">
              <p className="s2-action-headline">
                {overallScore < INSTITUTION_SCORE_THRESHOLD
                  ? 'You have the potential to do better.'
                  : 'Strong Performance Demonstrated.'}
              </p>
              <p className="s2-action-subheadline">
                {overallScore < INSTITUTION_SCORE_THRESHOLD
                  ? "Let's work together and improve your performance."
                  : 'Continue practicing to maintain competitive placement readiness.'}
              </p>
            </div>
            <div className="s2-action-btn-row">
              <button
                type="button"
                className="s2-talk-coach-btn"
                onClick={() => {
                  stopCoachVoice();
                  navigate(coachCallPath(callParams.toString(), `/reports/${encodeURIComponent(sessionId)}`, {report_session_id:sessionId}));
                }}
              >
                Talk to AI Coach Now
              </button>
              <button
                type="button"
                className="s2-review-btn-secondary"
                onClick={() => setShowSatisfactionDrawer(!showSatisfactionDrawer)}
              >
                <MessageCircle size={13} />
                {showSatisfactionDrawer ? 'Hide Survey' : 'Share Feedback & Evidence'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          RECOMMENDED INTELLIGENT WORKFLOW: AI COACH AVATAR POP-UP SCREEN WINDOW
          Exact Light Theme Rectangle Window with 4-Step Pagination & Live Discussion
          ========================================================================= */}
      {showCoachPopup && (
        <div
          className="s3-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              stopCoachVoice();
              setShowCoachPopup(false);
            }
          }}
        >
          <div className={`s3-modal-card ${coachIntro ? 's3-reference-intro' : ''}`}>
            {/* Top Window Bar */}
            <div className="s3-top-window-bar">
              <div className="s3-top-title-group">
                <span className="s3-top-badge-box">3</span>
                <span className="s3-top-title-text">AI Coach Pop-up – Start Conversation</span>
              </div>
              <div className="s3-top-meta-group">
                <div className="s3-candidate-pill-badge">
                  <span className="s3-candidate-avatar-circle">{candidateInitial}</span>
                  <span className="s3-candidate-name-bold">{candidateName}</span>
                  <span className="s3-candidate-divider-slash">|</span>
                  <span className="s3-candidate-dept-sub">{candidateDept}</span>
                </div>
                <button
                  type="button"
                  className="s3-modal-close-icon-btn"
                  onClick={() => {
                    stopCoachVoice();
                    setShowCoachPopup(false);
                  }}
                  aria-label="Close AI Coach Window"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Window Body Grid: Left Avatar Card + Right Discussion & Schedule */}
            <div className="s3-window-body-grid">
              {/* Left Column: AI Coach Avatar Visual & Voice Controls */}
              <div className="s3-avatar-card-column">
                <div className="s3-avatar-portrait-frame">
                  <div className="s3-avatar-floating-badge">
                    <span className="s3-avatar-live-green-dot" />
                    Dr. Rajesh · AI Coach
                  </div>
                  <PlacementOfficerAvatar speaking={isCoachSpeaking} analyser={null} />
                </div>
                <div className="s3-avatar-bottom-voice-bar">
                  <div className="s3-avatar-voice-info">
                    <strong>Dr. Rajesh</strong>
                    <span>AI Placement Coach</span>
                  </div>
                  <button
                    type="button"
                    className="s3-audio-toggle-btn"
                    disabled={coachVoiceLoading}
                    onClick={() => {
                      if (isCoachSpeaking) {
                        stopCoachVoice();
                        setIsVoiceMuted(true);
                      } else {
                        setIsVoiceMuted(false);
                        void speakCoachText(currentDialogue, true);
                      }
                    }}
                    title={isCoachSpeaking ? 'Mute Coach Voice' : 'Play Coach Voice'}
                  >
                    {isCoachSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    <span>{coachVoiceLoading ? 'Preparing voice…' : isCoachSpeaking ? 'Mute' : 'Play voice'}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Title, Pagination, Dialogue, Schedule, Live Discussion */}
              <div className="s3-content-column">
                <div>
                  <h2 className="s3-coach-headline">Hi {studentFirstName}! I'm your AI Coach</h2>
                  <p className="s3-coach-subheadline">Personalized Placement Readiness Guidance</p>
                </div>
                {discussionError && <p role="alert" className="s3-voice-notice">{discussionError}</p>}
                {coachVoiceError && <div role="status" className="s3-voice-notice"><p>{coachVoiceError}</p><button type="button" className="s3-discussion-prompt-chip" disabled={coachVoiceLoading} onClick={() => { setIsVoiceMuted(false); void speakCoachText(currentDialogue, true); }}>Play voice / Retry</button></div>}

                {coachIntro && <div className="s3-intro-conversation">
                  <p>I've reviewed your {companyName} interview for {roleTitle}. Your score is <strong>{overallScore}/100</strong>. I can help you improve and prepare for your next attempt.</p>
                  <p>We will create a personalized improvement plan based on your weak areas. Would you like to start now?</p>
                  <div className="s3-intro-checklist"><h3>We will work on:</h3>{['Identify your weak areas', 'Provide learning resources', 'Create a daily practice schedule', 'Schedule re-attempt interviews', 'Track your progress'].map(item => <div key={item}><CheckCircle2 size={19} aria-hidden="true"/><span>{item}</span></div>)}</div>
                  <button type="button" className="s3-discussion-prompt-chip" onClick={() => { setCoachIntro(false); setActiveStep(1); setCustomDialogue(null); }}>Discuss my goals and availability</button>
                </div>}
                <div className="s3-detailed-conversation" hidden={coachIntro} aria-busy={discussionBusy}>
                {/* 4-Step Breadcrumbs Pagination */}
                <div className="s3-breadcrumbs-nav-row">
                  <button
                    type="button"
                    className={`s3-breadcrumb-btn ${activeStep === 1 ? 'active' : activeStep > 1 ? 'completed' : ''}`}
                    onClick={() => {
                      setActiveStep(1);
                      setCustomDialogue(null);
                    }}
                  >
                    1. Diagnosis
                  </button>
                  <span className="s3-breadcrumb-separator">›</span>
                  <button
                    type="button"
                    className={`s3-breadcrumb-btn ${activeStep === 2 ? 'active' : activeStep > 2 ? 'completed' : ''}`}
                    onClick={() => {
                      setActiveStep(2);
                      setCustomDialogue(null);
                    }}
                  >
                    2. Goals &amp; Availability
                  </button>
                  <span className="s3-breadcrumb-separator">›</span>
                  <button
                    type="button"
                    className={`s3-breadcrumb-btn ${activeStep === 3 ? 'active' : activeStep > 3 ? 'completed' : ''}`}
                    onClick={() => {
                      setActiveStep(3);
                      setCustomDialogue(null);
                    }}
                  >
                    3. Focus Areas
                  </button>
                  <span className="s3-breadcrumb-separator">›</span>
                  <button
                    type="button"
                    className={`s3-breadcrumb-btn ${activeStep === 4 ? 'active' : ''}`}
                    onClick={() => {
                      setActiveStep(4);
                      setCustomDialogue(null);
                    }}
                  >
                    4. Daily Schedule
                  </button>
                </div>

                {/* Dr. Rajesh's discussion */}
                <div className="s3-dialogue-speech-box">
                  {activeStep === 4 && !customDialogue ? (
                    <>
                      Here is your <span className="s3-dialogue-highlight-amber">Personalized Daily Learning Schedule</span>!
                      I've structured your roadmap with daily technical exercises, communication drills, and simulated mock interviews.
                    </>
                  ) : (
                    <span>{currentDialogue}</span>
                  )}
                </div>

                {/* Step 4: Exact Daily Learning Schedule Card */}
                {activeStep === 4 && (
                  <div className="s3-schedule-container-card">
                    {/* Days Tabs Row: Day 1-3, Day 4-7, Day 8-10, Day 11-13, Day 14 */}
                    <div className="s3-days-tabs-list">
                      {['1-3', '4-7', '8-10', '11-13', '14'].map((day) => (
                        <button
                          key={day}
                          type="button"
                          className={`s3-day-pill-tab ${activeScheduleDay === day ? 'active' : ''}`}
                          onClick={() => setActiveScheduleDay(day)}
                        >
                          {day === '14' ? 'Day 14' : `Day ${day}`}
                        </button>
                      ))}
                    </div>

                    {/* Track Subheading */}
                    <div className="s3-track-heading-text">{currentDayPlan.track}</div>

                    {/* 3 Activity Items with Colored Pills */}
                    <div className="s3-schedule-tags-stack">
                      <div className="s3-schedule-tag-row">
                        <span className="s3-badge-pill topic">TOPIC RESOURCE</span>
                        <span>{currentDayPlan.topic}</span>
                      </div>
                      <div className="s3-schedule-tag-row">
                        <span className="s3-badge-pill technical">TECHNICAL EXERCISE</span>
                        <span>{currentDayPlan.technical}</span>
                      </div>
                      <div className="s3-schedule-tag-row">
                        <span className="s3-badge-pill communication">COMMUNICATION</span>
                        <span>{currentDayPlan.communication}</span>
                      </div>
                    </div>

                    {/* Metrics Summary Bar */}
                    <div className="s3-metrics-summary-bar">
                      <span>14 Days Total</span>
                      <span>·</span>
                      <span>28 Hours Paced</span>
                      <span>·</span>
                      <span>4 Weak Areas Mastered</span>
                      <span>·</span>
                      <span>Target: 85%+</span>
                    </div>
                  </div>
                )}

                {/* Step 1: Diagnosis Breakdown Card */}
                {activeStep === 1 && (
                  <div className="s3-diag-summary-card">
                    <div className="s3-diag-header">
                      <span>Identified Competency Gap Breakdown</span>
                      <span className="s3-threshold-tag">Threshold: {INSTITUTION_SCORE_THRESHOLD}/100</span>
                    </div>
                    <div className="s3-comp-pills-row">
                      {competencies.map((comp) => {
                        const isWeak = comp.score < 50;
                        return (
                          <span
                            key={comp.name}
                            className={`s3-pill-item ${isWeak ? 'weak' : 'strong'}`}
                            onClick={() =>
                              handleDiscussionPrompt(
                                `How can I improve my ${comp.name} score from ${comp.score}/100?`
                              )
                            }
                            style={{ cursor: 'pointer' }}
                            title="Click to ask Dr. Rajesh about this competency"
                          >
                            {isWeak ? <AlertCircle size={13} /> : <Check size={13} />}
                            {comp.name} ({comp.score}/100)
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step 2: Goals & Availability Selection Card */}
                {activeStep === 2 && (
                  <div className="s3-step-section">
                    <span className="s3-step-label">Select Daily Study Availability</span>
                    <div className="s3-goal-chips-row">
                      {[
                        { id: '1h', label: '⏱️ 1h / day (Standard)' },
                        { id: '2h', label: '⏱️ 2h / day (Recommended - Paced)' },
                        { id: '3h', label: '⏱️ 3h / day (Intensive Sprint)' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={`s3-goal-chip ${selectedDailyTime === t.id ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedDailyTime(t.id);
                            handleDiscussionPrompt(`I selected ${t.label}. How does this shape my daily schedule?`);
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <span className="s3-step-label" style={{ marginTop: '6px' }}>Target Preparation Timeline</span>
                    <div className="s3-goal-chips-row">
                      {[
                        { id: '7 Days', label: '📅 7 Days (Fast-Track)' },
                        { id: '14 Days', label: '📅 14 Days (Balanced Masterclass)' },
                        { id: '30 Days', label: '📅 30 Days (Comprehensive)' },
                      ].map((tm) => (
                        <button
                          key={tm.id}
                          type="button"
                          className={`s3-goal-chip ${selectedTimeline === tm.id ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedTimeline(tm.id);
                            handleDiscussionPrompt(`I want to prepare in ${tm.id}. What is the milestone goal?`);
                          }}
                        >
                          {tm.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: 4 Focus Pillars Card */}
                {activeStep === 3 && (
                  <div className="s3-curriculum-grid">
                    <div className="s3-curriculum-card">
                      <div className="s3-curriculum-icon-wrap icon-blue">
                        <Code2 size={16} />
                      </div>
                      <div className="s3-curriculum-content">
                        <strong>Topic-based Resources</strong>
                        <span>System architecture, memory hierarchies, and database indexing patterns</span>
                      </div>
                    </div>
                    <div className="s3-curriculum-card">
                      <div className="s3-curriculum-icon-wrap icon-purple">
                        <Brain size={16} />
                      </div>
                      <div className="s3-curriculum-content">
                        <strong>Technical Exercises</strong>
                        <span>Hands-on coding challenges &amp; algorithmic edge-case drills</span>
                      </div>
                    </div>
                    <div className="s3-curriculum-card">
                      <div className="s3-curriculum-icon-wrap icon-green">
                        <MessageSquare size={16} />
                      </div>
                      <div className="s3-curriculum-content">
                        <strong>Communication Practice</strong>
                        <span>Spoken technical trade-offs &amp; structured STAR method delivery</span>
                      </div>
                    </div>
                    <div className="s3-curriculum-card">
                      <div className="s3-curriculum-icon-wrap icon-amber">
                        <Target size={16} />
                      </div>
                      <div className="s3-curriculum-content">
                        <strong>Mock Re-attempts</strong>
                        <span>Scheduled simulation checkpoints to verify placement readiness target</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Discussion with student regarding schedule and improvement plan */}
                <div className="s3-live-discussion-card">
                  <div className="s3-live-discussion-header">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={14} style={{ color: '#2563eb' }} />
                      Live Discussion with Dr. Rajesh
                    </span>
                    <span className="s3-live-indicator-tag">● Live Discussion</span>
                  </div>

                  {/* Interactive Quick Prompts Chips */}
                  <div className="s3-discussion-prompts-row">
                    <button
                      type="button"
                      className="s3-discussion-prompt-chip"
                      onClick={() => handleDiscussionPrompt('How does this schedule reach 85%?')}
                    >
                      💬 How does this reach 85%?
                    </button>
                    <button
                      type="button"
                      className="s3-discussion-prompt-chip"
                      onClick={() => handleDiscussionPrompt('Can I adjust for weekends?')}
                    >
                      ⏱️ Adjust for weekends?
                    </button>
                    <button
                      type="button"
                      className="s3-discussion-prompt-chip"
                      onClick={() => handleDiscussionPrompt('How to practice communication trade-offs?')}
                    >
                      🎙️ Communication practice
                    </button>
                    <button
                      type="button"
                      className="s3-discussion-prompt-chip"
                      onClick={() => handleDiscussionPrompt('When should I schedule the re-attempt?')}
                    >
                      🎯 Re-attempt milestone
                    </button>
                  </div>

                  {/* Discussion grounded in this report's company, frozen JD and assessment. */}
                  <form
                    className="s3-discussion-input-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (discussionInput.trim()) {
                        void handleDiscussionPrompt(discussionInput.trim()).then(sent=>{if(sent)setDiscussionInput('');});
                      }
                    }}
                  >
                    <input
                      type="text"
                      className="s3-discussion-text-input"
                      placeholder="Ask Dr. Rajesh about your schedule, topics, or improvement plan…"
                      value={discussionInput}
                      onChange={(e) => setDiscussionInput(e.target.value)}
                    />
                    <button type="submit" className="s3-discussion-send-btn" disabled={discussionBusy}>
                      {discussionBusy ? "Reviewing your report…" : "Ask Dr. Rajesh →"}
                    </button>
                  </form>
                </div>

                </div>
                {/* Bottom Action Buttons: Save & Start Day 1 Learning Plan -> and Re-adjust Goals */}
                <div className="s3-bottom-actions-row">
                  {!coachIntro && <Link className="s3-btn-readjust" to={coachCallPath(callParams.toString(), `/reports/${encodeURIComponent(sessionId)}`, {report_session_id:sessionId})} onClick={() => { stopCoachVoice(); setShowCoachPopup(false); }}><PhoneCall size={16} /> Call AI Coach Now</Link>}
                  <button
                    type="button"
                    disabled={openingPlan || !callDriveId}
                    className="s3-btn-start-plan"
                    onClick={async () => {
                      setOpeningPlan(true);
                      setPlanError('');
                      try {
                        await api(`/api/student/coach/improvement-journey?drive_id=${encodeURIComponent(callDriveId)}`);
                        stopCoachVoice();
                        setShowCoachPopup(false);
                        navigate(`/placement/plan?${callParams.toString()}`);
                      } catch (cause) {
                        setPlanError(cause instanceof ApiError && [404,405].includes(cause.status)
                          ? 'Your interview report is available, but the improvement journey service is not enabled on this server yet. Please contact support. You can keep reviewing your results here.'
                          : cause instanceof Error ? cause.message : 'Your plan could not be opened. Please try again.');
                      } finally { setOpeningPlan(false); }
                    }}
                  >
                    {openingPlan ? 'Opening your plan…' : !callDriveId ? 'Waiting for placement drive…' : coachIntro ? "Let's Start My Improvement Plan" : 'Open My Learning Plan'} <ArrowRight size={15} />
                  </button>

                  <button
                    type="button"
                    className="s3-btn-readjust"
                    onClick={() => {
                      if (coachIntro) { stopCoachVoice(); setShowCoachPopup(false); return; }
                      setActiveStep(2);
                      setCustomDialogue(null);
                    }}
                  >
                    {coachIntro ? 'Maybe Later' : 'Re-adjust Goals'}
                  </button>
                </div>
                {planError && <p role="alert" className="s3-voice-notice">{planError}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          COLLAPSIBLE CANDIDATE SATISFACTION SURVEY & DETAILED EVIDENCE
          ========================================================================= */}
      {showSatisfactionDrawer && (
        <section className="scorecard-satisfaction-panel">
          <div className="satisfaction-panel-header">
            <span className="feedback-section-icon" aria-hidden="true"><MessageCircle size={23}/></span>
            <div className="feedback-heading-copy"><span className="feedback-eyebrow">YOUR INTERVIEW EXPERIENCE</span>
            <h3>
              Candidate Interview Satisfaction &amp; Feedback
            </h3>
            <p>Help us improve interview fairness, relevance, and quality.</p></div>
            <span className="feedback-completion" aria-live="polite">{feedbackQuestions.filter(([key])=>feedbackRatings[key]!=null).length}/{feedbackQuestions.length} rated</span>
          </div>

          <form onSubmit={saveFeedback} className="satisfaction-panel-form">
            <div className="feedback-survey-grid">
              {feedbackQuestions.map(([key, label], index) => (
                <fieldset key={key} className="feedback-rating-question">
                  <legend>
                    <span className="feedback-question-number">{index + 1}</span><span>{label}</span>
                  </legend>
                  <div className="feedback-star-options">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label key={n} className={n <= (feedbackRatings[key] ?? 0) ? 'feedback-star-selected' : ''}>
                        <input
                          type="radio"
                          name={key}
                          value={n}
                          required
                          checked={feedbackRatings[key] === n}
                          onChange={() => setFeedbackRatings((prev) => ({ ...prev, [key]: n }))}
                          aria-label={`${n} out of 5: ${['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'][n-1]}`}
                        />
                        <Star size={20} />
                        <small>{n}</small>
                      </label>
                    ))}
                  </div>
                  <div className="feedback-scale-labels" aria-hidden="true"><span>Strongly disagree</span><span>Strongly agree</span></div>
                </fieldset>
              ))}
            </div>

            <div className="feedback-recommend-section"><label className="feedback-recommend-toggle">
              <input
                type="checkbox"
                checked={recommend}
                onChange={(e) => setRecommend(e.target.checked)}
              />{' '}
              <span>Would you recommend this experience?<small>Add an optional recommendation rating.</small></span>
            </label>

            {recommend && (
              <label className="feedback-recommend-range">
                How likely are you to recommend this interview? <output>{recommendation}/10</output>
                <input
                  aria-label="Recommendation rating"
                  type="range"
                  min="0"
                  max="10"
                  value={recommendation}
                  onChange={(e) => setRecommendation(Number(e.target.value))}
                />
              </label>
            )}
            </div>

            <label className="feedback-comments">
              <span>Anything else you'd like us to know? <small>Optional</small></span>
              <textarea
                maxLength={500}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Share your thoughts on the question relevance or coach timing…"
              />
              <small className="feedback-character-count">{comments.length}/500 characters</small>
            </label>

            {error && <p role="alert" className="feedback-error">{error}</p>}
            <div className="feedback-form-footer"><span className="feedback-required-note">Rate all {feedbackQuestions.length} statements before submitting.</span>
            <button type="submit" className="button primary" disabled={busy}>
              {busy ? 'Saving feedback…' : satisfaction ? 'Update feedback' : 'Submit feedback'} <ArrowRight size={16}/>
            </button>
            </div>
            {satisfaction && <p role="status" className="feedback-success"><CheckCircle2 size={17}/> Feedback saved successfully. Thank you for sharing.</p>}
          </form>
        </section>
      )}
    </div>
  );
}
