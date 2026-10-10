// ─── OfflineBanner Component ───
// Connection-lost indicator using ink/paper style (not red/green).

import * as React from "react";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { slideUpVariants } from "../motion";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          variants={slideUpVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-center space-x-2 rounded-ticket border-2 border-ink bg-paper-deep p-3 text-sm font-semibold text-ink shadow-stamp sm:bottom-6 sm:left-auto sm:w-[300px]"
        >
          <WifiOff className="h-4 w-4" />
          <span>You are offline. Showing cached data.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
