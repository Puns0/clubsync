import { Calendar, MapPin, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface EventCardProps {
  title: string;
  club: string;
  time: string;
  venue: string;
  totalSeats: number;
  takenSeats: number;
  waitlistCount?: number;
  isLive?: boolean;
}

export default function EventCard({ 
  title, 
  club, 
  time, 
  venue, 
  totalSeats, 
  takenSeats,
  waitlistCount = 0,
  isLive = false
}: EventCardProps) {
  const isFull = takenSeats >= totalSeats;
  const percentage = Math.min(100, Math.round((takenSeats / totalSeats) * 100));

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl p-5 border border-brand-ink/10 shadow-sm hover:shadow-md transition-all flex flex-col h-full relative overflow-hidden group"
    >
      {/* Ticket perforation effect */}
      <div className="absolute -left-3 top-1/2 w-6 h-6 bg-brand-offwhite rounded-full border-r border-brand-ink/10"></div>
      <div className="absolute -right-3 top-1/2 w-6 h-6 bg-brand-offwhite rounded-full border-l border-brand-ink/10"></div>
      
      {isLive && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand-vermilion animate-pulse"></span>
          <span className="text-[10px] uppercase font-bold text-brand-vermilion tracking-wider">Live Now</span>
        </div>
      )}

      <div className="mb-4">
        <p className="text-sm font-medium text-brand-ink/60 mb-1">{club}</p>
        <h3 className="text-lg font-bold leading-tight group-hover:text-brand-vermilion transition-colors pr-16">{title}</h3>
      </div>

      <div className="space-y-2 mb-6 text-sm text-brand-ink/80 flex-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 opacity-70" />
          <span>{time}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 opacity-70" />
          <span>{venue}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-brand-ink/10 border-dashed mt-auto">
        <div className="flex justify-between items-end mb-2">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Users className="w-4 h-4" />
            <span>{takenSeats} / {totalSeats} seats</span>
          </div>
          {isFull && waitlistCount > 0 && (
            <span className="text-xs font-semibold px-2 py-1 bg-brand-ink/5 rounded-md text-brand-ink/70">
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
