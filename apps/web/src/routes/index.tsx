import { createBrowserRouter } from "react-router-dom";
import { DesignShowcase } from "../dev/DesignShowcase";
import { AuthGuard, PublicOnlyGuard } from "../features/auth/AuthGuard";
import { LoginPage } from "../features/auth/LoginPage";
import { SignupPage } from "../features/auth/SignupPage";
import { OtpPage } from "../features/auth/OtpPage";
import { ForgotPasswordPage } from "../features/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../features/auth/ResetPasswordPage";
import { HomePage } from "../features/feed/HomePage";
import { EventDetailPage } from "../features/event/EventDetailPage";
import { SchedulePage } from "../features/schedule/SchedulePage";
import { NotificationsPage } from "../features/notifications/NotificationsPage";
import { ProfilePage } from "../features/profile/ProfilePage";

export const router = createBrowserRouter([
  // ─── Public-only routes (redirect to / if already logged in) ───
  {
    path: "/login",
    element: (
      <PublicOnlyGuard>
        <LoginPage />
      </PublicOnlyGuard>
    ),
  },
  {
    path: "/signup",
    element: (
      <PublicOnlyGuard>
        <SignupPage />
      </PublicOnlyGuard>
    ),
  },
  {
    path: "/signup/verify",
    element: (
      <PublicOnlyGuard>
        <OtpPage />
      </PublicOnlyGuard>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <PublicOnlyGuard>
        <ForgotPasswordPage />
      </PublicOnlyGuard>
    ),
  },
  {
    path: "/reset-password",
    element: (
      <PublicOnlyGuard>
        <ResetPasswordPage />
      </PublicOnlyGuard>
    ),
  },

  // ─── Authenticated routes ───
  {
    path: "/",
    element: (
      <AuthGuard>
        <HomePage />
      </AuthGuard>
    ),
  },
  {
    path: "/event/:id",
    element: (
      <AuthGuard>
        <EventDetailPage />
      </AuthGuard>
    ),
  },
  {
    path: "/schedule",
    element: (
      <AuthGuard>
        <SchedulePage />
      </AuthGuard>
    ),
  },
  {
    path: "/notifications",
    element: (
      <AuthGuard>
        <NotificationsPage />
      </AuthGuard>
    ),
  },
  {
    path: "/passes",
    element: (
      <AuthGuard>
        <div className="min-h-screen bg-paper p-8 text-center flex items-center justify-center flex-col">
          <h1 className="text-2xl font-bold font-display">My Passes</h1>
          <p className="text-ink-soft mt-2">Coming soon...</p>
        </div>
      </AuthGuard>
    ),
  },
  {
    path: "/profile",
    element: (
      <AuthGuard>
        <ProfilePage />
      </AuthGuard>
    ),
  },

  // ─── Dev routes ───
  {
    path: "/design",
    element: <DesignShowcase />,
  },
]);
