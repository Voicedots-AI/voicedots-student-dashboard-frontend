import {ReferenceScorecard} from './ReferenceScorecard';
import { useState, type FormEvent } from 'react';
import { MessageCircle, Star } from 'lucide-react';
export type CandidateSatisfaction = {score:number;label:string;ratings:Record<string,number>;submitted_at:string;method:string;recommendation_score?:number|null;comments?:string};
export type ScorecardView = {candidate_info?:{full_name?:string;program?:string;department?:string;year_of_study?:string;graduation_year?:number};target_role?:string;session_id?:string;assessment_date?:string;readiness_score?:number|null;duration_seconds?:number|null;strengths?:Array<string|{text?:string}>;priority_improvement_areas?:Array<{focus?:string;problem?:string;actions?:string[]}>;question_reviews?:Array<{question?:string;answer?:string;score?:number|null;seconds?:number|null}>;role_targets?:Record<string,number>;employer_follow_up?:string[];status?:string;candidate_satisfaction?:CandidateSatisfaction;overall_score?:number|null;readiness?:string;executive_summary?:string;score_breakdown?:Record<string,number|null>;core_dimensions?:{dimension:string;percentage?:number|null;role_target?:number|null;reason?:string;rationale?:string}[];domain_dimensions?:{dimension:string;percentage?:number|null;role_target?:number|null;reason?:string;rationale?:string}[]};
const humanize=(value:string)=>value.replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase());
import './scorecard.css';

const feedbackQuestions=[['question_relevance','The questions were relevant to my role.'],['conversation_quality','The conversation felt natural and clear.'],['assessment_fairness','The assessment felt fair.'],['feedback_usefulness','The feedback is useful for my next steps.'],['audio_experience','The audio and response timing worked well.'],['overall_experience','Overall, I was satisfied with the interview.']] as const;

function evidenceTopic(value: unknown) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "—";
  if (text.split(/\s+/).length <= 3) return text;
  if (/\breporting a bug\b/i.test(text)) return "Reporting a bug";
  const topic = text.match(/\b(?:bug[- ]report(?: fields| explanation)?|regression (?:testing|checks|ordering)|personal (?:task|example|positioning)|automation tools|fillers and self-corrections|boundary[- ]value (?:inputs|analysis)|boundary values|defect[- ]tracking|reporting defects|testing knowledge|testing serves quality|software testing|supporting evidence|quality assurance|testing steps|project architecture|SQL (?:query|optimisation|optimization)|teamwork examples?|expected (?:versus|vs\.?) actual|role awareness|failed inputs?)\b/i)?.[0];
  if (topic) return topic.charAt(0).toUpperCase() + topic.slice(1);
  const words = text.replace(/[.,;:!?]/g, "").split(/\s+/).filter(word => !/^(the|a|an|candidate|answers?|is|are|was|were|has|have|had|some|there|this|that|of|to|in|on|and|or|but|for|with|by|as|it|their|they|gives?|shows?|demonstrates?|provides?|appears?|generally|how|did|do|you|your|what|would|can|could)$/i.test(word));
  return words.slice(0, 3).join(" ") || text.split(/\s+/).slice(0, 3).join(" ");
}


export function SharedScorecard({view,onSaveFeedback,photo}:{view:ScorecardView;photo?:string;onSaveFeedback?:(ratings:Record<string,number|string>)=>Promise<CandidateSatisfaction>}) {
  const [satisfaction,setSatisfaction]=useState(view.candidate_satisfaction);
  const [feedbackRatings,setFeedbackRatings]=useState<Record<string,number>>(satisfaction?.ratings??{});
  const [recommend,setRecommend]=useState(satisfaction?.recommendation_score!=null);
  const [recommendation,setRecommendation]=useState(satisfaction?.recommendation_score??5);
  const [comments,setComments]=useState(satisfaction?.comments??'');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const canonicalDimensions=[...(view.core_dimensions||[]),...(view.domain_dimensions||[])].filter((item,index,all)=>all.findIndex(other=>other.dimension===item.dimension)===index);
  const dimensions:Array<[string,number|null]>=canonicalDimensions.some(item=>item.percentage!==undefined)?canonicalDimensions.map(item=>[item.dimension,item.percentage??null]):Object.entries(view.score_breakdown||{});
  const reasons=new Map([...(view.core_dimensions||[]),...(view.domain_dimensions||[])].map(d=>[d.dimension.toLowerCase().replaceAll(' ','_'),d.reason||d.rationale]));
  const points=view.overall_score;
  async function saveFeedback(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!onSaveFeedback)return;const form=new FormData(event.currentTarget);
    const ratings:Record<string,number|string>=Object.fromEntries(feedbackQuestions.map(([key])=>[key,Number(form.get(key))]));
    if(recommend)ratings.recommendation_score=recommendation;
    if(comments.trim())ratings.comments=comments.trim();
    setBusy(true);setError('');
    try {setSatisfaction(await onSaveFeedback(ratings));}
    catch(cause){setError(cause instanceof Error?cause.message:'Your feedback could not be saved. Please retry.');}
    finally{setBusy(false);}
  }
  const competencies=dimensions.map(([label,value])=>({label:humanize(label),score:value,target:canonicalDimensions.find(item=>item.dimension===label)?.role_target??view.role_targets?.[label]??null,evidence:evidenceTopic(reasons.get(label.toLowerCase().replaceAll(' ','_')))}));
  const identity=view.candidate_info;
  return <div className="uniform-scorecard">
   <ReferenceScorecard student={{full_name:identity?.full_name,program:identity?.program,department_code:identity?.department,year_of_study:identity?.year_of_study,graduation_year:identity?.graduation_year}} studentId={view.session_id||'student'} candidatePhoto={photo?{studentId:view.session_id||'student',url:photo}:undefined} role={view.target_role} report={{overall_score:points,session_id:view.session_id,completed_at:view.assessment_date}} recordingDuration={view.duration_seconds} questionCount={view.question_reviews?.length||0} executiveSummary={view.executive_summary} readinessLabel={view.readiness?humanize(view.readiness):'Not assessed'} competencyRows={competencies} strengthBriefs={(view.strengths||[]).map(item=>typeof item==='string'?item:item.text||'').filter(Boolean)} growthBriefs={(view.priority_improvement_areas||[]).map(item=>item.focus||item.problem||'').filter(Boolean)} followUpBriefs={view.employer_follow_up||[]} evidenceHighlights={(view.question_reviews||[]).slice(0,3).map((item,index)=>({key:String(index),offset:item.seconds??null,timestamp:item.seconds==null?'—':`${Math.floor(item.seconds/60)}:${String(Math.floor(item.seconds%60)).padStart(2,'0')}`,question:item.question||'Interview question',score:item.score==null?'—':`${item.score}/100`}))}/>
   <section className="assessment-scorecard scorecard-feedback">
<aside className="scorecard-sidebar"><section className="scorecard-card scorecard-satisfaction"><h3><MessageCircle size={20}/> Candidate Satisfaction Score</h3><p>How you experienced the AI interview</p><div className="satisfaction-value"><strong>{satisfaction?`${satisfaction.score}/100`:'Not collected'}</strong>{satisfaction&&<span>{satisfaction.label}</span>}</div>{satisfaction&&<progress max="100" value={satisfaction.score} aria-label="Candidate satisfaction score"/>}<p className="scorecard-note">Measured from six post-interview feedback questions. This does not affect your competency score.</p>{onSaveFeedback&&<details className="satisfaction-form"><summary>{satisfaction?'Update your feedback':'Share interview feedback'}</summary><form onSubmit={saveFeedback}><p>1 = Strongly disagree · 5 = Strongly agree</p><div className="feedback-survey-grid">{feedbackQuestions.map(([key,label],index)=><fieldset key={key} className="feedback-rating-question"><legend>{index+1}. {label}</legend><div className="feedback-star-options">{[1,2,3,4,5].map(n=><label key={n} className={n<=(feedbackRatings[key]??0)?'feedback-star-selected':''}><input type="radio" name={key} value={n} required checked={feedbackRatings[key]===n} onChange={()=>setFeedbackRatings(previous=>({...previous,[key]:n}))} aria-label={`${n} out of 5`}/><Star size={23}/><small>{n}</small></label>)}</div><span className="scorecard-note">Strongly disagree → Strongly agree</span></fieldset>)}</div><label className="feedback-recommend-toggle"><input type="checkbox" checked={recommend} onChange={e=>setRecommend(e.target.checked)}/> Include a recommendation rating (optional)</label><label>How likely are you to recommend this interview? <output>{recommend?`${recommendation}/10`:'Not selected'}</output><input aria-label="Recommendation rating" type="range" min="0" max="10" disabled={!recommend} value={recommendation} onChange={e=>setRecommendation(Number(e.target.value))}/></label><label>Additional comments (optional)<textarea maxLength={500} value={comments} onChange={e=>setComments(e.target.value)} placeholder="Share your thoughts or suggestions…"/><small>{comments.length}/500</small></label>{error&&<p role="alert">{error}</p>}<button className="button primary" disabled={busy}>{busy?'Saving…':'Save feedback'}</button>{satisfaction&&<p role="status">Your feedback is saved.</p>}</form></details>}</section></aside></section></div>;
}
