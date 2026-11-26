import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  FolderArchive,
  ChevronRight,
  Search,
  PlayCircle,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { PageHeading } from './ui';
import { CoachTopNav } from './coach-top-nav';
import './coach-approved.css';
import { useCoachCallPath } from './coach-call-link';
import './coach-resource-library.css';

type ResourceCategory = 'all' | 'technical' | 'system_design' | 'behavioral' | 'company_banks';

type Resource = { id: string | number; category: string; title: string; description: string; readTime: string; skillTag: string; level: string; actionUrl: string; actionLabel: string };

const referenceGuides = [
  { title: 'Computer science course notes', match: /computer science|algorithm|data structure/i, url: 'https://cs50.harvard.edu/x/' },
  { title: 'Java learning guide', match: /\bjava\b(?!script)/i, url: 'https://dev.java/learn/' },
  { title: 'Python tutorial', match: /\bpython\b/i, url: 'https://docs.python.org/3/tutorial/' },
  { title: 'SQL tutorial', match: /\bsql\b|postgres/i, url: 'https://www.postgresql.org/docs/current/tutorial.html' },
  { title: 'pandas tutorials', match: /\bpandas\b|data cleaning/i, url: 'https://pandas.pydata.org/docs/getting_started/intro_tutorials/' },
  { title: 'Structure interview answers with STAR', match: /communication|ownership|structured thinking|confidence|conduct|presentation|\bstar\b|behavioral/i, url: 'https://nationalcareers.service.gov.uk/careers-advice/interview-advice/the-star-method' },
  { title: 'MDN web development lessons', match: /javascript|\bhtml\b|\bcss\b|front.?end|web development/i, url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development' },
  { title: 'Algorithms lessons and exercises', match: /algorithm|data structure|complexity/i, url: 'https://www.khanacademy.org/computing/computer-science/algorithms' },
];
// Public learning material, never a substitute for saved student records.
const learningLibrary = [
  {title:'Java video lessons',topic:'Java',category:'technical',match:/\bjava\b(?!script)/i,format:'video',source:'Oracle · Learn Java',description:'Video lessons and Java exercises from the Java learning site.',url:'https://learn.java/'},
  {title:'Python lectures and exercises',topic:'Python',category:'technical',match:/\bpython\b/i,format:'video',source:'Harvard · CS50P',description:'Python video lessons, course notes and independent practice exercises.',url:'https://cs50.harvard.edu/python/'},
  { title: 'Python for beginners', topic: 'Python · Programming', category: 'technical', match: /\bpython\b/i, format: 'video', source: 'freeCodeCamp · YouTube', description: 'Build your foundations in Python with a guided video course.', url: 'https://www.youtube.com/watch?v=kLZgQWjnUz0' },
  { title: 'SQL and database fundamentals', topic: 'SQL · Databases', category: 'technical', match: /\bsql\b|database/i, format: 'video', source: 'freeCodeCamp · YouTube', description: 'Learn tables, queries, joins and database design using MySQL.', url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY' },
  ...referenceGuides.map(guide => ({ title: guide.title, topic: guide.title, match: guide.match, category: guide.match.test('communication') ? 'behavioral' : 'technical', format: 'website', source: new URL(guide.url).hostname, description: 'Read the guide and apply one idea to your next practice answer.', url: guide.url })),
];

export function matchesCoachTopic(text:string,topic:string){
  const normalize=(value:string)=>value.toLowerCase().replace(/[^a-z0-9+#]+/g,' ').trim();
  const focus=normalize(topic).replace(/\b(programming|skills?|knowledge|fundamentals|basics)\b/g,'').replace(/\s+/g,' ').trim()||normalize(topic);
  return !topic||(` ${normalize(text)} `).includes(` ${focus} `);
}

export function CoachLearningResources({ resources = [], questions = [], focusAreas=[] }: { resources?: Resource[]; questions?: { question: string; topic?: string; answer_guidance?: string }[];focusAreas?:string[] }) {
  const coachPath = useCoachCallPath();
  const [params] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [format, setFormat] = useState('all');
  const [topic,setTopic]=useState(params.get('topic')||'');
  const hints=[...focusAreas,...resources.map(r=>`${r.skillTag} ${r.description}`),...questions.map(q=>`${q.topic||''} ${q.question}`)].join(' ');
  const technologies=['Java','Python','JavaScript','SQL','pandas'].filter(name=>matchesCoachTopic(hints,name));
  const topics=[...new Set([...focusAreas,...resources.map(r=>r.skillTag),...technologies].filter(Boolean))];
  useEffect(()=>{setTopic(params.get('topic')||'');setSearchQuery('');},[params.get('topic')]);
  const matchesTopic=(text:string)=>matchesCoachTopic(text,topic);

  const categories = [
    { id: 'all' as const, label: 'All Resources' },
    { id: 'technical' as const, label: 'Technical Core' },
    { id: 'system_design' as const, label: 'System Design & Architecture' },
    { id: 'behavioral' as const, label: 'HR & Behavioral Frameworks' },
    { id: 'company_banks' as const, label: 'Placement Question Banks' },
  ];

  const filtered = resources.filter(res => {
    const matchesCat = (selectedCategory === 'all' || res.category === selectedCategory) && format === 'all';
    const matchesSearch = !searchQuery || res.title.toLowerCase().includes(searchQuery.toLowerCase()) || res.description.toLowerCase().includes(searchQuery.toLowerCase()) || res.skillTag.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch && matchesTopic(`${res.skillTag} ${res.title}`);
  });
  const library = learningLibrary.filter(item =>
    topics.some(focus=>item.match.test(focus)) && (!topic||item.match.test(topic)) &&
    (selectedCategory === 'all' || item.category === selectedCategory) &&
    (format === 'all' || item.format === format) &&
    (!searchQuery.trim() || `${item.title} ${item.topic} ${item.source} ${item.description}`.toLowerCase().includes(searchQuery.trim().toLowerCase())));
  const visibleQuestions = questions.filter(item => matchesTopic(`${item.topic||''} ${item.question}`) && (
    !searchQuery.trim() || `${item.question} ${'topic' in item ? item.topic : ''} ${item.answer_guidance || ''}`.toLowerCase().includes(searchQuery.trim().toLowerCase())));
  function resourceAction(item: Resource) {
    if(!item.actionUrl.startsWith('/')){try{const url=new URL(item.actionUrl);return url.protocol==='https:'?url.href:'#';}catch{return '#';}}
    if(item.actionUrl.startsWith('//'))return '#';
    if (!item.actionUrl.startsWith('/placement/schedule')) return item.actionUrl;
    const [path, query] = item.actionUrl.split('?');
    const target = new URLSearchParams(query);
    target.set('task', String(item.id));
    if(params.get('report_session_id'))target.set('report_session_id',params.get('report_session_id')!);
    return `${path}?${target}`;
  }

  return (
    <div className="coach-approved-page">
      <CoachTopNav activeTab="resources" />

      <div style={{ marginBottom: '16px' }}>
        <Link to={coachPath} className="coach-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '9999px', fontSize: '12px' }}>
          <ArrowLeft size={14} /> Back to AI Coach
        </Link>
      </div>

      <header className="coach-approved-heading" style={{ marginBottom: '24px' }}>
        <div>
          <div className="coach-approved-crumb">Workspace / AI Coach / Resources</div>
          <PageHeading eyebrow="AI COACH CURRICULUM" title="Learning Resources & Practice Questions">
            Topic-wise revision notes, high-yield practice questions, and interview preparation guides.
          </PageHeading>
        </div>
      </header>

      {/* Category Bar and Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`coach-secondary ${selectedCategory === cat.id ? 'active' : ''}`}
              style={{
                borderRadius: '9999px',
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: 600,
                borderColor: selectedCategory === cat.id ? '#6366f1' : '#e2e8f0',
                background: selectedCategory === cat.id ? '#f5f3ff' : '#ffffff',
                color: selectedCategory === cat.id ? '#4f46e5' : '#475569',
              }}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: '240px', maxWidth: '320px', width: '100%' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            aria-label="Search learning resources and questions"
            placeholder="Search questions & topics…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '9999px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
              background: '#ffffff',
            }}
          />
        </div>
      </div>

      <label className="coach-topic-selector">Focus skill<select aria-label="Focus skill" value={topic} onChange={e=>setTopic(e.target.value)}><option value="">All saved focus skills</option>{topics.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
      <div className="resource-format-tabs" aria-label="Resource format">
        {[['all', 'All formats'], ['video', 'YouTube videos'], ['website', 'Websites & guides']].map(([value, label]) =>
          <button key={value} type="button" aria-pressed={format === value} onClick={() => setFormat(value)}>{label}</button>)}
      </div>
      {/* Resource Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '20px' }}>
        {filtered.map((item) => (
          <article
            key={item.id}
            className="coach-stage-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '22px',
              borderRadius: '14px',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#6366f1', letterSpacing: '0.05em' }}>
                  {item.skillTag}
                </span>
                <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                  {item.level}
                </span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.55, margin: '0 0 16px 0' }}>
                {item.description}
              </p>
            </div>

            <div style={{ paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>{item.readTime}</span>
              <Link
                to={resourceAction(item)}
                target={item.actionUrl.startsWith('https://')?'_blank':undefined} rel={item.actionUrl.startsWith('https://')?'noopener noreferrer':undefined}
                className="coach-primary"
                style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '9999px' }}
              >
                {item.actionLabel} <ChevronRight size={14} />
              </Link>
            </div>
          </article>
        ))}
      </div>

      <section className="resource-library" aria-label="Learning library">
        <div className="resource-section-heading"><div><h2>Learn, then put it into practice</h2><p>Public learning links matched to the selected topic and recorded assessment context. Your progress changes only when you complete an activity.</p></div><span>{library.length} links</span></div>
        <div className="resource-library-grid">{library.map(item => <article className="resource-library-card" key={item.url}>
          <div className={`resource-library-icon ${item.format}`} aria-hidden="true">{item.format === 'video' ? <PlayCircle size={25}/> : <BookOpen size={25}/>}</div>
          <span className="resource-library-source">{item.source}</span>
          <h3>{item.title}</h3><p>{item.description}</p>
          <a href={item.url} target="_blank" rel="noopener noreferrer">{item.format === 'video' ? 'Watch on YouTube' : 'Open website'}<ExternalLink size={14}/><span className="resource-sr-only"> (opens in a new tab)</span></a>
        </article>)}</div>
      </section>

      <section className="coach-stage-card" style={{marginTop:24,padding:24}}>
        <h2>Practice questions from your interview</h2>
        <p>Try each answer yourself, then review the preparation guidance.</p>
        {visibleQuestions.length === 0 && <p>No questions match this search. Try a different topic.</p>}
        {visibleQuestions.map((question,index) => <details key={`${index}-${question.question}`} style={{padding:'16px 0',borderBottom:'1px solid #e2e8f0'}}>
          <summary style={{cursor:'pointer',fontWeight:600}}>{index+1}. {question.question}</summary>
          {'topic' in question && typeof question.topic === 'string' && <p>{question.topic}</p>}
          <p>{question.answer_guidance || 'Discuss your reasoning and examples with your AI Coach.'}</p>
        </details>)}
      </section>

      {!resources.length && library.length > 0 ? <section className="journey-preview journey-notes">
        <h3>Build a practice checklist</h3>
        <p>Pick one interview answer, write a clearer version, and rehearse it aloud. Ask AI Coach for resources tied to your target role.</p>
        <Link to={coachPath}>Ask AI Coach</Link>
      </section> : filtered.length === 0 && library.length === 0 && (
        <section className="coach-stage-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <FolderArchive size={36} style={{ color: '#94a3b8', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '16px', color: '#1e293b', marginBottom: '6px' }}>No matching resources found</h3>
          <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '400px', margin: '0 auto 16px auto' }}>
            Try searching for other keywords like "System Design", "SQL", or "STAR method".
          </p>
          <button
            type="button"
            className="coach-secondary"
            onClick={() => { setSelectedCategory('all'); setSearchQuery(''); setFormat('all'); }}
          >
            Clear filters
          </button>
        </section>
      )}
    </div>
  );
}
