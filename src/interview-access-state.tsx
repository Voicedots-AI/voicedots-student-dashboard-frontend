import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import './interview-access-state.css';

export function InterviewAccessState({ title, children, retry }: { title: string; children: ReactNode; retry?: () => void }) {
  return <section className="interview-access-state" aria-labelledby="interview-access-title">
    <div className="interview-access-card">
      <span className="interview-access-icon" aria-hidden="true"><LockKeyhole size={30}/></span>
      <p className="interview-access-eyebrow">YOUR NEXT STEP</p>
      <h1 id="interview-access-title">{title}</h1>
      <div className="interview-access-description" role="status">{children}</div>
      <div className="interview-access-actions">
        <Link className="button primary" to="/placements">View placement drives <ArrowRight size={17}/></Link>
        {retry && <button className="button secondary" onClick={retry}>Check again</button>}
      </div>
    </div>
  </section>;
}
