// ATS indicator policy: green only strictly above the drive cutoff.
// Interview admission remains governed by the backend's configured minimum.
export function atsCutoff(value:unknown):number|null {
 const minimum=value==null?50:value;
 return typeof minimum==='number'&&Number.isFinite(minimum)&&minimum>=0&&minimum<=100?minimum:null;
}
export function atsIndicator(score:unknown,minimum:unknown):'neutral'|'green'|'red' {
 const cutoff=atsCutoff(minimum);
 if(typeof score!=='number'||!Number.isFinite(score)||score<0||score>100||cutoff===null)return 'neutral';
 return score>cutoff?'green':'red';
}
export function atsCutoffLabel(score:unknown,minimum:unknown):string {
 const cutoff=atsCutoff(minimum),tone=atsIndicator(score,minimum);
 return tone==='neutral'?'Not assessed':tone==='green'?`Above cutoff · ATS > ${cutoff}%`:`At/below cutoff · ATS ≤ ${cutoff}%`;
}
