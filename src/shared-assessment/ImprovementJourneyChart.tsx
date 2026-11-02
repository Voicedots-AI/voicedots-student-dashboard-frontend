import { useId, useState } from 'react';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import './improvement-journey-chart.css';

export type Point = { milestone: string; date: string; overall: number; technical: number; communication: number };
const metrics = [
  { key: 'overall', label: 'Overall score', color: '#2563eb' },
  { key: 'technical', label: 'Technical', color: '#0284c7' },
  { key: 'communication', label: 'Communication', color: '#059669' },
] as const;
type Metric = typeof metrics[number]['key'];
function dateLabel(value: string) {
  if (!value) return 'Date unavailable';
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  }).format(parsed);
}

export function ImprovementJourneyChart({ points, onReport }: { points: Point[]; onReport: () => void }) {
  const [metric, setMetric] = useState<Metric>('overall');
  const [focused, setFocused] = useState<number | null>(null);
  const gradient = useId().replace(/:/g, '');
  const selected = metrics.find(item => item.key === metric)!;
  const index = Math.max(0, Math.min(focused ?? points.length - 1, points.length - 1));
  const current = points[index];
  const width = Math.max(760, points.length * 115);
  const x = (i: number) => points.length === 1 ? width / 2 : 70 + i * (width - 140) / (points.length - 1);
  const y = (value: number) => 215 - Math.max(0, Math.min(100, value)) * 1.7;
  const curve = (key: Metric) => points.map((point, i) => {
    if (!i) return `M ${x(i)} ${y(point[key])}`;
    const middle = (x(i-1)+x(i))/2;
    return `C ${middle} ${y(points[i-1][key])}, ${middle} ${y(point[key])}, ${x(i)} ${y(point[key])}`;
  }).join(' ');
  return <section className="improvement-chart" aria-label="Interview improvement journey">
    <header className="improvement-chart-heading">
      <div><span className="improvement-chart-eyebrow"><TrendingUp size={14}/> YOUR INTERVIEW PROGRESS</span>
        <h2>My Improvement Journey</h2><p>Compare your recorded interview scores, one attempt at a time.</p></div>
      <button type="button" className="improvement-chart-report" onClick={onReport}>View detailed report <ArrowUpRight size={16}/></button>
    </header>
    {!current ? <div className="improvement-chart-empty">Your first released interview score will appear here. Future attempts will build your progress chart.</div> : <>
      <div className="improvement-chart-metrics" role="group" aria-label="Highlight a score metric">
        {metrics.map(item => <button key={item.key} type="button" aria-pressed={metric === item.key}
          onClick={() => setMetric(item.key)} className={metric === item.key ? 'selected' : ''}>
          <span><i style={{background:item.color}}/>{item.label}</span>
          <strong style={{color:item.color}}>{current[item.key]}<small>/100</small></strong>
        </button>)}
      </div>
      <div className="improvement-chart-context"><strong>{current.milestone}</strong><span>{dateLabel(current.date)}</span><span className="improvement-chart-count">{points.length} recorded {points.length === 1 ? 'attempt' : 'attempts'}</span></div>
      <div className="improvement-chart-scroll" role="region" aria-label="Scores across interview attempts" tabIndex={0}>
        <svg viewBox={`0 0 ${width} 285`} style={{minWidth:points.length > 5 ? width : undefined}} role="group" aria-label={`${selected.label} highlighted. ${current.milestone}: ${current[metric]} out of 100.`}>
          <defs><linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1"><stop stopColor={selected.color} stopOpacity=".13"/><stop offset="1" stopColor={selected.color} stopOpacity="0"/></linearGradient></defs>
          {[0,25,50,75,100].map(value => <g key={value}><line x1="48" x2={width-30} y1={y(value)} y2={y(value)} stroke="#e8eff8" strokeDasharray={value ? '4 5' : undefined}/><text x="35" y={y(value)+4} textAnchor="end" fill="#8a9bb1" fontSize="11">{value}</text></g>)}
          {points.length > 1 && <path d={`${curve(metric)} L ${x(points.length-1)} 215 L ${x(0)} 215 Z`} fill={`url(#${gradient})`}/>}
          <line x1={x(index)} x2={x(index)} y1="32" y2="215" stroke="#c8d9f2" strokeDasharray="4 5"/>
          {metrics.map(item => <g key={item.key} opacity={metric===item.key ? 1 : .45}>
            {points.length > 1 && <path d={curve(item.key)} fill="none" stroke={item.color} strokeWidth={metric===item.key ? 3 : 2} strokeLinejoin="round" strokeLinecap="round"/>}
            {points.map((point,i) => <circle key={i} cx={x(i)} cy={y(point[item.key])} r={metric===item.key ? 5 : 3.5} fill={item.color} stroke="white" strokeWidth="2"/>)}
          </g>)}
          {points.map((point,i) => <g key={i}>
            <rect x={x(i)-42} y="25" width="84" height="200" fill="transparent" tabIndex={0} role="button"
              aria-label={`${point.milestone}, ${dateLabel(point.date)}: overall ${point.overall}, technical ${point.technical}, communication ${point.communication}`}
              onMouseEnter={()=>setFocused(i)} onFocus={()=>setFocused(i)} onClick={()=>setFocused(i)}
              onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setFocused(i);}}}/>
            {index===i && <g pointerEvents="none"><rect x={x(i)-24} y={y(point[metric])-32} width="48" height="23" rx="7" fill={selected.color}/><text x={x(i)} y={y(point[metric])-16} textAnchor="middle" fontSize="12" fontWeight="700" fill="white">{point[metric]}</text></g>}
            <text x={x(i)} y="243" textAnchor="middle" fontSize="12" fontWeight="600" fill="#294463">{point.milestone}</text>
            <text x={x(i)} y="262" textAnchor="middle" fontSize="10" fill="#8293aa">{dateLabel(point.date)}</text>
          </g>)}
        </svg>
      </div>
      <p className="improvement-chart-note">{points.length===1 ? 'Your starting point is recorded. Complete your next interview to see how your scores change.' : 'Select a metric to highlight it. Select an attempt to compare its three scores.'}</p>
    </>}
  </section>;
}
