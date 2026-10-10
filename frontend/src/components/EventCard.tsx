import { Calendar, MapPin, Users, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';

export interface EventCardProps {
  id: string;
  title: string;
  club: string;
  time: string;
  date?: string;
  venue: string;
  totalSeats: number;
  takenSeats: number;
  waitlistCount?: number;
  isLive?: boolean;
  description?: string;
  isPaid?: boolean;
  ticketPrice?: number;
  paymentQr?: string | null;
  imageUrl?: string | null;
  pdfUrl?: string | null;
  pdfName?: string | null;
  userStatus?: string | null;
  onClick?: () => void;
}

export default function EventCard({ 
  title, 
  club, 
  time, 
  date,
  venue, 
  totalSeats, 
  takenSeats,
  waitlistCount = 0,
  isLive = false,
  isPaid = false,
  ticketPrice = 0,
  imageUrl,
  userStatus,
  onClick
}: EventCardProps) {
  const isFull = takenSeats >= totalSeats;
  const percentage = Math.min(100, Math.round((takenSeats / totalSeats) * 100));

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="bg-white rounded-2xl p-5 border border-brand-ink/10 shadow-sm hover:shadow-md transition-all flex flex-col h-full relative overflow-hidden group cursor-pointer"
    >
      {/* Ticket perforation effect */}
      <div className="absolute -left-3 top-1/2 w-6 h-6 bg-brand-offwhite rounded-full border-r border-brand-ink/10 pointer-events-none z-10"></div>
      <div className="absolute -right-3 top-1/2 w-6 h-6 bg-brand-offwhite rounded-full border-l border-brand-ink/10 pointer-events-none z-10"></div>
      
      {/* User Status Badge Overlay */}
      {userStatus && userStatus !== 'cancelled' && userStatus !== 'rejected' && userStatus !== 'expired' && (
        <div className="absolute top-3 right-3 z-20">
          <span className={`shadow-sm px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
            userStatus === 'confirmed'
              ? 'bg-emerald-500 text-white'
              : userStatus === 'pending_approval'
              ? 'bg-amber-500 text-white'
              : 'bg-purple-500 text-white'
          }`}>
            {userStatus === 'confirmed' ? 'Joined ✓' : userStatus === 'pending_approval' ? 'Pending' : 'Waitlisted'}
          </span>
        </div>
      )}
      
      {imageUrl && (
        <div className="-mx-5 -mt-5 mb-4 h-32 overflow-hidden bg-brand-ink/5">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60">{club}</p>

        <div className="flex items-center gap-1.5">
          {isPaid ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
              <Ticket className="w-3 h-3" /> ₹{ticketPrice}
            </span>
          ) : (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
              Free Entry
            </span>
          )}

          {isLive && (
            <div className="flex items-center gap-1 bg-brand-vermilion/10 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-vermilion animate-pulse"></span>
              <span className="text-[10px] uppercase font-bold text-brand-vermilion">Live</span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-bold leading-tight group-hover:text-brand-vermilion transition-colors">
          {title}
        </h3>
      </div>

      <div className="space-y-2 mb-6 text-sm text-brand-ink/80 flex-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 opacity-70 flex-shrink-0" />
          <span>{date ? `${date} • ` : ''}{time}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 opacity-70 flex-shrink-0 text-brand-vermilion" />
          <span className="font-medium">{venue}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-brand-ink/10 border-dashed mt-auto">
        <div className="flex justify-between items-end mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-ink/70">
            <Users className="w-3.5 h-3.5" />
            <span>{takenSeats} / {totalSeats} seats filled</span>
          </div>
          {isFull && waitlistCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-ink/5 rounded text-brand-ink/70">
              Waitlist: {waitlistCount}
            </span>
          )}
        </div>
        
        {/* Visual Seat Meter */}
        <div className="h-2 w-full bg-brand-ink/5 rounded-full overflow-hidden flex">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full ${isFull ? 'bg-brand-ink' : 'bg-brand-vermilion'}`}
          />
        </div>
      </div>
    </motion.div>
  );
}
