import {api,type InterviewReportView,type CandidateSatisfaction} from './api';
import {SharedScorecard} from './shared-assessment/Scorecard';
export function InterviewScorecard({view,sessionId}:{view:InterviewReportView;sessionId:string}){
 return <SharedScorecard view={view} onSaveFeedback={ratings=>api<CandidateSatisfaction>(`/api/interview/${encodeURIComponent(sessionId)}/evaluation/satisfaction`,{method:'POST',body:JSON.stringify(ratings)})}/>;
}
