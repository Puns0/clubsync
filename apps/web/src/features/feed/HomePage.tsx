import { useState, useMemo } from "react";
import { TopBar } from "../../design-system/components/TopBar";
import { BottomNav } from "../../design-system/components/BottomNav";
import { NotificationBell } from "../../design-system/components/NotificationBell";
import { SearchBar } from "./SearchBar";
import { ClubChips } from "./ClubChips";
import { EventCard } from "./EventCard";
import { useEvents } from "../../api/hooks/useEvents";
import { useClubs } from "../../api/hooks/useClubs";
import { useMyRegistrations } from "../../api/hooks/useRegistrations";
import { Skeleton } from "../../design-system/components/Skeleton";
import { EmptyState } from "../../design-system/components/EmptyState";
import { ErrorState } from "../../design-system/components/ErrorState";
import { SearchX, CalendarOff } from "lucide-react";
import { cn } from "../../lib/format";

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  
  // Always fetch today, live, and upcoming
  const { data: allEvents, isLoading: eventsLoading, isError: eventsError } = useEvents();
  const { data: clubs, isLoading: clubsLoading } = useClubs();
  const { data: registrations } = useMyRegistrations();

  // Filter events locally for instant search experience
  const filteredEvents = useMemo(() => {
    if (!allEvents) return [];
    
    let filtered = allEvents;
    
    if (selectedClub) {
      filtered = filtered.filter(e => e.clubId === selectedClub);
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        e => e.title.toLowerCase().includes(q) || e.clubName.toLowerCase().includes(q)
      );
    }
    
    // Sort logic: live first, then chronological
    return filtered.sort((a, b) => {
       if (a.status === "live" && b.status !== "live") return -1;
       if (b.status === "live" && a.status !== "live") return 1;
       return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    });
  }, [allEvents, selectedClub, searchQuery]);

  const liveEvents = filteredEvents.filter(e => e.status === "live");
  const todayEvents = filteredEvents.filter(e => e.status !== "live" && e.startsAt.includes(new Date().toISOString().split('T')[0]));
  // For demo, treat all non-live as upcoming if today isn't explicitly matched
  const upcomingEvents = filteredEvents.filter(e => e.status === "upcoming" && !todayEvents.includes(e));

  const handleClearSearch = () => setSearchQuery("");

  const renderContent = () => {
    if (eventsError) {
      return <ErrorState className="mt-8" />;
    }

    if (eventsLoading) {
      return (
        <div className="space-y-4 mt-6">
           <Skeleton className="h-[180px] w-full rounded-ticket" />
           <Skeleton className="h-[180px] w-full rounded-ticket" />
           <Skeleton className="h-[180px] w-full rounded-ticket" />
        </div>
      );
    }

    if (filteredEvents.length === 0) {
      return (
        <EmptyState 
          icon={<SearchX className="w-6 h-6" />}
          title="No events found"
          description={searchQuery ? "Try adjusting your search or filters." : "There are no events scheduled right now."}
          className="mt-8"
        />
      );
    }

    return (
      <div className="space-y-8 mt-6">
        {liveEvents.length > 0 && (
          <section>
             <h2 className="text-xl font-display font-bold text-ink mb-4 flex items-center">
               <span className="w-2 h-2 rounded-full bg-vermilion mr-2 animate-pulse-soft" />
               Happening Now
             </h2>
             <div className="space-y-4">
                {liveEvents.map(event => (
                   <EventCard 
                     key={event.id} 
                     event={event} 
                     userRegistration={registrations?.find(r => r.eventId === event.id)} 
                   />
                ))}
             </div>
          </section>
        )}

        {todayEvents.length > 0 && (
          <section>
             <h2 className="text-xl font-display font-bold text-ink mb-4">Today</h2>
             <div className="space-y-4">
                {todayEvents.map(event => (
                   <EventCard 
                     key={event.id} 
                     event={event} 
                     userRegistration={registrations?.find(r => r.eventId === event.id)} 
                   />
                ))}
             </div>
          </section>
        )}

        {upcomingEvents.length > 0 && (
          <section>
             <h2 className="text-xl font-display font-bold text-ink mb-4">Upcoming</h2>
             <div className="space-y-4">
                {upcomingEvents.map(event => (
                   <EventCard 
                     key={event.id} 
                     event={event} 
                     userRegistration={registrations?.find(r => r.eventId === event.id)} 
                   />
                ))}
             </div>
          </section>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-paper pb-24">
      <TopBar 
        title="ClubSync" 
        action={<NotificationBell unreadCount={2} />} 
      />

      <main className="px-4 pt-4 max-w-2xl mx-auto">
        <div className="sticky top-[64px] z-30 bg-paper/90 backdrop-blur-md pb-4 pt-2 -mx-4 px-4 space-y-4">
          <SearchBar 
            placeholder="Search events, clubs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={handleClearSearch}
          />
          
          {clubsLoading ? (
             <div className="flex gap-2 overflow-hidden">
                <Skeleton className="h-8 w-16 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-full" />
             </div>
          ) : (
             <ClubChips 
                clubs={clubs || []} 
                selectedClubId={selectedClub} 
                onSelect={setSelectedClub} 
             />
          )}
        </div>

        {renderContent()}
      </main>

      <BottomNav />
    </div>
  );
}
