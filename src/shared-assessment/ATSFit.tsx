import {useState,type ReactNode} from 'react';
import {BarChart3,CheckCircle2,FileText,Info} from 'lucide-react';
import './assessment.css';
type Row=Record<string,unknown>;
export type AssessmentStudent={full_name?:string;email?:string;program?:string;department_code?:string;cgpa?:number|null;graduation_year?:number|null};
const obj=(value:unknown):Row=>value&&typeof value==='object'&&!Array.isArray(value)?value as Row:{};
const rows=(value:unknown):Row[]=>Array.isArray(value)?value.map(obj):[];
const text=(value:unknown,fallback='—')=>value===null||value===undefined||value===''?fallback:String(value);
const numeric=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value:null;
const sections=[['education','Education'],['technical_skills','Technical skills'],['internship','Experience & internships'],['projects','Projects'],['certifications','Certifications']];
const match=(row:Row)=>({FULL_MATCH:'Strong',RELATED_EVIDENCE:'Good',WEAK_OR_INFERRED:'Partial',NO_EVIDENCE:'Missing',NOT_ASSESSED:'Not assessed'}[text(row.match_status)]||text(row.match_status,'Not assessed'));
export function SharedATSFit({data,student,actions}:{data:Row;student:AssessmentStudent;actions?:ReactNode}){
 const [query,setQuery]=useState(''),[importance,setImportance]=useState('all');
 const score=numeric(data.ats_fit_score),evaluated=data.ats_status==='evaluated'&&score!==null&&score>=0&&score<=100;
 const minimum=numeric(data.criteria_ats_fit);
 const eligible=minimum===null||(evaluated&&score>=minimum),skills=rows(data.skills),resume=obj(data.resume_sections);
 const verified=evaluated?numeric(data.verified_requirements_count):null,total=numeric(data.total_requirements_count);
 const selected=skills.filter(row=>(importance==='all'||row.priority===importance)&&[row.requirement,row.skill,row.evidence_text].map(value=>text(value,'')).join(' ').toLowerCase().includes(query.toLowerCase()));
 const groups=new Map<string,string[]>();
 for(const item of rows(data.resume_edit_suggestions)){
  const name=text(item.requirement,'');const suggestion=text(item.suggestion,'');
  if(!suggestion)continue;
  const template=name?suggestion.split(name).join('{requirement}'):suggestion;
  groups.set(template,[...(groups.get(template)||[]),...(name?[name]:[])]);
 }
 const columns=[selected];
 const strengths=skills.filter(row=>['FULL_MATCH','RELATED_EVIDENCE'].includes(text(row.match_status))),gaps=skills.filter(row=>['WEAK_OR_INFERRED','NO_EVIDENCE'].includes(text(row.match_status)));
 return <section className="vd-assessment" aria-label="ATS Fit Assessment" data-ats-eligibility={evaluated?eligible?'eligible':'ineligible':'pending'}>
  <header className="vd-assessment-heading"><div><span>RESUME & ROLE ALIGNMENT</span><h3>{text(data.company_name,'Placement opportunity')} · {text(data.role_title,'Role not supplied')}</h3></div></header>
  <div className="vd-assessment-identity"><div><strong>{student.full_name||'Student assessment'}</strong><p>{student.email||'—'}</p></div><dl>{[['Program',[student.department_code,student.program].filter(Boolean).join(' / ')],['CGPA',student.cgpa],['Graduation',student.graduation_year]].map(([label,value])=><div key={String(label)}><dt>{text(label)}</dt><dd>{text(value)}</dd></div>)}</dl></div>
  <div className="vd-assessment-metrics"><article><div className={`vd-assessment-score ${eligible?'is-good':'is-review'}`} style={{background:evaluated?`conic-gradient(${eligible?'#16834a':'#e34b58'} ${score!*3.6}deg,#e9eef7 0)`:'#e9eef7'}}><strong>{evaluated?score:'—'}<small>/100</small></strong></div><div><h4>Resume Match</h4><b>{minimum===null?'No ATS minimum':evaluated?eligible?`Eligible · ATS ≥ ${minimum}%`:`Not eligible · ATS < ${minimum}%`:'Not assessed'}</b><p>Current resume compared with this drive.</p></div></article><article><BarChart3/><div><h4>Role readiness</h4><b>{evaluated?gaps.length?'Needs review':'Requirements evidenced':'Not assessed'}</b><p>{text(data.compatibility_summary,'Assessment will appear when processing completes.')}</p></div></article><article><CheckCircle2/><div><h4>Evidence coverage</h4><b>{verified!==null&&total!==null?`${verified} of ${total}`:'—'}</b><p>requirements verified</p><progress aria-label="Evidence coverage" max={total&&total>0?total:1} value={verified??0}/></div></article></div>
  <p className="vd-assessment-note"><Info size={16}/>Based on resume evidence and job description completeness. Some requirements may need manual verification.</p>
  <div className="vd-assessment-overview">
  <section className="vd-assessment-box"><header><h4><BarChart3 size={18}/>Requirement alignment</h4><span>{skills.length} requirements</span></header><div className="vd-assessment-filters"><input aria-label="Search requirements" value={query} placeholder="Requirement or evidence" onChange={event=>{setQuery(event.target.value)}}/><select aria-label="Importance" value={importance} onChange={event=>{setImportance(event.target.value)}}><option value="all">All importance levels</option>{['mandatory','core','preferred'].map(value=><option key={value}>{value}</option>)}</select></div><div className={`vd-assessment-requirement-columns ${columns.length>1?'has-two-columns':''}`}>{columns.map((items,column)=><div className="vd-assessment-table" key={column}><table><thead><tr>{['#','Requirement','Resume evidence','Match'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{items.map((row,index)=><tr key={text(row.target_id,String(index))}><td>{index+1}</td><th scope="row">{text(row.requirement||row.skill)}<small className={`vd-assessment-tag ${text(row.priority,'core')}`}>{text(row.priority,'core')}</small></th><td>{text(row.evidence_text,evaluated?'No evidence found':'Assessment pending')}</td><td><span className={`vd-assessment-match ${['FULL_MATCH','RELATED_EVIDENCE'].includes(text(row.match_status))?'is-good':'is-review'}`}>{match(row)}{numeric(row.match_strength)!==null?` · ${Math.round(Number(row.match_strength))}%`:numeric(row.confidence)!==null?` · ${Math.round(Number(row.confidence)*100)}%`:''}</span></td></tr>)}</tbody></table></div>)}</div>{!selected.length&&<p className="vd-assessment-empty">No matching requirements.</p>}</section>
  <aside className="vd-assessment-support">

  <section className="vd-assessment-box"><header><h4><FileText size={18}/>Resume evidence</h4></header>{!data.resume_parse_ready&&<p className="vd-assessment-empty">Parsed resume details are not available yet.</p>}{sections.map(([key,label])=><details className="vd-assessment-resume" open key={key}><summary>{label}<span>{Array.isArray(resume[key])?(resume[key] as unknown[]).length:0} entries</span></summary>{Array.isArray(resume[key])&&(resume[key] as unknown[]).length?(resume[key] as unknown[]).map((value,index)=><p key={index}>{text(value)}</p>):<p>No {label.toLowerCase()} returned in the parsed resume.</p>}</details>)}</section>
  <div className="vd-assessment-insights">{[['Strengths',strengths,'is-good'],['Gaps to verify',gaps,'is-review']].map(([label,values,tone])=><section className={`vd-assessment-box ${tone}`} key={String(label)}><header><h4>{String(label)} <span>({(values as Row[]).length})</span></h4></header><div className="vd-assessment-skill-chips">{(values as Row[]).map((row,index)=><span key={index}>{text(row.requirement||row.skill)}</span>)}{!(values as Row[]).length&&<p>No {String(label).toLowerCase()} returned.</p>}</div></section>)}</div>
  <section className="vd-assessment-box"><header><h4>Personalized resume suggestions</h4></header>{groups.size?[...groups].map(([template,names],index)=><p className="vd-assessment-guidance" key={index}>{template.split('{requirement}').join([...new Set(names)].join(', '))}</p>):<p className="vd-assessment-empty">No evidence-gap edit suggestions were returned.</p>}</section>
  <section className="vd-assessment-box"><header><h4>Assessment & job description</h4></header><dl className="vd-assessment-details">{[['Mandatory coverage',data.mandatory_coverage],['Core coverage',data.core_coverage],['Preferred coverage',data.preferred_coverage],['Assessed at',data.evaluated_at],['Resume version',data.resume_version]].map(([label,value])=><div key={String(label)}><dt>{text(label)}</dt><dd>{text(value)}</dd></div>)}</dl><h4 className="vd-assessment-jd-title">Job description</h4><p className="vd-assessment-jd">{text(data.job_description,'Job description not returned.')}</p></section>
  </aside>
  </div>
  {actions&&<footer className="vd-assessment-actions">{actions}</footer>}
 </section>;
}
