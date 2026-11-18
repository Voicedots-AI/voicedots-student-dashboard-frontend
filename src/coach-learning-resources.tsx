import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  FolderArchive,
  ChevronRight,
  Search,
} from 'lucide-react';
import { PageHeading } from './ui';
import { CoachTopNav } from './coach-top-nav';
import './coach-approved.css';
import { useCoachCallPath } from './coach-call-link';

type ResourceCategory = 'all' | 'technical' | 'system_design' | 'behavioral' | 'company_banks';

type Resource = { id: string | number; category: string; title: string; description: string; readTime: string; skillTag: string; level: string; actionUrl: string; actionLabel: string };

const referenceGuides = [
  { title: 'Python tutorial', match: /\bpython\b/i, url: 'https://docs.python.org/3/tutorial/' },
  { title: 'SQL tutorial', match: /\bsql\b|postgres/i, url: 'https://www.postgresql.org/docs/current/tutorial.html' },
  { title: 'pandas tutorials', match: /\bpandas\b|data cleaning/i, url: 'https://pandas.pydata.org/docs/getting_started/intro_tutorials/' },
  { title: 'Structure interview answers with STAR', match: /communication|ownership|structured thinking|\bstar\b|behavioral/i, url: 'https://nationalcareers.service.gov.uk/careers-advice/interview-advice/the-star-method' },
  { title: 'MDN web development lessons', match: /javascript|\bhtml\b|\bcss\b|front.?end|web development/i, url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development' },
  { title: 'Algorithms lessons and exercises', match: /algorithm|data structure|complexity/i, url: 'https://www.khanacademy.org/computing/computer-science/algorithms' },
];
const exampleQuestions = [
  { question: 'Tell me about a decision you owned on a project.', answer_guidance: 'Explain the situation, your decision, why you made it, and the result you observed.' },
  { question: 'How would you investigate a result that looks wrong?', answer_guidance: 'Define the expected result, check your inputs, test one explanation at a time, and describe how you would verify the fix.' },
];

export function CoachLearningResources({ resources = [], questions = [] }: { resources?: Resource[]; questions?: { question: string; topic?: string; answer_guidance?: string }[] }) {
  const coachPath = useCoachCallPath();
  const [params] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory>('all');
  const [searchQuery, setSearchQuery] = useState(params.get('topic') || '');

  const categories = [
    { id: 'all' as const, label: 'All Resources' },
    { id: 'technical' as const, label: 'Technical Core' },
    { id: 'system_design' as const, label: 'System Design & Architecture' },
    { id: 'behavioral' as const, label: 'HR & Behavioral Frameworks' },
    { id: 'company_banks' as const, label: 'Placement Question Banks' },
  ];

  const filtered = resources.filter(res => {
    const matchesCat = selectedCategory === 'all' || res.category === selectedCategory;
    const matchesSearch = !searchQuery || res.title.toLowerCase().includes(searchQuery.toLowerCase()) || res.description.toLowerCase().includes(searchQuery.toLowerCase()) || res.skillTag.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });
  const topics = [...resources.map(item => `${item.title} ${item.description} ${item.skillTag}`),
    ...questions.map(item => `${item.question} ${item.topic || ''} ${item.answer_guidance || ''}`)].join(' ');
  const guides = referenceGuides.filter(item => item.match.test(topics));
  function resourceAction(item: Resource) {
    if (!item.actionUrl.startsWith('/placement/schedule')) return item.actionUrl;
    const [path, query] = item.actionUrl.split('?');
    const params = new URLSearchParams(query);
    params.set('task', String(item.id));
    return `${path}?${params}`;
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
      {guides.length > 0 && <section className="journey-preview" style={{marginBottom:20}}>
        <h2>Documentation for your practice topics</h2>
        <ul>{guides.map(guide => <li key={guide.url}>
          <a href={guide.url} target="_blank" rel="noopener noreferrer">{guide.title}</a>
        </li>)}</ul>
      </section>}
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

      {/* Resource Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
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
                className="coach-primary"
                style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '9999px' }}
              >
                {item.actionLabel} <ChevronRight size={14} />
              </Link>
            </div>
          </article>
        ))}
      </div>

      <section className="coach-stage-card" style={{marginTop:24,padding:24}}>
        <h2>{questions.length ? 'Practice questions for your drive' : 'Example practice questions'}</h2>
        <p>Try each answer yourself, then review the preparation guidance.</p>
        {(questions.length ? questions : exampleQuestions).map((question,index) => <details key={`${index}-${question.question}`} style={{padding:'16px 0',borderBottom:'1px solid #e2e8f0'}}>
          <summary style={{cursor:'pointer',fontWeight:600}}>{index+1}. {question.question}</summary>
          {'topic' in question && typeof question.topic === 'string' && <p>{question.topic}</p>}
          <p>{question.answer_guidance || 'Discuss your reasoning and examples with your AI Coach.'}</p>
        </details>)}
      </section>

      {!resources.length ? <section className="journey-preview journey-notes">
        <h3>Build a practice checklist</h3>
        <p>Pick one interview answer, write a clearer version, and rehearse it aloud. Ask AI Coach for resources tied to your target role.</p>
        <Link to={coachPath}>Ask AI Coach</Link>
      </section> : filtered.length === 0 && (
        <section className="coach-stage-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <FolderArchive size={36} style={{ color: '#94a3b8', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '16px', color: '#1e293b', marginBottom: '6px' }}>No matching resources found</h3>
          <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '400px', margin: '0 auto 16px auto' }}>
            Try searching for other keywords like "System Design", "SQL", or "STAR method".
          </p>
          <button
            type="button"
            className="coach-secondary"
            onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
          >
            Clear filters
          </button>
        </section>
      )}
    </div>
  );
}
