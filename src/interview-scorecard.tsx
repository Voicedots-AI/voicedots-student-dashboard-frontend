import {useAuth} from './auth';
import {api,type InterviewReportView,type CandidateSatisfaction} from './api';
import {SharedScorecard} from './shared-assessment/Scorecard';
export function InterviewScorecard({view,sessionId,role,assessedAt,durationSeconds}:{view:InterviewReportView;sessionId:string;role?:string;assessedAt?:string;durationSeconds?:number}){
 const {identity}=useAuth();
 return <SharedScorecard photo={identity?.student.photo_url} view={{...view,session_id:sessionId,target_role:role,assessment_date:assessedAt,duration_seconds:durationSeconds,candidate_info:{...view.candidate_info,full_name:view.candidate_info?.full_name||identity?.student.full_name,program:view.candidate_info?.program||identity?.student.program,department:view.candidate_info?.department||identity?.student.department_code,graduation_year:identity?.student.graduation_year}}} onSaveFeedback={ratings=>api<CandidateSatisfaction>(`/api/interview/${encodeURIComponent(sessionId)}/evaluation/satisfaction`,{method:'POST',body:JSON.stringify(ratings)})}/>;
}
