import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import API_BASE_URL from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
   const location = useLocation();
  const { login } = useAuth();

  // Determine where to redirect based on role
  function getRedirectPath(role: string) {
    switch (role) {
      case 'admin': return '/admin';
      case 'organizer': return '/organizer';
      default: return '/';
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      login(data.token, data.user);

      // If user was trying to access a specific page, send them there
      // Otherwise, redirect to their role-based dashboard
      const from = location.state?.from?.pathname;
      const destination = from || getRedirectPath(data.user.role);
      navigate(destination, { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-brand-ink/10"
      >
        <div className="p-8 sm:p-10">
          <div className="flex items-center justify-center w-12 h-12 bg-brand-vermilion/10 text-brand-vermilion rounded-2xl mb-6 mx-auto">
            <LogIn className="w-6 h-6" />
          </div>
          
          <h2 className="text-3xl font-bold text-center text-brand-ink mb-2">Welcome Back</h2>
          <p className="text-center text-brand-ink/60 mb-8">Sign in to manage your events and schedule.</p>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 mb-6 text-sm font-medium border border-red-100"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-brand-ink/80 pl-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-ink/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-brand-offwhite/50 border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-vermilion/50 focus:bg-white transition-all text-brand-ink"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center pl-1">
                <label className="text-sm font-semibold text-brand-ink/80">Password</label>
                <a href="#" className="text-xs font-medium text-brand-vermilion hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-ink/40" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-brand-offwhite/50 border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-vermilion/50 focus:bg-white transition-all text-brand-ink"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-brand-ink text-white rounded-xl font-semibold hover:bg-brand-ink/90 focus:ring-4 focus:ring-brand-ink/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed group mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="px-8 py-5 bg-brand-offwhite/50 border-t border-brand-ink/5 text-center">
          <p className="text-sm text-brand-ink/60">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-brand-vermilion hover:underline">
              Create one now
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
