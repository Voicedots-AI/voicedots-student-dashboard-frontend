import type {InterviewReportView} from './api';

const definitions = [
  {key:'technical_knowledge',name:'Technical Knowledge',aliases:['technical_knowledge','technical']},
  {key:'communication',name:'Communication Skills',aliases:['communication','communication_skills']},
  {key:'resume_ownership',name:'Resume Ownership',aliases:['resume_ownership']},
  {key:'confidence_conduct',name:'Confidence & Conduct',aliases:['confidence_conduct','confidence']},
  {key:'structured_thinking',name:'Problem Solving',aliases:['structured_thinking','problem_solving']},
  {key:'domain_knowledge',name:'Domain Knowledge',aliases:['domain_knowledge','domain']},
  {key:'applied_evidence',name:'Applied Evidence',aliases:['applied_evidence']},
  {key:'role_awareness',name:'Role Awareness',aliases:['role_awareness','role_fit']},
];
const normalize=(key:string)=>key.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const percentage=(value:unknown):number|null=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100?value:null;

/** Read old display-label breakdowns and current rubric dimensions without inventing scores. */
export function reportCompetencies(view:Pick<InterviewReportView,'score_breakdown'|'core_dimensions'|'domain_dimensions'>) {
  const breakdown=new Map(Object.entries(view.score_breakdown||{}).map(([key,value])=>[normalize(key),value]));
  const dimensions=[...(view.core_dimensions||[]),...(view.domain_dimensions||[])];
  return definitions.flatMap(item=>{
    const dimension=dimensions.find(row=>row&&typeof row.dimension==='string'&&item.aliases.includes(normalize(row.dimension)));
    const alias=item.aliases.find(key=>breakdown.has(key));
    if (!dimension && !alias) return [];
    // A null detailed band explicitly means unassessed. Do not turn it into
    // zero or override it with an older aggregate from another report shape.
    const score=dimension
      ? percentage(dimension.percentage) ?? (typeof dimension.band==='number'&&Number.isInteger(dimension.band)&&dimension.band>=0&&dimension.band<=4?dimension.band*25:null)
      : percentage(breakdown.get(alias!));
    return [{key:item.key,name:item.name,score,max:100}];
  });
}
