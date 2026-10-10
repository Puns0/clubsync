// ─── Profile Page ───
// User profile with account info and logout.

import { useAuth } from "../../api/hooks/useAuth";
import { TopBar } from "../../design-system/components/TopBar";
import { BottomNav } from "../../design-system/components/BottomNav";
import { Button } from "../../design-system/components/Button";
import { Tag } from "../../design-system/components/Tag";
import { formatCollegeYear, formatOrdinal } from "../../lib/format";
import { LogOut, Mail, Phone, GraduationCap, Hash } from "lucide-react";

export function ProfilePage() {
  const { user, logout, isLoggingOut } = useAuth();

  if (!user) return null;

  const infoItems = [
    { icon: Mail, label: "Email", value: user.email },
    { icon: Hash, label: "USN", value: user.usn },
    { icon: GraduationCap, label: "Department", value: `${user.department} — ${formatCollegeYear(user.year)}` },
    { icon: Phone, label: "Phone", value: user.phone },
  ];

  return (
    <div className="min-h-screen bg-paper pb-24">
      <TopBar title="Profile" />

      <main className="px-4 pt-6 max-w-2xl mx-auto space-y-8">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-ink bg-paper-deep text-3xl font-display font-bold text-ink">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <h1 className="mt-3 text-xl font-display font-bold text-ink">
            {user.name}
          </h1>
          <Tag className="mt-1">{user.role}</Tag>
        </div>

        {/* Info Cards */}
        <div className="space-y-3">
          {infoItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-lg border-2 border-ink/10 bg-paper-deep p-4"
            >
              <item.icon className="h-5 w-5 text-ink-soft shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-ink-faint font-semibold">
                  {item.label}
                </p>
                <p className="text-sm font-semibold text-ink">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="pt-4">
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => logout()}
            isLoading={isLoggingOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
