import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import API_BASE_URL from '../lib/api';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [year, setYear] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, year, department }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      login(data.token, data.user);
      navigate('/');
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
            <UserPlus className="w-6 h-6" />
          </div>
          
          <h2 className="text-3xl font-bold text-center text-brand-ink mb-2">Create Account</h2>
          <p className="text-center text-brand-ink/60 mb-8">Join ClubSync to easily manage your campus life.</p>

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
              <label className="text-sm font-semibold text-brand-ink/80 pl-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-ink/40" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-brand-offwhite/50 border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-vermilion/50 focus:bg-white transition-all text-brand-ink"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

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
              <label className="text-sm font-semibold text-brand-ink/80 pl-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-ink/40" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-brand-offwhite/50 border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-vermilion/50 focus:bg-white transition-all text-brand-ink"
                  placeholder="••••••••"
                  required
                  minLength={4}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-brand-ink/80 pl-1">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-4 py-3 bg-brand-offwhite/50 border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-vermilion/50 focus:bg-white transition-all text-brand-ink"
                  required
                >
                  <option value="">Select Year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                  <option value="5">5th Year / PG</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-brand-ink/80 pl-1">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 bg-brand-offwhite/50 border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-vermilion/50 focus:bg-white transition-all text-brand-ink"
                  required
                >
                  <option value="">Select Dept</option>
                  <option value="CSE">CSE</option>
                  <option value="ECE">ECE</option>
                  <option value="EEE">EEE</option>
                  <option value="ME">Mechanical</option>
                  <option value="CE">Civil</option>
                  <option value="IT">IT</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-brand-vermilion text-white rounded-xl font-semibold hover:bg-brand-vermilion/90 focus:ring-4 focus:ring-brand-vermilion/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed group mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="px-8 py-5 bg-brand-offwhite/50 border-t border-brand-ink/5 text-center">
          <p className="text-sm text-brand-ink/60">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-vermilion hover:underline">
              Sign in instead
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
