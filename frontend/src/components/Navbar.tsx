import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, CalendarDays, User, Ticket, LogOut, Shield, ClipboardList, Sun, Moon } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-brand-offwhite/90 backdrop-blur-md border-b border-brand-ink/10 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-brand-vermilion rounded-lg flex items-center justify-center text-white font-bold transition-transform">
              C
            </div>
            <span className="font-bold text-xl tracking-tight text-brand-ink">ClubSync</span>
          </Link>
          
          <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ink/50" />
            <input 
              type="text" 
              placeholder="Search clubs or events..." 
              className="w-full pl-10 pr-4 py-2 bg-white/50 border border-brand-ink/20 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-vermilion/50 transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/schedule" className="text-brand-ink/70 hover:text-brand-vermilion transition-colors flex flex-col items-center gap-1">
              <CalendarDays className="w-5 h-5" />
              <span className="text-[10px] font-medium hidden md:block">Schedule</span>
            </Link>
            {user?.role !== 'admin' && (
              <Link to="/passes" className="text-brand-ink/70 hover:text-brand-vermilion transition-colors flex flex-col items-center gap-1 relative">
                <Ticket className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-vermilion rounded-full border-2 border-brand-offwhite"></span>
                <span className="text-[10px] font-medium hidden md:block">Passes</span>
              </Link>
            )}

            {/* Dark Mode Toggle Switch */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-2 rounded-full bg-brand-ink/5 hover:bg-brand-ink/10 text-brand-ink transition-all cursor-pointer flex items-center justify-center border border-brand-ink/10"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
            
            {user ? (
              <div className="flex items-center gap-4">
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-brand-ink/70 hover:text-brand-vermilion transition-colors flex flex-col items-center gap-1">
                    <Shield className="w-5 h-5" />
                    <span className="text-[10px] font-medium hidden md:block">Admin</span>
                  </Link>
                )}
                {user.role === 'organizer' && (
                  <Link to="/organizer" className="text-brand-ink/70 hover:text-brand-vermilion transition-colors flex flex-col items-center gap-1">
                    <ClipboardList className="w-5 h-5" />
                    <span className="text-[10px] font-medium hidden md:block">Manage</span>
                  </Link>
                )}
                <div className="flex items-center gap-2 border-l border-brand-ink/20 pl-4">
                  <span className="text-sm font-medium hidden md:block text-brand-ink">{user.name}</span>
                  <button 
                    onClick={handleLogout}
                    className="w-8 h-8 rounded-full bg-brand-ink/10 text-brand-ink flex items-center justify-center hover:bg-brand-vermilion hover:text-white transition-all cursor-pointer"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-2 px-4 py-2 bg-brand-ink text-white rounded-full font-medium text-sm transition-transform">
                <User className="w-4 h-4" />
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
