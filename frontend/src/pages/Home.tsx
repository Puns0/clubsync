import { motion } from 'framer-motion';
import ClubChip from '../components/ClubChip';
import EventCard from '../components/EventCard';
import { Search } from 'lucide-react';

// Mock data
const CLUBS = [
  { id: '1', name: 'GDSC SJBIT' },
  { id: '2', name: 'IEEE Student Branch' },
  { id: '3', name: 'Cultural Committee' },
  { id: '4', name: 'Turing Club' },
  { id: '5', name: 'Sports Council' },
];

const EVENTS_LIVE = [
  {
    id: 'e1',
    title: 'Web3 Workshop: Build Your First DApp',
    club: 'GDSC SJBIT',
    time: 'Today, 2:00 PM - 5:00 PM',
    venue: 'Lab 3, CS Block',
    totalSeats: 60,
    takenSeats: 60,
    waitlistCount: 14,
    isLive: true,
  },
  {
    id: 'e2',
    title: 'Ideathon 2026 Pitch Practice',
    club: 'IEEE Student Branch',
    time: 'Today, 3:30 PM - 6:00 PM',
    venue: 'Seminar Hall 1',
    totalSeats: 120,
    takenSeats: 85,
    isLive: true,
  }
];

const EVENTS_UPCOMING = [
  {
    id: 'e3',
    title: 'Annual Cultural Fest - Auditions',
    club: 'Cultural Committee',
    time: 'Tomorrow, 4:00 PM',
    venue: 'Main Auditorium',
    totalSeats: 200,
    takenSeats: 156,
  },
  {
    id: 'e4',
    title: 'Intro to Competitive Programming',
    club: 'Turing Club',
    time: 'Oct 12, 5:00 PM',
    venue: 'Lab 1, CS Block',
    totalSeats: 50,
    takenSeats: 50,
    waitlistCount: 8,
  },
  {
    id: 'e5',
    title: 'Basketball Inter-department Match',
    club: 'Sports Council',
    time: 'Oct 14, 8:00 AM',
    venue: 'Main Ground',
    totalSeats: 100,
    takenSeats: 42,
  }
];

export default function Home() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <section className="pt-4 md:pt-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold tracking-tight mb-3"
        >
          Discover Campus Events.
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-brand-ink/60 max-w-2xl"
        >
          One calendar, zero clashes. Book your seat, manage your schedule, and never miss out on what's happening.
        </motion.p>
      </section>

      {/* Mobile Search (visible only on small screens) */}
      <div className="md:hidden relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-ink/50" />
        <input 
          type="text" 
          placeholder="Search clubs or events..." 
          className="w-full pl-11 pr-4 py-3 bg-white border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-vermilion/50 shadow-sm"
        />
      </div>

      {/* Clubs Scroller */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Active Clubs</h2>
        </div>
        <div className="flex overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 gap-3 no-scrollbar scroll-smooth">
          {CLUBS.map((club) => (
            <ClubChip key={club.id} id={club.id} name={club.name} />
          ))}
        </div>
      </section>

      {/* Live / Today Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-vermilion"></span>
            Live & Today
          </h2>
        </div>
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {EVENTS_LIVE.map(event => (
            <motion.div key={event.id} variants={item}>
              <EventCard {...event} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Upcoming Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Upcoming</h2>
          <button className="text-sm font-medium text-brand-vermilion hover:underline">View All</button>
        </div>
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {EVENTS_UPCOMING.map(event => (
            <motion.div key={event.id} variants={item}>
              <EventCard {...event} />
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
