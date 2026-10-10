import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../api/hooks/useAuth";
import { Skeleton } from "../../design-system/components/Skeleton";
import { useRealtimeEvents } from "../../realtime/useRealtimeEvents";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  useRealtimeEvents();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-paper">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  if (!user) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export function PublicOnlyGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-paper">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  if (user) {
    // If logged in, don't let them see login/signup pages
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
