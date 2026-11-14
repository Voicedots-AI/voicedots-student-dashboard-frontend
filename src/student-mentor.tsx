import { Navigate, useSearchParams } from 'react-router-dom';
import StudentMentoringWorkspace from './mentoring-workspace/StudentMentoringWorkspace';
import './student-mentor.css';

const workspaceViews: Record<string, string> = {
  dashboard: 'Dashboard',
  discussions: 'Discussions',
  tasks: 'Tasks & Schedule',
};

export function StudentMentor() {
  const [params, setParams] = useSearchParams();
  const section = params.get('section') || 'dashboard';
  if (section === 'communications') return <Navigate to="/mentor?section=discussions" replace />;
  if (section === 'profile') return <Navigate to="/mentor?section=dashboard" replace />;

  const changeView = (view: string) => {
    const nextSection = Object.entries(workspaceViews).find(([, label]) => label === view)?.[0] || 'dashboard';
    setParams(previous => {
      const next = new URLSearchParams(previous);
      next.set('section', nextSection);
      return next;
    });
  };

  return <div className="sm-page"><StudentMentoringWorkspace activeView={workspaceViews[section] || 'Dashboard'} onViewChange={changeView}/></div>;
}
