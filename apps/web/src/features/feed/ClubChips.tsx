import { Chip } from "../../design-system/components/Chip";
import type { Club } from "../../api/types";

interface ClubChipsProps {
  clubs: Club[];
  selectedClubId: string | null;
  onSelect: (clubId: string | null) => void;
}

export function ClubChips({ clubs, selectedClubId, onSelect }: ClubChipsProps) {
  return (
    <div className="flex w-full overflow-x-auto hide-scrollbar gap-2 py-1 px-4 -mx-4">
      <Chip 
        selected={selectedClubId === null} 
        onClick={() => onSelect(null)}
      >
        All
      </Chip>
      {clubs.map((club) => (
        <Chip
          key={club.id}
          selected={selectedClubId === club.id}
          onClick={() => onSelect(club.id)}
        >
          {club.name}
        </Chip>
      ))}
    </div>
  );
}
