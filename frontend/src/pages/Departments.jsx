import { useEffect, useState } from 'react';
import { Building2, Plus, Pencil, Trash2, X, Users as UsersIcon } from 'lucide-react';
import useStore from '../store';
import api from '../api';
import { useLang } from '../hooks/useLang';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316'];
const ICONS  = ['🏢','🏭','💻','📊','🔧','📦','🎨','📋','🧪','🚀'];

export default function Departments() {
  const { departments, loadDepartments, users, loadUsers, showToast } = useStore();
  const { t } = useLang();
  const [modal, setModal] = useState(null);
  const [form, setForm]   = useState({ name: '', description: '', color: '#3b82f6', icon: '🏢', manager_id: '' });
  const [delId, setDelId] = useState(null);

  useEffect(() => { loadDepartments(); loadUsers(); }, []);

  const managers = users.filter(u => u.role === 'manager' || u.role === 'super_admin');

  const openCreate = () => {
    setForm({ name: '', description: '', color: '#3b82f6', icon: '🏢', manager_id: '' });
    setModal('create');
  };

  const openEdit = (dept) => {
    setForm({ name: dept.name, description: dept.description || '', color: dept.color, icon: dept.icon, manager_id: dept.manager_id || '' });
    setModal(dept);
  };

  const handleSave = async () => {
    try {
      const data = { ...form, manager_id: form.manager_id || null };
      if (modal === 'create') { await api.createDepartment(data); showToast(t('deptCreated')); }
      else { await api.updateDepartment(modal.id, data); showToast(t('deptUpdated')); }
      loadDepartments(); setModal(null);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleDelete = async () => {
    try { await api.deleteDepartment(delId); showToast(t('deptDeleted')); loadDepartments(); }
    catch (e) { showToast(e.message, 'error'); }
    setDelId(null);
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('departments')}</h1>
          <p className="page-subtitle">{t('deptOrgSubtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> {t('newDept')}</button>
      </div>

      <div className="dept-grid">
        {departments.map(d => (
          <div key={d.id} className="dept-card" style={{ borderTop: `4px solid ${d.color}` }}>
            <div className="dept-card-head">
              <span className="dept-icon" style={{ background: d.color + '15' }}>{d.icon}</span>
              <div className="dept-card-actions">
                <button className="icon-btn" onClick={() => openEdit(d)}><Pencil size={14} /></button>
                <button className="icon-btn icon-btn-danger" onClick={() => setDelId(d.id)}><Trash2 size={14} /></button>
              </div>
            </div>
            <h3 className="dept-card-name">{d.name}</h3>
            <p className="dept-card-desc">{d.description || t('noDeptDesc')}</p>
            <div className="dept-card-footer">
              <div className="dept-card-stat"><UsersIcon size={14} /><span>{d.employee_count} {t('employees')}</span></div>
              {d.manager_name && <div className="dept-card-manager"><span className="avatar-xs">{d.manager_name.charAt(0)}</span>{d.manager_name}</div>}
            </div>
          </div>
        ))}
        {departments.length === 0 && (
          <div className="empty-state"><Building2 size={40} /><h3>{t('noDept')}</h3><p>{t('noDeptHint')}</p></div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal === 'create' ? t('newDept') : t('editDept')}</h2>
              <button className="icon-btn" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <label className="form-label">{t('name')} *</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

              <label className="form-label" style={{ marginTop: 16 }}>{t('description')}</label>
              <textarea className="form-input form-textarea" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />

              <label className="form-label" style={{ marginTop: 16 }}>{t('color')}</label>
              <div className="color-picker">
                {COLORS.map(c => (
                  <button key={c} className={`color-dot ${form.color === c ? 'active' : ''}`}
                    style={{ background: c }} onClick={() => setForm({ ...form, color: c })} />
                ))}
              </div>

              <label className="form-label" style={{ marginTop: 16 }}>{t('icon')}</label>
              <div className="icon-picker">
                {ICONS.map(ic => (
                  <button key={ic} className={`icon-opt ${form.icon === ic ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, icon: ic })}>{ic}</button>
                ))}
              </div>

              <label className="form-label" style={{ marginTop: 16 }}>{t('manager')}</label>
              <select className="form-input form-select" value={form.manager_id}
                onChange={e => setForm({ ...form, manager_id: e.target.value ? parseInt(e.target.value) : '' })}>
                <option value="">— {t('none')} —</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.name.trim()}>
                {modal === 'create' ? t('create') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {delId && (
        <div className="modal-overlay" onClick={() => setDelId(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: 'center', padding: 32 }}>
              <Trash2 size={40} style={{ color: '#ef4444', marginBottom: 16 }} />
              <h3>{t('deleteDept')}</h3>
              <p style={{ color: '#64748b', margin: '8px 0 24px' }}>{t('irreversible')}</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setDelId(null)}>{t('cancel')}</button>
                <button className="btn btn-danger" onClick={handleDelete}>{t('delete')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
