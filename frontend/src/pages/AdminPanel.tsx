import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  ShieldAlert, 
  Users, 
  CheckCircle, 
  Search, 
  Building2, 
  CalendarClock, 
  Check, 
  X, 
  Trash2, 
  Sparkles,
  MapPin,
  Clock,
  Ticket,
  AlertTriangle,
  ArrowLeft,
  FileText,
  Eye
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import API_BASE_URL from '../lib/api';

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface Club {
  id: number;
  name: string;
  code: string;
  category?: string;
  description?: string;
}

interface OrganizerWithClubs extends UserData {
  clubs: Club[];
}

interface EventItem {
  id: string;
  title: string;
  club: string;
  clubId: number;
  organizerName: string;
  date: string;
  time: string;
  timeStart: string;
  timeEnd: string;
  venue: string;
  description: string;
  totalSeats: number;
  takenSeats: number;
  isPaid: boolean;
  ticketPrice: number;
  paymentQr?: string;
  imageUrl?: string;
  pdfUrl?: string;
  pdfName?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  rejectionReason?: string;
  isLive: boolean;
  createdAt: string;
}

export default function AdminPanel() {
  const { token } = useAuth();

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'events' | 'clubs' | 'users'>('events');

  // Data states
  const [events, setEvents] = useState<EventItem[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerWithClubs[]>([]);
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & filter
  const [eventFilter, setEventFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [userSearch, setUserSearch] = useState('');

  // Rejection modal state
  const [rejectingEventId, setRejectingEventId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Event details preview modal state
  const [selectedEventForView, setSelectedEventForView] = useState<EventItem | null>(null);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedEventForView(null);
        setRejectingEventId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEventForView, rejectingEventId]);

  // Initial data fetch
  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch in parallel
      const [eventsRes, orgsRes, clubsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/events/all`, { headers }),
        fetch(`${API_BASE_URL}/clubs/organizers`, { headers }),
        fetch(`${API_BASE_URL}/clubs`),
        fetch(`${API_BASE_URL}/auth/users`, { headers })
      ]);

      if (eventsRes.ok) {
        const d = await eventsRes.json();
        setEvents(d.events || []);
      }
      if (orgsRes.ok) {
        const d = await orgsRes.json();
        setOrganizers(d.organizers || []);
      }
      if (clubsRes.ok) {
        const d = await clubsRes.json();
        setAllClubs(d.clubs || []);
      }
      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsers(d.users || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Flash messages
  const flashSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Create demo event
  const handleCreateDemoEvent = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/events/demo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create demo event');
      }
      flashSuccess('Demo event broadcasted live across all dashboards!');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Approve event
  const handleApproveEvent = async (eventId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'approved' })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to approve event');

      flashSuccess('Event approved and made live!');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Reject event
  const handleConfirmReject = async () => {
    if (!rejectingEventId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/events/${rejectingEventId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'rejected',
          rejectionReason: rejectionReason.trim() || 'Schedule conflict or incomplete details.'
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to reject event');

      flashSuccess('Event marked as rejected.');
      setRejectingEventId(null);
      setRejectionReason('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete event
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event permanently?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete event');
      flashSuccess('Event deleted.');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Assign club to organizer
  const handleAssignClub = async (userId: number, clubId: number) => {
    if (!clubId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/clubs/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId, clubId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to assign club');

      flashSuccess('Club assigned successfully!');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Unassign club from organizer
  const handleUnassignClub = async (userId: number, clubId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/clubs/unassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId, clubId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to unassign club');

      flashSuccess('Club removed.');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Change user role
  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (!response.ok) throw new Error('Failed to update role');

      flashSuccess(`User role updated to ${newRole}`);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredEvents = events.filter(e => {
    if (eventFilter === 'pending') return e.status === 'pending_approval';
    if (eventFilter === 'approved') return e.status === 'approved';
    if (eventFilter === 'rejected') return e.status === 'rejected';
    return true;
  });

  const pendingCount = events.filter(e => e.status === 'pending_approval').length;

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner & Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <span className="p-2 bg-brand-vermilion/10 text-brand-vermilion rounded-2xl">
              <Shield className="w-8 h-8" />
            </span>
            System Admin Center
          </h1>
          <p className="text-brand-ink/60 mt-1">
            Manage clubs, assign organizers, review venue reservations, and approve events.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleCreateDemoEvent}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-ink text-brand-offwhite rounded-xl text-sm font-semibold hover:bg-brand-ink/90 active:scale-95 transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-brand-vermilion" />
            + Demo Sync Event
          </button>
        </div>
      </header>

      {/* Notifications */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium"
        >
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-medium border border-red-100">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-brand-ink/10 pb-2">
        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'events'
              ? 'bg-brand-vermilion text-white shadow-sm'
              : 'text-brand-ink/70 hover:bg-brand-ink/5'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          Event Governance
          {pendingCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'events' ? 'bg-white text-brand-vermilion' : 'bg-brand-vermilion text-white'
            }`}>
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('clubs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'clubs'
              ? 'bg-brand-vermilion text-white shadow-sm'
              : 'text-brand-ink/70 hover:bg-brand-ink/5'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Club & Organizer Assignments
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'users'
              ? 'bg-brand-vermilion text-white shadow-sm'
              : 'text-brand-ink/70 hover:bg-brand-ink/5'
          }`}
        >
          <Users className="w-4 h-4" />
          User Roles
        </button>
      </div>

      {/* TAB 1: EVENT GOVERNANCE & APPROVALS */}
      {activeTab === 'events' && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Event Requests & Reservations</h2>
              <p className="text-sm text-brand-ink/60">
                Review submitted events and verify room/time availability before publishing.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-brand-offwhite p-1 rounded-xl border border-brand-ink/10 text-xs font-semibold">
              <button
                onClick={() => setEventFilter('pending')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  eventFilter === 'pending'
                    ? 'bg-white text-brand-ink shadow-sm'
                    : 'text-brand-ink/60 hover:text-brand-ink'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setEventFilter('approved')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  eventFilter === 'approved'
                    ? 'bg-white text-brand-ink shadow-sm'
                    : 'text-brand-ink/60 hover:text-brand-ink'
                }`}
              >
                Approved Live
              </button>
              <button
                onClick={() => setEventFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  eventFilter === 'rejected'
                    ? 'bg-white text-brand-ink shadow-sm'
                    : 'text-brand-ink/60 hover:text-brand-ink'
                }`}
              >
                Rejected
              </button>
              <button
                onClick={() => setEventFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  eventFilter === 'all'
                    ? 'bg-white text-brand-ink shadow-sm'
                    : 'text-brand-ink/60 hover:text-brand-ink'
                }`}
              >
                All ({events.length})
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-brand-ink/40">
              <div className="w-8 h-8 border-2 border-brand-ink/20 border-t-brand-vermilion rounded-full animate-spin mx-auto mb-3"></div>
              Loading event requests...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-brand-ink/10 p-12 text-center text-brand-ink/50">
              No events found in this category.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredEvents.map((ev) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-brand-ink/10 p-6 shadow-sm hover:border-brand-ink/20 transition-all flex flex-col md:flex-row justify-between gap-6"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-ink/5 text-brand-ink/70">
                        {ev.club}
                      </span>

                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        ev.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ev.status === 'pending_approval'
                          ? 'bg-amber-100 text-amber-800'
                          : ev.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ev.status === 'pending_approval' ? 'Pending Approval' : ev.status}
                      </span>

                      {ev.isPaid ? (
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 flex items-center gap-1">
                          <Ticket className="w-3 h-3" /> Paid (₹{ev.ticketPrice})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700">
                          Free Entry
                        </span>
                      )}
                    </div>

                    <h3 
                      onClick={() => setSelectedEventForView(ev)}
                      className="text-xl font-bold tracking-tight text-brand-ink hover:text-brand-vermilion transition-colors cursor-pointer"
                      title="Click to view full description and details"
                    >
                      {ev.title}
                    </h3>

                    {ev.description && (
                      <p className="text-sm text-brand-ink/70 leading-relaxed max-w-2xl line-clamp-2">
                        {ev.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-y-2 gap-x-6 text-xs text-brand-ink/60 font-medium pt-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-brand-vermilion" />
                        <span>Venue: <strong className="text-brand-ink">{ev.venue}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-brand-ink/40" />
                        <span>Date & Time: <strong className="text-brand-ink">{ev.date} ({ev.time})</strong></span>
                      </div>
                      <div>
                        Capacity: <strong className="text-brand-ink">{ev.totalSeats} seats</strong>
                      </div>
                      <div>
                        Organizer: <strong className="text-brand-ink">{ev.organizerName}</strong>
                      </div>
                    </div>

                    {ev.rejectionReason && (
                      <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-medium border border-red-200">
                        <strong>Rejection Reason:</strong> {ev.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex md:flex-col items-center justify-center gap-2 border-t md:border-t-0 md:border-l border-brand-ink/10 pt-4 md:pt-0 md:pl-6 min-w-[160px]">
                    <button
                      onClick={() => setSelectedEventForView(ev)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-offwhite text-brand-ink rounded-xl text-xs font-bold hover:bg-brand-ink/10 transition-all border border-brand-ink/10 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Description & Info
                    </button>
                    {ev.status === 'pending_approval' && (
                      <>
                        <button
                          onClick={() => handleApproveEvent(ev.id)}
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
                        >
                          <Check className="w-4 h-4" /> Approve & Publish
                        </button>
                        <button
                          onClick={() => setRejectingEventId(ev.id)}
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-xs font-bold active:scale-95 transition-all border border-red-200"
                        >
                          <X className="w-4 h-4" /> Reject Event
                        </button>
                      </>
                    )}

                    {ev.status === 'approved' && (
                      <div className="w-full text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 w-full justify-center">
                          <CheckCircle className="w-3.5 h-3.5" /> Published Live
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-brand-ink/40 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium transition-all"
                      title="Permanently Delete Event"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: CLUB & ORGANIZER ASSIGNMENTS */}
      {activeTab === 'clubs' && (
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">Club Assignments for Organizers</h2>
            <p className="text-sm text-brand-ink/60">
              Assign organizers to their specific clubs so they can draft and publish events for those clubs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {organizers.map((org) => {
              const assignedClubIds = org.clubs.map(c => c.id);
              const unassignedClubs = allClubs.filter(c => !assignedClubIds.includes(c.id));

              return (
                <div
                  key={org.id}
                  className="bg-white rounded-2xl border border-brand-ink/10 p-6 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-lg text-brand-ink">{org.name}</h3>
                        <p className="text-xs text-brand-ink/60">{org.email}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        Organizer
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-brand-ink/40 mb-2">
                        Assigned Clubs ({org.clubs.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {org.clubs.length === 0 ? (
                          <span className="text-xs text-amber-600 italic bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            No clubs assigned yet
                          </span>
                        ) : (
                          org.clubs.map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-offwhite rounded-xl text-xs font-medium border border-brand-ink/10"
                            >
                              <span>{c.name}</span>
                              <button
                                onClick={() => handleUnassignClub(org.id, c.id)}
                                className="text-brand-ink/40 hover:text-red-600 transition-colors"
                                title="Remove club assignment"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Add Club Dropdown */}
                  <div className="mt-6 pt-4 border-t border-brand-ink/10 flex items-center gap-2">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignClub(org.id, parseInt(e.target.value, 10));
                          e.target.value = '';
                        }
                      }}
                      className="w-full bg-brand-offwhite/50 border border-brand-ink/10 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-vermilion/40"
                    >
                      <option value="" disabled>+ Assign to a club...</option>
                      {unassignedClubs.map((club) => (
                        <option key={club.id} value={club.id}>
                          {club.name} ({club.category || 'General'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {organizers.length === 0 && !isLoading && (
            <div className="bg-white rounded-2xl border border-brand-ink/10 p-12 text-center text-brand-ink/50">
              No users have the organizer role yet. Promote users from the "User Roles" tab.
            </div>
          )}
        </section>
      )}

      {/* TAB 3: USER ROLES MANAGEMENT */}
      {activeTab === 'users' && (
        <section className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-brand-ink/10 overflow-hidden">
            <div className="p-6 border-b border-brand-ink/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-vermilion" />
                  Account Permissions
                </h2>
                <p className="text-xs text-brand-ink/50 mt-0.5">
                  Promote students to organizers or revert them back to regular attendees.
                </p>
              </div>

              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ink/40" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-brand-offwhite/50 border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-vermilion/50 transition-all text-sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-brand-offwhite/50 text-brand-ink/60 border-b border-brand-ink/10">
                  <tr>
                    <th className="px-6 py-4 font-semibold">User</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">Current Role</th>
                    <th className="px-6 py-4 font-semibold">Modify Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-ink/5">
                  {users
                    .filter(u =>
                      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.email.toLowerCase().includes(userSearch.toLowerCase())
                    )
                    .map((u) => (
                      <tr key={u.id} className="hover:bg-brand-offwhite/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-brand-ink">{u.name}</td>
                        <td className="px-6 py-4 text-brand-ink/70">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'organizer'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {u.role !== 'admin' ? (
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="bg-brand-offwhite border border-brand-ink/10 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-vermilion/50 cursor-pointer"
                            >
                              <option value="user">User</option>
                              <option value="organizer">Organizer</option>
                            </select>
                          ) : (
                            <span className="text-xs text-brand-ink/40 font-medium">System SuperAdmin</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Reject Reason Modal */}
      <AnimatePresence>
        {rejectingEventId && (
          <div 
            onClick={(e) => { if (e.target === e.currentTarget) setRejectingEventId(null); }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-brand-ink/10 relative"
            >
              {/* Top Navigation Bar with Back Button */}
              <div className="flex items-center justify-between pb-3 border-b border-brand-ink/10 -mt-2">
                <button
                  type="button"
                  onClick={() => setRejectingEventId(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-offwhite hover:bg-brand-ink/10 text-brand-ink rounded-xl text-xs font-bold transition-all border border-brand-ink/10 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Events
                </button>
                <button
                  type="button"
                  onClick={() => setRejectingEventId(null)}
                  className="p-1.5 rounded-full bg-brand-ink/5 hover:bg-brand-ink/10 text-brand-ink transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-lg font-bold">Reject Event Request</h3>
              </div>
              <p className="text-sm text-brand-ink/70">
                Provide feedback to the organizer explaining why this request cannot be approved (e.g. venue booked, incomplete brochure).
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={3}
                className="w-full p-3 rounded-xl border border-brand-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-brand-ink/10">
                <button
                  type="button"
                  onClick={() => setRejectingEventId(null)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-brand-ink/60 hover:bg-brand-ink/5 border border-brand-ink/10 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back / Cancel
                </button>
                <button
                  onClick={handleConfirmReject}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Event Details & Description Review Modal */}
      <AnimatePresence>
        {selectedEventForView && (
          <div 
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedEventForView(null); }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 space-y-6 shadow-2xl border border-brand-ink/10 relative max-h-[90vh] overflow-y-auto"
            >
              {/* Top Navigation Bar with Back Button */}
              <div className="flex items-center justify-between pb-3 border-b border-brand-ink/10 -mt-2">
                <button
                  type="button"
                  onClick={() => setSelectedEventForView(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-offwhite hover:bg-brand-ink/10 text-brand-ink rounded-xl text-xs font-bold transition-all border border-brand-ink/10 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Event List
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEventForView(null)}
                  className="p-1.5 rounded-full bg-brand-ink/5 hover:bg-brand-ink/10 text-brand-ink transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedEventForView.imageUrl && (
                <div className="-mx-6 md:-mx-8 -mt-2 mb-4 h-52 overflow-hidden bg-brand-ink/5">
                  <img
                    src={selectedEventForView.imageUrl}
                    alt={selectedEventForView.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-vermilion/10 text-brand-vermilion">
                    {selectedEventForView.club}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                    selectedEventForView.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedEventForView.status === 'pending_approval'
                      ? 'bg-amber-100 text-amber-800'
                      : selectedEventForView.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedEventForView.status === 'pending_approval' ? 'Pending Approval' : selectedEventForView.status}
                  </span>
                  {selectedEventForView.isPaid ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 flex items-center gap-1">
                      <Ticket className="w-3.5 h-3.5" /> ₹{selectedEventForView.ticketPrice} Entry
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                      Free Entry
                    </span>
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-brand-ink tracking-tight">
                  {selectedEventForView.title}
                </h2>
                <p className="text-xs text-brand-ink/50 mt-1">
                  Submitted by organizer: <strong className="text-brand-ink">{selectedEventForView.organizerName}</strong>
                </p>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-brand-offwhite p-4 rounded-2xl border border-brand-ink/10 text-xs font-medium">
                <div className="space-y-0.5">
                  <span className="text-brand-ink/50 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-brand-vermilion" /> Venue
                  </span>
                  <strong className="text-brand-ink block text-sm">{selectedEventForView.venue}</strong>
                </div>
                <div className="space-y-0.5">
                  <span className="text-brand-ink/50 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Date & Time
                  </span>
                  <strong className="text-brand-ink block text-sm">{selectedEventForView.date} ({selectedEventForView.time})</strong>
                </div>
                <div className="space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-brand-ink/50 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Capacity
                  </span>
                  <strong className="text-brand-ink block text-sm">{selectedEventForView.totalSeats} seats</strong>
                </div>
              </div>

              {/* Full Description Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-ink/50">
                  Full Event Description
                </h4>
                <div className="p-4 bg-brand-offwhite/50 rounded-2xl border border-brand-ink/10 text-sm text-brand-ink/80 leading-relaxed whitespace-pre-line">
                  {selectedEventForView.description || 'No description provided.'}
                </div>
              </div>

              {/* Payment UPI QR Code preview if paid */}
              {selectedEventForView.isPaid && selectedEventForView.paymentQr && (
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center gap-4">
                  <img
                    src={selectedEventForView.paymentQr}
                    alt="Payment UPI QR"
                    className="w-20 h-20 object-contain rounded-xl border border-brand-ink/10 bg-white p-1"
                  />
                  <div>
                    <span className="text-xs font-bold text-indigo-950 block">Payment QR Attached</span>
                    <span className="text-xs text-indigo-700">Ticket Price: ₹{selectedEventForView.ticketPrice}</span>
                  </div>
                </div>
              )}

              {/* Attached Rules Brochure PDF */}
              {selectedEventForView.pdfName && (
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs font-medium text-emerald-800">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>{selectedEventForView.pdfName}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                    Official Brochure
                  </span>
                </div>
              )}

              {/* Rejection Note if rejected */}
              {selectedEventForView.rejectionReason && (
                <div className="p-3 bg-red-50 rounded-2xl border border-red-200 text-xs font-semibold text-red-700">
                  <strong>Rejection Note:</strong> {selectedEventForView.rejectionReason}
                </div>
              )}

              {/* Admin Actions in Modal (if pending approval) */}
              {selectedEventForView.status === 'pending_approval' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      handleApproveEvent(selectedEventForView.id);
                      setSelectedEventForView(null);
                    }}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Approve & Publish Live
                  </button>
                  <button
                    onClick={() => {
                      setRejectingEventId(selectedEventForView.id);
                      setSelectedEventForView(null);
                    }}
                    className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <X className="w-4 h-4" /> Reject Event
                  </button>
                </div>
              )}

              {/* Prominent Back Button at Bottom */}
              <div className="pt-2 border-t border-brand-ink/10">
                <button
                  type="button"
                  onClick={() => setSelectedEventForView(null)}
                  className="w-full py-3 bg-brand-offwhite hover:bg-brand-ink/10 text-brand-ink font-bold text-sm rounded-2xl transition-all border border-brand-ink/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Event List
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
