// ══════════════════════════════════════════
// SmartTask Pro — App Router
// ══════════════════════════════════════════
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useStore from './store';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Departments from './pages/Departments';
import Users from './pages/Users';
import Tasks from './pages/Tasks';
import Flags from './pages/Flags';
import Calendar from './pages/Calendar';

function ProtectedRoute({ children }) {
  const user = useStore(s => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const toast = useStore(s => s.toast);
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="departments" element={<Departments />} />
          <Route path="users" element={<Users />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="flags" element={<Flags />} />
          <Route path="calendar" element={<Calendar />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
