import {useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {api} from './api';
import {PlacementJourneyGate} from './placement-journey-gate';
import {JourneyReview,type SavedJourney} from './shared-journey/JourneyReview';

export function StudentJourneyReview(){return <PlacementJourneyGate><SavedStudentJourney/></PlacementJourneyGate>}
function SavedStudentJourney(){
 const [params]=useSearchParams(),drive=params.get('drive')||'';
 const [revision,setRevision]=useState(0),[result,setResult]=useState<{key:string;journey?:SavedJourney;error?:string}>();
 const key=`${drive}:${revision}`;
 useEffect(()=>{
  const controller=new AbortController();
  void api<SavedJourney>(`/api/student/coach/improvement-journey?drive_id=${encodeURIComponent(drive)}`,{signal:controller.signal,cache:'no-store'}).then(journey=>{
   if(controller.signal.aborted)return;
   if(journey.drive_id!==drive)throw Error('The saved journey does not match this placement drive.');
   setResult({key,journey});
  }).catch(error=>{if(!controller.signal.aborted)setResult({key,error:error instanceof Error?error.message:'Could not load your progress.'})});
  return()=>controller.abort();
 },[drive,key]);
 return <div className="student-journey-review-page" style={{maxWidth:1480,margin:'0 auto',padding:20}}>
  <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:16}}><Link className="button secondary" to="/placements">← Placement drives</Link><Link className="button" to={`/placement/call?drive=${encodeURIComponent(drive)}`}>Continue AI coaching →</Link><button className="button secondary" disabled={result?.key!==key} onClick={()=>setRevision(value=>value+1)}>Refresh progress</button></div>
  {result?.key!==key?<p role="status">Loading your saved journey…</p>:result.error?<div role="alert"><p>{result.error}</p><button className="button secondary" onClick={()=>setRevision(value=>value+1)}>Retry progress</button></div>:result.journey&&<JourneyReview key={key} journey={result.journey} studentName={result.journey.student_name} companyName={result.journey.company_name} roleTitle={result.journey.role_title}/>}
 </div>
}
