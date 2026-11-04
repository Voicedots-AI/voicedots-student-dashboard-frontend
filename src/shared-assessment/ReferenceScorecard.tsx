import {BarChart3,Code2,FileText,Lightbulb,MessageCircle,Settings,Trophy,Target} from 'lucide-react';
import type {ReactNode} from 'react';
import './reference-scorecard.css';
export type ReferenceCompetency={label:string;score:number|null;target:number|null;evidence:string};
export type ReferenceHighlight={key:string;offset:number|null;timestamp:string;question:string;score:string};
export type ReferenceScorecardProps={student:Record<string,unknown>;studentId:string;candidatePhoto?:{studentId:string;url:string};candidateProfile?:Record<string,unknown>;role?:unknown;report:{overall_score?:number|null;session_id?:string;completed_at?:string};recordingDuration?:unknown;questionCount:number;executiveSummary?:unknown;readinessLabel:string;competencyRows:ReferenceCompetency[];strengthBriefs:string[];growthBriefs:string[];followUpBriefs:string[];evidenceHighlights:ReferenceHighlight[];infoMessage?:ReactNode;onSeek?:(seconds:number)=>void};
const competencyColors = ["#0dafa0", "#f2b313", "#11b39b", "#f4ad16", "#42b7ec"];
function CompetencyIcon({ label, index }: { label: string; index: number }) {
  const normalized = label.toLowerCase();
  const Icon = normalized.includes("communication")
    ? MessageCircle
    : normalized.includes("analytic") || normalized.includes("reason") || normalized.includes("thinking")
      ? BarChart3
      : normalized.includes("practical") || normalized.includes("applied") || normalized.includes("code")
        ? Code2
        : normalized.includes("problem") || normalized.includes("confidence")
          ? Lightbulb
          : Settings;
  const tones = ["text-blue-600", "text-teal-600", "text-sky-600", "text-amber-500"];
  return <Icon aria-hidden="true" className={`shrink-0 ${tones[index % tones.length]}`} size={18} strokeWidth={2.5}/>;
}

const show = (value: unknown, fallback = "Not available") =>
  value === null || value === undefined || value === ""
    ? fallback
    : String(value);
const stamp = (value: unknown) =>
  value ? new Date(String(value)).toLocaleString() : "Not available";
const durationLabel=(value:unknown)=>{const total=Math.max(0,Math.floor(Number(value)||0)),hours=Math.floor(total/3600),minutes=Math.floor(total%3600/60),seconds=total%60;return hours?`${hours}h ${minutes}m ${seconds}s`:`${minutes}m ${seconds}s`};
export function ReferenceScorecard({student,studentId,candidatePhoto={studentId:'',url:''},candidateProfile={},role,report,recordingDuration=null,questionCount,executiveSummary,readinessLabel,competencyRows,strengthBriefs,growthBriefs,followUpBriefs,evidenceHighlights,infoMessage,onSeek}:ReferenceScorecardProps){
 const studentInitials=String(student.full_name||'Candidate').trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase();
 const reviews={length:questionCount};
 // The seven-competency rubric calls 70/100 Interview Ready. This count
 // describes saved competency evidence, independently of the optional PRI.
 const assessedCompetencies=competencyRows.filter(item=>typeof item.score==='number'&&Number.isFinite(item.score)&&item.score>=0&&item.score<=100);
 const readyCompetencies=assessedCompetencies.filter(item=>item.score!==null&&item.score>=70).length;
 const readinessAvailable=assessedCompetencies.length>0;
 const readinessTotal=competencyRows.length;
 const readinessProgress=readinessAvailable?100*readyCompetencies/readinessTotal:0;
 const scoreWidth=(value:unknown)=>`${Math.max(0,Math.min(100,typeof value==='number'?value:0))}%`;
 return <div className="vd-reference-scorecard"><section id="glance" className="scroll-mt-4 space-y-3.5 rounded-[1.75rem] border border-sky-100 bg-white p-4 shadow-[0_18px_55px_rgba(15,42,82,0.08)] sm:p-5">
        <header className="report-candidate-header grid items-stretch gap-3 xl:grid-cols-[minmax(30rem,2.7fr)_repeat(3,minmax(9rem,1fr))]">
          <article className="min-w-0 rounded-2xl border border-sky-100 bg-white p-4">
            <div className="flex min-w-0 gap-4">
              {candidatePhoto.studentId === studentId && candidatePhoto.url ? <img src={candidatePhoto.url} alt={`${show(student.full_name, "Candidate")} profile`} className="h-[118px] w-[104px] shrink-0 rounded-xl border border-slate-100 object-cover object-top shadow-sm"/> : <div aria-label={`${show(student.full_name, "Candidate")} initials`} className="grid h-[118px] w-[104px] shrink-0 place-items-center rounded-xl bg-[#123765] text-2xl font-extrabold tracking-wide text-white shadow-sm">{studentInitials || "C"}</div>}
              <div className="min-w-0 flex-1">
                <h1 className="text-[1.75rem] font-extrabold leading-none tracking-[-0.035em] text-[#092653]">{show(student.full_name, "Candidate")}</h1>
                <p className="mt-1.5 text-[13px] font-medium leading-5 text-slate-600">{[student.program, student.department_code, (student.graduation_year ?? candidateProfile.graduation_year) ? `Class of ${String(student.graduation_year ?? candidateProfile.graduation_year)}` : null].filter(Boolean).join(" · ") || "—"}</p>
                <dl className="mt-2.5 space-y-0.5 text-[13px] leading-[1.15rem] text-slate-600">
                  <div className="min-w-0"><dt className="inline font-bold text-[#0b2b59]">Target Role: </dt><dd className="inline">{show(role, "—")}</dd></div>
                  <div className="min-w-0"><dt className="inline font-bold text-[#0b2b59]">Scorecard ID: </dt><dd className="inline break-all">{show(report.session_id, "—")}</dd></div>
                  <div className="min-w-0"><dt className="inline font-bold text-[#0b2b59]">Assessment Date: </dt><dd className="inline">{report.completed_at ? stamp(report.completed_at) : "—"}</dd></div>
                  <div className="min-w-0"><dt className="inline font-bold text-[#0b2b59]">Interview: </dt><dd className="inline">{recordingDuration == null ? "—" : durationLabel(recordingDuration)} · {reviews.length} questions</dd></div>
                </dl>
                {infoMessage && <p role="alert" className="mt-1 text-xs text-rose-700">{infoMessage}</p>}
              </div>
            </div>
          </article>
          <article className="flex min-h-[152px] flex-col rounded-2xl border border-sky-100 bg-[#eef8ff] p-4">
            <p className="text-[13px] font-bold text-[#0b2b59]">Overall Score</p>
            <p className="mt-3 flex items-baseline gap-1 tabular-nums text-[#0b2b59]"><span className="text-[32px] font-extrabold leading-none">{report.overall_score == null ? "—" : report.overall_score}</span>{report.overall_score != null && <span className="text-sm font-semibold">/100</span>}</p>
            <div className="mt-auto pt-4"><div className="h-2 w-full overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#1e7be6]" style={{ width: scoreWidth(report.overall_score) }}/></div></div>
          </article>
          <article className="flex min-h-[152px] flex-col rounded-2xl border border-amber-100 bg-[#fff8e8] p-4">
            <p className="text-[13px] font-bold text-[#0b2b59]">Readiness</p>
            <p className="mt-3 flex items-baseline gap-1 tabular-nums text-[#0b2b59]"><span className="text-[32px] font-extrabold leading-none">{readinessAvailable ? readyCompetencies : "—"}</span>{readinessAvailable && <span className="text-sm font-semibold">/{readinessTotal}</span>}</p>
            <p className="mt-1 text-xs text-slate-600">Competencies at 70/100 or above</p>
            {readinessAvailable&&assessedCompetencies.length<readinessTotal&&<p className="mt-1 text-xs text-slate-600">{assessedCompetencies.length}/{readinessTotal} assessed</p>}
            <span className="mt-2 self-start rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-bold text-amber-800">{readinessLabel}</span>
            <div className="mt-auto pt-3"><div className="h-2 w-full overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-amber-400" style={{ width: scoreWidth(readinessProgress) }}/></div></div>
          </article>
          <article className="flex min-h-[152px] flex-col items-center rounded-2xl border border-teal-100 bg-[#eafaf8] p-4 text-center">
            <p className="text-[13px] font-bold text-[#0b2b59]">Assessment Scope</p>
            <p className="mt-3 text-[32px] font-extrabold leading-none text-[#0b2b59]">{competencyRows.length}</p>
            <p className="mt-1 text-[13px] font-medium text-[#0b2b59]">Competencies</p>
            <div className="mt-auto flex h-8 items-end gap-1" aria-hidden="true"><span className="h-2.5 w-2 rounded-sm bg-teal-300"/><span className="h-5 w-2 rounded-sm bg-teal-400"/><span className="h-8 w-2 rounded-sm bg-teal-600"/></div>
          </article>
        </header>

        <article className="flex items-center gap-4 rounded-2xl border border-sky-100 bg-[#eaf6fd] p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky-200/70 text-[#0b4d86]"><FileText aria-hidden="true" size={25} strokeWidth={2.4}/></span>
          <div className="min-w-0 border-l border-sky-300 pl-4"><h2 className="text-[20px] font-extrabold leading-tight text-[#092653]">Executive Assessment Summary</h2><p className="mt-1 text-sm leading-5 text-slate-700">{show(executiveSummary, "—")}</p></div>
        </article>

        <section>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2"><h2 className="text-[20px] font-extrabold text-[#092653]">Competency Results</h2><span className="text-xs text-slate-500">Saved assessment evidence</span></div>
          <div className="overflow-x-auto rounded-2xl border border-sky-100">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[#e7f4fc] text-[#092653]"><tr><th className="px-4 py-3 font-extrabold">Competency</th><th className="px-4 py-3 font-extrabold">Score</th><th className="px-4 py-3 font-extrabold">Role Target</th><th className="px-4 py-3 font-extrabold">Evidence</th></tr></thead>
              <tbody>{competencyRows.length ? competencyRows.map((item, index) => <tr key={`${item.label}-${index}`} className="border-t border-sky-100">
                <th className="px-4 py-2.5 font-bold text-[#0b2b59]"><span className="flex items-center gap-2.5"><CompetencyIcon label={item.label} index={index}/><span>{item.label}</span></span></th>
                <td className="px-4 py-2.5"><div className="flex items-center gap-3"><strong className="w-14 tabular-nums" style={{ color: competencyColors[index % competencyColors.length] }}>{item.score == null ? "—" : `${item.score}/100`}</strong><div className="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full" style={{ width: scoreWidth(item.score), backgroundColor: competencyColors[index % competencyColors.length] }}/></div></div></td>
                <td className="px-4 py-3 text-slate-700">{item.target == null ? "—" : `${item.target}/100`}</td>
                <td className="max-w-[28rem] px-4 py-2.5 text-[13px] leading-5 text-slate-600">{item.evidence}</td>
              </tr>) : <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No competency results are available in this report.</td></tr>}</tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-teal-100 bg-[#eafaf6] p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-100 text-teal-700"><Trophy aria-hidden="true" size={21}/></span><h2 className="text-lg font-extrabold text-[#092653]">Demonstrated Strengths</h2></div>{strengthBriefs.length ? <ul className="mt-3 space-y-1.5">{strengthBriefs.map((item, index) => <li key={index} className="flex gap-3 text-sm leading-5 text-slate-700"><span aria-hidden="true" className="mt-1.5 grid h-2.5 w-2.5 shrink-0 place-items-center rounded-full bg-teal-600 text-[7px] font-bold leading-none text-white">✓</span><span>{item}</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No strengths are available in this report.</p>}</article>
          <article className="rounded-2xl border border-amber-100 bg-[#fff8e8] p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-rose-600"><Target aria-hidden="true" size={21}/></span><h2 className="text-lg font-extrabold text-[#092653]">Areas to Explore</h2></div>{growthBriefs.length ? <ul className="mt-3 space-y-1.5">{growthBriefs.map((item, index) => <li key={index} className="flex gap-3 text-sm leading-5 text-slate-700"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500"/><span>{item}</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No areas to explore are available in this report.</p>}</article>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-sky-100 bg-white p-4">
            <h2 className="text-lg font-extrabold text-[#092653]">Interview Evidence Highlights</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border border-sky-100">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="bg-[#e7f4fc] text-[#092653]"><tr><th className="px-3 py-2 font-bold">Timestamp</th><th className="px-3 py-2 font-bold">Question / Topic</th><th className="px-3 py-2 font-bold">Score</th></tr></thead>
                <tbody>{evidenceHighlights.length ? evidenceHighlights.map(item => <tr key={item.key} className="border-t border-sky-100">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{item.offset == null ? "—" : <button type="button" disabled={!onSeek} aria-label={`Play interview at ${item.timestamp}`} className="font-semibold text-blue-700 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-700 disabled:cursor-not-allowed disabled:text-slate-400" onClick={() => onSeek?.(item.offset!)}>{item.timestamp}</button>}</td>
                  <td className="px-3 py-2 text-slate-700"><p className="line-clamp-2 leading-4" title={item.question}>{item.question}</p></td>
                  <td className="whitespace-nowrap px-3 py-2 font-bold text-[#0b2b59]">{item.score}</td>
                </tr>) : <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-500">No timestamped question evidence is available.</td></tr>}</tbody>
              </table>
            </div>
          </section>
          <section className="rounded-2xl border border-sky-100 bg-white p-4"><h2 className="text-lg font-extrabold text-[#092653]">Recommended Employer Follow-Up</h2>{followUpBriefs.length ? <ol className="mt-4 space-y-3">{followUpBriefs.map((item, index) => <li key={index} className="flex items-start gap-3 text-sm leading-6 text-slate-700"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#147fdf] text-xs font-extrabold text-white">{index + 1}</span><span>{item}</span></li>)}</ol> : <p className="mt-3 text-sm text-slate-500">No employer follow-up is available in this report.</p>}</section>
        </div>
      </section></div>;
}
