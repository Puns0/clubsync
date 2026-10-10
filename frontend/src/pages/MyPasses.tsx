import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, 
  QrCode, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Sparkles, 
  X,
  Award
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import API_BASE_URL from '../lib/api';
import CertificateModal from '../components/CertificateModal';

interface StudentPass {
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
  certificatesIssued?: boolean;
  created_at: string;
}

export default function MyPasses() {
  const { token } = useAuth();
  const [passes, setPasses] = useState<StudentPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'pending'>('all');
  
  // Selected pass for enlarged QR popup modal
  const [selectedPassModal, setSelectedPassModal] = useState<StudentPass | null>(null);
  const [modalQrUrl, setModalQrUrl] = useState<string | null>(null);
  const [loadingModalQr, setLoadingModalQr] = useState(false);

  // Certificate Modal State
  const [activeCertPass, setActiveCertPass] = useState<StudentPass | null>(null);

  // Fetch student's registrations / passes
  const fetchMyPasses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/events/my-registrations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPasses(data.registrations || []);
      }
    } catch (err) {
      console.error('Failed to fetch passes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPasses();
  }, [token]);

  // Open full-screen / enlarged QR modal
  const openQrPassModal = async (pass: StudentPass) => {
    setSelectedPassModal(pass);
    setModalQrUrl(null);
    setLoadingModalQr(true);

    try {
      const res = await fetch(`${API_BASE_URL}/events/${pass.event_id}/registrations/${pass.id}/qr`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setModalQrUrl(data.qrDataUrl);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingModalQr(false);
    }
  };

  const filteredPasses = passes.filter(p => {
    if (filter === 'confirmed') return p.status === 'confirmed';
    if (filter === 'pending') return ['pending_approval', 'waitlisted', 'promoted'].includes(p.status);
    return true;
  });

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-brand-ink/10 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-vermilion/10 text-brand-vermilion rounded-full text-xs font-bold mb-2">
            <Ticket className="w-3.5 h-3.5" />
            <span>Student Dashboard</span>
          </div>
          <h1 className="text-3xl font-black text-brand-ink tracking-tight">My Event Passes</h1>
          <p className="text-xs text-brand-ink/60 mt-1">
            Access your QR entry passes, check venue attendance status, and manage your registrations.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-brand-offwhite p-1.5 rounded-2xl border border-brand-ink/10 text-xs font-bold">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filter === 'all' 
                ? 'bg-brand-ink text-white shadow-sm' 
                : 'text-brand-ink/60 hover:text-brand-ink'
            }`}
          >
            All Passes ({passes.length})
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filter === 'confirmed' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-brand-ink/60 hover:text-brand-ink'
            }`}
          >
            Confirmed ({passes.filter(p => p.status === 'confirmed').length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filter === 'pending' 
                ? 'bg-purple-600 text-white shadow-sm' 
                : 'text-brand-ink/60 hover:text-brand-ink'
            }`}
          >
            Pending / Waitlist ({passes.filter(p => ['pending_approval', 'waitlisted', 'promoted'].includes(p.status)).length})
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-20 text-center text-brand-ink/40">
          <div className="w-8 h-8 border-3 border-brand-ink/20 border-t-brand-vermilion rounded-full animate-spin mx-auto mb-3" />
          Loading your event passes...
        </div>
      ) : filteredPasses.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-brand-ink/10 space-y-3">
          <div className="w-12 h-12 bg-brand-offwhite text-brand-ink/30 rounded-2xl flex items-center justify-center mx-auto">
            <Ticket className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-brand-ink">No passes found</h3>
          <p className="text-xs text-brand-ink/50 max-w-sm mx-auto">
            You haven't joined or registered for any events yet. Explore live events on the home page to secure your ticket!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPasses.map((pass) => (
            <motion.div
              key={pass.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-brand-ink/10 shadow-sm overflow-hidden flex flex-col justify-between relative group hover:border-brand-vermilion/30 transition-all"
            >
              {/* Ticket Top Banner */}
              <div className="p-5 bg-gradient-to-r from-slate-900 via-brand-ink to-slate-800 text-white space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/15 px-2.5 py-0.5 rounded-md border border-orange-400/20">
                    {pass.club_name}
                  </span>
                  
                  {/* Status Badge */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    pass.status === 'confirmed'
                      ? 'bg-emerald-500 text-white'
                      : pass.status === 'pending_approval'
                      ? 'bg-amber-500 text-white'
                      : pass.status === 'waitlisted'
                      ? 'bg-purple-500 text-white'
                      : pass.status === 'promoted'
                      ? 'bg-blue-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}>
                    {pass.status === 'confirmed'
                      ? 'Confirmed Entry ✓'
                      : pass.status === 'pending_approval'
                      ? 'Pending Organizer Review'
                      : pass.status === 'waitlisted'
                      ? `Waitlisted (#${pass.waitlist_position})`
                      : pass.status === 'promoted'
                      ? 'Seat Offered (Promoted)'
                      : 'Rejected'}
                  </span>
                </div>

                <h3 className="text-lg font-extrabold tracking-tight text-white leading-tight pr-4">
                  {pass.event_title}
                </h3>
              </div>

              {/* Event Details Section */}
              <div className="p-5 space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-3 text-xs bg-brand-offwhite/60 p-3.5 rounded-2xl border border-brand-ink/5">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-vermilion" />
                    <div>
                      <span className="text-[10px] text-brand-ink/40 font-bold block uppercase">Date</span>
                      <span className="font-bold text-brand-ink">{pass.event_date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-brand-vermilion" />
                    <div>
                      <span className="text-[10px] text-brand-ink/40 font-bold block uppercase">Time</span>
                      <span className="font-bold text-brand-ink">{pass.time_start} - {pass.time_end}</span>
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center gap-2 pt-1 border-t border-brand-ink/5">
                    <MapPin className="w-4 h-4 text-brand-vermilion flex-shrink-0" />
                    <div className="truncate">
                      <span className="text-[10px] text-brand-ink/40 font-bold block uppercase">Venue</span>
                      <span className="font-bold text-brand-ink truncate block">{pass.venue}</span>
                    </div>
                  </div>
                </div>

                {/* Confirmed QR Code Section */}
                {pass.status === 'confirmed' ? (
                  <div className="p-4 bg-gradient-to-b from-orange-50/50 to-amber-50/30 rounded-2xl border border-orange-200/60 text-center space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1 text-orange-700">
                        <QrCode className="w-4 h-4" /> Entry Pass Code
                      </span>
                      {pass.checkedIn ? (
                        <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Verified Checked-In
                        </span>
                      ) : (
                        <span className="text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md text-[10px] font-bold">
                          ⏳ Gate Verification Pending
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => openQrPassModal(pass)}
                        className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <QrCode className="w-4 h-4" />
                        Show QR Pass for Venue Entry
                      </button>

                      {pass.certificatesIssued ? (
                        <button
                          type="button"
                          onClick={() => setActiveCertPass(pass)}
                          className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                          <Award className="w-4 h-4" />
                          Download Participation Certificate 📜
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveCertPass(pass)}
                          className="w-full py-2 bg-brand-offwhite hover:bg-brand-ink/5 text-brand-ink/70 font-bold text-xs rounded-xl border border-brand-ink/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Award className="w-4 h-4 text-brand-vermilion" />
                          Preview Certificate
                        </button>
                      )}
                    </div>
                  </div>
                ) : pass.status === 'pending_approval' ? (
                  <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" /> Awaiting Organizer Approval
                    </p>
                    <p className="text-[11px] opacity-80">
                      Your payment screenshot and details are being verified by the organizer. Your QR pass will be issued once confirmed.
                    </p>
                  </div>
                ) : pass.status === 'waitlisted' ? (
                  <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-900 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" /> You are on the Waitlist
                    </p>
                    <p className="text-[11px] opacity-80">
                      Current Position: <strong>#{pass.waitlist_position}</strong>. If a confirmed student leaves, you will be automatically accepted & issued a pass!
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 bg-brand-offwhite/50 border-t border-brand-ink/5 flex items-center justify-between text-[11px] text-brand-ink/50 font-medium">
                <span>Pass ID: #{pass.id}</span>
                <span>Registered: {new Date(pass.created_at).toLocaleDateString()}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Full Screen High-Contrast QR Pass Modal */}
      <AnimatePresence>
        {selectedPassModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-ink/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center space-y-5 border border-brand-ink/10 relative overflow-hidden"
            >
              <button
                onClick={() => setSelectedPassModal(null)}
                className="absolute top-4 right-4 p-2 text-brand-ink/40 hover:text-brand-ink hover:bg-brand-ink/5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-vermilion bg-brand-vermilion/10 px-2.5 py-0.5 rounded-full">
                  Official Entry Ticket
                </span>
                <h3 className="font-black text-xl text-brand-ink mt-2 leading-tight">
                  {selectedPassModal.event_title}
                </h3>
                <p className="text-xs text-brand-ink/60 mt-0.5">{selectedPassModal.club_name}</p>
              </div>

              {/* High Contrast QR Container */}
              <div className="p-5 bg-white rounded-3xl border-2 border-brand-ink/10 shadow-lg inline-block mx-auto">
                {loadingModalQr ? (
                  <div className="w-56 h-56 flex flex-col items-center justify-center text-xs text-brand-ink/40 space-y-2">
                    <div className="w-7 h-7 border-3 border-brand-ink/20 border-t-brand-vermilion rounded-full animate-spin" />
                    <span>Loading High-Res QR...</span>
                  </div>
                ) : modalQrUrl ? (
                  <img
                    src={modalQrUrl}
                    alt="Official Event QR Pass"
                    className="w-56 h-56 object-contain rounded-xl border border-slate-100"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-xs text-red-500">
                    Failed to render QR Code.
                  </div>
                )}
              </div>

              {/* Gate Verification Status */}
              <div className="pt-2">
                {selectedPassModal.checkedIn ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-900 rounded-2xl text-xs font-bold border border-emerald-300">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Attendance Verified at Venue</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-900 rounded-2xl text-xs font-bold border border-amber-300">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Show screen to scanner at venue gate</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-brand-ink/10 text-[11px] text-brand-ink/40 font-medium">
                Student: {selectedPassModal.user_name} ({selectedPassModal.user_email})
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Student Certificate Download Modal */}
      {activeCertPass && (
        <CertificateModal
          eventId={activeCertPass.event_id}
          token={token}
          studentName={activeCertPass.user_name}
          isOrganizer={false}
          onClose={() => setActiveCertPass(null)}
        />
      )}
    </div>
  );
}
