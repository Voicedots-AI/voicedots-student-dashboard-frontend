import {atsCutoff} from "../shared-assessment/atsCutoff";
import {type ReactNode} from "react";
import {BriefcaseBusiness,FileText,Building2,ShieldCheck} from "lucide-react";
export type DriveInformation = {
 job_description?:string; jd_raw_text?:string; company_description?:string;
 location?:string; job_type?:string; status?:string; window_start_at?:string; window_end_at?:string;
 interview_window_start_at?:string; interview_window_end_at?:string; application_deadline_at?:string|null; application_deadline?:string;
 criteria_min_cgpa?:number|null; criteria_ats_fit?:number|null; criteria_interview_score?:number|null;
 criteria_department_codes?:string[]; criteria_programs?:string[]; criteria_graduation_years?:number[];
 criteria_required_skills?:string[]; criteria_require_resume?:boolean; interview_duration_minutes?:number|null; duration_minutes?:number|null; max_attempts?:number;
 salary_min_amount?:number|null; salary_max_amount?:number|null; salary_currency?:string; salary_period?:string;
 package_min_lpa?:number|null; package_max_lpa?:number|null; package_currency?:string|null;
 eligibility?:{status:string;reason?:string|null}; eligibility_status?:string; eligibility_reason?:string;
};
const human=(value?:string)=>value?value.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase()):"Not recorded";
const date=(value?:string|null)=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}):"Not recorded";
function Description({text,empty}:{text?:string;empty:string}) {
 return <p className="da-readable-copy">{text||empty}</p>;
}
export default function DriveInformationPanel({drive}:{drive:DriveInformation}) {
 const field=(label:string,value:ReactNode)=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>;
 const list=(value?:Array<string|number>)=>value===undefined?"Not recorded":value.length?value.join(", "):"No restriction";
 const salary=drive.salary_min_amount!=null?`${drive.salary_currency||"INR"} ${drive.salary_min_amount.toLocaleString("en-IN")}${drive.salary_max_amount!=null&&drive.salary_max_amount!==drive.salary_min_amount?` – ${drive.salary_max_amount.toLocaleString("en-IN")}`:""} / ${drive.salary_period||"year"}`:drive.package_min_lpa!=null?`${drive.package_currency||"INR"} ${drive.package_min_lpa}${drive.package_max_lpa!=null&&drive.package_max_lpa!==drive.package_min_lpa?` – ${drive.package_max_lpa}`:""} LPA`:"Not recorded";
 return <div className="da-information">
  <section className="da-info-section da-drive-facts"><h3><BriefcaseBusiness size={17}/>Drive details</h3><dl className="da-info-grid">
   {field("Location",drive.location||"Not recorded")}{field("Employment",human(drive.job_type))}{field("Compensation",salary)}
   {field("Applications close",date(drive.application_deadline_at||drive.application_deadline))}{field("Interview opens",date(drive.interview_window_start_at||drive.window_start_at))}{field("Interview closes",date(drive.interview_window_end_at||drive.window_end_at))}
   {field("Interview duration",(drive.duration_minutes??drive.interview_duration_minutes)!=null?`${drive.duration_minutes??drive.interview_duration_minutes} minutes`:"Not recorded")}{field("Maximum attempts",drive.max_attempts??"Not recorded")}
  </dl></section>
  <section className="da-info-section da-description-card"><h3><FileText size={17}/>Job description</h3><Description text={drive.job_description||drive.jd_raw_text} empty="No job description has been recorded for this drive."/></section>
  <section className="da-info-section da-company-card"><h3><Building2 size={17}/>About the company</h3><Description text={drive.company_description} empty="No company overview has been recorded."/></section>
  <section className="da-info-section da-eligibility-section"><h3><ShieldCheck size={17}/>Eligibility requirements</h3>{(drive.eligibility||drive.eligibility_status)&&<p className="da-eligibility"><strong>{human(drive.eligibility?.status||drive.eligibility_status)}</strong>{(drive.eligibility?.reason||drive.eligibility_reason)&&<span>{drive.eligibility?.reason||drive.eligibility_reason}</span>}</p>}<dl className="da-info-grid">
   {field("Minimum CGPA",drive.criteria_min_cgpa===null?"No restriction":drive.criteria_min_cgpa??"Not recorded")}{field("Programs",list(drive.criteria_programs))}{field("Departments",list(drive.criteria_department_codes))}{field("Graduating classes",list(drive.criteria_graduation_years))}
   {field("Required skills",drive.criteria_required_skills===undefined?"Not recorded":drive.criteria_required_skills.join(", ")||"None specified")}{field("Resume required",drive.criteria_require_resume===undefined?"Not recorded":drive.criteria_require_resume?"Yes":"No")}{field("ATS Fit cutoff",atsCutoff(drive.criteria_ats_fit)!=null?`${atsCutoff(drive.criteria_ats_fit)}%`:"Not recorded")}{field("Interview score cutoff",drive.criteria_interview_score!=null?`${drive.criteria_interview_score}/100`:"Not recorded")}
  </dl></section>
 </div>;
}
