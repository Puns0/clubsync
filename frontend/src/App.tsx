import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminPanel from './pages/AdminPanel';
import OrganizerDashboard from './pages/OrganizerDashboard';
import MyPasses from './pages/MyPasses';
import MySchedule from './pages/MySchedule';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './lib/AuthContext';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-brand-offwhite text-brand-ink selection:bg-brand-vermilion selection:text-white">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes (Any logged in user) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Home />} />
              <Route path="/clubs" element={<div className="p-8 text-center font-medium">Clubs Directory Placeholder</div>} />
              <Route path="/schedule" element={<MySchedule />} />
              <Route path="/passes" element={<MyPasses />} />
            </Route>

            {/* Organizer Only Routes */}
            <Route element={<ProtectedRoute allowedRoles={['organizer', 'admin']} />}>
              <Route path="/organizer" element={<OrganizerDashboard />} />
            </Route>

            {/* Admin Only Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminPanel />} />
            </Route>
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
