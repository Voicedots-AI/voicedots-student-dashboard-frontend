import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Flame,
  Target,
  Clock,
  Award,
  ChevronRight,
} from 'lucide-react';
import { PageHeading } from './ui';
import { CoachTopNav } from './coach-top-nav';
import './coach-approved.css';

export function CoachDailyProgress() {
  const stats = [
    { label: 'Current Streak', value: '4 Days', sub: 'Personal best: 7 days', icon: Flame, color: '#f59e0b' },
    { label: 'Completed Sessions', value: '12', sub: 'Across 3 preparation plans', icon: CheckCircle2, color: '#10b981' },
    { label: 'Practice Time', value: '3.5 Hrs', sub: 'Avg 22 mins per day', icon: Clock, color: '#6366f1' },
    { label: 'Target Readiness', value: '78%', sub: '+14% improvement this week', icon: Target, color: '#ec4899' },
  ];

  const skillProgress = [
    { skill: 'Structured Thinking', score: 82, trend: '+12%', status: 'Strong', color: '#10b981' },
    { skill: 'Resume Ownership', score: 76, trend: '+8%', status: 'Improving', color: '#6366f1' },
    { skill: 'Communication & Tone', score: 70, trend: '+15%', status: 'Target Met', color: '#10b981' },
    { skill: 'Problem Formulation', score: 64, trend: '+5%', status: 'Practice Needed', color: '#f59e0b' },
  ];

  const recentMilestones = [
    { title: 'Completed Day 3: Object-Oriented Architecture', plan: 'TCS Placement Prep', time: 'Today, 2:30 PM', badge: 'Completed' },
    { title: 'Passed Diagnostic Baseline with Neha', plan: 'General SDE Interview', time: 'Yesterday', badge: 'Validated' },
    { title: 'Mock Interview: Behavioral Situational Questions', plan: 'Amazon Leadership Principles', time: '2 days ago', badge: 'Completed' },
  ];

  return (
    <div className="coach-approved-page">
      <CoachTopNav activeTab="plan" />

      <div style={{ marginBottom: '16px' }}>
        <Link to="/coach" className="coach-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '9999px', fontSize: '12px' }}>
          <ArrowLeft size={14} /> Back to AI Coach
        </Link>
      </div>

      <header className="coach-approved-heading" style={{ marginBottom: '24px' }}>
        <div>
          <div className="coach-approved-crumb">Workspace / AI Coach / Daily Progress</div>
          <PageHeading eyebrow="AI COACH INSIGHTS" title="Daily Progress & Performance Tracking">
            Track your daily learning consistency, mock test milestones, and skill performance growth over time.
          </PageHeading>
        </div>
      </header>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="coach-stage-card"
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>{stat.label}</span>
                <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${stat.color}15`, display: 'grid', placeItems: 'center', color: stat.color }}>
                  <Icon size={18} />
                </span>
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>{stat.value}</div>
              <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 500 }}>{stat.sub}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(280px, 1.2fr)', gap: '24px' }}>
        {/* Skill Performance Breakdown */}
        <section className="coach-stage-card">
          <div className="coach-card-kicker">SKILL TRACKING</div>
          <h2 style={{ fontSize: '18px', margin: '0 0 16px 0', fontWeight: 600 }}>Skill Mastery & Assessment Trends</h2>
          <p className="coach-muted" style={{ marginBottom: '20px' }}>
            Calculated from your diagnostic quizzes, AI Coach sessions with Neha, and mock interview answers.
          </p>

          <div style={{ display: 'grid', gap: '16px' }}>
            {skillProgress.map((item) => (
              <div key={item.skill} style={{ display: 'grid', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <strong style={{ color: '#1e293b' }}>{item.skill}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600 }}>{item.trend}</span>
                    <span style={{ color: '#475569', fontWeight: 700 }}>{item.score}%</span>
                  </div>
                </div>
                <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${item.score}%`,
                      background: item.color,
                      borderRadius: '9999px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Next AI evaluation scheduled on next completed lesson</span>
            <Link to="/coach" className="coach-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
              Practice with AI Coach <ChevronRight size={14} />
            </Link>
          </div>
        </section>

        {/* Recent Milestones & Schedule Overview */}
        <section className="coach-stage-card">
          <div className="coach-card-kicker">DAILY TIMELINE</div>
          <h2 style={{ fontSize: '18px', margin: '0 0 16px 0', fontWeight: 600 }}>Recent Activity & Milestones</h2>
          <div style={{ display: 'grid', gap: '14px' }}>
            {recentMilestones.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  border: '1px solid #f1f5f9',
                  borderRadius: '10px',
                  background: '#fafbfc',
                  display: 'grid',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>{item.plan}</span>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '9999px', background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>
                    {item.badge}
                  </span>
                </div>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>{item.title}</strong>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{item.time}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '20px', padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Award size={24} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <div>
              <strong style={{ display: 'block', fontSize: '12px', color: '#1e293b' }}>Weekly Placement Target</strong>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Complete 2 more practice drills to unlock Drive-Ready Certification.</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
