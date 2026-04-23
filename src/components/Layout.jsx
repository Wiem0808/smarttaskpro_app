// ══════════════════════════════════════════
// SmartTask Pro — Layout (Sidebar + Top bar)
// ══════════════════════════════════════════
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, UsersRound,
  ListChecks, Flag, LogOut, Zap, CalendarDays, Menu, X,
} from 'lucide-react';
import useStore from '../store';
import { useLang } from '../hooks/useLang';

export default function Layout() {
  const user = useStore(s => s.user);
  const logout = useStore(s => s.logout);
  const nav = useNavigate();
  const { lang, changeLang, t, LANGUAGES } = useLang();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const NAV = [
    { to: '/',            icon: LayoutDashboard, labelKey: 'dashboard' },
    { to: '/departments', icon: Building2,       labelKey: 'departments', roles: ['super_admin'] },
    { to: '/users',       icon: UsersRound,      labelKey: 'users',       roles: ['super_admin', 'manager'] },
    { to: '/tasks',       icon: ListChecks,      labelKey: 'tasks' },
    { to: '/flags',       icon: Flag,            labelKey: 'flags' },
    { to: '/calendar',    icon: CalendarDays,    labelKey: 'calendar' },
  ];

  const handleLogout = () => { logout(); nav('/login'); };
  const visibleNav = NAV.filter(n => !n.roles || n.roles.includes(user?.role));
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-layout">
      {/* ── Mobile Top Bar ── */}
      <header className="mobile-topbar">
        <button className="mobile-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className="mobile-topbar-brand">
          <Zap size={18} /> <span>SmartTask</span>
        </div>
        <div className="mobile-topbar-avatar">{user?.full_name?.charAt(0)}</div>
      </header>

      {/* ── Sidebar Overlay (mobile) ── */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Zap size={22} />
          <span>SmartTask</span>
        </div>

        <nav className="sidebar-nav">
          {visibleNav.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}>
              <n.icon size={18} />
              <span>{t(n.labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        {/* ── Language Switcher ── */}
        <div className="lang-switcher">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              className={`lang-btn ${lang === l.code ? 'active' : ''}`}
              onClick={() => changeLang(l.code)}
              title={l.label}
            >
              {l.flag} <span>{l.code.toUpperCase()}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar-sm">{user?.full_name?.charAt(0)}</div>
            <div>
              <div className="sidebar-user-name">{user?.full_name}</div>
              <div className="sidebar-user-role">{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout} title={t('logout')}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
