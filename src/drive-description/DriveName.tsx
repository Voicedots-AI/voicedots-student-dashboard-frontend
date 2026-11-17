import DriveDetailsLabel from "../drive-assessment/DriveDetailsLabel";
import {useEffect,useState,type ReactNode} from "react";
import {useNavigate} from "react-router-dom";
import {ArrowUpRight} from "lucide-react";
import {api,type Drive,type DriveContext,type Report} from "../api";
import {atsCutoff,atsIndicator} from "../shared-assessment/atsCutoff";
import DriveInformationPanel,{type DriveInformation} from "../drive-assessment/DriveInformationPanel";
import AssessmentPopup from "../drive-assessment/AssessmentPopup";
type Match={drive_details?:DriveInformation;drive_id?:string;ats_status?:string;ats_fit_score?:number|null;criteria_ats_fit?:number|null};
function Summary({id,company,role,drive,close}:{id:string;company?:string|null;role?:string|null;drive?:Drive;close:()=>void}) {
 const navigate=useNavigate();
 const [data,setData]=useState<{context:DriveContext;ats:Match;reports:Report[];drive?:Drive}|null>(null),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setData(null);setError("");void Promise.all([api<DriveContext>(`/api/student/drives/${encodeURIComponent(id)}/interview-context`),api<Match>(`/api/student/drives/${encodeURIComponent(id)}/ats-fit`),api<{reports:Report[]}>("/api/student/reports"),api<Drive[]>("/api/student/drives")]).then(([context,ats,result,drives])=>{if(context.drive_id!==id||ats.drive_id&&ats.drive_id!==id)throw new Error("Drive mismatch");if(active)setData({context,ats,reports:result.reports,drive:drives.find(item=>item.id===id)||drive})}).catch(()=>{if(active)setError("Unable to load this drive assessment. Please retry.")});return()=>{active=false}},[id,retry]);
 const go=(path:string)=>{close();navigate(path)};
 const report=data?.reports.filter(row=>row.drive_id===id).sort((a,b)=>(Date.parse(b.completed_at||b.created_at)||0)-(Date.parse(a.completed_at||a.created_at)||0))[0];
 const released=report?.status==="released"&&report.report?.status!=="awaiting_release";
 const score=released?report?.report?.overall_score:null;
 const valid=(value:unknown):value is number=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;
 const atsScore=data?.ats.ats_status==="evaluated"&&valid(data.ats.ats_fit_score)?data.ats.ats_fit_score:null;
 const indicator=atsIndicator(atsScore,atsCutoff(data?.ats.criteria_ats_fit??drive?.criteria_ats_fit));
 const status=data?.context.assignment_status||drive?.interview_assignment_status||"Not assessed";
 const human=(value:string)=>value.replaceAll("_"," ").replace(/\b\w/g,letter=>letter.toUpperCase());
 const date=(value?:string)=>value?new Date(value).toLocaleDateString("en-IN",{dateStyle:"medium",timeZone:"Asia/Kolkata"}):"Not supplied";
 const cell=(label:string,value:ReactNode)=><td data-label={label}><div className="da-cell-value">{value}</div></td>;
 return <AssessmentPopup title={data?.context.role_title||role||"Placement drive"} company={data?.context.company_name||company} onClose={close}>
  {error?<div className="da-state" role="alert">{error}<button type="button" onClick={()=>setRetry(value=>value+1)}>Retry</button></div>:!data?<p className="da-state" role="status">Loading drive assessment…</p>:<>
   <DriveInformationPanel drive={{...data.drive,...data.ats.drive_details,...data.context,criteria_ats_fit:atsCutoff(data.ats.criteria_ats_fit??drive?.criteria_ats_fit)}}/>
   <h3 className="da-student-heading">Your assessment</h3>
   <div className="ai-drive-table-wrap"><table className="ai-drive-table"><thead><tr>{["Drive / company","Date range","ATS Fit","Scorecard","Interview status","Readiness","Action"].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody><tr>
    {cell("Drive / company",<strong>{data.context.company_name} {data.context.role_title}</strong>)}
    {cell("Date range",`${date(data.context.interview_window_start_at||drive?.window_start_at)} – ${date(data.context.interview_window_end_at||drive?.window_end_at)}`)}
    {cell("ATS Fit",<button type="button" className={`ai-ats-chip ${indicator==="green"?"good":indicator==="red"?"low":"neutral"}`} onClick={()=>go(`/ats-fit?drive=${encodeURIComponent(id)}`)}>{atsScore===null?data.ats.ats_status==="processing"?"Processing…":"Not assessed":`${atsScore}%`}<ArrowUpRight size={12}/></button>)}
    {cell("Scorecard",valid(score)&&report?<button type="button" className="ai-scorecard-chip" onClick={()=>go(`/reports/${encodeURIComponent(report.session_id)}`)}>Score {Math.round(score*10)/10}/100<ArrowUpRight size={12}/></button>:<span>{report&&!released?"Awaiting release":"Not assessed"}</span>)}
    {cell("Interview status",<span className={`ai-status ${status==="completed"?"good":status==="in_progress"?"partial":"neutral"}`}>{human(status)}</span>)}
    {cell("Readiness",released&&report?.report?.readiness?human(report.report.readiness):"Not assessed")}
    {cell("Action",<div className="ai-drive-actions"><button type="button" className="ai-text-button" onClick={()=>go("/profile")}>Resume &amp; biodata</button><button type="button" className="ai-coach-button" onClick={()=>go(`/placement/plan?drive=${encodeURIComponent(id)}`)}>AI Coach Progress</button></div>)}
   </tr></tbody></table></div>

  </>}
 </AssessmentPopup>;
}
export default function DriveName({id,company,role,children,drive}:{id:string;company?:string|null;role?:string|null;children?:ReactNode;drive?:Drive}) {
 const [open,setOpen]=useState(false);
 return <><button type="button" className="da-name-button" aria-haspopup="dialog" aria-label={`View drive details for ${[company,role].filter(Boolean).join(" · ")}`} onClick={()=>setOpen(true)}><DriveDetailsLabel>{children||<>{company} · {role}</>}</DriveDetailsLabel></button>{open&&<Summary id={id} company={company} role={role} drive={drive} close={()=>setOpen(false)}/>}</>;
}
