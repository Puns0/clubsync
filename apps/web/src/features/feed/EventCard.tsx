import { Link } from "react-router-dom";
import { TicketCard, TicketCardHeader, TicketCardTearLine, TicketCardFooter } from "../../design-system/components/TicketCard";
import { SeatMeter } from "../../design-system/components/SeatMeter";
import { Tag } from "../../design-system/components/Tag";
import { formatTimeRange, formatDateLabel } from "../../lib/time";
import type { ClubEvent, Registration } from "../../api/types";

interface EventCardProps {
  event: ClubEvent;
  userRegistration?: Registration;
}

export function EventCard({ event, userRegistration }: EventCardProps) {
  const isLive = event.status === "live";
  const isWaitlisted = userRegistration?.status === "waitlisted";
  const isConfirmed = userRegistration?.status === "confirmed" || userRegistration?.status === "promoted_pending";

  return (
    <Link to={`/event/${event.id}`} className="block">
      <TicketCard highlighted={isConfirmed || isWaitlisted}>
        <TicketCardHeader>
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-display font-bold text-lg leading-tight line-clamp-2">
              {event.title}
            </h3>
            {isLive && <Tag variant="vermilion" className="ml-2 shrink-0 animate-pulse-soft">Live</Tag>}
          </div>
          <div className="text-sm font-semibold text-ink-soft space-y-0.5">
            <p>{event.clubName}</p>
            <p>{formatDateLabel(event.startsAt)} • {formatTimeRange(event.startsAt, event.endsAt)}</p>
          </div>
        </TicketCardHeader>

        <TicketCardTearLine />

        <TicketCardFooter className="flex flex-col gap-3">
          <SeatMeter taken={event.taken} capacity={event.capacity} />
          
          {(isConfirmed || isWaitlisted) && (
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
              {isConfirmed && <span className="text-vermilion">Seat Confirmed</span>}
              {isWaitlisted && <span className="text-ink-soft">On Waitlist</span>}
              <span className="text-ink">View Details &rarr;</span>
            </div>
          )}
        </TicketCardFooter>
      </TicketCard>
    </Link>
  );
}
