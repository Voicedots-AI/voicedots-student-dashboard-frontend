import {BookOpen,CheckCircle2,Play} from 'lucide-react';
import {ImprovementJourneyChart,type Point} from './ImprovementJourneyChart';
import './drive-progress.css';
export type ProgressReport={drive_id?:string;status?:string;attempt_number?:number;completed_at?:string;created_at?:string;report?:{overall_score?:unknown;score_breakdown?:{technical?:unknown;technical_knowledge?:unknown;communication?:unknown}}};
export type ProgressMetrics={modules_completed?:number;questions_completed?:number;questions_total?:number;mock_interviews_completed?:number;mock_interviews_total?:number};
export function selectDriveTrajectory(reports:ProgressReport[],driveId:string,saved?:unknown):Point[]{
 const records=reports.filter(row=>row.drive_id===driveId&&row.status==='released'&&row.report).sort((a,b)=>Date.parse(a.completed_at||a.created_at||'')-Date.parse(b.completed_at||b.created_at||''));
 const measured=records.flatMap((row,index)=>{
  const overall=row.report!.overall_score,technical=row.report!.score_breakdown?.technical??row.report!.score_breakdown?.technical_knowledge,communication=row.report!.score_breakdown?.communication;
  if(![overall,technical,communication].every(value=>typeof value==='number'&&Number.isFinite(value)))return [];
  return [{milestone:`Attempt ${row.attempt_number||index+1}`,date:row.completed_at||row.created_at||'',overall:overall as number,technical:technical as number,communication:communication as number}];
 });
 if(measured.length)return measured;
 return Array.isArray(saved)?saved.filter(point=>point&&[point.overall,point.technical,point.communication].every(value=>typeof value==='number'&&Number.isFinite(value))):[];
}
export function DriveProgress({points,progressMetrics={},onReport}:{points:Point[];progressMetrics?:ProgressMetrics;onReport:()=>void}){
 return <section className="shared-drive-progress" aria-label="Progress Tracking">
            <ImprovementJourneyChart points={points} onReport={onReport} />

            {/* 3 Bottom Metric Stat Cards (Solid Blue and Green theme - ZERO purple) */}
            <div className="s8-metrics-grid">
              {/* Blue Card 1 */}
              <div className="s8-metric-card card-blue">
                <div className="s8-metric-icon-box icon-blue">
                  <BookOpen size={22} />
                </div>
                <div className="s8-metric-content">
                  <strong className="s8-metric-value">{progressMetrics.modules_completed ?? 0}</strong>
                  <span className="s8-metric-label">Learning Modules Completed</span>
                </div>
              </div>

              {/* Green Card 2 */}
              <div className="s8-metric-card card-green">
                <div className="s8-metric-icon-box icon-green">
                  <CheckCircle2 size={22} />
                </div>
                <div className="s8-metric-content">
                  <strong className="s8-metric-value">
                    {progressMetrics.questions_completed ?? 0} / {progressMetrics.questions_total ?? 0}
                  </strong>
                  <span className="s8-metric-label">Practice Questions Completed</span>
                </div>
              </div>

              {/* Solid Blue Card 3 */}
              <div className="s8-metric-card card-blue">
                <div className="s8-metric-icon-box icon-blue">
                  <Play size={20} fill="currentColor" />
                </div>
                <div className="s8-metric-content">
                  <strong className="s8-metric-value">
                    {progressMetrics.mock_interviews_completed ?? 0} / {progressMetrics.mock_interviews_total ?? 0}
                  </strong>
                  <span className="s8-metric-label">Mock Interviews Completed</span>
                </div>
              </div>
            </div>

</section>;
}
