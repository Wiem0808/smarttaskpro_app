import { useEffect, useState, useMemo, useRef } from 'react';
import { Flag, Plus, X, Clock, CheckCircle2, Building2, Link2, Upload, Paperclip, Pencil, Trash2 } from 'lucide-react';
import useStore from '../store';
import api from '../api';
import { useLang } from '../hooks/useLang';
import Pagination from '../components/Pagination';

function SlaCountdown({ deadline, t }) {
  if (!deadline) return null;
  const diff = new Date(deadline) - new Date();
  const overdue = diff < 0;
  const hours = Math.abs(Math.floor(diff / 3600000));
  const mins  = Math.abs(Math.floor((diff % 3600000) / 60000));
  return (
    <span className={`sla-badge ${overdue ? 'sla-overdue' : hours < 4 ? 'sla-warning' : 'sla-ok'}`}>
      <Clock size={12} />
      {overdue ? `${t('slaOverdue')} ${hours}h${mins}m` : `${hours}h${mins}m ${t('slaLeft')}`}
    </span>
  );
}

export default function Flags() {
  const { flags, loadFlags, tasks, loadTasks, departments, loadDepartments, users, loadUsers, showToast, user } = useStore();
  const { t } = useLang();
  const [modal, setModal]       = useState(null);   // null | 'create' | { ...flagObj }
  const [resolveModal, setResolveModal] = useState(null);
  const [deleteModal, setDeleteModal]   = useState(null);
  const [form, setForm]         = useState({
    task_id: '', category: 'technical', urgency: 'normal', description: '',
    assigned_to: '', detected_by: '', link: '',
  });
  const [resolution, setResolution] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [attachments, setAttachments] = useState({});
  const fileRef = useRef(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const STATUS_MAP = {
    open:        { labelKey: 'flagOpen',        color: '#ef4444' },
    in_progress: { labelKey: 'flagInProgress',  color: '#f59e0b' },
    resolved:    { labelKey: 'flagResolution2', color: '#3b82f6' },
    closed:      { labelKey: 'flagClosed2',     color: '#10b981' },
  };

  const URGENCY = {
    normal:   { labelKey: 'urgNormal',   color: '#10b981', sla: '48h' },
    urgent:   { labelKey: 'urgUrgent',   color: '#f59e0b', sla: '24h' },
    critical: { labelKey: 'urgCritical', color: '#ef4444', sla: '4h'  },
  };

  const CATEGORIES = [
    { id: 'technical',     labelKey: 'catTechnical' },
    { id: 'resources',     labelKey: 'catResources' },
    { id: 'communication', labelKey: 'catCommunication' },
    { id: 'external',      labelKey: 'catExternal' },
  ];

  useEffect(() => { loadFlags(); loadTasks(); loadDepartments(); loadUsers(); }, []);

  useEffect(() => {
    if (flags.length > 0) loadAllAttachments();
  }, [flags]);

  const loadAllAttachments = async () => {
    try {
      const allAttach = await api.getAttachments();
      const byFlag = {};
      allAttach.forEach(a => {
        if (a.flag_id) {
          if (!byFlag[a.flag_id]) byFlag[a.flag_id] = [];
          byFlag[a.flag_id].push(a);
        }
      });
      setAttachments(byFlag);
    } catch (e) { /* silent */ }
  };

  const taskDeptMap = useMemo(() => {
    const m = {};
    tasks.forEach(task => { m[task.id] = task.department_id; });
    return m;
  }, [tasks]);

  const deptMap = useMemo(() => {
    const m = {};
    departments.forEach(d => { m[d.id] = d; });
    return m;
  }, [departments]);

  const filtered = useMemo(() => {
    return flags.filter(f => {
      if (filterStatus && f.status !== filterStatus) return false;
      if (filterDept) {
        const deptId = taskDeptMap[f.task_id];
        if (deptId !== parseInt(filterDept)) return false;
      }
      if (filterUser && f.assigned_to !== parseInt(filterUser)) return false;
      // Archive: hide "closed" flags older than 7 days unless showArchived
      if (!showArchived && f.status === 'closed' && f.closed_at) {
        const closedDate = new Date(f.closed_at);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (closedDate < sevenDaysAgo) return false;
      }
      return true;
    });
  }, [flags, filterStatus, filterDept, filterUser, taskDeptMap, showArchived]);

  const archivedCount = useMemo(() => {
    return flags.filter(f => {
      if (f.status !== 'closed' || !f.closed_at) return false;
      const d = new Date(f.closed_at);
      return d < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }).length;
  }, [flags]);

  const getFlagDept = (flag) => {
    const deptId = taskDeptMap[flag.task_id];
    return deptMap[deptId];
  };

  const openCreate = () => {
    setForm({
      task_id: '', category: 'technical', urgency: 'normal', description: '',
      assigned_to: '', detected_by: user?.id?.toString() || '', link: '',
    });
    setUploadFiles([]);
    setModal('create');
  };

  const openEdit = (flag) => {
    setForm({
      task_id: flag.task_id?.toString() || '',
      category: flag.category || 'technical',
      urgency: flag.urgency || 'normal',
      description: flag.description || '',
      assigned_to: flag.assigned_to?.toString() || '',
      detected_by: flag.detected_by?.toString() || '',
      link: flag.link || '',
    });
    setUploadFiles([]);
    setModal(flag);
  };

  const handleSave = async () => {
    try {
      const payload = {
        task_id: form.task_id ? parseInt(form.task_id) : null,
        category: form.category,
        urgency: form.urgency,
        description: form.description,
        assigned_to: form.assigned_to ? parseInt(form.assigned_to) : null,
        detected_by: form.detected_by ? parseInt(form.detected_by) : null,
        link: form.link || null,
      };

      let flagId;
      if (modal === 'create') {
        const newFlag = await api.createFlag(payload);
        flagId = newFlag.id;
        showToast(t('flagCreated'));
      } else {
        // For update, only send updateable fields
        await api.updateFlag(modal.id, {
          assigned_to: payload.assigned_to,
        });
        flagId = modal.id;
        showToast(t('flagUpdated'));
      }

      // Upload files
      for (const file of uploadFiles) {
        await api.uploadFile(file, flagId, null);
      }

      loadFlags(); loadTasks(); setModal(null);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleDelete = async () => {
    try {
      await api.deleteFlag(deleteModal.id);
      showToast(t('flagDeleted'));
      loadFlags(); loadTasks(); setDeleteModal(null);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setUploadFiles(prev => [...prev, ...files]);
  };

  const removeFile = (idx) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleResolve = async () => {
    try {
      await api.updateFlag(resolveModal.id, { status: 'resolved', resolution });
      showToast(t('flagResolved'));
      loadFlags(); setResolveModal(null);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleClose = async (fid) => {
    await api.closeFlag(fid);
    showToast(t('flagClosed'));
    loadFlags(); loadTasks();
  };

  const isImage = (name) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('flags')}</h1>
          <p className="page-subtitle">
            {filtered.filter(f => f.status === 'open').length} {t('openFlags2')}
            {filterDept && deptMap[parseInt(filterDept)] ? ` — ${deptMap[parseInt(filterDept)].name}` : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> {t('newFlag')}
        </button>
      </div>

      <div className="filters-bar">
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
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{t(v.labelKey)}</option>)}
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

      {/* Flag cards list */}
      <div className="flags-list">
        {filtered.slice((page - 1) * perPage, page * perPage).map(f => {
          const urg = URGENCY[f.urgency];
          const st  = STATUS_MAP[f.status];
          const cat = CATEGORIES.find(c => c.id === f.category);
          const dept = getFlagDept(f);
          const flagAttach = attachments[f.id] || [];
          return (
            <div key={f.id} className="flag-card" style={{ borderLeft: `4px solid ${urg?.color}` }}>
              <div className="flag-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: urg?.color + '18', color: urg?.color }}>{t(urg?.labelKey)}</span>
                  <span className="badge" style={{ background: st?.color + '18', color: st?.color }}>{t(st?.labelKey)}</span>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{t(cat?.labelKey)}</span>
                  {dept && (
                    <span className="flag-dept-badge">
                      <Building2 size={11} /> {dept.name}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SlaCountdown deadline={f.sla_deadline} t={t} />
                  <button className="icon-btn icon-btn-xs" title={t('edit')} onClick={() => openEdit(f)}><Pencil size={13} /></button>
                  <button className="icon-btn icon-btn-xs icon-btn-danger" title={t('delete')} onClick={() => setDeleteModal(f)}><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="flag-card-body">
                <h3 className="flag-card-task">{t('tasks')}: {f.task_title}</h3>
                <p className="flag-card-desc">{f.description}</p>
                {f.resolution && <div className="flag-resolution"><strong>{t('resolution')}</strong> {f.resolution}</div>}
                {f.link && (
                  <a href={f.link} target="_blank" rel="noopener noreferrer" className="flag-link">
                    <Link2 size={13} /> {f.link}
                  </a>
                )}
                {flagAttach.length > 0 && (
                  <div className="flag-attachments">
                    <span className="flag-attach-label"><Paperclip size={12} /> {t('flagAttachments')} ({flagAttach.length})</span>
                    <div className="flag-attach-list">
                      {flagAttach.map(a => (
                        <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer" className="flag-attach-item" title={a.file_name}>
                          {isImage(a.file_name) ? (
                            <img src={a.file_url} alt={a.file_name} className="flag-attach-thumb" />
                          ) : (
                            <span className="flag-attach-file"><Paperclip size={12} /> {a.file_name}</span>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flag-card-footer">
                <div className="flag-card-people">
                  <span>{t('raisedBy')} <strong>{f.raiser_name}</strong></span>
                  {f.detected_name && f.detected_name !== f.raiser_name && (
                    <span> · {t('detectedBy')} <strong>{f.detected_name}</strong></span>
                  )}
                  {f.assignee_name && <span> → {t('assignedTo2')} <strong>{f.assignee_name}</strong></span>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {f.status === 'open' && (user?.role === 'manager' || user?.role === 'super_admin') && (
                    <button className="btn btn-sm btn-warning" onClick={() => { setResolution(''); setResolveModal(f); }}>{t('flagTreat')}</button>
                  )}
                  {f.status === 'resolved' && (
                    <button className="btn btn-sm btn-success" onClick={() => handleClose(f.id)}>
                      <CheckCircle2 size={13} /> {t('closeFlag')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty-state"><Flag size={40} /><h3>{t('noFlags')}</h3><p>{t('noFlagsHint')}</p></div>
        )}
      </div>

      <Pagination currentPage={page} totalItems={filtered.length} itemsPerPage={perPage}
        onPageChange={p => setPage(p)} onItemsPerPageChange={n => { setPerPage(n); setPage(1); }} />

      {/* ── Create / Edit Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🚩 {modal === 'create' ? t('newFlag') : t('editFlag')}</h2>
              <button className="icon-btn" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {/* Task */}
              <label className="form-label">{t('flagTask')}</label>
              <select className="form-input form-select" value={form.task_id}
                onChange={e => setForm({ ...form, task_id: e.target.value })}
                disabled={modal !== 'create'}>
                <option value="">— Aucune tâche (facultatif) —</option>
                {tasks.filter(task => task.status !== 'done').map(task => <option key={task.id} value={task.id}>{task.title}</option>)}
              </select>

              {/* Category + Urgency */}
              <div className="form-row" style={{ marginTop: 16 }}>
                <div className="form-group">
                  <label className="form-label">{t('category')}</label>
                  <select className="form-input form-select" value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    disabled={modal !== 'create'}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{t(c.labelKey)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('urgency')}</label>
                  <div className="urgency-toggle">
                    {Object.entries(URGENCY).map(([k, v]) => (
                      <button key={k} className={`urgency-btn ${form.urgency === k ? 'active' : ''}`}
                        style={{ '--urg-color': v.color }}
                        onClick={() => modal === 'create' && setForm({ ...form, urgency: k })}
                        disabled={modal !== 'create'}>
                        {t(v.labelKey)} ({v.sla})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detected by + Resolution responsible */}
              <div className="form-row" style={{ marginTop: 16 }}>
                <div className="form-group">
                  <label className="form-label">🔍 {t('detectedBy')}</label>
                  <select className="form-input form-select" value={form.detected_by}
                    onChange={e => setForm({ ...form, detected_by: e.target.value })}
                    disabled={modal !== 'create'}>
                    <option value="">{t('choose')}</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">🛠️ {t('resolutionResp')}</label>
                  <select className="form-input form-select" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                    <option value="">{t('autoAssign')}</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <label className="form-label" style={{ marginTop: 16 }}>{t('flagDesc')} *</label>
              <textarea className="form-input form-textarea" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} rows={4}
                placeholder={t('flagDescPlaceholder')}
                disabled={modal !== 'create'} />

              {/* Link */}
              <label className="form-label" style={{ marginTop: 16 }}><Link2 size={14} /> {t('flagLink')}</label>
              <input className="form-input" type="url" value={form.link}
                onChange={e => setForm({ ...form, link: e.target.value })}
                placeholder="https://..."
                disabled={modal !== 'create'} />

              {/* File upload */}
              <label className="form-label" style={{ marginTop: 16 }}><Paperclip size={14} /> {t('flagFiles')}</label>
              <div className="flag-upload-zone" onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" multiple hidden onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />
                <Upload size={20} />
                <span>{t('flagDropFiles')}</span>
              </div>

              {uploadFiles.length > 0 && (
                <div className="flag-upload-preview">
                  {uploadFiles.map((f, i) => (
                    <div key={i} className="flag-upload-item">
                      {isImage(f.name) ? (
                        <img src={URL.createObjectURL(f)} alt={f.name} className="flag-upload-thumb" />
                      ) : (
                        <span className="flag-upload-file-icon"><Paperclip size={14} /></span>
                      )}
                      <span className="flag-upload-name">{f.name}</span>
                      <button className="icon-btn" onClick={(e) => { e.stopPropagation(); removeFile(i); }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>{t('cancel')}</button>
              <button className="btn btn-danger" onClick={handleSave}
                disabled={modal === 'create' ? (!form.task_id || !form.description.trim()) : false}>
                {modal === 'create' ? t('flagReport') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ {t('confirmDelete')}</h2>
              <button className="icon-btn" onClick={() => setDeleteModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 8, fontWeight: 600 }}>{deleteModal.task_title || deleteModal.description?.slice(0, 80)}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '.88rem' }}>{t('confirmDeleteMsg')}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteModal(null)}>{t('cancel')}</button>
              <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={14} /> {t('delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resolve Modal ── */}
      {resolveModal && (
        <div className="modal-overlay" onClick={() => setResolveModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('flagTreat')}</h2>
              <button className="icon-btn" onClick={() => setResolveModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="flag-resolution-preview"><strong>{t('problem')}</strong><p>{resolveModal.description}</p></div>
              <label className="form-label" style={{ marginTop: 16 }}>{t('solution')} *</label>
              <textarea className="form-input form-textarea" value={resolution}
                onChange={e => setResolution(e.target.value)} rows={4} placeholder={t('solutionPlaceholder')} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setResolveModal(null)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={handleResolve} disabled={!resolution.trim()}>{t('markResolved')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
