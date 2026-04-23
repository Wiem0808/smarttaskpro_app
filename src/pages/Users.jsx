import { useEffect, useState } from 'react';
import { UsersRound, Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import useStore from '../store';
import api from '../api';
import { useLang } from '../hooks/useLang';
import Pagination from '../components/Pagination';

export default function Users() {
  const { users, loadUsers, departments, loadDepartments, showToast } = useStore();
  const { t } = useLang();
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState({ full_name: '', email: '', password: '', role: 'employee', department_id: '', daily_capacity: 8 });
  const [delId, setDelId]   = useState(null);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  useEffect(() => { loadUsers(); loadDepartments(); }, []);

  const ROLES = [
    { id: 'super_admin',  labelKey: 'roleSuperAdmin',  color: '#ef4444', icon: '👑' },
    { id: 'manager',      labelKey: 'roleManager',      color: '#f59e0b', icon: '⭐' },
    { id: 'project_lead', labelKey: 'roleProjectLead',  color: '#3b82f6', icon: '📋' },
    { id: 'employee',     labelKey: 'roleEmployee',     color: '#10b981', icon: '👤' },
  ];

  const filtered = users.filter(u => {
    if (search && !u.full_name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterDept && u.department_id !== parseInt(filterDept)) return false;
    if (filterRole && u.role !== filterRole) return false;
    return true;
  });

  const openCreate = () => {
    setForm({ full_name: '', email: '', password: 'smarttask2025', role: 'employee', department_id: '', daily_capacity: 8 });
    setModal('create');
  };

  const openEdit = (u) => {
    setForm({ full_name: u.full_name, email: u.email, password: '', role: u.role, department_id: u.department_id || '', daily_capacity: u.daily_capacity });
    setModal(u);
  };

  const handleSave = async () => {
    try {
      const data = { ...form, department_id: form.department_id || null };
      if (!data.password) delete data.password;
      if (modal === 'create') { await api.createUser(data); showToast(t('userCreated')); }
      else { await api.updateUser(modal.id, data); showToast(t('userUpdated')); }
      loadUsers(); setModal(null);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleDeactivate = async () => {
    try { await api.deleteUser(delId); showToast(t('userDeactivated')); loadUsers(); }
    catch (e) { showToast(e.message, 'error'); }
    setDelId(null);
  };

  const getRoleBadge = (roleId) => {
    const r = ROLES.find(x => x.id === roleId);
    return r ? (
      <span className="badge" style={{ background: r.color + '18', color: r.color, border: `1px solid ${r.color}30` }}>
        {r.icon} {t(r.labelKey)}
      </span>
    ) : roleId;
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('users')}</h1>
          <p className="page-subtitle">{users.length} {t('activeAccounts')}</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> {t('newUser')}</button>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <Search size={16} />
          <input placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input form-select filter-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">{t('allDepts')}</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
        </select>
        <select className="form-input form-select filter-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">{t('allRoles')}</option>
          {ROLES.map(r => <option key={r.id} value={r.id}>{r.icon} {t(r.labelKey)}</option>)}
        </select>
      </div>

      <div className="section-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('fullName')}</th>
              <th>{t('email')}</th>
              <th>{t('role')}</th>
              <th>{t('department')}</th>
              <th>{t('capacity')}</th>
              <th>{t('status')}</th>
              <th style={{ width: 80 }}>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice((page - 1) * perPage, page * perPage).map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar-sm">{u.full_name.charAt(0)}</div>
                    <span style={{ fontWeight: 600 }}>{u.full_name}</span>
                  </div>
                </td>
                <td style={{ color: '#64748b' }}>{u.email}</td>
                <td>{getRoleBadge(u.role)}</td>
                <td>{u.department_name || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                <td>{u.daily_capacity}{t('hoursPerDay')}</td>
                <td><span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>{u.is_active ? t('active') : t('inactive')}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="icon-btn" onClick={() => openEdit(u)}><Pencil size={14} /></button>
                    <button className="icon-btn icon-btn-danger" onClick={() => setDelId(u.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>{t('noUserFound')}</td></tr>}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={page} totalItems={filtered.length} itemsPerPage={perPage}
        onPageChange={p => setPage(p)} onItemsPerPageChange={n => { setPerPage(n); setPage(1); }} />

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal === 'create' ? t('newUser') : t('editUser')}</h2>
              <button className="icon-btn" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('fullName')} *</label>
                  <input className="form-input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('email')} *</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 16 }}>
                <div className="form-group">
                  <label className="form-label">{t('password')} {modal !== 'create' && <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{t('pwdLeaveBlank')}</span>}</label>
                  <input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('role')}</label>
                  <select className="form-input form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.icon} {t(r.labelKey)}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 16 }}>
                <div className="form-group">
                  <label className="form-label">{t('department')}</label>
                  <select className="form-input form-select" value={form.department_id}
                    onChange={e => setForm({ ...form, department_id: e.target.value ? parseInt(e.target.value) : '' })}>
                    <option value="">— {t('none')} —</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('capacity')} ({t('hoursPerDay')})</label>
                  <input className="form-input" type="number" min={1} max={16} value={form.daily_capacity}
                    onChange={e => setForm({ ...form, daily_capacity: parseInt(e.target.value) || 8 })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.full_name.trim() || !form.email.trim()}>
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
              <h3>{t('deactivateUser')}</h3>
              <p style={{ color: '#64748b', margin: '8px 0 24px' }}>{t('deactivateWarn')}</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setDelId(null)}>{t('cancel')}</button>
                <button className="btn btn-danger" onClick={handleDeactivate}>{t('deactivate')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
