// ══════════════════════════════════════════════════════════
// SmartTask Pro — Calendar View (Tasks + Flags)
// ══════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Filter, User, Clock, AlertCircle, Building2, Flag, ListChecks, Paperclip, Link2,
} from 'lucide-react';
import useStore from '../store';
import { useLang } from '../hooks/useLang';
import api from '../api';

const STATUS_COLORS = {
  todo:        { bg: '#6366f118', border: '#6366f1', text: '#818cf8' },
  in_progress: { bg: '#3b82f618', border: '#3b82f6', text: '#60a5fa' },
  blocked:     { bg: '#ef444418', border: '#ef4444', text: '#f87171' },
  in_review:   { bg: '#f59e0b18', border: '#f59e0b', text: '#fbbf24' },
  done:        { bg: '#10b98118', border: '#10b981', text: '#34d399' },
};

const FLAG_URGENCY_COLORS = {
  normal:   { bg: '#10b98115', border: '#10b981', text: '#10b981' },
  urgent:   { bg: '#f59e0b15', border: '#f59e0b', text: '#f59e0b' },
  critical: { bg: '#ef444415', border: '#ef4444', text: '#ef4444' },
};

const VIEWS = ['month', 'week', 'day'];

function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7;
  const days = [];
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, isCurrentMonth: false });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  while (days.length < 42) {
    const d = new Date(year, month + 1, days.length - startPad - lastDay.getDate() + 1);
    days.push({ date: d, isCurrentMonth: false });
  }
  return days;
}

function getWeekDays(baseDate) {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const days = [];
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    days.push(current);
  }
  return days;
}

function sameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function formatDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function CalendarPage() {
  const { t } = useLang();
  const [tasks, setTasks] = useState([]);
  const [flags, setFlags] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');  // 'all' | 'tasks' | 'flags'
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [tasksData, flagsData, usersData, deptsData, attachData] = await Promise.all([
          api.getTasks(),
          api.getFlags(),
          api.getUsers(),
          api.getDepartments(),
          api.getAttachments(),
        ]);
        setTasks(tasksData);
        setFlags(flagsData);
        setUsers(usersData);
        setDepartments(deptsData);
        // Group attachments by flag_id and task_id
        const byFlag = {};
        const byTask = {};
        attachData.forEach(a => {
          if (a.flag_id) {
            if (!byFlag[a.flag_id]) byFlag[a.flag_id] = [];
            byFlag[a.flag_id].push(a);
          }
          if (a.task_id) {
            if (!byTask[a.task_id]) byTask[a.task_id] = [];
            byTask[a.task_id].push(a);
          }
        });
        setAttachments({ flags: byFlag, tasks: byTask });
      } catch (e) {
        console.error('Calendar load error:', e);
      }
      setLoading(false);
    };
    load();
  }, []);

  const deptMap = useMemo(() => {
    const m = {};
    departments.forEach(d => { m[d.id] = d.name; });
    return m;
  }, [departments]);

  // ── Task map for flags ──
  const taskMap = useMemo(() => {
    const m = {};
    tasks.forEach(t => { m[t.id] = t; });
    return m;
  }, [tasks]);

  // ── Unified calendar items ──
  const calendarItems = useMemo(() => {
    const items = [];

    // Add tasks (if type is all or tasks)
    if (selectedType === 'all' || selectedType === 'tasks') {
      tasks.forEach(task => {
        if (!task.deadline) return;
        if (selectedUser !== 'all' && task.assigned_to !== parseInt(selectedUser)) return;
        if (selectedStatus !== 'all' && task.status !== selectedStatus) return;
        if (selectedDept !== 'all' && task.department_id !== parseInt(selectedDept)) return;
        items.push({
          type: 'task',
          id: `task-${task.id}`,
          date: new Date(task.deadline),
          title: task.title,
          data: task,
          assignee: users.find(u => u.id === task.assigned_to),
        });
      });
    }

    // Add flags (if type is all or flags)
    if (selectedType === 'all' || selectedType === 'flags') {
      flags.forEach(flag => {
        // Use SLA deadline as the calendar date
        const flagDate = flag.sla_deadline || flag.created_at;
        if (!flagDate) return;
        // Filter by user (raised_by or assigned_to)
        if (selectedUser !== 'all') {
          const uid = parseInt(selectedUser);
          if (flag.raised_by !== uid && flag.assigned_to !== uid) return;
        }
        // Filter by status
        if (selectedStatus !== 'all') {
          if (flag.status !== selectedStatus) return;
        }
        // Filter by department (via task)
        if (selectedDept !== 'all') {
          const parentTask = taskMap[flag.task_id];
          if (!parentTask || parentTask.department_id !== parseInt(selectedDept)) return;
        }
        const parentTask = taskMap[flag.task_id];
        items.push({
          type: 'flag',
          id: `flag-${flag.id}`,
          date: new Date(flagDate),
          title: `🚩 ${flag.task_title || ''}`,
          data: flag,
          assignee: users.find(u => u.id === flag.assigned_to),
          parentTask,
        });
      });
    }

    return items;
  }, [tasks, flags, selectedUser, selectedStatus, selectedDept, selectedType, users, taskMap]);

  const itemsByDate = useMemo(() => {
    const map = {};
    calendarItems.forEach(item => {
      const key = formatDateKey(item.date);
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [calendarItems]);

  const navigate = useCallback((dir) => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  }, [currentDate, view]);

  const goToday = useCallback(() => setCurrentDate(new Date()), []);

  const monthNames = {
    fr: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
    en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    it: ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'],
  };
  const dayNames = {
    fr: ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'],
    en: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    it: ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'],
  };
  const dayNamesFull = {
    fr: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
    en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    it: ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'],
  };

  const lang = localStorage.getItem('st_lang') || 'fr';
  const today = new Date();

  const stats = useMemo(() => {
    const taskCount = calendarItems.filter(i => i.type === 'task').length;
    const flagCount = calendarItems.filter(i => i.type === 'flag').length;
    const overdue = calendarItems.filter(i => {
      if (i.type === 'task' && i.data.status === 'done') return false;
      if (i.type === 'flag' && i.data.status === 'closed') return false;
      return i.date < today;
    }).length;
    return { taskCount, flagCount, overdue, total: taskCount + flagCount };
  }, [calendarItems]);

  const renderItemPill = (item) => {
    if (item.type === 'task') {
      const task = item.data;
      const sc = STATUS_COLORS[task.status] || STATUS_COLORS.todo;
      const isOverdue = task.deadline && new Date(task.deadline) < today && task.status !== 'done';
      const firstName = item.assignee ? item.assignee.full_name.split(' ')[0] : '';
      return (
        <div
          key={item.id}
          className={`cal-task-pill ${isOverdue ? 'overdue' : ''}`}
          style={{ '--task-bg': sc.bg, '--task-border': sc.border, '--task-text': sc.text }}
          onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
          title={`${task.title} — ${item.assignee ? item.assignee.full_name : t('unassigned')} (${t(task.status)})`}
        >
          <span className="cal-task-dot" style={{ background: sc.border }} />
          <span className="cal-task-title">{task.title}</span>
          {item.assignee && (
            <span className="cal-task-assignee">
              <span className="cal-task-avatar">{firstName.charAt(0)}</span>
              {firstName}
            </span>
          )}
        </div>
      );
    } else {
      // Flag pill
      const flag = item.data;
      const uc = FLAG_URGENCY_COLORS[flag.urgency] || FLAG_URGENCY_COLORS.normal;
      const isOverdue = flag.sla_deadline && new Date(flag.sla_deadline) < today && flag.status !== 'closed';
      const assigneeName = item.assignee ? item.assignee.full_name.split(' ')[0] : '';
      return (
        <div
          key={item.id}
          className={`cal-task-pill cal-flag-pill ${isOverdue ? 'overdue' : ''}`}
          style={{ '--task-bg': uc.bg, '--task-border': uc.border, '--task-text': uc.text }}
          onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
          title={`🚩 ${flag.task_title} — ${flag.urgency}`}
        >
          <Flag size={10} style={{ color: uc.border, flexShrink: 0 }} />
          <span className="cal-task-title">{flag.task_title || flag.description?.slice(0, 30)}</span>
          {assigneeName && (
            <span className="cal-task-assignee">
              <span className="cal-task-avatar" style={{ background: uc.border }}>{assigneeName.charAt(0)}</span>
              {assigneeName}
            </span>
          )}
        </div>
      );
    }
  };

  const renderMonthView = () => {
    const grid = getMonthGrid(currentDate.getFullYear(), currentDate.getMonth());
    return (
      <div className="cal-month-grid">
        {dayNames[lang].map(dn => (
          <div key={dn} className="cal-day-header">{dn}</div>
        ))}
        {grid.map((cell, i) => {
          const key = formatDateKey(cell.date);
          const dayItems = itemsByDate[key] || [];
          const isToday = sameDay(cell.date, today);
          const maxShow = 3;
          const taskCount = dayItems.filter(i => i.type === 'task').length;
          const flagCount = dayItems.filter(i => i.type === 'flag').length;
          return (
            <div key={i} className={`cal-day-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''}`}>
              <div className="cal-day-number">
                <span className={isToday ? 'today-badge' : ''}>{cell.date.getDate()}</span>
                <div className="cal-day-counts">
                  {taskCount > 0 && <span className="cal-day-count cal-count-task">{taskCount}</span>}
                  {flagCount > 0 && <span className="cal-day-count cal-count-flag">{flagCount}</span>}
                </div>
              </div>
              <div className="cal-day-tasks">
                {dayItems.slice(0, maxShow).map(item => renderItemPill(item))}
                {dayItems.length > maxShow && (
                  <div className="cal-more">+{dayItems.length - maxShow} {t('calMore')}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    return (
      <div className="cal-week-columns">
        {weekDays.map((d, i) => {
          const key = formatDateKey(d);
          const dayItems = itemsByDate[key] || [];
          const isToday = sameDay(d, today);
          const taskCount = dayItems.filter(it => it.type === 'task').length;
          const flagCount = dayItems.filter(it => it.type === 'flag').length;
          return (
            <div key={i} className={`cal-week-col ${isToday ? 'is-today' : ''}`}>
              <div className="cal-week-col-header">
                <span className="cal-week-day-name">{dayNames[lang][i]}</span>
                <span className={`cal-week-day-num ${isToday ? 'today-badge' : ''}`}>{d.getDate()}</span>
                <div className="cal-day-counts" style={{ marginLeft: 'auto' }}>
                  {taskCount > 0 && <span className="cal-count-task">{taskCount}</span>}
                  {flagCount > 0 && <span className="cal-count-flag">{flagCount}</span>}
                </div>
              </div>
              <div className="cal-week-col-body">
                {dayItems.length === 0 && (
                  <div className="cal-week-empty">—</div>
                )}
                {dayItems.map(item => renderItemPill(item))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const isImage = (name) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);

  const renderDayView = () => {
    const key = formatDateKey(currentDate);
    const dayItems = itemsByDate[key] || [];
    const dayTasks = dayItems.filter(it => it.type === 'task');
    const dayFlags = dayItems.filter(it => it.type === 'flag');
    const isToday = sameDay(currentDate, today);
    return (
      <div className="cal-day-view">
        <div className="cal-day-view-header">
          <span className={`cal-day-view-date ${isToday ? 'today-badge' : ''}`}>
            {currentDate.getDate()}
          </span>
          <span className="cal-day-view-info">
            {dayNamesFull[lang][currentDate.getDay()]} — {monthNames[lang][currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <div className="cal-day-counts" style={{ marginLeft: 'auto' }}>
            {dayTasks.length > 0 && <span className="cal-count-task">{dayTasks.length} {t('calTypeTasks')}</span>}
            {dayFlags.length > 0 && <span className="cal-count-flag">{dayFlags.length} {t('calTypeFlags')}</span>}
          </div>
        </div>
        {dayItems.length === 0 && (
          <div className="empty-state" style={{ padding: '60px 0' }}>
            <CalendarIcon size={40} />
            <h3>{t('calNoTasks')}</h3>
          </div>
        )}
        <div className="cal-day-view-items">
          {dayItems.map(item => {
            if (item.type === 'task') {
              const task = item.data;
              const sc = STATUS_COLORS[task.status] || STATUS_COLORS.todo;
              const taskAttach = (attachments.tasks || {})[task.id] || [];
              return (
                <div key={item.id} className="cal-day-item" style={{ borderLeft: `4px solid ${sc.border}` }}
                  onClick={() => setSelectedItem(item)}>
                  <div className="cal-day-item-top">
                    <span className="badge" style={{ background: sc.bg, color: sc.text }}>{t(task.status)}</span>
                    <span className="cal-day-item-dept">{deptMap[task.department_id]}</span>
                    {task.deadline && (
                      <span className="cal-day-item-time"><Clock size={12} /> {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                  </div>
                  <h4 className="cal-day-item-title">{task.title}</h4>
                  {task.description && <p className="cal-day-item-desc">{task.description}</p>}
                  <div className="cal-day-item-meta">
                    {item.assignee && <span><User size={12} /> {item.assignee.full_name}</span>}
                    <span>{'★'.repeat(task.importance)}{'☆'.repeat(5 - task.importance)}</span>
                  </div>
                  {task.link && (
                    <a href={task.link} target="_blank" rel="noopener noreferrer" className="flag-link" style={{ marginTop: 6, fontSize: '.75rem' }}
                      onClick={e => e.stopPropagation()}>
                      <Link2 size={11} /> {task.link}
                    </a>
                  )}
                  {taskAttach.length > 0 && (
                    <div className="cal-day-item-attach">
                      {taskAttach.map(a => (
                        isImage(a.file_name) ? (
                          <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                            <img src={a.file_url} alt={a.file_name} className="cal-day-item-img" />
                          </a>
                        ) : (
                          <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer" className="flag-attach-file" onClick={e => e.stopPropagation()}>
                            <Paperclip size={11} /> {a.file_name}
                          </a>
                        )
                      ))}
                    </div>
                  )}
                </div>
              );
            } else {
              const flag = item.data;
              const uc = FLAG_URGENCY_COLORS[flag.urgency] || FLAG_URGENCY_COLORS.normal;
              const flagAttach = (attachments.flags || {})[flag.id] || [];
              return (
                <div key={item.id} className="cal-day-item cal-day-item-flag" style={{ borderLeft: `4px dashed ${uc.border}` }}
                  onClick={() => setSelectedItem(item)}>
                  <div className="cal-day-item-top">
                    <span className="badge" style={{ background: uc.bg, color: uc.text }}>🚩 {t(`urg${flag.urgency.charAt(0).toUpperCase() + flag.urgency.slice(1)}`)}</span>
                    <span className="badge" style={{ background: '#64748b18', color: '#64748b' }}>{flag.status}</span>
                  </div>
                  <h4 className="cal-day-item-title">🚩 {flag.task_title}</h4>
                  <p className="cal-day-item-desc">{flag.description}</p>
                  <div className="cal-day-item-meta">
                    {flag.raiser_name && <span>{t('raisedBy')} {flag.raiser_name}</span>}
                    {flag.assignee_name && <span>→ {flag.assignee_name}</span>}
                  </div>
                  {flagAttach.length > 0 && (
                    <div className="cal-day-item-attach">
                      {flagAttach.map(a => (
                        isImage(a.file_name) ? (
                          <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer">
                            <img src={a.file_url} alt={a.file_name} className="cal-day-item-img" />
                          </a>
                        ) : (
                          <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer" className="flag-attach-file">
                            <Paperclip size={11} /> {a.file_name}
                          </a>
                        )
                      ))}
                    </div>
                  )}
                </div>
              );
            }
          })}
        </div>
      </div>
    );
  };

  const renderDetailModal = () => {
    if (!selectedItem) return null;
    const item = selectedItem;

    if (item.type === 'task') {
      const task = item.data;
      const sc = STATUS_COLORS[task.status] || STATUS_COLORS.todo;
      const isOverdue = task.deadline && new Date(task.deadline) < today && task.status !== 'done';
      return (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '480px' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ListChecks size={18} style={{ color: sc.border }} />
                {t('calTaskDetail')}
              </h2>
              <button className="icon-btn" onClick={() => setSelectedItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="cal-modal-task-title">{task.title}</div>
              {task.description && <p className="cal-modal-desc">{task.description}</p>}
              <div className="cal-modal-grid">
                <div className="cal-modal-field">
                  <span className="cal-modal-label">{t('status')}</span>
                  <span className="badge" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}40` }}>
                    ● {t(task.status)}
                  </span>
                </div>
                <div className="cal-modal-field">
                  <span className="cal-modal-label">{t('department')}</span>
                  <span>{deptMap[task.department_id] || '—'}</span>
                </div>
                <div className="cal-modal-field">
                  <span className="cal-modal-label">{t('assignedTo')}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {item.assignee ? (
                      <><span className="avatar-xs">{item.assignee.full_name.charAt(0)}</span>{item.assignee.full_name}</>
                    ) : t('unassigned')}
                  </span>
                </div>
                <div className="cal-modal-field">
                  <span className="cal-modal-label">{t('deadline')}</span>
                  <span className={isOverdue ? 'text-danger' : ''}>
                    {task.deadline ? new Date(task.deadline).toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'it' ? 'it-IT' : 'en-US', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    }) : '—'}
                    {isOverdue && <span className="cal-overdue-badge"> ⚠ {t('calOverdue')}</span>}
                  </span>
                </div>
                <div className="cal-modal-field">
                  <span className="cal-modal-label">{t('importance')}</span>
                  <span>{'★'.repeat(task.importance)}{'☆'.repeat(5 - task.importance)}</span>
                </div>
                <div className="cal-modal-field">
                  <span className="cal-modal-label">{t('estimation')}</span>
                  <span>{task.estimated_hours || 0}h</span>
                </div>
                {task.link && (
                  <div className="cal-modal-field" style={{ gridColumn: '1 / -1' }}>
                    <span className="cal-modal-label"><Link2 size={13} /> {t('taskLink')}</span>
                    <a href={task.link} target="_blank" rel="noopener noreferrer" className="flag-link" style={{ marginTop: 0 }}>
                      {task.link}
                    </a>
                  </div>
                )}
                {(() => {
                  const taskAttach = (attachments.tasks || {})[task.id] || [];
                  if (taskAttach.length === 0) return null;
                  return (
                    <div className="cal-modal-field" style={{ gridColumn: '1 / -1' }}>
                      <span className="cal-modal-label"><Paperclip size={13} /> {t('flagAttachments')} ({taskAttach.length})</span>
                      <div className="cal-modal-attachments">
                        {taskAttach.map(a => (
                          <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer" className="cal-modal-attach-item">
                            {isImage(a.file_name) ? (
                              <img src={a.file_url} alt={a.file_name} className="cal-modal-attach-img" />
                            ) : (
                              <span className="flag-attach-file"><Paperclip size={12} /> {a.file_name}</span>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      // Flag detail modal
      const flag = item.data;
      const uc = FLAG_URGENCY_COLORS[flag.urgency] || FLAG_URGENCY_COLORS.normal;
      const isOverdue = flag.sla_deadline && new Date(flag.sla_deadline) < today && flag.status !== 'closed';
      return (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '480px' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flag size={18} style={{ color: uc.border }} />
                🚩 {t('flags')}
              </h2>
              <button className="icon-btn" onClick={() => setSelectedItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="cal-modal-task-title">{flag.task_title}</div>
              <p className="cal-modal-desc">{flag.description}</p>
              <div className="cal-modal-grid">
                <div className="cal-modal-field">
                  <span className="cal-modal-label">{t('status')}</span>
                  <span className="badge" style={{ background: uc.bg, color: uc.text, border: `1px solid ${uc.border}40` }}>
                    🚩 {t(`flag${flag.status.charAt(0).toUpperCase() + flag.status.slice(1)}`) || flag.status}
                  </span>
                </div>
                <div className="cal-modal-field">
                  <span className="cal-modal-label">{t('urgency')}</span>
                  <span className="badge" style={{ background: uc.bg, color: uc.text }}>
                    {t(`urg${flag.urgency.charAt(0).toUpperCase() + flag.urgency.slice(1)}`)}
                  </span>
                </div>
                <div className="cal-modal-field">
                  <span className="cal-modal-label">{t('raisedBy')}</span>
                  <span>{flag.raiser_name || '—'}</span>
                </div>
                <div className="cal-modal-field">
                  <span className="cal-modal-label">{t('assignedTo')}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {flag.assignee_name ? (
                      <><span className="avatar-xs">{flag.assignee_name.charAt(0)}</span>{flag.assignee_name}</>
                    ) : t('unassigned')}
                  </span>
                </div>
                <div className="cal-modal-field">
                  <span className="cal-modal-label">{t('calFlagSla')}</span>
                  <span className={isOverdue ? 'text-danger' : ''}>
                    {flag.sla_deadline ? new Date(flag.sla_deadline).toLocaleString(lang === 'fr' ? 'fr-FR' : lang === 'it' ? 'it-IT' : 'en-US') : '—'}
                    {isOverdue && <span className="cal-overdue-badge"> ⚠ {t('calOverdue')}</span>}
                  </span>
                </div>
                {flag.resolution && (
                  <div className="cal-modal-field" style={{ gridColumn: '1 / -1' }}>
                    <span className="cal-modal-label">{t('resolution')}</span>
                    <span style={{ fontSize: '.85rem' }}>{flag.resolution}</span>
                  </div>
                )}
                {flag.link && (
                  <div className="cal-modal-field" style={{ gridColumn: '1 / -1' }}>
                    <span className="cal-modal-label">{t('flagLink')}</span>
                    <a href={flag.link} target="_blank" rel="noopener noreferrer" className="flag-link" style={{ marginTop: 0 }}>
                      {flag.link}
                    </a>
                  </div>
                )}
                {(() => {
                  const flagAttach = (attachments.flags || {})[flag.id] || [];
                  if (flagAttach.length === 0) return null;
                  return (
                    <div className="cal-modal-field" style={{ gridColumn: '1 / -1' }}>
                      <span className="cal-modal-label"><Paperclip size={13} /> {t('flagAttachments')} ({flagAttach.length})</span>
                      <div className="cal-modal-attachments">
                        {flagAttach.map(a => (
                          <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer" className="cal-modal-attach-item">
                            {isImage(a.file_name) ? (
                              <img src={a.file_url} alt={a.file_name} className="cal-modal-attach-img" />
                            ) : (
                              <span className="flag-attach-file"><Paperclip size={12} /> {a.file_name}</span>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <CalendarIcon size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
        <p>{t('loading')}</p>
      </div>
    );
  }

  const title = view === 'month'
    ? `${monthNames[lang][currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : view === 'week'
    ? (() => {
        const week = getWeekDays(currentDate);
        const s = week[0], e = week[6];
        return `${s.getDate()} ${monthNames[lang][s.getMonth()].slice(0,3)} — ${e.getDate()} ${monthNames[lang][e.getMonth()].slice(0,3)} ${e.getFullYear()}`;
      })()
    : `${dayNamesFull[lang][currentDate.getDay()]} ${currentDate.getDate()} ${monthNames[lang][currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  return (
    <div className="calendar-page fade-in">
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="page-title">{t('calendar')}</h1>
          <p className="page-subtitle">{t('calSubtitle')}</p>
        </div>
      </div>

      <div className="cal-toolbar">
        <div className="cal-toolbar-left">
          <button className="btn btn-ghost btn-sm" onClick={goToday}>{t('calToday')}</button>
          <div className="cal-nav-group">
            <button className="icon-btn" onClick={() => navigate(-1)}><ChevronLeft size={18} /></button>
            <h2 className="cal-current-title">{title}</h2>
            <button className="icon-btn" onClick={() => navigate(1)}><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="cal-toolbar-right">
          <div className="toggle-group">
            {VIEWS.map(v => (
              <button key={v} className={`toggle-btn ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
                {t(`calView_${v}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="cal-filters">
        {/* Type filter: Tasks / Flags / All */}
        <div className="cal-filter-group">
          <ListChecks size={14} />
          <select className="form-input form-select cal-filter-select" value={selectedType} onChange={e => setSelectedType(e.target.value)}>
            <option value="all">{t('calTypeAll')}</option>
            <option value="tasks">📋 {t('calTypeTasks')}</option>
            <option value="flags">🚩 {t('calTypeFlags')}</option>
          </select>
        </div>

        <div className="cal-filter-group">
          <Building2 size={14} />
          <select className="form-input form-select cal-filter-select" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
            <option value="all">{t('allDepts')}</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.icon || '🏢'} {d.name}</option>)}
          </select>
        </div>
        <div className="cal-filter-group">
          <User size={14} />
          <select className="form-input form-select cal-filter-select" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
            <option value="all">{t('calAllPeople')}</option>
            {(selectedDept !== 'all' ? users.filter(u => u.department_id === parseInt(selectedDept)) : users).map(u => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
        </div>
        <div className="cal-filter-group">
          <Filter size={14} />
          <select className="form-input form-select cal-filter-select" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
            <option value="all">{t('allStatuses')}</option>
            <option value="todo">{t('todo')}</option>
            <option value="in_progress">{t('in_progress')}</option>
            <option value="blocked">{t('blocked')}</option>
            <option value="in_review">{t('in_review')}</option>
            <option value="done">{t('done')}</option>
            <option value="open">{t('flagOpen')}</option>
            <option value="resolved">{t('flagResolution2')}</option>
            <option value="closed">{t('flagClosed2')}</option>
          </select>
        </div>
        {(selectedDept !== 'all' || selectedUser !== 'all' || selectedStatus !== 'all' || selectedType !== 'all') && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedDept('all'); setSelectedUser('all'); setSelectedStatus('all'); setSelectedType('all'); }} style={{ color: 'var(--danger)' }}>
            ✕ {t('calReset')}
          </button>
        )}
        <div className="cal-filter-stats">
          <span className="cal-stat"><ListChecks size={13} /> {stats.taskCount} {t('calTypeTasks')}</span>
          <span className="cal-stat cal-stat-flag"><Flag size={13} /> {stats.flagCount} {t('calTypeFlags')}</span>
          {stats.overdue > 0 && (
            <span className="cal-stat cal-stat-danger"><AlertCircle size={13} /> {stats.overdue} {t('calOverdue')}</span>
          )}
        </div>
      </div>

      <div className="cal-legend">
        <span style={{ fontWeight: 600, fontSize: '.75rem', color: 'var(--text-muted)', marginRight: 6 }}>{t('calTypeTasks')}:</span>
        {Object.entries(STATUS_COLORS).map(([status, sc]) => (
          <div key={status} className="cal-legend-item">
            <span className="cal-legend-dot" style={{ background: sc.border }} />
            <span>{t(status)}</span>
          </div>
        ))}
        <span style={{ fontWeight: 600, fontSize: '.75rem', color: 'var(--text-muted)', margin: '0 6px 0 16px' }}>{t('calTypeFlags')}:</span>
        {Object.entries(FLAG_URGENCY_COLORS).map(([urg, uc]) => (
          <div key={urg} className="cal-legend-item">
            <Flag size={10} style={{ color: uc.border }} />
            <span>{t(`urg${urg.charAt(0).toUpperCase() + urg.slice(1)}`)}</span>
          </div>
        ))}
      </div>

      <div className="cal-body">
        {view === 'month' ? renderMonthView() : view === 'week' ? renderWeekView() : renderDayView()}
      </div>

      {renderDetailModal()}
    </div>
  );
}
