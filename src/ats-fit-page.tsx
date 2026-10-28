import {Link,Navigate,useSearchParams} from "react-router-dom";
import {DriveATSFit} from "./drive-ats-fit";
import "./ats-fit-page.css";

export function ATSFitPage(){
 const [params]=useSearchParams(),selected=params.get("drive");
 // Placements owns drive discovery; keep existing deep links to the same assessment.
 if(!selected)return <Navigate to="/placements" replace/>;
 return <div className="student-ats-page"><Link className="button secondary small" to="/placements">Back to placements</Link><DriveATSFit key={selected} driveId={selected}/></div>;
}
