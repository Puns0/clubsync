import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EventCard from '../components/EventCard';
import {
  Search,
  MapPin,
  Clock,
  Users,
  Ticket,
  FileText,
  X,
  CheckCircle2,
  CalendarDays,
  Sparkles,
  Upload,
  AlertCircle,
  Clock4,
  LogIn,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../lib/api';

interface EventItem {
  id: string;
  title: string;
  club: string;
  clubId?: number;
  date: string;
  time: string;
  venue: string;
  totalSeats: number;
  takenSeats: number;
  waitlistCount?: number;
  isLive: boolean;
  description?: string;
  isPaid?: boolean;
  ticketPrice?: number;
  paymentQr?: string | null;
  imageUrl?: string | null;
  pdfUrl?: string | null;
  pdfName?: string | null;
  customQuestions?: string[];
  eligibleYears?: string[];
  eligibleDepartments?: string[];
}

interface Club {
  id: number;
  name: string;
  code: string;
  category?: string;
}

interface UserRegItem {
  id: string;
  event_id: number;
  status: 'pending_payment_approval' | 'confirmed' | 'rejected' | 'waitlisted' | 'promoted' | 'cancelled' | 'expired';
  waitlist_position?: number;
}

export default function Home() {
  const { user, token } = useAuth();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Selected event modal
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [userRegMap, setUserRegMap] = useState<{ [eventId: string]: string }>({});

  // Paid event transaction screenshot state
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  // Custom question answers
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const fetchEventsAndClubs = async () => {
    try {
      setIsLoading(true);
      const [eventsRes, clubsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/events`),
        fetch(`${API_BASE_URL}/clubs`)
      ]);

      if (eventsRes.ok) {
        const d = await eventsRes.json();
        setEvents(d.events || []);
      }
      if (clubsRes.ok) {
        const c = await clubsRes.json();
        setClubs(c.clubs || []);
      }
    } catch (err) {
      console.error('Failed to fetch home data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyRegistrations = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/events/my-registrations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const d = await res.json();
        const map: { [eventId: string]: string } = {};
        (d.registrations || []).forEach((r: UserRegItem) => {
          if (!['cancelled', 'expired', 'rejected'].includes(r.status)) {
            map[r.event_id.toString()] = r.status;
          }
        });
        setUserRegMap(map);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEventsAndClubs();
  }, []);

  useEffect(() => {
    fetchMyRegistrations();
  }, [token]);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedEvent(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  // Handle Screenshot Upload
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotData(reader.result as string);
        setRegError('');
      };
      reader.readAsDataURL(file);
    }
  };

  // Register for Event (Free or Paid)
  const handleRegister = async () => {
    if (!selectedEvent) return;
    setRegError('');
    setRegSuccess('');

    if (!token) {
      setRegError('Please log in first to register for campus events.');
      return;
    }

    // If event is paid, transaction screenshot is mandatory!
    if (selectedEvent.isPaid && !screenshotData) {
      setRegError('Mandatory Requirement: You must upload a screenshot of your payment transaction before requesting registration.');
      return;
    }

    // Validate custom questions are answered
    if (selectedEvent.customQuestions && selectedEvent.customQuestions.length > 0) {
      for (const q of selectedEvent.customQuestions) {
        if (!answers[q] || !answers[q].trim()) {
          setRegError(`Please answer: "${q}"`);
          return;
        }
      }
    }

    try {
      setIsSubmittingReg(true);
      const res = await fetch(`${API_BASE_URL}/events/${selectedEvent.id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentScreenshot: selectedEvent.isPaid ? screenshotData : null,
          answers: Object.keys(answers).length > 0 ? answers : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register for event');
      }

      setRegSuccess(data.message);
      setUserRegMap((prev) => ({
        ...prev,
        [selectedEvent.id]: data.status
      }));

      // If free event, seat is immediately taken
      if (!selectedEvent.isPaid) {
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === selectedEvent.id ? { ...ev, takenSeats: ev.takenSeats + 1 } : ev
          )
        );
      }
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setIsSubmittingReg(false);
    }
  };

  // Filter events by selected club and search input
  const filteredEvents = events.filter((ev) => {
    const matchesClub = selectedClubId === null || ev.clubId === selectedClubId || ev.club === clubs.find(c => c.id === selectedClubId)?.name;
    const matchesSearch =
      ev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.club.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.venue.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClub && matchesSearch;
  });

  const liveEvents = filteredEvents.filter((e) => e.isLive);
  const upcomingEvents = filteredEvents.filter((e) => !e.isLive);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Header Section */}
      <section className="pt-4 md:pt-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-brand-vermilion/10 text-brand-vermilion rounded-full text-xs font-bold uppercase tracking-wider mb-3"
          >
            <Sparkles className="w-3.5 h-3.5" /> Campus Hub
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3"
          >
            Discover Campus Events.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-lg text-brand-ink/60 max-w-2xl"
          >
            Zero scheduling clashes. Browse approved club events, reserve your seats, and join the action.
          </motion.p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ink/40" />
          <input
            type="text"
            placeholder="Search events, venues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-brand-ink/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-vermilion/50 shadow-sm"
          />
        </div>
      </section>

      {/* Clubs Filter Scroller */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-brand-ink/50">Filter by Club</h2>
          {selectedClubId !== null && (
            <button
              onClick={() => setSelectedClubId(null)}
              className="text-xs text-brand-vermilion font-bold hover:underline"
            >
              Reset Filter
            </button>
          )}
        </div>
        <div className="flex overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 gap-2 no-scrollbar scroll-smooth">
          <button
            onClick={() => setSelectedClubId(null)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${selectedClubId === null
                ? 'bg-brand-ink text-white border-brand-ink shadow-sm'
                : 'bg-white text-brand-ink/70 border-brand-ink/10 hover:border-brand-ink/30'
              }`}
          >
            All Clubs ({events.length})
          </button>
          {clubs.map((club) => (
            <button
              key={club.id}
              onClick={() => setSelectedClubId(club.id === selectedClubId ? null : club.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${selectedClubId === club.id
                  ? 'bg-brand-vermilion text-white border-brand-vermilion shadow-sm'
                  : 'bg-white text-brand-ink/70 border-brand-ink/10 hover:border-brand-ink/30'
                }`}
            >
              {club.name}
            </button>
          ))}
        </div>
      </section>

      {/* Live / Today Section */}
      {liveEvents.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-vermilion animate-ping"></span>
              Live Now
            </h2>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {liveEvents.map((event) => (
              <motion.div key={event.id} variants={item}>
                <EventCard
                  {...event}
                  onClick={() => {
                    setSelectedEvent(event);
                    setScreenshotData(null);
                    setScreenshotName(null);
                    setRegError('');
                    setRegSuccess('');
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* Upcoming Events Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-brand-vermilion" />
            Upcoming Events
          </h2>
          <span className="text-xs font-semibold text-brand-ink/50">
            {upcomingEvents.length} events scheduled
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-brand-ink/40">
            <div className="w-8 h-8 border-2 border-brand-ink/20 border-t-brand-vermilion rounded-full animate-spin mx-auto mb-3"></div>
            Loading campus events...
          </div>
        ) : upcomingEvents.length === 0 && liveEvents.length === 0 ? (
          <div className="bg-white rounded-3xl border border-brand-ink/10 p-16 text-center text-brand-ink/50 space-y-3">
            <CalendarDays className="w-12 h-12 mx-auto text-brand-ink/20" />
            <h3 className="text-lg font-bold text-brand-ink">No events scheduled right now</h3>
            <p className="text-sm max-w-md mx-auto">
              Organizers are preparing upcoming activities. Check back shortly or generate a demo event from the Admin Panel.
            </p>
          </div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {upcomingEvents.map((event) => (
              <motion.div key={event.id} variants={item}>
                <EventCard
                  {...event}
                  onClick={() => {
                    setSelectedEvent(event);
                    setScreenshotData(null);
                    setScreenshotName(null);
                    setRegError('');
                    setRegSuccess('');
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Event Details & Registration Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedEvent(null); }}
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
                  onClick={() => setSelectedEvent(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-offwhite hover:bg-brand-ink/10 text-brand-ink rounded-xl text-xs font-bold transition-all border border-brand-ink/10 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Events
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="p-1.5 rounded-full bg-brand-ink/5 hover:bg-brand-ink/10 text-brand-ink transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedEvent.imageUrl && (
                <div className="-mx-6 md:-mx-8 mb-4 h-52 overflow-hidden bg-brand-ink/5">
                  <img
                    src={selectedEvent.imageUrl}
                    alt={selectedEvent.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-vermilion/10 text-brand-vermilion">
                    {selectedEvent.club}
                  </span>
                  {selectedEvent.isPaid ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 flex items-center gap-1">
                      <Ticket className="w-3.5 h-3.5" /> ₹{selectedEvent.ticketPrice} Entry
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                      Free Entry
                    </span>
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-brand-ink tracking-tight">
                  {selectedEvent.title}
                </h2>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-brand-offwhite p-4 rounded-2xl border border-brand-ink/10 text-xs font-medium">
                <div className="space-y-0.5">
                  <span className="text-brand-ink/50 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-brand-vermilion" /> Venue
                  </span>
                  <strong className="text-brand-ink block text-sm">{selectedEvent.venue}</strong>
                </div>
                <div className="space-y-0.5">
                  <span className="text-brand-ink/50 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Time
                  </span>
                  <strong className="text-brand-ink block text-sm">{selectedEvent.time}</strong>
                </div>
                <div className="space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-brand-ink/50 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Vacancy
                  </span>
                  <strong className="text-brand-ink block text-sm">
                    {Math.max(0, selectedEvent.totalSeats - selectedEvent.takenSeats)} seats left
                  </strong>
                </div>
              </div>

              {/* Description */}
              {selectedEvent.description && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-ink/50">
                    About This Event
                  </h4>
                  <p className="text-sm text-brand-ink/80 leading-relaxed whitespace-pre-line">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {/* Eligibility Notice */}
              {(selectedEvent.eligibleYears?.length || selectedEvent.eligibleDepartments?.length) ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Eligibility Restrictions
                  </h4>
                  <p className="text-xs text-blue-700 font-medium">
                    This event is restricted. 
                    {selectedEvent.eligibleYears?.length ? ` Years: ${selectedEvent.eligibleYears.join(', ')}.` : ''}
                    {selectedEvent.eligibleDepartments?.length ? ` Depts: ${selectedEvent.eligibleDepartments.join(', ')}.` : ''}
                  </p>
                </div>
              ) : null}

              {/* Custom Questions */}
              {selectedEvent.customQuestions && selectedEvent.customQuestions.length > 0 && !userRegMap[selectedEvent.id] && (
                <div className="p-4 bg-brand-offwhite rounded-2xl border border-brand-ink/10 space-y-3">
                  <h4 className="text-sm font-bold text-brand-ink">Required Details</h4>
                  {selectedEvent.customQuestions.map((q, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <label className="block text-xs font-bold text-brand-ink/70">
                        {q} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={answers[q] || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                        placeholder="Your answer..."
                        className="w-full p-2.5 bg-white border border-brand-ink/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-vermilion/50"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Paid Entry Payment Info & QR */}
              {selectedEvent.isPaid && (
                <div className="p-5 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                    {selectedEvent.paymentQr ? (
                      <img
                        src={selectedEvent.paymentQr}
                        alt="Payment QR"
                        className="w-28 h-28 object-contain rounded-xl border border-indigo-200 bg-white p-1"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs p-2 text-center">
                        UPI Entry: ₹{selectedEvent.ticketPrice}
                      </div>
                    )}
                    <div className="space-y-1">
                      <h5 className="font-bold text-sm text-indigo-900">
                        Scan UPI QR & Pay ₹{selectedEvent.ticketPrice}
                      </h5>
                      <p className="text-xs text-indigo-700/80 leading-relaxed">
                        Use GPay, PhonePe, or Paytm. After payment, <strong className="text-indigo-950 font-semibold">mandatory: upload your transaction screenshot below</strong> so the organizer can approve your seat.
                      </p>
                    </div>
                  </div>

                  {/* MANDATORY TRANSACTION SCREENSHOT UPLOAD */}
                  <div className="pt-3 border-t border-indigo-200/60 space-y-2">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-indigo-700" />
                      Transaction Screenshot (Mandatory) *
                    </label>

                    <input
                      type="file"
                      ref={screenshotInputRef}
                      accept="image/*"
                      onChange={handleScreenshotChange}
                      className="hidden"
                    />

                    <div
                      onClick={() => screenshotInputRef.current?.click()}
                      className={`p-4 border-2 border-dashed rounded-2xl cursor-pointer text-center space-y-1.5 transition-all bg-white ${screenshotData
                          ? 'border-emerald-500 bg-emerald-50/20'
                          : 'border-indigo-200 hover:border-indigo-400'
                        }`}
                    >
                      {screenshotData ? (
                        <div className="flex items-center justify-center gap-3">
                          <img
                            src={screenshotData}
                            alt="Screenshot preview"
                            className="w-14 h-14 object-cover rounded-lg border border-emerald-300"
                          />
                          <div className="text-left">
                            <p className="text-xs font-bold text-emerald-800">{screenshotName || 'Transaction Screenshot'}</p>
                            <p className="text-[11px] text-emerald-600 font-medium">Click to change screenshot</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 mx-auto text-indigo-400" />
                          <p className="text-xs font-bold text-indigo-900">Click to upload payment screenshot</p>
                          <p className="text-[11px] text-indigo-500">JPG, PNG, or WebP screenshot showing transaction ID</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Brochure Attachment */}
              {selectedEvent.pdfName && (
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs font-medium text-emerald-800">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>{selectedEvent.pdfName}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                    Official Brochure
                  </span>
                </div>
              )}

              {/* Errors & Success Notifications */}
              {regError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>{regError}</span>
                </div>
              )}

              {regSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  <span>{regSuccess}</span>
                </div>
              )}

              {/* Registration Action Section */}
              <div className="pt-2 space-y-2">
                {!user ? (
                  <Link
                    to="/login"
                    className="w-full py-4 bg-brand-ink text-brand-offwhite hover:bg-brand-ink/90 font-bold text-base rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-5 h-5 text-brand-vermilion" /> Log in to Book Ticket
                  </Link>
                ) : userRegMap[selectedEvent.id] === 'confirmed' ? (
                  <div className="w-full p-4 bg-emerald-100 border border-emerald-300 rounded-2xl flex items-center justify-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Registered & Confirmed! Your seat has been secured.
                  </div>
                ) : userRegMap[selectedEvent.id] === 'pending_payment_approval' ? (
                  <div className="w-full p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-center gap-2 text-amber-900 font-bold text-sm">
                    <Clock4 className="w-5 h-5 text-amber-600 animate-pulse" />
                    Payment Verification Pending Organizer Approval
                  </div>
                ) : userRegMap[selectedEvent.id] === 'waitlisted' ? (
                  <div className="w-full p-4 bg-blue-50 border border-blue-300 rounded-2xl flex items-center justify-center gap-2 text-blue-900 font-bold text-sm">
                    <Clock4 className="w-5 h-5 text-blue-600" />
                    You are on the Waitlist. We will notify you if a seat opens up.
                  </div>
                ) : userRegMap[selectedEvent.id] === 'promoted' ? (
                  <div className="space-y-3">
                    <div className="w-full p-4 bg-brand-vermilion/10 border border-brand-vermilion/30 rounded-2xl text-center space-y-1">
                      <h4 className="text-brand-vermilion font-bold text-sm flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4" /> Seat Available!
                      </h4>
                      <p className="text-xs text-brand-ink/70">
                        You have been promoted from the waitlist. Confirm now to secure your spot.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`${API_BASE_URL}/events/${selectedEvent.id}/confirm-promotion`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error);
                            setRegSuccess(data.message);
                            setUserRegMap(prev => ({ ...prev, [selectedEvent.id]: data.status }));
                          } catch(err: any) {
                            setRegError(err.message);
                          }
                        }}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all"
                      >
                        Confirm Seat
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`${API_BASE_URL}/events/${selectedEvent.id}/pass-promotion`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error);
                            setRegSuccess(data.message);
                            setUserRegMap(prev => {
                              const updated = { ...prev };
                              delete updated[selectedEvent.id];
                              return updated;
                            });
                          } catch(err: any) {
                            setRegError(err.message);
                          }
                        }}
                        className="flex-1 py-3 bg-brand-offwhite hover:bg-brand-ink/10 text-brand-ink font-bold text-sm rounded-xl transition-all border border-brand-ink/10"
                      >
                        Pass
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    disabled={isSubmittingReg}
                    onClick={handleRegister}
                    className="w-full py-4 bg-brand-vermilion hover:bg-brand-vermilion/90 active:scale-98 text-white font-bold text-base rounded-2xl shadow-lg transition-all disabled:opacity-50"
                  >
                    {isSubmittingReg
                      ? 'Submitting Request...'
                      : selectedEvent.isPaid
                        ? `Submit Payment Screenshot & Request (₹${selectedEvent.ticketPrice})`
                        : 'Register Now'}
                  </button>
                )}

                {/* Prominent Back Button at Bottom */}
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="w-full py-3 bg-brand-offwhite hover:bg-brand-ink/10 text-brand-ink font-bold text-sm rounded-2xl transition-all border border-brand-ink/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to All Events
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
}
