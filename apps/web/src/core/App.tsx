import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { api } from './api.js';

// Lazy load modules
import { Login } from '../modules/auth/pages/Login.js';
import { Register } from '../modules/auth/pages/Register.js';
import { AdminLayout } from '../modules/admin/AdminLayout.js';
import { AdminDashboard } from '../modules/admin/pages/AdminDashboard.js';

export function App() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    // Check session on load
    api.call('auth.me', {}).then(res => {
      // res.user contains auth state
      setInit(true);
    }).catch(() => {
      setInit(true);
    });
  }, []);

  if (!init) {
    return <div className="min-h-screen flex items-center justify-center font-sans font-bold text-xl animate-pulse">Loading ClubSync...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Admin routes (temporary for Phase 1 verification) */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
