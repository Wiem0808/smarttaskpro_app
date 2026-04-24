import { useEffect, useState, useMemo, useRef } from 'react';
import { ListChecks, Plus, X, Clock, Search, Building2, Pencil, Trash2, Link2, Upload, Paperclip } from 'lucide-react';
import useStore from '../store';
import api from '../api';
import { useLang } from '../hooks/useLang';
import Pagination from '../components/Pagination';

const PRIORITY_COLORS = [
  { min: 70, color: '#ef4444', labelKey: 'prioCritical' },
  { min: 50, color: '#f59e0b', labelKey: 'prioHigh' },
  { min: 30, color: '#3b82f6', labelKey: 'prioMedium' },
  { min: 0,  color: '#10b981', labelKey: 'prioLow' },
];

function getPriorityInfo(score) {
  return PRIORITY_COLORS.find(p => score >= p.min) || PRIORITY_COLORS[3];
}

export default function Tasks() {
  const { tasks, loadTasks, users, loadUsers, departments, loadDepartments, showToast } = useStore();
  const { t } = useLang();
  const [modal, setModal]       = useState(null);   // null | 'create' | { ...taskObj }
  const [deleteModal, setDeleteModal] = useState(null);
  const [view, setView]         = useState('kanban');
  const [search, setSearch]     = useState('');
  const [filterDept, setFilterDept]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUser, setFilterUser]     = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [form, setForm]         = useState({
    title: '', description: '', assigned_to: '',
    importance: 3, estimated_hours: 1, deadline: '', department_id: '', link: '',
  });
  const [uploadFiles, setUploadFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const fileRef = useRef(null);
  const isImage = (name) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);

  const STATUSES = [
    { id: 'todo',        labelKey: 'todo',        color: '#94a3b8', icon: '○' },
    { id: 'in_progress', labelKey: 'in_progress', color: '#3b82f6', icon: '◐' },
    { id: 'blocked',     labelKey: 'blocked',     color: '#ef4444', icon: '⊘' },
    { id: 'in_review',   labelKey: 'in_review',   color: '#f59e0b', icon: '◉' },
    { id: 'done',        labelKey: 'done',        color: '#10b981', icon: '●' },
  ];

  useEffect(() => { loadTasks(); loadUsers(); loadDepartments(); }, []);

  const deptMap = useMemo(() => {
    const m = {};
    departments.forEach(d => { m[d.id] = d.name; });
    return m;
  }, [departments]);

  const filtered = useMemo(() => {
    return tasks.filter(task => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterDept && task.department_id !== parseInt(filterDept)) return false;
      if (filterStatus && task.status !== filterStatus) return false;
      if (filterUser && task.assigned_to !== parseInt(filterUser)) return false;
      // Archive: hide "done" tasks older than 7 days unless showArchived
      if (!showArchived && task.status === 'done' && task.completed_at) {
        const doneDate = new Date(task.completed_at);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (doneDate < sevenDaysAgo) return false;
      }
      return true;
    });
  }, [tasks, search, filterDept, filterStatus, filterUser, showArchived]);

  const archivedCount = useMemo(() => {
    return tasks.filter(t => {
      if (t.status !== 'done' || !t.completed_at) return false;
      const d = new Date(t.completed_at);
      return d < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }).length;
  }, [tasks]);

  const formUsers = useMemo(() => {
    if (!form.department_id) return users;
    return users.filter(u => u.department_id === parseInt(form.department_id));
  }, [users, form.department_id]);

  const openCreate = () => {
    setForm({ title: '', description: '', assigned_to: '', importance: 3, estimated_hours: 1, deadline: '', department_id: '', link: '' });
    setUploadFiles([]);
    setExistingFiles([]);
    setModal('create');
  };

  const openEdit = async (task) => {
    setForm({
      title: task.title || '',
      description: task.description || '',
      assigned_to: task.assigned_to?.toString() || '',
      importance: task.importance || 3,
      estimated_hours: task.estimated_hours || 1,
      deadline: task.deadline ? task.deadline.slice(0, 16) : '',
      department_id: task.department_id?.toString() || '',
      link: task.link || '',
    });
    setUploadFiles([]);
    // Load existing attachments for this task
    try {
      const atts = await api.getAttachments({ task_id: task.id });
      setExistingFiles(atts);
    } catch { setExistingFiles([]); }
    setModal(task);
  };

  const deleteAttachment = async (attId) => {
    try {
      await api.deleteAttachment(attId);
      setExistingFiles(existingFiles.filter(a => a.id !== attId));
      showToast(t('deleted'));
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleDeptChange = (deptId) => {
    setForm({ ...form, department_id: deptId, assigned_to: '' });
  };

  const handleSave = async () => {
    try {
      const data = {
        title: form.title,
        description: form.description,
        department_id: form.department_id ? parseInt(form.department_id) : null,
        assigned_to: form.assigned_to ? parseInt(form.assigned_to) : null,
        importance: form.importance,
        estimated_hours: form.estimated_hours,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        link: form.link || null,
      };
      let taskId;
      if (modal === 'create') {
        const newTask = await api.createTask(data);
        taskId = newTask.id;
        showToast(t('taskCreated'));
      } else {
        await api.updateTask(modal.id, data);
        taskId = modal.id;
        showToast(t('taskUpdated'));
      }
      // Upload files
      for (const file of uploadFiles) {
        await api.uploadFile(file, null, taskId);
      }
      loadTasks(); setModal(null);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleDelete = async () => {
    try {
      await api.deleteTask(deleteModal.id);
      showToast(t('taskDeleted'));
      loadTasks(); setDeleteModal(null);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const changeStatus = async (tid, newStatus) => {
    await api.updateTask(tid, { status: newStatus }); loadTasks();
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('tasks')}</h1>
          <p className="page-subtitle">{filtered.length} {t('tasks').toLowerCase()}{filterDept ? ` — ${deptMap[parseInt(filterDept)] || ''}` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="toggle-group">
            <button className={`toggle-btn ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')}>{t('kanban')}</button>
            <button className={`toggle-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>{t('table')}</button>
          </div>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> {t('newTask')}</button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={16} />
          <input placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input form-select filter-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">{t('allDepts')}</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.icon || '🏢'} {d.name}</option>)}
        </select>
        <select className="form-input form-select filter-select" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
          <option value="">{t('allUsers')}</option>
          {users.map(u => <option key={u.id} value={u.id}>👤 {u.full_name}</option>)}
        </select>
        <select className="form-input form-select filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">{t('allStatuses')}</option>
          {STATUSES.map(s => <option key={s.id} value={s.id}>{s.icon} {t(s.labelKey)}</option>)}
        </select>
        {archivedCount > 0 && (
          <button className={`btn btn-sm ${showArchived ? 'btn-ghost' : 'btn-outline'}`} onClick={() => setShowArchived(!showArchived)} style={showArchived ? { color: 'var(--danger)' } : { color: 'var(--text-secondary)' }}>
            {showArchived ? t('hideArchives') : `${t('showArchives')} (${archivedCount})`}
          </button>
        )}
        {(filterDept || filterStatus || filterUser) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterDept(''); setFilterStatus(''); setFilterUser(''); }} style={{ color: 'var(--danger)' }}>
            ✕ {t('calReset')}
          </button>
        )}
      </div>

      {/* Kanban */}
      {view === 'kanban' && (
        <div className="kanban-board">
          {STATUSES.map(s => {
            const items = filtered.filter(task => task.status === s.id);
            return (
              <div key={s.id} className="kanban-col">
                <div className="kanban-col-header" style={{ borderBottom: `3px solid ${s.color}` }}>
                  <span>{s.icon} {t(s.labelKey)}</span>
                  <span className="kanban-count">{items.length}</span>
                </div>
                <div className="kanban-cards">
                  {items.map(task => {
                    const pi = getPriorityInfo(task.priority_score);
                    return (
                      <div key={task.id} className="kanban-card">
                        <div className="kanban-card-top">
                          <span className="priority-dot" style={{ background: pi.color }} title={`Score: ${task.priority_score}`} />
                          <span className="kanban-card-project">{deptMap[task.department_id] || ''}</span>
                          <div className="kanban-card-crud">
                            <button className="icon-btn icon-btn-xs" title={t('edit')} onClick={() => openEdit(task)}><Pencil size={12} /></button>
                            <button className="icon-btn icon-btn-xs icon-btn-danger" title={t('delete')} onClick={() => setDeleteModal(task)}><Trash2 size={12} /></button>
                          </div>
                        </div>
                        <h4 className="kanban-card-title">{task.title}</h4>
                        <div className="kanban-card-meta">
                          {task.assigned_name && <span className="kanban-card-assignee"><span className="avatar-xs">{task.assigned_name.charAt(0)}</span>{task.assigned_name}</span>}
                          {task.deadline && <span className="kanban-card-deadline"><Clock size={11} /> {new Date(task.deadline).toLocaleDateString()}</span>}
                        </div>
                        <div className="kanban-card-actions">
                          <select className="mini-select" value={task.status} onChange={e => changeStatus(task.id, e.target.value)}>
                            {STATUSES.map(st => <option key={st.id} value={st.id}>{t(st.labelKey)}</option>)}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      {view === 'table' && (
        <div className="section-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('priority')}</th>
                <th>{t('tasks')}</th>
                <th>{t('department')}</th>
                <th>{t('assignedTo')}</th>
                <th>{t('status')}</th>
                <th>{t('deadline')}</th>
                <th>{t('score')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice((page - 1) * perPage, page * perPage).map(task => {
                const pi = getPriorityInfo(task.priority_score);
                return (
                  <tr key={task.id}>
                    <td><span className="priority-dot" style={{ background: pi.color }} /> {t(pi.labelKey)}</td>
                    <td style={{ fontWeight: 600 }}>{task.title}</td>
                    <td><span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>{deptMap[task.department_id] || '—'}</span></td>
                    <td>{task.assigned_name || '—'}</td>
                    <td>
                      <select className="mini-select" value={task.status} onChange={e => changeStatus(task.id, e.target.value)}>
                        {STATUSES.map(s => <option key={s.id} value={s.id}>{t(s.labelKey)}</option>)}
                      </select>
                    </td>
                    <td>{task.deadline ? new Date(task.deadline).toLocaleDateString() : '—'}</td>
                    <td><span className="score-pill" style={{ background: pi.color + '18', color: pi.color }}>{task.priority_score}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="icon-btn icon-btn-xs" title={t('edit')} onClick={() => openEdit(task)}><Pencil size={13} /></button>
                        <button className="icon-btn icon-btn-xs icon-btn-danger" title={t('delete')} onClick={() => setDeleteModal(task)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={page} totalItems={filtered.length} itemsPerPage={perPage}
        onPageChange={p => setPage(p)} onItemsPerPageChange={n => { setPerPage(n); setPage(1); }} />

      {/* Create/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal === 'create' ? t('newTask') : t('editTask')}</h2>
              <button className="icon-btn" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <label className="form-label">{t('name')} *</label>
              <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />

              <label className="form-label" style={{ marginTop: 16 }}>{t('description')}</label>
              <textarea className="form-input form-textarea" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />

              <div className="form-row" style={{ marginTop: 16 }}>
                <div className="form-group">
                  <label className="form-label"><Building2 size={14} /> {t('department')}</label>
                  <select className="form-input form-select" value={form.department_id} onChange={e => handleDeptChange(e.target.value)}>
                    <option value="">{t('choose')}</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.icon || '🏢'} {d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('assignedTo')}</label>
                  <select className="form-input form-select" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                    <option value="">{t('unassigned')}</option>
                    {formUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ marginTop: 16 }}>
                <div className="form-group">
                  <label className="form-label">{t('importance')}</label>
                  <input className="form-input" type="number" min={1} max={5} value={form.importance}
                    onChange={e => setForm({ ...form, importance: parseInt(e.target.value) || 3 })} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('estimation')}</label>
                  <input className="form-input" type="number" min={0.5} step={0.5} value={form.estimated_hours}
                    onChange={e => setForm({ ...form, estimated_hours: parseFloat(e.target.value) || 1 })} />
                </div>
              </div>

              <label className="form-label" style={{ marginTop: 16 }}>{t('deadline')}</label>
              <input className="form-input" type="datetime-local" value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })} />

              <label className="form-label" style={{ marginTop: 16 }}><Link2 size={14} /> {t('taskLink')}</label>
              <input className="form-input" type="url" placeholder={t('taskLinkPlaceholder')} value={form.link}
                onChange={e => setForm({ ...form, link: e.target.value })} />

              <label className="form-label" style={{ marginTop: 16 }}><Paperclip size={14} /> {t('taskFiles')}</label>

              {/* Existing attachments */}
              {existingFiles.length > 0 && (
                <div className="task-existing-files" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {existingFiles.map(a => (
                    <div key={a.id} className="task-existing-file" style={{
                      position: 'relative', border: '1px solid var(--border)', borderRadius: 8,
                      overflow: 'hidden', background: 'var(--bg-input)'
                    }}>
                      {isImage(a.file_name) ? (
                        <a href={a.file_url} target="_blank" rel="noopener noreferrer">
                          <img src={a.file_url} alt={a.file_name}
                            style={{ width: 80, height: 64, objectFit: 'cover', display: 'block' }} />
                        </a>
                      ) : (
                        <a href={a.file_url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 10px',
                            fontSize: '.75rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                          <Paperclip size={12} /> {a.file_name}
                        </a>
                      )}
                      <button onClick={() => deleteAttachment(a.id)}
                        style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18,
                          borderRadius: '50%', background: 'rgba(239,68,68,.85)', color: '#fff',
                          border: 'none', cursor: 'pointer', fontSize: '10px', lineHeight: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload zone */}
              <div className="flag-upload-zone" onClick={() => fileRef.current?.click()}
                onDrop={e => { e.preventDefault(); setUploadFiles([...uploadFiles, ...e.dataTransfer.files]); }}
                onDragOver={e => e.preventDefault()}>
                <Upload size={20} />
                <span>{t('taskDropFiles')}</span>
                <input ref={fileRef} type="file" multiple hidden
                  onChange={e => setUploadFiles([...uploadFiles, ...e.target.files])} />
              </div>
              {uploadFiles.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {Array.from(uploadFiles).map((f, i) => (
                    <span key={i} className="badge" style={{ fontSize: '.75rem', gap: 4 }}>
                      <Paperclip size={11} /> {f.name}
                      <button className="icon-btn-xs" style={{ width: 16, height: 16 }}
                        onClick={() => setUploadFiles(uploadFiles.filter((_, j) => j !== i))}>✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.title.trim()}>
                {modal === 'create' ? t('create') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ {t('confirmDelete')}</h2>
              <button className="icon-btn" onClick={() => setDeleteModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 8, fontWeight: 600 }}>{deleteModal.title}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '.88rem' }}>{t('confirmDeleteMsg')}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteModal(null)}>{t('cancel')}</button>
              <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={14} /> {t('delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
