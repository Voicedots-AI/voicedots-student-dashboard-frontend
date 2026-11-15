import type {ReactNode} from "react";
import {ArrowUpRight} from "lucide-react";
export default function DriveDetailsLabel({children}:{children:ReactNode}) {
 return <><span className="da-drive-label">{children}</span><span className="da-drive-cue">View details<ArrowUpRight size={13} aria-hidden="true"/></span></>;
}
