import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Ticket, 
  CheckCircle, 
  ArrowRight,
  ChevronRight,
  Compass
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import API_BASE_URL from '../lib/api';

interface ScheduleRegistration {
  id: string;
  event_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  isPaid: boolean;
  ticket_price: number;
  status: 'pending_approval' | 'confirmed' | 'rejected' | 'waitlisted' | 'promoted' | 'cancelled' | 'expired';
  rejection_reason?: string;
  waitlist_position?: number;
  event_title: string;
  event_date: string;
  time_start: string;
  time_end: string;
  venue: string;
  club_name: string;
  ticketToken?: string;
  checkedIn: boolean;
  checkedInAt?: string;
  isEnded?: boolean;
  certificatesIssued?: boolean;
  created_at: string;
}

export default function MySchedule() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [registrations, setRegistrations] = useState<ScheduleRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'confirmed' | 'pending'>('all');

  useEffect(() => {
    const fetchMySchedule = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        const res = await fetch(`${API_BASE_URL}/events/my-registrations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setRegistrations(data.registrations || []);
        } else {
          setErrorMsg(data.error || 'Failed to load your event schedule.');
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('Network error while fetching schedule.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchMySchedule();
    }
  }, [token]);

  const filteredRegistrations = registrations.filter(reg => {
    if (activeFilter === 'confirmed') return reg.status === 'confirmed';
    if (activeFilter === 'pending') return ['pending_approval', 'waitlisted', 'promoted'].includes(reg.status);
    return true;
  });

  const confirmedCount = registrations.filter(r => r.status === 'confirmed').length;
  const checkedInCount = registrations.filter(r => r.checkedIn).length;
  const pendingCount = registrations.filter(r => ['pending_approval', 'waitlisted'].includes(r.status)).length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1e1e1e] p-6 sm:p-8 rounded-3xl border border-brand-ink/10 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-vermilion/10 text-brand-vermilion text-xs font-extrabold uppercase tracking-wider mb-2">
            <Calendar className="w-3.5 h-3.5" /> My Personal Timeline
          </div>
          <h1 className="text-3xl font-black text-brand-ink tracking-tight">
            My Event Schedule 📅
          </h1>
          <p className="text-brand-ink/60 text-sm mt-1 font-medium">
            All your joined events, schedule details, and entry pass redirects in one place.
          </p>
        </div>

        <Link to="/passes">
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-brand-ink text-white font-bold text-xs rounded-xl shadow-md hover:bg-brand-ink/90 transition-all cursor-pointer whitespace-nowrap"
          >
            <Ticket className="w-4 h-4 text-brand-vermilion" />
            Go to My Passes Page
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </Link>
      </div>

      {/* Quick Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-brand-ink/10 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-brand-ink/50 uppercase tracking-wider block">Joined Events</span>
            <strong className="text-2xl font-black text-brand-ink">{registrations.length}</strong>
          </div>
          <div className="p-3 bg-brand-offwhite rounded-xl text-brand-ink">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-brand-ink/10 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-brand-ink/50 uppercase tracking-wider block">Confirmed Passes</span>
            <strong className="text-2xl font-black text-emerald-700">{confirmedCount}</strong>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-brand-ink/10 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-brand-ink/50 uppercase tracking-wider block">Gate Verified</span>
            <strong className="text-2xl font-black text-purple-700">{checkedInCount}</strong>
          </div>
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
            <Ticket className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-brand-ink/10 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeFilter === 'all'
              ? 'bg-brand-ink text-white shadow-sm'
              : 'bg-white dark:bg-[#1e1e1e] text-brand-ink/70 hover:bg-brand-ink/5 border border-brand-ink/10'
          }`}
        >
          All Events ({registrations.length})
        </button>
        <button
          onClick={() => setActiveFilter('confirmed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeFilter === 'confirmed'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-[#1e1e1e] text-brand-ink/70 hover:bg-brand-ink/5 border border-brand-ink/10'
          }`}
        >
          Confirmed ({confirmedCount})
        </button>
        <button
          onClick={() => setActiveFilter('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeFilter === 'pending'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white dark:bg-[#1e1e1e] text-brand-ink/70 hover:bg-brand-ink/5 border border-brand-ink/10'
          }`}
        >
          Pending / Waitlist ({pendingCount})
        </button>
      </div>

      {/* Schedule List */}
      {loading ? (
        <div className="py-16 text-center space-y-3 bg-white dark:bg-[#1e1e1e] rounded-3xl border border-brand-ink/10">
          <div className="w-8 h-8 border-3 border-brand-ink/20 border-t-brand-vermilion rounded-full animate-spin mx-auto" />
          <p className="text-xs text-brand-ink/60 font-medium">Loading your schedule timeline...</p>
        </div>
      ) : errorMsg ? (
        <div className="p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-center font-medium text-sm">
          {errorMsg}
        </div>
      ) : filteredRegistrations.length === 0 ? (
        <div className="py-16 px-6 bg-white dark:bg-[#1e1e1e] rounded-3xl border border-brand-ink/10 text-center space-y-4">
          <div className="w-16 h-16 bg-brand-vermilion/10 text-brand-vermilion rounded-2xl flex items-center justify-center mx-auto">
            <Compass className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-brand-ink">No events in this view yet</h3>
            <p className="text-xs text-brand-ink/60 mt-1 max-w-sm mx-auto font-medium">
              Explore upcoming campus events and join them to automatically build your schedule timeline!
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-brand-vermilion text-white text-xs font-bold rounded-xl shadow-md hover:bg-brand-vermilion/90 transition-all cursor-pointer"
          >
            Explore Upcoming Events 🚀
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRegistrations.map((reg) => (
            <div
              key={reg.id}
              className="p-5 sm:p-6 bg-white dark:bg-[#1e1e1e] rounded-3xl border border-brand-ink/10 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden"
            >
              {/* Left Details Section */}
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-brand-ink/5 text-brand-ink">
                    {reg.club_name}
                  </span>

                  {reg.isPaid ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200/60">
                      Paid Entry (₹{reg.ticket_price})
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      Free Entry
                    </span>
                  )}

                  {/* Status Badge */}
                  {reg.checkedIn ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      Gate Verified ✓
                    </span>
                  ) : reg.status === 'confirmed' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Confirmed Pass Active ✓
                    </span>
                  ) : reg.status === 'pending_approval' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                      Pending Approval
                    </span>
                  ) : reg.status === 'waitlisted' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                      Waitlisted (#{reg.waitlist_position})
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700">
                      {reg.status}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-black text-brand-ink tracking-tight">
                    {reg.event_title}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-brand-ink/70">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-brand-ink/40" />
                    <span>{reg.event_date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-brand-ink/40" />
                    <span>{reg.time_start} - {reg.time_end}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-brand-vermilion" />
                    <span className="text-brand-ink font-bold">{reg.venue}</span>
                  </div>
                </div>
              </div>

              {/* Right Action Redirect Section */}
              <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center justify-center gap-2 border-t md:border-t-0 md:border-l border-brand-ink/10 pt-4 md:pt-0 md:pl-6 min-w-[200px]">
                {reg.status === 'confirmed' ? (
                  <Link to="/passes" className="w-full">
                    <button
                      type="button"
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Ticket className="w-4 h-4" />
                      View Entry Pass & QR 🎟️
                    </button>
                  </Link>
                ) : reg.status === 'pending_approval' ? (
                  <Link to="/passes" className="w-full">
                    <button
                      type="button"
                      className="w-full py-2.5 px-4 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-xl border border-amber-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-amber-700" />
                      Check Approval Status
                    </button>
                  </Link>
                ) : (
                  <Link to="/passes" className="w-full">
                    <button
                      type="button"
                      className="w-full py-2.5 px-4 bg-brand-offwhite hover:bg-brand-ink/10 text-brand-ink font-bold text-xs rounded-xl border border-brand-ink/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4 text-brand-ink/60" />
                      View Pass Details
                    </button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
