import { useEffect, useState } from 'react';
import { ListChecks, CheckCircle2, AlertTriangle, Flag, Users, Building2, TrendingUp } from 'lucide-react';
import useStore from '../store';
import { useLang } from '../hooks/useLang';
import Pagination from '../components/Pagination';

export default function Dashboard() {
  const { stats, loadStats, heatmap, loadHeatmap, user } = useStore();
  const { t } = useLang();

  useEffect(() => { loadStats(); loadHeatmap(); }, []);
  const [hmPage, setHmPage] = useState(1);
  const [hmPerPage, setHmPerPage] = useState(25);

  const STAT_CARDS = [
    { key: 'total_tasks',       labelKey: 'totalTasks',     icon: ListChecks,    color: '#3b82f6' },
    { key: 'done_tasks',        labelKey: 'doneTasks',      icon: CheckCircle2,  color: '#10b981' },
    { key: 'blocked_tasks',     labelKey: 'blockedTasks',   icon: AlertTriangle, color: '#ef4444' },
    { key: 'open_flags',        labelKey: 'openFlags',      icon: Flag,          color: '#f59e0b' },
    { key: 'total_users',       labelKey: 'totalUsers',     icon: Users,         color: '#8b5cf6' },
    { key: 'total_departments', labelKey: 'totalDepts',     icon: Building2,     color: '#06b6d4' },
    { key: 'completion_rate',   labelKey: 'completionRate', icon: TrendingUp,    color: '#10b981', suffix: '%' },
  ];

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard')}</h1>
          <p className="page-subtitle">{t('welcome')}, {user?.full_name} 👋</p>
        </div>
      </div>

      <div className="kpi-grid">
        {STAT_CARDS.map(c => (
          <div key={c.key} className="kpi-card">
            <div className="kpi-icon" style={{ background: c.color + '15', color: c.color }}>
              <c.icon size={22} />
            </div>
            <div className="kpi-data">
              <div className="kpi-value">{stats?.[c.key] ?? '—'}{c.suffix || ''}</div>
              <div className="kpi-label">{t(c.labelKey)}</div>
            </div>
          </div>
        ))}
      </div>

      {(
        <div className="section-card" style={{ marginTop: 24 }}>
          <h2 className="section-title">{t('workloadTitle')}</h2>
          <div className="heatmap-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('employee')}</th>
                  <th>{t('department')}</th>
                  <th>{t('activeTasks')}</th>
                  <th>{t('blockedTasks')}</th>
                  <th>{t('completedTasks')}</th>
                  <th>{t('load')}</th>
                </tr>
              </thead>
              <tbody>
                {heatmap.slice((hmPage - 1) * hmPerPage, hmPage * hmPerPage).map(h => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 600 }}>{h.full_name}</td>
                    <td>{h.department || '—'}</td>
                    <td>{h.active_tasks}</td>
                    <td>{h.blocked_tasks > 0 ? <span className="badge badge-danger">{h.blocked_tasks}</span> : '0'}</td>
                    <td>{h.completed_tasks}</td>
                    <td>
                      <div className="load-bar-track">
                        <div className="load-bar-fill" style={{
                          width: `${Math.min(h.load_pct, 100)}%`,
                          background: h.load_pct > 90 ? '#ef4444' : h.load_pct > 70 ? '#f59e0b' : '#10b981',
                        }} />
                      </div>
                      <span className="load-pct">{h.load_pct}%</span>
                    </td>
                  </tr>
                ))}
                {heatmap.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>{t('noData')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={hmPage} totalItems={heatmap.length} itemsPerPage={hmPerPage}
            onPageChange={p => setHmPage(p)} onItemsPerPageChange={n => { setHmPerPage(n); setHmPage(1); }} />
        </div>
      )}
    </div>
  );
}
