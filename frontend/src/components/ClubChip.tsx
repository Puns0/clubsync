import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface ClubChipProps {
  name: string;
  id: string;
}

export default function ClubChip({ name, id }: ClubChipProps) {
  return (
    <Link to={`/club/${id}`}>
      <motion.div 
        whileTap={{ scale: 0.98 }}
        className="px-4 py-2 bg-white border border-brand-ink/10 rounded-full whitespace-nowrap text-sm font-medium hover:border-brand-vermilion transition-colors shadow-sm"
      >
        {name}
      </motion.div>
    </Link>
  );
}
