import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarPlus, 
  ClipboardList, 
  Send, 
  Sparkles, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  Ticket, 
  Image as ImageIcon, 
  FileText, 
  QrCode, 
  AlertCircle, 
  AlertTriangle,
  ArrowUp,
  CheckCircle, 
  Check,
  Receipt,
  ExternalLink,
  X,
  FileCheck,
  Eye,
  Info,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import API_BASE_URL from '../lib/api';

const VENUES = [
  'Lab 1',
  'Seminar Hall 1',
  'Main Auditorium',
  'CS Block Hall',
  'Main Ground'
];

interface Club {
  id: number;
  name: string;
  code: string;
  category?: string;
}

interface EventItem {
  id: string;
  title: string;
  club: string;
  clubId: number;
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
  eligibleYears?: string[];
  eligibleDepartments?: string[];
  customQuestions?: string[];
  demoMode?: boolean;
  createdAt: string;
}

export interface RegistrationItem {
  id: string;
  event_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  isPaid: boolean;
  ticket_price: number;
  payment_screenshot: string | null;
  status: 'pending_payment_approval' | 'confirmed' | 'rejected' | 'waitlisted' | 'promoted' | 'cancelled' | 'expired';
  rejection_reason: string | null;
  waitlist_position?: number;
  promoted_at?: string;
  promotion_expires_at?: string;
  answers?: Record<string, string>;
  year?: string;
  department?: string;
  created_at: string;
}

export default function OrganizerDashboard() {
  const { user, token } = useAuth();

  // Tab: 'create' or 'my-events'
  const [activeTab, setActiveTab] = useState<'create' | 'my-events'>('create');

  // Club assignments state
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);

  // My events list
  const [myEvents, setMyEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Registrations review modal & state
  const [registrationsEvent, setRegistrationsEvent] = useState<EventItem | null>(null);
  const [registrationsList, setRegistrationsList] = useState<RegistrationItem[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [activeScreenshotModal, setActiveScreenshotModal] = useState<string | null>(null);
  const [processingRegId, setProcessingRegId] = useState<string | null>(null);


  // Form Fields
  const [selectedClubId, setSelectedClubId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [timeStart, setTimeStart] = useState('10:00');
  const [timeEnd, setTimeEnd] = useState('12:00');
  const [venue, setVenue] = useState(VENUES[0]);
  const [description, setDescription] = useState('');
  const [totalSeats, setTotalSeats] = useState(50);
  const [isPaid, setIsPaid] = useState(false);
  const [ticketPrice, setTicketPrice] = useState<number | ''>('');
  
  // Media uploads (Data URLs)
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);

  // Advanced / Waitlist fields
  const [eligibleYears, setEligibleYears] = useState<string[]>([]);
  const [eligibleDepartments, setEligibleDepartments] = useState<string[]>([]);
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [demoMode, setDemoMode] = useState(false);

  // Status feedback
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selected event preview modal
  const [previewEvent, setPreviewEvent] = useState<EventItem | null>(null);

  // Field-specific validation and overlap error tracking
  interface FieldErrors {
    title?: string;
    club?: string;
    date?: string;
    time?: string;
    venue?: string;
    seats?: string;
    ticketPrice?: string;
    overlap?: string;
  }
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Refs for scrolling back to problem sections
  const clubSectionRef = useRef<HTMLDivElement>(null);
  const titleSectionRef = useRef<HTMLDivElement>(null);
  const dateTimeVenueSectionRef = useRef<HTMLDivElement>(null);
  const seatsSectionRef = useRef<HTMLDivElement>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Smooth scroll and focus helper to drag user back to problematic field
  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusable = ref.current.querySelector('input, select, textarea') as HTMLElement | null;
      if (focusable) {
        setTimeout(() => focusable.focus(), 350);
      }
    }
  };

  // Clear specific field error when user interacts
  const clearError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      if (['date', 'time', 'venue', 'overlap'].includes(field)) {
        delete next.overlap;
        delete next.time;
        delete next.venue;
        delete next.date;
      }
      return next;
    });
    setErrorMsg('');
  };

  // Fetch organizer's assigned clubs
  const fetchMyClubs = async () => {
    try {
      setLoadingClubs(true);
      const res = await fetch(`${API_BASE_URL}/clubs/my-clubs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const clubs: Club[] = data.clubs || [];
        setMyClubs(clubs);
        if (clubs.length > 0 && selectedClubId === '') {
          setSelectedClubId(clubs[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingClubs(false);
    }
  };

  // Fetch organizer's created events
  const fetchMyEvents = async () => {
    try {
      setLoadingEvents(true);
      const res = await fetch(`${API_BASE_URL}/events/my-events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyEvents(data.events || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchMyClubs();
    fetchMyEvents();
  }, [token]);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeScreenshotModal) setActiveScreenshotModal(null);
        else if (registrationsEvent) setRegistrationsEvent(null);
        else if (previewEvent) setPreviewEvent(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeScreenshotModal, registrationsEvent, previewEvent]);


  // Fetch registrations for an event
  const fetchRegistrationsForEvent = async (event: EventItem) => {
    setRegistrationsEvent(event);
    setLoadingRegistrations(true);
    try {
      const res = await fetch(`${API_BASE_URL}/events/${event.id}/registrations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRegistrationsList(data.registrations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  // Approve a registration (paid transaction verification)
  const handleApproveRegistration = async (eventId: string, regId: string) => {
    try {
      setProcessingRegId(regId);
      const res = await fetch(`${API_BASE_URL}/events/${eventId}/registrations/${regId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'confirmed' })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve registration');
      }

      flashSuccess('Registration approved! Student has joined the event and 1 seat has been deducted.');

      // Update registration status locally
      setRegistrationsList(prev =>
        prev.map(r => (r.id === regId ? { ...r, status: 'confirmed' } : r))
      );

      // Decrement available vacancy seats by 1 (increment takenSeats)
      setMyEvents(prev =>
        prev.map(e =>
          e.id === eventId
            ? { ...e, takenSeats: data.eventSeats?.takenSeats ?? (e.takenSeats + 1) }
            : e
        )
      );

      if (registrationsEvent && registrationsEvent.id === eventId) {
        setRegistrationsEvent({
          ...registrationsEvent,
          takenSeats: data.eventSeats?.takenSeats ?? (registrationsEvent.takenSeats + 1)
        });
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessingRegId(null);
    }
  };

  // Reject a registration
  const handleRejectRegistration = async (eventId: string, regId: string) => {
    const reason = prompt('Reason for rejecting transaction screenshot:', 'Unverified payment ID or invalid screenshot.');
    if (reason === null) return;

    try {
      setProcessingRegId(regId);
      const res = await fetch(`${API_BASE_URL}/events/${eventId}/registrations/${regId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'rejected', rejectionReason: reason })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reject registration');
      }

      flashSuccess('Registration rejected.');
      setRegistrationsList(prev =>
        prev.map(r => (r.id === regId ? { ...r, status: 'rejected', rejection_reason: reason } : r))
      );

      if (data.eventSeats) {
        setMyEvents(prev =>
          prev.map(e =>
            e.id === eventId ? { ...e, takenSeats: data.eventSeats.takenSeats } : e
          )
        );
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessingRegId(null);
    }
  };


  // Flash message
  const flashSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Dummy Drafting Button
  const handleFillDummyDraft = () => {
    const club = myClubs.length > 0 ? myClubs[0] : null;
    if (club) setSelectedClubId(club.id);

    const randomId = Math.floor(Math.random() * 900) + 100;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const dateStr = tomorrow.toISOString().split('T')[0];

    setTitle(`CodeSprint Challenge #${randomId}`);
    setDate(dateStr);
    setTimeStart('14:00');
    setTimeEnd('17:00');
    setVenue('Seminar Hall 1');
    setDescription(
      'An intense 3-hour competitive programming & systems sprint featuring algorithms, speed debugging, and algorithmic design! Cash prizes and internship interview shortcuts for top 3 teams.'
    );
    setTotalSeats(60);
    setIsPaid(true);
    setTicketPrice(99);
    
    setImagePreview('https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80');
    setPdfName('CodeSprint_Rulebook_2026.pdf');
    setPdfData('data:application/pdf;base64,JVBERi0xLjQKJUZha2VQREY=');
    setQrPreview('https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=clubsync@upi&pn=ClubSync&am=99');
    
    setFieldErrors({});
    setErrorMsg('');
    flashSuccess('Filled form with rich sample event draft!');
  };

  // Handle Image Upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Handle PDF Upload
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => setPdfData(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Handle QR Upload
  const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setQrPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Submit Event Form (Save as Draft or Request Approval)
  const handleSubmit = async (submitStatus: 'draft' | 'pending_approval') => {
    setErrorMsg('');
    setFieldErrors({});

    // 1. Validate Hosting Club
    if (!selectedClubId) {
      const msg = 'Unfilled info: Please select a hosting club.';
      setFieldErrors({ club: msg });
      setErrorMsg(msg);
      scrollToSection(clubSectionRef);
      return;
    }

    // 2. Validate Title
    if (!title.trim()) {
      const msg = 'Unfilled info: Event title is required.';
      setFieldErrors({ title: msg });
      setErrorMsg(msg);
      scrollToSection(titleSectionRef);
      return;
    }

    // 3. Validate Date
    if (!date) {
      const msg = 'Unfilled info: Please select an event date.';
      setFieldErrors({ date: msg });
      setErrorMsg(msg);
      scrollToSection(dateTimeVenueSectionRef);
      return;
    }

    // 4. Validate Time Range
    if (!timeStart || !timeEnd) {
      const msg = 'Unfilled info: Both start and end times must be specified.';
      setFieldErrors({ time: msg });
      setErrorMsg(msg);
      scrollToSection(dateTimeVenueSectionRef);
      return;
    }

    if (timeStart >= timeEnd) {
      const msg = 'Invalid time slot: Start time must be strictly earlier than end time.';
      setFieldErrors({ time: msg });
      setErrorMsg(msg);
      scrollToSection(dateTimeVenueSectionRef);
      return;
    }

    // 5. Validate Vacancy Seats
    if (!totalSeats || Number(totalSeats) <= 0) {
      const msg = 'Unfilled info: Seat vacancy must be at least 1.';
      setFieldErrors({ seats: msg });
      setErrorMsg(msg);
      scrollToSection(seatsSectionRef);
      return;
    }

    // 6. Validate Paid Entry Details
    if (isPaid && (!ticketPrice || Number(ticketPrice) <= 0)) {
      const msg = 'Unfilled info: Please enter the ticket price for paid entry.';
      setFieldErrors({ ticketPrice: msg });
      setErrorMsg(msg);
      scrollToSection(paymentSectionRef);
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          clubId: selectedClubId,
          date,
          timeStart,
          timeEnd,
          venue,
          description,
          totalSeats: Number(totalSeats) || 50,
          isPaid,
          ticketPrice: isPaid ? Number(ticketPrice) : 0,
          paymentQr: isPaid ? qrPreview : null,
          imageUrl: imagePreview,
          pdfUrl: pdfData,
          pdfName,
          status: submitStatus,
          eligibleYears,
          eligibleDepartments,
          customQuestions,
          demoMode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if error is venue conflict / overlap
        const isConflict = response.status === 409 || 
          (data.error && (data.error.toLowerCase().includes('conflict') || data.error.toLowerCase().includes('already booked')));

        if (isConflict) {
          const conflictMsg = data.error || `Overlapping event: ${venue} is already booked on ${date} during this time.`;
          setFieldErrors({
            overlap: conflictMsg,
            venue: 'Venue clash detected',
            time: 'Time overlaps with an existing booking'
          });
          setErrorMsg(conflictMsg);
          // Drag user back to the time slot & venue section!
          scrollToSection(dateTimeVenueSectionRef);
          return;
        }

        throw new Error(data.error || 'Failed to save event');
      }

      flashSuccess(
        submitStatus === 'pending_approval' 
          ? 'Event submitted to Admin for approval!' 
          : 'Event saved to your drafts!'
      );

      // Reset form
      setTitle('');
      setDescription('');
      setImagePreview(null);
      setPdfName(null);
      setPdfData(null);
      setQrPreview(null);
      setIsPaid(false);
      setTicketPrice('');
      setFieldErrors({});

      // Refresh list & switch tab
      fetchMyEvents();
      setActiveTab('my-events');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <section className="pt-2 md:pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <span className="p-2 bg-brand-vermilion/10 text-brand-vermilion rounded-2xl">
              <CalendarPlus className="w-8 h-8" />
            </span>
            Organizer Studio
          </h1>
          <p className="text-brand-ink/60 mt-1">
            Welcome back, <strong className="text-brand-ink">{user?.name}</strong>. Create events, manage venues, and submit for admin publication.
          </p>
        </div>

        {/* Dummy Drafting Button */}
        <button
          onClick={handleFillDummyDraft}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-brand-vermilion text-white font-semibold text-sm rounded-xl shadow-sm hover:opacity-95 active:scale-95 transition-all self-start md:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          Quick Demo Draft Fill
        </button>
      </section>

      {/* Notifications */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium"
        >
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium"
        >
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-brand-ink/10 pb-2">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'create'
              ? 'bg-brand-vermilion text-white shadow-sm'
              : 'text-brand-ink/70 hover:bg-brand-ink/5'
          }`}
        >
          <CalendarPlus className="w-4 h-4" />
          Create Event Form
        </button>

        <button
          onClick={() => setActiveTab('my-events')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'my-events'
              ? 'bg-brand-vermilion text-white shadow-sm'
              : 'text-brand-ink/70 hover:bg-brand-ink/5'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          My Events ({myEvents.length})
        </button>
      </div>

      {/* TAB 1: CREATE EVENT FORM */}
      {activeTab === 'create' && (
        <div className="space-y-8">
          {loadingClubs ? (
            <div className="py-12 text-center text-brand-ink/40">Loading club authorizations...</div>
          ) : myClubs.length === 0 ? (
            /* Warning if organizer has no assigned clubs */
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-amber-900">No Assigned Clubs Yet</h2>
              <p className="text-sm text-amber-800 max-w-lg mx-auto">
                You are registered as an organizer, but an Administrator has not yet assigned you to a club. 
                Please ask an Admin to grant you club access from the Admin Panel.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-brand-ink/10 p-6 md:p-8 shadow-sm space-y-8">
              {/* Club Selection Section */}
              <div ref={clubSectionRef} className="space-y-3">
                <label className="block text-sm font-bold text-brand-ink">
                  Hosting Club *
                </label>
                {myClubs.length === 1 ? (
                  <div className="p-4 bg-brand-offwhite rounded-2xl border border-brand-ink/10 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-base text-brand-ink">{myClubs[0].name}</span>
                      <span className="text-xs text-brand-ink/50 ml-2">({myClubs[0].category || 'General'})</span>
                    </div>
                    <span className="text-xs bg-brand-ink/10 text-brand-ink font-semibold px-2.5 py-1 rounded-lg">
                      Assigned Default
                    </span>
                  </div>
                ) : (
                  <div>
                    <select
                      value={selectedClubId}
                      onChange={(e) => {
                        setSelectedClubId(Number(e.target.value));
                        clearError('club');
                      }}
                      className={`w-full p-3.5 bg-brand-offwhite/50 border rounded-2xl text-sm font-semibold focus:outline-none transition-all ${
                        fieldErrors.club
                          ? 'border-red-500 ring-2 ring-red-400/30 bg-red-50/30'
                          : 'border-brand-ink/10 focus:ring-2 focus:ring-brand-vermilion/50'
                      }`}
                    >
                      {myClubs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.category || 'General'})
                        </option>
                      ))}
                    </select>
                    {fieldErrors.club && (
                      <p className="text-xs font-semibold text-red-600 flex items-center gap-1 mt-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {fieldErrors.club}
                      </p>
                    )}
                    <p className="text-xs text-brand-ink/50 mt-1 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" />
                      You belong to multiple clubs. Select which club will host this event.
                    </p>
                  </div>
                )}
              </div>

              {/* Event Name */}
              <div ref={titleSectionRef} className="space-y-2">
                <label className="block text-sm font-bold text-brand-ink">
                  Event Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. HackMatrix 2026: 24-Hour AI Hackathon"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    clearError('title');
                  }}
                  className={`w-full p-3.5 bg-brand-offwhite/50 border rounded-2xl text-base font-semibold focus:outline-none transition-all ${
                    fieldErrors.title
                      ? 'border-red-500 ring-2 ring-red-400/30 bg-red-50/20'
                      : 'border-brand-ink/10 focus:ring-2 focus:ring-brand-vermilion/50'
                  }`}
                />
                {fieldErrors.title && (
                  <p className="text-xs font-semibold text-red-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {fieldErrors.title}
                  </p>
                )}
              </div>

              {/* Date, Time & Venue Combined Block with Conflict Banner */}
              <div ref={dateTimeVenueSectionRef} className="space-y-5 pt-2">
                {/* Prominent Clash Alert Banner */}
                {fieldErrors.overlap && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="p-5 bg-red-50 border-2 border-red-500 rounded-3xl flex items-start gap-3.5 shadow-md"
                  >
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5 animate-bounce" />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-red-900">
                          Schedule Clash Detected
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-200 text-red-800">
                          Overlapping Event
                        </span>
                      </div>
                      <p className="text-xs text-red-800 font-semibold leading-relaxed">
                        {fieldErrors.overlap}
                      </p>
                      <p className="text-[11px] text-red-700 font-medium pt-1">
                        👉 Please choose a different time slot or pick an alternative room from the 5 campus venues below.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Date & Time Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-brand-ink flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-brand-vermilion" /> Date *
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        clearError('date');
                      }}
                      className={`w-full p-3.5 bg-brand-offwhite/50 border rounded-2xl text-sm font-medium focus:outline-none transition-all ${
                        fieldErrors.date || fieldErrors.overlap
                          ? 'border-red-500 ring-2 ring-red-400/30 bg-red-50/20'
                          : 'border-brand-ink/10 focus:ring-2 focus:ring-brand-vermilion/50'
                      }`}
                    />
                    {fieldErrors.date && (
                      <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {fieldErrors.date}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-brand-ink flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-brand-ink/40" /> Start Time *
                    </label>
                    <input
                      type="time"
                      value={timeStart}
                      onChange={(e) => {
                        setTimeStart(e.target.value);
                        clearError('time');
                      }}
                      className={`w-full p-3.5 bg-brand-offwhite/50 border rounded-2xl text-sm font-medium focus:outline-none transition-all ${
                        fieldErrors.time || fieldErrors.overlap
                          ? 'border-red-500 ring-2 ring-red-400/30 bg-red-50/20'
                          : 'border-brand-ink/10 focus:ring-2 focus:ring-brand-vermilion/50'
                      }`}
                    />
                    {fieldErrors.time && (
                      <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {fieldErrors.time}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-brand-ink flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-brand-ink/40" /> End Time *
                    </label>
                    <input
                      type="time"
                      value={timeEnd}
                      onChange={(e) => {
                        setTimeEnd(e.target.value);
                        clearError('time');
                      }}
                      className={`w-full p-3.5 bg-brand-offwhite/50 border rounded-2xl text-sm font-medium focus:outline-none transition-all ${
                        fieldErrors.time || fieldErrors.overlap
                          ? 'border-red-500 ring-2 ring-red-400/30 bg-red-50/20'
                          : 'border-brand-ink/10 focus:ring-2 focus:ring-brand-vermilion/50'
                      }`}
                    />
                  </div>
                </div>

                {/* Venue & Capacity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-brand-ink flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-brand-vermilion" /> Venue (5 Campus Locations) *
                    </label>
                    <select
                      value={venue}
                      onChange={(e) => {
                        setVenue(e.target.value);
                        clearError('venue');
                      }}
                      className={`w-full p-3.5 bg-brand-offwhite/50 border rounded-2xl text-sm font-semibold focus:outline-none transition-all ${
                        fieldErrors.venue || fieldErrors.overlap
                          ? 'border-red-500 ring-2 ring-red-400/30 bg-red-50/20'
                          : 'border-brand-ink/10 focus:ring-2 focus:ring-brand-vermilion/50'
                      }`}
                    >
                      {VENUES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.venue && !fieldErrors.overlap && (
                      <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {fieldErrors.venue}
                      </p>
                    )}
                    <p className="text-xs text-brand-ink/50">
                      System automatically checks conflicting events booked for this room and date.
                    </p>
                  </div>

                  <div ref={seatsSectionRef} className="space-y-2">
                    <label className="block text-sm font-bold text-brand-ink flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-brand-ink/40" /> Vacancy Capacity (Seats) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={totalSeats}
                      onChange={(e) => {
                        setTotalSeats(Number(e.target.value));
                        clearError('seats');
                      }}
                      className={`w-full p-3.5 bg-brand-offwhite/50 border rounded-2xl text-sm font-semibold focus:outline-none transition-all ${
                        fieldErrors.seats
                          ? 'border-red-500 ring-2 ring-red-400/30 bg-red-50/20'
                          : 'border-brand-ink/10 focus:ring-2 focus:ring-brand-vermilion/50'
                      }`}
                    />
                    {fieldErrors.seats && (
                      <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {fieldErrors.seats}
                      </p>
                    )}
                    <p className="text-xs text-brand-ink/50">
                      Max attendees that can register for this event before waitlisting begins.
                    </p>
                  </div>
                </div>
              </div>

              {/* Description Paragraph */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-brand-ink">
                  Event Description & Details
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide a comprehensive summary of what will happen, agenda highlights, guest speakers, eligibility criteria, and requirements..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 bg-brand-offwhite/50 border border-brand-ink/10 rounded-2xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-vermilion/50"
                />
              </div>

              {/* Entry Model (Free vs Paid) */}
              <div ref={paymentSectionRef} className="p-5 bg-brand-offwhite rounded-2xl border border-brand-ink/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-brand-ink flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-brand-vermilion" />
                      Entry Type
                    </h3>
                    <p className="text-xs text-brand-ink/60">
                      Specify whether this event has free admission or requires a paid entry fee.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-brand-ink/10">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPaid(false);
                        clearError('ticketPrice');
                      }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        !isPaid ? 'bg-emerald-600 text-white shadow-sm' : 'text-brand-ink/60'
                      }`}
                    >
                      Free Entry
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPaid(true)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isPaid ? 'bg-brand-vermilion text-white shadow-sm' : 'text-brand-ink/60'
                      }`}
                    >
                      Paid Entry
                    </button>
                  </div>
                </div>

                {isPaid && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-4 border-t border-brand-ink/10 grid grid-cols-1 md:grid-cols-2 gap-5"
                  >
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-ink/70">
                        Ticket Price (INR ₹) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 150"
                        value={ticketPrice}
                        onChange={(e) => {
                          setTicketPrice(Number(e.target.value));
                          clearError('ticketPrice');
                        }}
                        className={`w-full p-3 bg-white border rounded-xl text-sm font-semibold focus:outline-none transition-all ${
                          fieldErrors.ticketPrice
                            ? 'border-red-500 ring-2 ring-red-400/30 bg-red-50/20'
                            : 'border-brand-ink/10 focus:ring-2 focus:ring-brand-vermilion/50'
                        }`}
                      />
                      {fieldErrors.ticketPrice && (
                        <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {fieldErrors.ticketPrice}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-ink/70 flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-brand-vermilion" /> Payment UPI QR Code
                      </label>
                      <input
                        type="file"
                        ref={qrInputRef}
                        accept="image/*"
                        onChange={handleQrChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => qrInputRef.current?.click()}
                        className="w-full p-2.5 bg-white border border-dashed border-brand-ink/20 rounded-xl text-xs font-medium text-brand-ink/70 hover:border-brand-vermilion transition-all flex items-center justify-center gap-2"
                      >
                        <QrCode className="w-4 h-4" />
                        {qrPreview ? 'Change QR Image' : 'Upload Payment QR'}
                      </button>
                      {qrPreview && (
                        <div className="mt-2 flex items-center gap-3">
                          <img
                            src={qrPreview}
                            alt="QR Preview"
                            className="w-16 h-16 object-contain rounded-lg border border-brand-ink/10 p-1 bg-white"
                          />
                          <span className="text-xs text-emerald-700 font-semibold">QR code attached</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Media Attachments: Banner Image & PDF Brochure */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Image Upload */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-brand-ink flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-brand-vermilion" /> Poster / Banner Image
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 border-2 border-dashed border-brand-ink/10 hover:border-brand-vermilion rounded-2xl cursor-pointer text-center space-y-2 transition-all bg-brand-offwhite/30"
                  >
                    {imagePreview ? (
                      <div className="space-y-2">
                        <img
                          src={imagePreview}
                          alt="Poster preview"
                          className="max-h-36 mx-auto rounded-xl object-cover shadow-sm"
                        />
                        <p className="text-xs text-brand-ink/60">Click to change image</p>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-7 h-7 mx-auto text-brand-ink/30" />
                        <p className="text-xs font-semibold text-brand-ink/70">Click to upload banner poster</p>
                        <p className="text-[11px] text-brand-ink/40">PNG, JPG, or WebP up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>

                {/* PDF Brochure Upload */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-brand-ink flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-brand-vermilion" /> Rules / Brochure PDF
                  </label>
                  <input
                    type="file"
                    ref={pdfInputRef}
                    accept="application/pdf"
                    onChange={handlePdfChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => pdfInputRef.current?.click()}
                    className="p-5 border-2 border-dashed border-brand-ink/10 hover:border-brand-vermilion rounded-2xl cursor-pointer text-center space-y-2 transition-all bg-brand-offwhite/30 flex flex-col items-center justify-center min-h-[140px]"
                  >
                    {pdfName ? (
                      <div className="space-y-1">
                        <FileCheck className="w-8 h-8 mx-auto text-emerald-600" />
                        <p className="text-xs font-bold text-brand-ink">{pdfName}</p>
                        <p className="text-[11px] text-brand-ink/50">Click to change document</p>
                      </div>
                    ) : (
                      <>
                        <FileText className="w-7 h-7 mx-auto text-brand-ink/30" />
                        <p className="text-xs font-semibold text-brand-ink/70">Upload rules or brochure PDF</p>
                        <p className="text-[11px] text-brand-ink/40">PDF documents up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Eligibility Restrictions (Year / Department) */}
              <div className="p-5 bg-brand-offwhite rounded-2xl border border-brand-ink/10 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-brand-ink flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-vermilion" />
                    Eligibility Restrictions
                  </h3>
                  <p className="text-xs text-brand-ink/60 mt-0.5">
                    Leave blank to allow all students. Select specific years or departments to restrict who can register.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Year Restriction */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-ink/70">
                      Allowed Years
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['1st Year', '2nd Year', '3rd Year', '4th Year'].map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => {
                            setEligibleYears((prev) =>
                              prev.includes(yr) ? prev.filter((y) => y !== yr) : [...prev, yr]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            eligibleYears.includes(yr)
                              ? 'bg-brand-vermilion text-white border-brand-vermilion shadow-sm'
                              : 'bg-white text-brand-ink/60 border-brand-ink/10 hover:border-brand-ink/30'
                          }`}
                        >
                          {yr}
                        </button>
                      ))}
                    </div>
                    {eligibleYears.length > 0 && (
                      <p className="text-[11px] text-brand-vermilion font-semibold">
                        Only {eligibleYears.join(', ')} students can register.
                      </p>
                    )}
                  </div>

                  {/* Department Restriction */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-ink/70">
                      Allowed Departments
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT', 'AIDS', 'AIML'].map((dept) => (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => {
                            setEligibleDepartments((prev) =>
                              prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            eligibleDepartments.includes(dept)
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white text-brand-ink/60 border-brand-ink/10 hover:border-brand-ink/30'
                          }`}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                    {eligibleDepartments.length > 0 && (
                      <p className="text-[11px] text-indigo-700 font-semibold">
                        Only {eligibleDepartments.join(', ')} students can register.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Custom Questions Builder */}
              <div className="p-5 bg-brand-offwhite rounded-2xl border border-brand-ink/10 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-brand-ink flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-brand-vermilion" />
                    Custom Registration Questions
                  </h3>
                  <p className="text-xs text-brand-ink/60 mt-0.5">
                    Add questions students must answer when registering (e.g., "Which semester are you in?", "College name", etc.). Name and email are auto-filled from their account.
                  </p>
                </div>

                {/* Existing Questions */}
                {customQuestions.length > 0 && (
                  <div className="space-y-2">
                    {customQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-3 bg-white rounded-xl border border-brand-ink/10"
                      >
                        <span className="w-6 h-6 rounded-full bg-brand-vermilion/10 text-brand-vermilion text-xs font-extrabold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-medium text-brand-ink flex-1">{q}</span>
                        <button
                          type="button"
                          onClick={() => setCustomQuestions((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="Remove question"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Question */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. What is your semester?"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newQuestion.trim()) {
                        e.preventDefault();
                        setCustomQuestions((prev) => [...prev, newQuestion.trim()]);
                        setNewQuestion('');
                      }
                    }}
                    className="flex-1 p-3 bg-white border border-brand-ink/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-vermilion/50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newQuestion.trim()) {
                        setCustomQuestions((prev) => [...prev, newQuestion.trim()]);
                        setNewQuestion('');
                      }
                    }}
                    className="px-4 py-2 bg-brand-vermilion text-white rounded-xl text-xs font-bold hover:bg-brand-vermilion/90 transition-all whitespace-nowrap"
                  >
                    + Add
                  </button>
                </div>

                {customQuestions.length === 0 && (
                  <p className="text-[11px] text-brand-ink/40 italic">
                    No custom questions added yet. Students will only provide their name and email (auto-filled).
                  </p>
                )}
              </div>

              {/* Action Buttons & Bottom Error Bar */}
              <div className="space-y-4 pt-4 border-t border-brand-ink/10">
                {/* Immediate Feedback Bar Right Above the Buttons */}
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 border border-red-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-800"
                  >
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-bold block">
                          {fieldErrors.overlap ? 'Schedule Conflict: Venue is already booked!' : 'Action Needed:'}
                        </span>
                        <span className="text-xs font-medium text-red-700">
                          {errorMsg}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (fieldErrors.overlap || fieldErrors.time || fieldErrors.venue || fieldErrors.date) {
                          scrollToSection(dateTimeVenueSectionRef);
                        } else if (fieldErrors.title) {
                          scrollToSection(titleSectionRef);
                        } else if (fieldErrors.club) {
                          scrollToSection(clubSectionRef);
                        } else if (fieldErrors.seats) {
                          scrollToSection(seatsSectionRef);
                        } else if (fieldErrors.ticketPrice) {
                          scrollToSection(paymentSectionRef);
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap self-start sm:self-auto"
                    >
                      <ArrowUp className="w-3.5 h-3.5" /> Jump to Problem Field
                    </button>
                  </motion.div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmit('draft')}
                    className="w-full sm:w-auto px-6 py-3 bg-brand-offwhite hover:bg-brand-ink/10 text-brand-ink font-bold text-sm rounded-xl transition-all active:scale-95 border border-brand-ink/10"
                  >
                    Save as Draft
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmit('pending_approval')}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 bg-brand-vermilion hover:bg-brand-vermilion/90 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? 'Submitting...' : 'Request Admin Approval'}
                  </button>
                </div>
              </div>
            </div>

          )}
        </div>
      )}

      {/* TAB 2: MY EVENTS LIST */}
      {activeTab === 'my-events' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">My Created Events</h2>
              <p className="text-sm text-brand-ink/60">
                Track approval status, manage drafts, and see admin feedback.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('create')}
              className="px-4 py-2 bg-brand-vermilion text-white text-xs font-bold rounded-xl shadow-sm hover:bg-brand-vermilion/90"
            >
              + Create New
            </button>
          </div>

          {loadingEvents ? (
            <div className="py-16 text-center text-brand-ink/40">Loading your events...</div>
          ) : myEvents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-brand-ink/10 p-12 text-center text-brand-ink/50 space-y-3">
              <CalendarPlus className="w-10 h-10 mx-auto text-brand-ink/20" />
              <p>You haven't created any events yet.</p>
              <button
                onClick={handleFillDummyDraft}
                className="text-xs text-brand-vermilion font-bold underline cursor-pointer"
              >
                Use Quick Demo Draft to test immediately
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {myEvents.map((ev) => (
                <div
                  key={ev.id}
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
                        {ev.status === 'pending_approval' ? 'Pending Admin Approval' : ev.status}
                      </span>

                      {ev.isPaid ? (
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700">
                          Paid Entry (₹{ev.ticketPrice})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700">
                          Free Entry
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold tracking-tight text-brand-ink">{ev.title}</h3>

                    {ev.description && (
                      <p className="text-sm text-brand-ink/70 line-clamp-2">{ev.description}</p>
                    )}

                    <div className="flex flex-wrap gap-y-2 gap-x-6 text-xs text-brand-ink/60 font-medium">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-brand-vermilion" />
                        <span>Venue: <strong className="text-brand-ink">{ev.venue}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Date & Time: <strong className="text-brand-ink">{ev.date} ({ev.time})</strong></span>
                      </div>
                      <div>
                        Capacity: <strong className="text-brand-ink">{ev.totalSeats} seats</strong>
                      </div>
                    </div>

                    {ev.rejectionReason && (
                      <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-medium border border-red-200">
                        <strong>Rejection Feedback:</strong> {ev.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col items-center justify-center gap-2 border-t md:border-t-0 md:border-l border-brand-ink/10 pt-4 md:pt-0 md:pl-6 min-w-[170px]">
                    <button
                      onClick={() => fetchRegistrationsForEvent(ev)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all border border-indigo-200"
                    >
                      <Receipt className="w-3.5 h-3.5" /> Registrations & Approvals
                    </button>

                    <button
                      onClick={() => setPreviewEvent(ev)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-offwhite text-brand-ink rounded-xl text-xs font-bold hover:bg-brand-ink/10 transition-all border border-brand-ink/10"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview Card
                    </button>

                    {ev.status === 'draft' && (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`${API_BASE_URL}/events/${ev.id}`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                              },
                              body: JSON.stringify({ status: 'pending_approval' })
                            });
                            if (!res.ok) {
                              const d = await res.json();
                              throw new Error(d.error || 'Failed to submit');
                            }
                            flashSuccess('Draft submitted for Admin approval!');
                            fetchMyEvents();
                          } catch (err: any) {
                            alert(err.message);
                          }
                        }}
                        className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-brand-vermilion text-white rounded-xl text-xs font-bold hover:bg-brand-vermilion/90 transition-all shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" /> Submit Now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Registrations & Payment Verification Modal */}
      <AnimatePresence>
        {registrationsEvent && (
          <div 
            onClick={(e) => { if (e.target === e.currentTarget) setRegistrationsEvent(null); }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl border border-brand-ink/10 relative max-h-[90vh] overflow-y-auto"
            >
              {/* Top Navigation Bar with Back Button */}
              <div className="flex items-center justify-between pb-3 border-b border-brand-ink/10 -mt-2">
                <button
                  type="button"
                  onClick={() => setRegistrationsEvent(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-offwhite hover:bg-brand-ink/10 text-brand-ink rounded-xl text-xs font-bold transition-all border border-brand-ink/10 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Events
                </button>
                <button
                  type="button"
                  onClick={() => setRegistrationsEvent(null)}
                  className="p-1.5 rounded-full bg-brand-ink/5 hover:bg-brand-ink/10 text-brand-ink transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                    {registrationsEvent.club}
                  </span>
                  <span className="text-xs text-brand-ink/50 font-medium">
                    {registrationsEvent.isPaid ? `Paid Entry (₹${registrationsEvent.ticketPrice})` : 'Free Entry'}
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold text-brand-ink tracking-tight">
                  Student Registrations & Payments
                </h3>
                <p className="text-xs text-brand-ink/60 mt-1">
                  Event: <strong className="text-brand-ink">{registrationsEvent.title}</strong>
                </p>
              </div>

              {/* Seats Stats Bar */}
              <div className="p-4 bg-brand-offwhite rounded-2xl border border-brand-ink/10 flex items-center justify-between text-xs font-semibold">
                <div>
                  <span className="text-brand-ink/50 block">Seats Occupied</span>
                  <strong className="text-base text-brand-ink">{registrationsEvent.takenSeats} / {registrationsEvent.totalSeats}</strong>
                </div>
                <div>
                  <span className="text-brand-ink/50 block">Remaining Vacancy</span>
                  <strong className="text-base text-emerald-700">
                    {Math.max(0, registrationsEvent.totalSeats - registrationsEvent.takenSeats)} seats left
                  </strong>
                </div>
                <div>
                  <span className="text-brand-ink/50 block">Registrations Count</span>
                  <strong className="text-base text-brand-ink">{registrationsList.length}</strong>
                </div>
              </div>

              {/* Registrations List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-ink/50">
                  Registered Students ({registrationsList.length})
                </h4>

                {loadingRegistrations ? (
                  <div className="py-12 text-center text-brand-ink/40">
                    <div className="w-7 h-7 border-2 border-brand-ink/20 border-t-brand-vermilion rounded-full animate-spin mx-auto mb-2"></div>
                    Loading registered students...
                  </div>
                ) : registrationsList.length === 0 ? (
                  <div className="p-8 text-center bg-brand-offwhite/50 border border-brand-ink/10 rounded-2xl text-brand-ink/50 text-xs">
                    No registrations found for this event yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {registrationsList.map((reg) => (
                      <div
                        key={reg.id}
                        className="p-4 bg-white rounded-2xl border border-brand-ink/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-brand-ink">{reg.user_name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              reg.status === 'confirmed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : reg.status === 'pending_payment_approval'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {reg.status === 'pending_payment_approval'
                                ? 'Pending Payment Approval'
                                : reg.status === 'confirmed'
                                ? 'Officially Joined'
                                : 'Rejected'}
                            </span>
                          </div>
                          <p className="text-xs text-brand-ink/60">{reg.user_email}</p>

                          {/* Year & Department Badges */}
                          {(reg.year || reg.department) && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {reg.year && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  {reg.year}
                                </span>
                              )}
                              {reg.department && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  {reg.department}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Custom Question Answers */}
                          {reg.answers && Object.keys(reg.answers).length > 0 && (
                            <div className="mt-1.5 p-2.5 bg-brand-offwhite/80 rounded-xl border border-brand-ink/5 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-ink/40">
                                Responses
                              </span>
                              {Object.entries(reg.answers).map(([question, answer]) => (
                                <div key={question} className="text-xs">
                                  <span className="font-semibold text-brand-ink/70">{question}: </span>
                                  <span className="text-brand-ink">{String(answer)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Payment Screenshot Thumbnail & Lightbox Trigger */}
                          {reg.isPaid && (
                            <div className="pt-1">
                              {reg.payment_screenshot ? (
                                <button
                                  type="button"
                                  onClick={() => setActiveScreenshotModal(reg.payment_screenshot)}
                                  className="inline-flex items-center gap-2 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-200 transition-all cursor-pointer"
                                >
                                  <img
                                    src={reg.payment_screenshot}
                                    alt="Transaction receipt"
                                    className="w-5 h-5 object-cover rounded"
                                  />
                                  <span>View Transaction Screenshot</span>
                                  <ExternalLink className="w-3 h-3 opacity-60" />
                                </button>
                              ) : (
                                <span className="text-[11px] text-brand-ink/40 italic">
                                  No screenshot uploaded
                                </span>
                              )}
                            </div>
                          )}

                          {reg.rejection_reason && (
                            <p className="text-[11px] text-red-600 font-medium">
                              Rejection note: {reg.rejection_reason}
                            </p>
                          )}
                        </div>

                        {/* Approval Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {reg.status === 'pending_payment_approval' ? (
                            <>
                              <button
                                disabled={processingRegId === reg.id}
                                onClick={() => handleApproveRegistration(registrationsEvent.id, reg.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve & Deduct 1 Seat
                              </button>
                              <button
                                disabled={processingRegId === reg.id}
                                onClick={() => handleRejectRegistration(registrationsEvent.id, reg.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition-all border border-red-200 active:scale-95 disabled:opacity-50 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </>
                          ) : reg.status === 'confirmed' ? (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              Seat Confirmed ✓
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                              Rejected ✕
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Back Button */}
              <div className="pt-2 border-t border-brand-ink/10">
                <button
                  type="button"
                  onClick={() => setRegistrationsEvent(null)}
                  className="w-full py-3 bg-brand-offwhite hover:bg-brand-ink/10 text-brand-ink font-bold text-sm rounded-2xl transition-all border border-brand-ink/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to My Events
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Screenshot High-Resolution Lightbox Modal */}
      <AnimatePresence>
        {activeScreenshotModal && (
          <div 
            onClick={(e) => { if (e.target === e.currentTarget) setActiveScreenshotModal(null); }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-2 border-b border-brand-ink/10">
                <button
                  type="button"
                  onClick={() => setActiveScreenshotModal(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-offwhite hover:bg-brand-ink/10 text-brand-ink rounded-xl text-xs font-bold transition-all border border-brand-ink/10 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Registrations
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScreenshotModal(null)}
                  className="p-1.5 rounded-full bg-brand-ink/5 hover:bg-brand-ink/10 text-brand-ink transition-colors cursor-pointer"
                  title="Close screenshot"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[65vh] overflow-auto rounded-2xl border border-brand-ink/10 bg-brand-offwhite p-2">
                <img
                  src={activeScreenshotModal}
                  alt="Full transaction screenshot"
                  className="w-full object-contain rounded-xl mx-auto"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveScreenshotModal(null)}
                  className="w-full py-3 bg-brand-ink text-white rounded-2xl text-xs font-bold hover:bg-brand-ink/90 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Registrations
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Event Details Preview Modal */}
      <AnimatePresence>
        {previewEvent && (
          <div 
            onClick={(e) => { if (e.target === e.currentTarget) setPreviewEvent(null); }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-brand-ink/10 overflow-hidden relative max-h-[90vh] overflow-y-auto"
            >
              {/* Top Navigation Bar with Back Button */}
              <div className="flex items-center justify-between pb-3 border-b border-brand-ink/10 -mt-2">
                <button
                  type="button"
                  onClick={() => setPreviewEvent(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-offwhite hover:bg-brand-ink/10 text-brand-ink rounded-xl text-xs font-bold transition-all border border-brand-ink/10 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Events
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewEvent(null)}
                  className="p-1.5 rounded-full bg-brand-ink/5 hover:bg-brand-ink/10 text-brand-ink transition-colors cursor-pointer"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {previewEvent.imageUrl && (
                <img
                  src={previewEvent.imageUrl}
                  alt={previewEvent.title}
                  className="w-full h-44 object-cover rounded-2xl"
                />
              )}

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-vermilion">
                  {previewEvent.club}
                </span>
                <h3 className="text-2xl font-bold text-brand-ink mt-1">{previewEvent.title}</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-brand-offwhite p-4 rounded-2xl border border-brand-ink/10">
                <div>
                  <span className="text-brand-ink/50 block">Venue</span>
                  <strong className="text-brand-ink font-semibold">{previewEvent.venue}</strong>
                </div>
                <div>
                  <span className="text-brand-ink/50 block">Date & Time</span>
                  <strong className="text-brand-ink font-semibold">{previewEvent.date} ({previewEvent.time})</strong>
                </div>
                <div>
                  <span className="text-brand-ink/50 block">Entry Fee</span>
                  <strong className="text-brand-ink font-semibold">
                    {previewEvent.isPaid ? `₹${previewEvent.ticketPrice} Paid` : 'Free Entry'}
                  </strong>
                </div>
                <div>
                  <span className="text-brand-ink/50 block">Capacity</span>
                  <strong className="text-brand-ink font-semibold">{previewEvent.totalSeats} seats</strong>
                </div>
              </div>

              {previewEvent.description && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-ink/60">Description</h4>
                  <p className="text-sm text-brand-ink/80 leading-relaxed whitespace-pre-line">
                    {previewEvent.description}
                  </p>
                </div>
              )}

              {previewEvent.paymentQr && (
                <div className="p-4 bg-brand-offwhite rounded-2xl text-center space-y-2 border border-brand-ink/10">
                  <span className="text-xs font-bold text-brand-ink">Payment UPI QR</span>
                  <img
                    src={previewEvent.paymentQr}
                    alt="Payment QR"
                    className="w-32 h-32 mx-auto rounded-xl border border-brand-ink/10 bg-white p-1"
                  />
                </div>
              )}

              {previewEvent.pdfName && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs font-medium text-emerald-800">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>{previewEvent.pdfName}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                    Brochure Attached
                  </span>
                </div>
              )}

              {/* Bottom Back Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setPreviewEvent(null)}
                  className="w-full py-3 bg-brand-offwhite hover:bg-brand-ink/10 text-brand-ink font-bold text-sm rounded-2xl transition-all border border-brand-ink/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to My Events
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

