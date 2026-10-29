import {evaluatedPlacementScore,meetsPlacementATSThreshold} from "./placement-eligibility";
import {Fragment,useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {api,apiUrl,type Drive,type DriveContext} from "./api";
import {useAuth} from "./auth";
import {studentDataCache} from "./student-data-cache";
import {BarChart3,FileText,Info,Star,AlertTriangle,GraduationCap,Code2,BriefcaseBusiness,FolderKanban,Award,ChevronDown,Download} from "lucide-react";
import "./drive-ats-fit.css";

type Skill={evidence_level?:string;evidence_source?:string;skill?:string;requirement?:string;priority?:string;match_status?:string;evidence_text?:string;reason?:string;match_strength?:number;confidence?:number};
type Suggestion={requirement:string;priority?:string;reason?:string;match_status:string;evidence:string;suggestion:string};
type Match={ats_status:string;ats_fit_score:number|null;skills:Skill[];compatibility_summary?:string;company_name?:string;role_title?:string;job_description?:string;resume_sections?:Record<string,string[]>;resume_parse_ready?:boolean;verified_requirements_count?:number;total_requirements_count?:number;mandatory_coverage?:string;core_coverage?:string;preferred_coverage?:string;resume_edit_suggestions?:Suggestion[];job_description_ready_reason?:string;resume_version?:string;evaluated_at?:string;resume_evidence?:string;components?:{match_strength?:number;evidence_strength?:number};applied_evidence?:string[];declared_only?:string[];not_evidenced?:string[]};
const label=(s:Skill)=>s.requirement||s.skill||"Requirement";
const importance=(s:Skill)=>s.priority?.trim().toLowerCase()||"unavailable";
const importanceOrder=["mandatory","core","preferred"];
const matchLabel=(s:Skill)=>({FULL_MATCH:"Strong",RELATED_EVIDENCE:"Good",WEAK_OR_INFERRED:"Partial",NO_EVIDENCE:"Missing"}[s.match_status||""]||"Not assessed");
const matchPercent=(s:Skill)=>{const value=s.match_strength??(typeof s.confidence==="number"?s.confidence*100:null);return typeof value==="number"&&Number.isFinite(value)?Math.max(0,Math.min(100,value)):null};

function AssessmentPagination({page,total,size,onChange}:{page:number;total:number;size:number;onChange:(page:number)=>void}){
 if(total<=size)return null;
 const pages=Math.ceil(total/size);
 return <nav className="student-ats-pagination" aria-label="Results pages"><span aria-live="polite">{page*size+1}–{Math.min(total,(page+1)*size)} of {total}</span><div><button type="button" disabled={page===0} onClick={()=>onChange(page-1)}>Previous</button><span>{page+1} / {pages}</span><button type="button" disabled={page>=pages-1} onClick={()=>onChange(page+1)}>Next</button></div></nav>;
}

export function DriveATSFit({driveId,studio=false,onAdd,busy=false,onJob,driveRecord,driveContext}:{driveId:string;studio?:boolean;onAdd?:(skills:string[])=>Promise<boolean>;busy?:boolean;onJob?:(text:string)=>void;driveRecord?:Drive;driveContext?:DriveContext|null}){
 const {identity}=useAuth();
 const student=identity?.student;
 const [drive,setDrive]=useState<Drive|null>(null),[context,setContext]=useState<DriveContext|null>(null);
 useEffect(()=>{if(driveRecord?.id===driveId){setDrive(driveRecord);setContext(driveContext?.drive_id===driveId?driveContext:null);return}let active=true;setDrive(null);setContext(null);void Promise.allSettled([studentDataCache.get<Drive[]>("/api/student/drives",()=>api<Drive[]>("/api/student/drives",{timeoutMs:120000})),api<DriveContext>(`/api/student/drives/${encodeURIComponent(driveId)}/interview-context`,{timeoutMs:120000})]).then(([drives,details])=>{if(!active)return;if(drives.status==="fulfilled")setDrive(drives.value.find(row=>row.id===driveId)||null);if(details.status==="fulfilled"&&details.value.drive_id===driveId)setContext(details.value)});return()=>{active=false}},[driveId,driveRecord,driveContext]);
 const [assessmentView,setAssessmentView]=useState("requirements");
 const [requirementPage,setRequirementPage]=useState(0),[insightPage,setInsightPage]=useState(0),[suggestionPage,setSuggestionPage]=useState(0);
 const [search,setSearch]=useState(""),[importanceFilter,setImportanceFilter]=useState("all");
 const [allStrengths,setAllStrengths]=useState(!studio),[allGaps,setAllGaps]=useState(!studio),[allSuggestions,setAllSuggestions]=useState(!studio);
 useEffect(()=>{setAllStrengths(!studio);setAllGaps(!studio);setAllSuggestions(!studio)},[driveId,studio]);
 useEffect(()=>{setSearch("");setImportanceFilter("all")},[driveId]);
 useEffect(()=>{setRequirementPage(0)},[search,importanceFilter]);
 useEffect(()=>{setAssessmentView("requirements");setRequirementPage(0);setInsightPage(0);setSuggestionPage(0)},[driveId]);
 const requirementRows=(data:Match)=>data.skills
  .map((skill,index)=>({skill,index}))
  .filter(({skill})=>(importanceFilter==="all"||importance(skill)===importanceFilter)&&[label(skill),skill.evidence_text||""].join(" ").toLowerCase().includes(search.trim().toLowerCase()))
  .sort((a,b)=>{const rank=(s:Skill)=>{const n=importanceOrder.indexOf(importance(s));return n<0?3:n};return rank(a.skill)-rank(b.skill)||a.index-b.index});
 const panelRef=useRef<HTMLElement>(null),focused=useRef(false);
 const[data,setData]=useState<Match|null>(null),[error,setError]=useState(""),[selected,setSelected]=useState<string[]>([]),[retry,setRetry]=useState(0);
 const assessmentPath=`/api/student/drives/${encodeURIComponent(driveId)}/ats-fit`;
 const refreshAssessment=()=>{studentDataCache.invalidate(assessmentPath);studentDataCache.invalidate(`${student?.id}:${student?.current_resume_submission_id||"none"}:${driveId}`);setRetry(v=>v+1)};
 useEffect(()=>{let alive=true;let timer:ReturnType<typeof setTimeout>;setData(studentDataCache.peek<Match>(assessmentPath)||null);setSelected([]);setError("");const load=async()=>{try{if(document.visibilityState==="hidden"){timer=setTimeout(load,10000);return}const result=await studentDataCache.get<Match>(assessmentPath,()=>api<Match>(assessmentPath,{timeoutMs:120000}));if(!alive)return;setData(result);setError("");if(result.ats_status==='processing')timer=setTimeout(()=>{studentDataCache.invalidate(assessmentPath);void load()},10000)}catch(e){if(alive)setError((e as Error).message)}};void load();return()=>{alive=false;clearTimeout(timer)}},[assessmentPath,retry]);
 useEffect(()=>{if(data?.job_description)onJob?.(data.job_description)},[data?.job_description,onJob]);
 useEffect(()=>{if(!studio||!onAdd||busy||!data||focused.current||new URLSearchParams(window.location.search).get("action")!=="add-skills")return;const timer=setTimeout(()=>{focused.current=true;panelRef.current?.scrollIntoView({block:"start",behavior:"smooth"});panelRef.current?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.focus({preventScroll:true})},100);return()=>clearTimeout(timer)},[studio,onAdd,busy,data]);
 const matching=(data?.skills||[]).filter(s=>['FULL_MATCH','RELATED_EVIDENCE'].includes(s.match_status||''));
 const missing=(data?.skills||[]).filter(s=>['NO_EVIDENCE','WEAK_OR_INFERRED'].includes(s.match_status||''));
 const missingSkills=missing.filter(s=>s.match_status==='NO_EVIDENCE').map(label);
 const partialSkills=missing.filter(s=>s.match_status==='WEAK_OR_INFERRED').map(label);
 const total=data?.total_requirements_count;
 const verified=data?.verified_requirements_count;
 const coverage=total&&verified!=null?Math.round(verified/total*100):0;
 const shown=(value:unknown)=>value===null||value===undefined||value===""?"Unavailable":String(value);
 const date=(value?:string)=>value&&!Number.isNaN(Date.parse(value))?new Date(value).toLocaleString():"Unavailable";
 const compensation=drive?.salary_min_amount!=null||drive?.salary_max_amount!=null?[drive.salary_currency,[drive.salary_min_amount,drive.salary_max_amount].filter(value=>value!=null).join(" – "),drive.salary_period].filter(Boolean).join(" "):drive?.package_min_lpa!=null||drive?.package_max_lpa!=null?[drive.package_currency,[drive.package_min_lpa,drive.package_max_lpa].filter(value=>value!=null).join(" – "),"LPA"].filter(Boolean).join(" "):"Unavailable";
 const atsScore=evaluatedPlacementScore(data?.ats_status||"",data?.ats_fit_score);
 const evaluated=atsScore!==null;
 const atsEligible=meetsPlacementATSThreshold(atsScore);
 const download=()=>{if(!data)return;const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));const a=document.createElement('a');a.href=url;a.download=`${driveId}-ats-assessment.json`;a.click();URL.revokeObjectURL(url)};
 return <section ref={panelRef} id={studio?"add-skills":undefined} className="drive-ats-panel" data-ats-eligibility={evaluated?atsEligible?"eligible":"ineligible":"pending"} aria-label="ATS Fit Assessment">
  <header className="student-ats-header"><div><h3>ATS Fit Assessment</h3><p>{data?.company_name || drive?.company_name || context?.company_name || "Placement opportunity"}{(data?.role_title || drive?.role_title || context?.role_title) ? ` · ${data?.role_title || drive?.role_title || context?.role_title}` : ""} · Resume evidence &amp; role alignment</p></div><button className="button secondary small" onClick={refreshAssessment}>Refresh assessment</button></header>
  {error?<div role="alert">{error}<button className="button secondary small" onClick={refreshAssessment}>Retry</button></div>:!data?<p role="status">Loading resume match…</p>:<>
  <div className="student-ats-identity">
   {student?.photo_url?<img src={apiUrl(student.photo_url)} alt={`${student.full_name} profile`}/>:<span className="student-ats-avatar" aria-label="Photo unavailable">{student?.full_name?.slice(0,1)||"—"}</span>}
   <div className="student-ats-name"><div><b>{student?.full_name||"Your resume"}</b>{(context?.assignment_status||drive?.interview_assignment_status)&&<span className="student-ats-badge completed">{(context?.assignment_status||drive?.interview_assignment_status)?.replaceAll("_"," ")}</span>}<span className={`student-ats-badge ${evaluated?atsEligible?"ats-qualified":"ats-unqualified":"review"}`}>{evaluated?atsEligible?"Eligible · ATS ≥ 50%":"Not eligible · ATS < 50%":data.ats_status.replaceAll("_"," ")}</span></div><p>{student?.email||"Email unavailable"}</p></div>
   <dl>{[["Program",[student?.department_code,student?.program].filter(Boolean).join(" / ")||"—"],["CGPA",student?.cgpa??"—"],["Graduation",student?.graduation_year??"—"]].map(([title,value])=><div key={title}><dt>{title}</dt><dd>{value}</dd></div>)}</dl>
  </div>
  <div className="student-ats-cards">
   <article><div className="student-ats-ring" style={{background:evaluated?`conic-gradient(${atsEligible?"#178343":"#df4750"} ${atsScore!*3.6}deg,#e7edf7 0)`:"#e7edf7"}}><span><b>{evaluated?data.ats_fit_score:"—"}</b><small>/100</small></span></div><div><h4>Resume Match <Info size={12}/></h4><strong className="student-ats-alignment">{evaluated?(data.ats_fit_score!>=80?"Strong alignment":data.ats_fit_score!>=60?"Moderate alignment":"Limited alignment"):"Not assessed"}</strong><p>{evaluated?"Your saved resume compared with this drive’s requirements.":"A meaningful ATS score is not available yet."}</p></div></article>
   <article><span className="student-ats-card-icon readiness"><BarChart3 size={24}/></span><div><h4>Role readiness <Info size={12}/></h4><span className="student-ats-badge review">{evaluated?(missing.length?"Needs review":"Requirements evidenced"):data.ats_status.replaceAll("_"," ")}</span><p>{data.compatibility_summary||"Assessment details unavailable."}</p></div></article>
   <article><span className="student-ats-card-icon evidence"><FileText size={24}/></span><div><h4>Evidence coverage <Info size={12}/></h4><b className="student-ats-coverage">{total&&verified!=null?`${verified} of ${total}`:"—"}</b><p>requirements verified</p><div className="student-ats-progress"><span style={{width:`${coverage}%`}}/></div></div></article>
  </div>
  <p className="student-ats-info"><Info size={15}/>Based on resume evidence and job description completeness. Some requirements may need manual verification.</p>
  {!studio&&<nav className="student-ats-navigation" aria-label="Assessment sections">{[["requirements","Requirements",data.skills.length],["insights","Strengths & gaps",matching.length+missing.length],["suggestions","Suggestions",data.resume_edit_suggestions?.length||0],["resume","Resume evidence",null],["details","Job & assessment",null]].map(([key,title,count])=><button type="button" key={key} aria-pressed={assessmentView===key} onClick={()=>setAssessmentView(String(key))}>{title}{count!=null&&<span>{count}</span>}</button>)}</nav>}
  <details hidden={!studio&&assessmentView!=="details"} open={!studio || undefined} className="student-ats-box student-ats-combined"><summary tabIndex={studio?undefined:-1}><span className="student-ats-details-title"><FileText size={21}/><span><b>Assessment &amp; opportunity details</b><small>Review your assessment, opportunity details and full job description</small></span></span><span className="student-ats-details-action">View details <ChevronDown size={17}/></span></summary>
   <div className="student-ats-detail-groups"><section><h5>Assessment record</h5><dl className="student-ats-metadata">{[
    ["Interview status",shown(context?.assignment_status||drive?.interview_status||drive?.interview_assignment_status)],
    ["Resume version",shown(data.resume_version)],["Last assessed",date(data.evaluated_at)],["ATS status",shown(data.ats_status?.replaceAll("_"," "))],
    ["Match strength",data.components?.match_strength!=null?`${data.components.match_strength}/100`:"Unavailable"],
    ["Evidence strength",data.components?.evidence_strength!=null?`${data.components.evidence_strength}/100`:"Unavailable"],
    ["Mandatory coverage",shown(data.mandatory_coverage)],["Core coverage",shown(data.core_coverage)],["Preferred coverage",shown(data.preferred_coverage)],
    ["Applied evidence",shown(data.applied_evidence?.join(", "))],["Declared skills",shown(data.declared_only?.join(", "))],["Resume evidence",shown(data.resume_evidence)],
   ].map(([title,value])=><div key={title}><dt>{title}</dt><dd>{value}</dd></div>)}</dl></section><section><h5>Placement opportunity</h5><dl className="student-ats-metadata">{[
    ["Company",shown(data.company_name||context?.company_name||drive?.company_name)],["Role",shown(data.role_title||context?.role_title||drive?.role_title)],
    ["Location",shown(context?.location||drive?.location)],["Job type",shown(drive?.job_type)],["Compensation",compensation],
    ["Interview window",`${date(context?.interview_window_start_at||drive?.window_start_at)} – ${date(context?.interview_window_end_at||drive?.window_end_at)}`],
    ["Status",shown(drive?.status)],["Eligibility",shown(context?.eligibility?.status||drive?.eligibility_status)]
   ].map(([title,value])=><div key={title}><dt>{title}</dt><dd>{value}</dd></div>)}</dl>
   </section></div><section className="student-ats-job-description">{data.job_description_ready_reason&&<p role="status">{data.job_description_ready_reason}</p>}<h5>Full job description</h5><p className="student-ats-jd">{data.job_description||context?.job_description||drive?.job_description||"Unavailable"}</p>
   </section>
  </details>
  <div className="student-ats-body" hidden={!studio&&assessmentView==="details"}><div className="student-ats-left">
   <section hidden={!studio&&assessmentView!=="requirements"} className="student-ats-box student-ats-requirements"><header className="student-ats-section-header"><h4><BarChart3 size={17}/>Requirement alignment</h4><span>{requirementRows(data).length} / {data.skills.length}</span></header>
    <div className="student-ats-filters"><label><span>Search requirements</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Requirement or evidence"/></label><label><span>Importance</span><select aria-label="Importance" value={importanceFilter} onChange={e=>setImportanceFilter(e.target.value)}><option value="all">All importance levels</option>{importanceOrder.map(value=><option key={value} value={value}>{value[0].toUpperCase()+value.slice(1)}</option>)}<option value="unavailable">Unavailable</option>{Array.from(new Set(data.skills.map(importance))).filter(value=>!importanceOrder.includes(value)&&value!=="unavailable").map(value=><option key={value} value={value}>{value}</option>)}</select></label></div>
    <div className="student-ats-table" role="region" aria-label="Requirement alignment details" tabIndex={0}><table aria-label="Requirement alignment"><thead><tr>{['#','Requirement','Importance','Resume evidence','Match'].map(x=><th scope="col" key={x}>{x}</th>)}</tr></thead><tbody>{(studio?requirementRows(data):requirementRows(data).slice(requirementPage*6,requirementPage*6+6)).map(({skill:s},i,rows)=>{const percentage=matchPercent(s),group=importance(s),start=i===0||importance(rows[i-1].skill)!==group;return <Fragment key={`${s.requirement||s.skill}-${rows[i].index}`}>{start&&<tr className="student-ats-group"><th scope="rowgroup" colSpan={5}>{group==="unavailable"?"Importance unavailable":group[0].toUpperCase()+group.slice(1)}</th></tr>}<tr><td>{(studio?0:requirementPage*6)+i+1}</td><td>{label(s)}</td><td><span className={`student-ats-priority ${group}`}>{s.priority||"Unavailable"}</span></td><td><span className="student-ats-evidence-line" title={s.evidence_text||"No evidence returned"}>{s.evidence_text||"No evidence returned"}</span></td><td><div className="student-ats-match-cell"><div className="student-ats-progress"><span className={s.match_status} style={{width:`${percentage??0}%`}}/></div><span className={`student-ats-match ${s.match_status}`}>{percentage!=null?`${Math.round(percentage)}% · `:"— · "}{matchLabel(s)}</span></div></td></tr></Fragment>})}</tbody></table></div>
    {!studio&&<AssessmentPagination page={requirementPage} total={requirementRows(data).length} size={6} onChange={setRequirementPage}/> }
    {!data.skills.length?<p>No assessed requirements are available yet. {data.compatibility_summary}</p>:!requirementRows(data).length&&<p>No requirements match these filters.</p>}
   </section>
   <section hidden={!studio&&assessmentView!=="resume"} className="student-ats-box student-ats-resume" tabIndex={0} aria-label="Resume evidence"><header className="student-ats-section-header"><h4><FileText size={17}/>Resume evidence</h4><button className="button secondary small" disabled title="The ATS response does not provide a verified resume download URL"><Download size={13}/>Download resume</button></header>
    {([["Education","education",GraduationCap],["Technical Skills","technical_skills",Code2],["Internship","internship",BriefcaseBusiness],["Projects","projects",FolderKanban],["Certifications","certifications",Award]] as const).map(([title,key,Icon])=><details key={key}><summary><Icon size={15}/><b>{title}</b><span title={data.resume_sections?.[key]?.join(" · ")}>{data.resume_sections?.[key]?.join(" · ")||(data.resume_parse_ready?"No entries found":"Parsed section unavailable")}</span><ChevronDown size={13}/></summary>{data.resume_sections?.[key]?.map((text,i)=><p key={i}>{text}</p>)}</details>)}
   </section>
  </div><div className="student-ats-right">
   <section hidden={!studio&&assessmentView!=="insights"} className="student-ats-box student-ats-insights" tabIndex={0} aria-label="Evidence-based insights"><h4><FileText size={17}/>Evidence-based insights</h4>
    <div className="student-ats-strengths"><h5><Star size={16}/>Strengths <span className="student-ats-insight-count">{matching.length}</span></h5>{!studio&&matching.length>0&&insightPage*3>=matching.length&&<p>No additional strengths on this page.</p>}{matching.length?(studio?(allStrengths?matching:matching.slice(0,3)):matching.slice(insightPage*3,insightPage*3+3)).map((s,i)=><p key={i}><b>{label(s)}</b><span className="student-ats-insight-line" title={s.evidence_text||s.reason}>{s.evidence_text||s.reason||"Evidence detail unavailable"}</span></p>):<p>No supported strengths have been returned.</p>}{studio&&matching.length>3&&<button className="student-ats-show" aria-expanded={allStrengths} onClick={()=>setAllStrengths(v=>!v)}>{allStrengths?"Collapse strengths":`Show all strengths (${matching.length})`}</button>}</div>
    <div className="student-ats-gaps"><h5><AlertTriangle size={16}/>Gaps to verify <span className="student-ats-insight-count">{missing.length}</span></h5>{!studio&&missing.length>0&&insightPage*3>=missing.length&&<p>No additional gaps on this page.</p>}{missing.length?(studio?(allGaps?missing:missing.slice(0,3)):missing.slice(insightPage*3,insightPage*3+3)).map((s,i)=><p key={i}><b>{label(s)}</b><span className="student-ats-insight-line" title={s.reason||s.evidence_text}>{s.reason||s.evidence_text||"Resume evidence is missing or incomplete."}</span></p>):<p>{evaluated?"No missing or partial requirements were found.":"Requirements have not been assessed yet."}</p>}{studio&&missing.length>3&&<button className="student-ats-show" aria-expanded={allGaps} onClick={()=>setAllGaps(v=>!v)}>{allGaps?"Collapse gaps":`Show all gaps (${missing.length})`}</button>}</div>
   {!studio&&<AssessmentPagination page={insightPage} total={Math.max(matching.length,missing.length)} size={3} onChange={setInsightPage}/>}
   </section>
   <section hidden={!studio&&assessmentView!=="suggestions"} className="student-ats-box student-ats-suggestions" tabIndex={0} aria-label="Personalized resume suggestions"><h4><FileText size={17}/>Personalized resume suggestions</h4>
    {evaluated&&missingSkills.length>0&&<p className="student-ats-insight-line" title={missingSkills.join(", ")}><b>Missing resume evidence:</b> {(studio&&allSuggestions?missingSkills:missingSkills.slice(0,3)).join(", ")}{(!studio||!allSuggestions)&&missingSkills.length>3?"…":""}</p>}
    {evaluated&&partialSkills.length>0&&<p className="student-ats-insight-line" title={partialSkills.join(", ")}><b>Evidence to strengthen:</b> {(studio&&allSuggestions?partialSkills:partialSkills.slice(0,3)).join(", ")}</p>}
    {data.resume_edit_suggestions?.length?(studio?(allSuggestions?data.resume_edit_suggestions:data.resume_edit_suggestions.slice(0,5)):data.resume_edit_suggestions.slice(suggestionPage*3,suggestionPage*3+3)).map((s,i)=><article className="student-ats-suggestion" key={i}><b>{s.requirement}</b><p className="student-ats-insight-line" title={s.suggestion}>{s.suggestion}</p><small>Add only if you actually have it; do not list a skill you have not used.</small></article>):<p>{evaluated?"No evidence-gap edit suggestions were returned.":"Suggestions will appear after assessment."}</p>}
    {studio&&(data.resume_edit_suggestions?.length||0)>5&&<button className="student-ats-show" aria-expanded={allSuggestions} onClick={()=>setAllSuggestions(v=>!v)}>{allSuggestions?"Show fewer suggestions":`Show all suggestions (${data.resume_edit_suggestions!.length})`}</button>}
   {!studio&&<AssessmentPagination page={suggestionPage} total={data.resume_edit_suggestions?.length||0} size={3} onChange={setSuggestionPage}/>}
   </section>
  </div></div>
  {missing.length>0&&(studio?<div className="student-ats-studio-controls"><div className="drive-ats-chips">{missing.map((s,i)=><label key={i}><input type="checkbox" checked={selected.includes(label(s))} disabled={busy} onChange={e=>setSelected(v=>e.target.checked?[...v,label(s)]:v.filter(x=>x!==label(s)))}/>{label(s)}</label>)}</div><p>Select only skills you already possess and support them with relevant project or work examples. Adding skill names alone does not unlock interviews. After editing, set the draft as Main Resume for reassessment.</p><button className="button primary small" disabled={busy||!onAdd||!selected.length} onClick={async()=>{if(await onAdd?.(selected))setSelected([])}}>{busy?'Adding…':'Add confirmed skills'}</button></div>:null)}
  <footer className="student-ats-actions"><button className="button secondary small" disabled={!evaluated} onClick={download}><Download size={14}/>Download assessment</button><Link className="button primary small" to={`/resume-studio?drive=${encodeURIComponent(driveId)}&action=add-skills#add-skills`}>Open in Resume Studio</Link><Link className="button secondary small" to={`/coach?drive=${encodeURIComponent(driveId)}`}>Practice with AI coach</Link></footer>
  </>}
 </section>;
}
