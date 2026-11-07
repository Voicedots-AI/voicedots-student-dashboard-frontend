import {useId, useState, type ReactNode} from 'react';
import {ImprovementJourneyChart} from './improvement-journey-chart';
import './journey-review.css';

type Fact = Record<string, unknown>;
export type SavedJourney = {
 id:string; student_name:string; drive_id:string; company_name?:string; role_title?:string;
 interview_result?:Fact; questions?:Fact[]; coach_popup?:Fact;
 improvement_plan?:{focus_areas?:unknown[];weekly_roadmap?:unknown[];target_role?:string;target_score?:number;score?:number};
 daily_schedule?:Fact[]; weekly_metrics?:Fact; learning_resources?:{syllabus_topics?:unknown[];question_bank?:unknown[]};
 reattempt_plan?:Fact[];progress_tracking?:Fact;placement_readiness?:Fact;data_status?:string;
};
export const JOURNEY_SCREENS = ['AI Avatar Interview','Interview Result','AI Coach','Personalized Improvement Plan','Daily Learning Schedule','Learning Resources & Practice Questions','Interview Re-attempt Scheduling','Progress Tracking & Trajectory','Placement Readiness'] as const;
const object=(value:unknown):Fact=>value&&typeof value==='object'&&!Array.isArray(value)?value as Fact:{};
const list=(value:unknown):unknown[]=>Array.isArray(value)?value:[];
const text=(value:unknown):string=>typeof value==='string'?value:typeof value==='number'&&Number.isFinite(value)?String(value):'';
const number=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value:null;
const title=(row:Fact)=>text(row.title)||text(row.name)||text(row.topic)||text(row.skill)||text(row.focus)||text(row.activity)||text(row.question)||text(row.question_text)||text(row.area)||text(row.company_name);
const score=(value:unknown,max=100)=>{const n=number(value);return n===null?'Not assessed':`${n}/${max}`};
function Empty({children}:{children:ReactNode}){return <p className="jr-empty">{children}</p>}
function Panel({heading,children}:{heading:string;children:ReactNode}){return <section className="jr-panel"><h3>{heading}</h3>{children}</section>}
function Cards({items,empty}:{items:unknown[];empty:string}){
 if(!items.length)return <Empty>{empty}</Empty>;
 return <div className="jr-items">{items.map((value,index)=>{const row=object(value);const label=typeof value==='string'?value:title(row);return <article key={text(row.id)||index}>
  <h4>{label||`Item ${index+1}`}</h4>
  {['description','objective','success_check','summary','feedback','answer','reason','status','priority','duration','time','date_label','scheduled_at','date','url'].map(key=>text(row[key])&&<p key={key}><span className="jr-detail-label">{key.replaceAll('_',' ')}: </span>{text(row[key])}</p>)}
  {['topics','activities','tasks','resources','recommended_steps'].map(key=>list(row[key]).length>0&&<div key={key}><p className="jr-detail-label">{key.replaceAll('_',' ')}</p><Cards items={list(row[key])} empty=""/></div>)}
 </article>})}</div>
}
function Competencies({items}:{items:unknown[]}){return items.length?<div className="jr-competencies">{items.map((item,index)=>{const row=object(item),value=number(row.percentage??row.score),max=number(row.max)||100;return <div key={index}><span>{text(row.name)||text(row.skill)||'Competency'}</span><strong>{score(value,max)}</strong><meter min={0} max={max} value={value??0} aria-label={text(row.name)||'Competency'} aria-valuetext={value===null?'Not assessed':`${value} out of ${max}`}/></div>})}</div>:<Empty>No competency assessment has been saved for this drive.</Empty>}
function Stat({label,value}:{label:string;value:string}){return <div className="jr-stat"><span>{label}</span><strong>{value}</strong></div>}

/** Shared by both portals. This component receives saved facts and has no API or student actions. */
export function JourneyReview({journey,studentName,companyName,roleTitle,initialScreen=2}:{journey:SavedJourney|null;studentName:string;companyName?:string;roleTitle?:string;initialScreen?:number}){
 const [screen,setScreen]=useState(initialScreen),id=useId();
 const result=journey?.interview_result||{},tracking=journey?.progress_tracking||{},ready=journey?.placement_readiness||{};
 const tasks=journey?.daily_schedule||[],attempts=journey?.reattempt_plan||[],stats=object(result.question_stats),coach=journey?.coach_popup||{};
 const trajectory=list(tracking.trajectory_points).flatMap(value=>{const point=object(value);const overall=number(point.overall),technical=number(point.technical),communication=number(point.communication);return overall!==null&&technical!==null&&communication!==null?[{milestone:text(point.milestone),date:text(point.date),overall,technical,communication}]:[]});
 const questions=list(result.submitted_answers).length?list(result.submitted_answers):journey?.questions||[];
 return <div className="journey-review">
  <header className="jr-heading"><div><p className="jr-eyebrow">PLACEMENT JOURNEY · SAVED PROGRESS</p><h1>{studentName}</h1><p>{companyName||journey?.company_name||'Placement drive'} · {roleTitle||journey?.role_title||'Role not supplied'}</p></div><span className="jr-view-badge">Read-only view</span></header>
  <nav className="jr-nav" aria-label="Journey screens">{JOURNEY_SCREENS.map((name,index)=><button key={name} type="button" aria-current={screen===index+1?'step':undefined} aria-controls={`${id}-screen`} onClick={()=>setScreen(index+1)}><span>{index+1}</span>{name}</button>)}</nav>
  <section className="jr-screen" id={`${id}-screen`} aria-labelledby={`${id}-heading`} tabIndex={-1}>
   <div className="jr-screen-heading"><span>{screen}</span><h2 id={`${id}-heading`}>{JOURNEY_SCREENS[screen-1]}</h2></div>
   {!journey?<Empty>No saved improvement journey is available for this student and drive. This view does not create or change student records.</Empty>:<>
    {screen===1&&<><div className="jr-stats"><Stat label="Assessment date" value={text(result.assessment_date)||'Not recorded'}/><Stat label="Questions" value={text(stats.total)||'Not recorded'}/><Stat label="Answered" value={text(stats.answered)||'Not recorded'}/></div><Panel heading="Saved interview questions and answers"><Cards items={questions} empty="No interview questions or answers have been saved in this journey."/></Panel><Panel heading="Interview transcript"><Cards items={list(result.transcript).map(value=>{const row=object(value);return {...row,title:row.speaker,description:row.text}})} empty="No transcript has been saved in this journey."/></Panel></>}
    {screen===2&&<><div className="jr-stats"><Stat label="Interview score" value={score(result.overall_score,number(result.max_score)||100)}/><Stat label="Assessment status" value={text(result.status_label)||'Not recorded'}/></div><Panel heading="Competency analysis"><Competencies items={list(result.competencies)}/></Panel><Panel heading="Answer feedback"><Cards items={list(result.submitted_answers)} empty="No answer feedback has been saved."/></Panel></>}
    {screen===3&&<><Panel heading="AI Coach recommendation">{text(coach.message)||text(coach.summary)?<p>{text(coach.message)||text(coach.summary)}</p>:<Empty>No coach recommendation has been saved for this drive.</Empty>}<Cards items={list(coach.recommendations).length?list(coach.recommendations):list(coach.focus_areas)} empty="No saved coaching focus areas."/></Panel><p className="jr-notice">The student starts coaching in their own portal. Viewing this screen does not start a call.</p></>}
    {screen===4&&<><div className="jr-stats"><Stat label="Target role" value={journey.improvement_plan?.target_role||journey.role_title||'Not recorded'}/><Stat label="Target score" value={score(journey.improvement_plan?.target_score)}/></div><Panel heading="My Improvement Plan"><Cards items={journey.improvement_plan?.focus_areas||[]} empty="No personalized focus areas have been saved yet."/></Panel><Panel heading="Weekly roadmap"><Cards items={journey.improvement_plan?.weekly_roadmap||[]} empty="No weekly roadmap has been saved yet."/></Panel></>}
    {screen===5&&<><Panel heading="Daily AI Coaching Schedule">{tasks.length?<div className="jr-table-wrap"><table><thead><tr><th>Day / date</th><th>Time</th><th>Activity</th><th>Status</th></tr></thead><tbody>{tasks.map((task,index)=><tr key={text(task.id)||index}><td>{text(task.date_label)||text(task.date)||'Not scheduled'}</td><td>{text(task.time)||'Not set'}</td><td>{text(task.activity)||title(task)||'Learning activity'}</td><td><span className="jr-status">{text(task.status)||'Not recorded'}</span></td></tr>)}</tbody></table></div>:<Empty>No daily learning schedule has been saved yet.</Empty>}</Panel><Panel heading="Weekly goals"><Cards items={list(journey.weekly_metrics?.goals)} empty="No weekly goals have been saved."/></Panel></>}
    {screen===6&&<div className="jr-two-col"><Panel heading="Learning resources"><Cards items={journey.learning_resources?.syllabus_topics||[]} empty="No learning resources have been saved for this drive."/></Panel><Panel heading="Practice questions"><Cards items={journey.learning_resources?.question_bank||[]} empty="No practice questions have been saved for this drive."/></Panel></div>}
    {screen===7&&<Panel heading="Interview Re-attempt Scheduling">{attempts.length?<div className="jr-table-wrap"><table><thead><tr><th>Attempt</th><th>Date</th><th>Status</th><th>Score</th></tr></thead><tbody>{attempts.map((attempt,index)=><tr key={index}><td>{text(attempt.attempt_number)||'Not recorded'}</td><td>{text(attempt.date)||'Not scheduled'}</td><td>{text(attempt.status)||'Not recorded'}</td><td>{score(attempt.score)}</td></tr>)}</tbody></table></div>:<Empty>No re-attempt schedule has been saved. Scheduling remains available in the student portal.</Empty>}</Panel>}
    {screen===8&&<><div className="jr-stats"><Stat label="Plan completion" value={number(tracking.plan_completed_percent)===null?'Not recorded':`${tracking.plan_completed_percent}%`}/><Stat label="Modules completed" value={number(tracking.modules_total)?`${text(tracking.modules_completed)} / ${text(tracking.modules_total)}`:'No modules recorded'}/></div><ImprovementJourneyChart points={trajectory} onReport={()=>setScreen(2)}/><Panel heading="Daily Progress & Performance Tracking"><Cards items={list(tracking.daily_progress).length?list(tracking.daily_progress):list(tracking.history)} empty="No dated progress history has been saved in this journey."/></Panel><Panel heading="Saved learning activity"><Cards items={tasks} empty="No learning activity has been saved."/></Panel></>}
    {screen===9&&<><div className="jr-stats"><Stat label="Placement readiness score" value={score(ready.overall_score)}/><Stat label="Status" value={text(ready.status_label)||'Not assessed'}/></div><Panel heading="Placement Readiness Dashboard"><Competencies items={list(ready.competencies)}/></Panel><div className="jr-two-col"><Panel heading="Recommended next steps"><Cards items={list(ready.recommended_steps)} empty="No recommended steps have been saved."/></Panel><Panel heading="Target drives"><Cards items={list(ready.target_drives)} empty="No target drives have been saved."/></Panel></div><p className="jr-notice">{text(ready.advisory_notice)||'Readiness is preparation guidance and does not determine placement eligibility.'}</p></>}
   </>}
  </section>
  <footer className="jr-pagination"><button type="button" disabled={screen===1} onClick={()=>setScreen(value=>value-1)}>← Previous screen</button><span>Screen {screen} of 9</span><button type="button" disabled={screen===9} onClick={()=>setScreen(value=>value+1)}>Next screen →</button></footer>
 </div>
}
