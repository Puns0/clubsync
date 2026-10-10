// ─── Design Showcase ───
// Dev-only route to test and visualize all components and variants.

import * as React from "react";
import { Button, MotionButton } from "../design-system/components/Button";
import { IconButton } from "../design-system/components/IconButton";
import { Input } from "../design-system/components/Input";
import { Checkbox } from "../design-system/components/Checkbox";
import { OtpInput } from "../design-system/components/OtpInput";
import { Chip, MotionChip } from "../design-system/components/Chip";
import { Tag } from "../design-system/components/Tag";
import { TicketCard, TicketCardHeader, TicketCardTearLine, TicketCardFooter } from "../design-system/components/TicketCard";
import { SeatMeter } from "../design-system/components/SeatMeter";
import { SeatGrid } from "../design-system/components/SeatGrid";
import { WaitlistQueue } from "../design-system/components/WaitlistQueue";
import { CountdownRing } from "../design-system/components/CountdownRing";
import { AnimatedNumber } from "../design-system/components/AnimatedNumber";
import { Timeline, TimelineItem } from "../design-system/components/Timeline";
import { Skeleton } from "../design-system/components/Skeleton";
import { EmptyState } from "../design-system/components/EmptyState";
import { ErrorState } from "../design-system/components/ErrorState";
import { BottomNav } from "../design-system/components/BottomNav";
import { TopBar } from "../design-system/components/TopBar";
import { NotificationBell } from "../design-system/components/NotificationBell";
import { OfflineBanner } from "../design-system/components/OfflineBanner";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "../design-system/primitives/Dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../design-system/primitives/Sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../design-system/primitives/Tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../design-system/primitives/Select";
import { Toast, ToastAction, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "../design-system/primitives/Toast";

import { Home, Settings, AlertCircle, RefreshCw } from "lucide-react";
import { useState } from "react";

export function DesignShowcase() {
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [selectedChip, setSelectedChip] = useState("all");
  const [ticketsTaken, setTicketsTaken] = useState(15);
  const [toastOpen, setToastOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper pb-32">
      <TopBar title="Design Showcase" showBack action={<NotificationBell unreadCount={3} />} />

      <main className="mx-auto max-w-3xl p-6 space-y-16">
        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-xl font-display font-bold">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button isLoading>Loading</Button>
          </div>
          <div className="flex flex-wrap gap-4 pt-4">
            <IconButton><Home className="w-5 h-5" /></IconButton>
            <IconButton variant="secondary"><Settings className="w-5 h-5" /></IconButton>
            <IconButton variant="ghost"><RefreshCw className="w-5 h-5" /></IconButton>
          </div>
        </section>

        {/* Inputs */}
        <section className="space-y-4">
          <h2 className="text-xl font-display font-bold">Inputs & Forms</h2>
          <div className="space-y-4 max-w-sm">
            <Input placeholder="Standard input" />
            <Input placeholder="Error input" error />
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox id="terms" />
              <label htmlFor="terms" className="text-sm font-semibold">Accept terms and conditions</label>
            </div>
            <div className="pt-4">
              <label className="block text-sm font-semibold mb-2">OTP Input</label>
              <OtpInput value={otp} onChange={setOtp} />
            </div>
            <div className="pt-4">
               <Select>
                 <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                 </SelectTrigger>
                 <SelectContent>
                    <SelectItem value="1">Option 1</SelectItem>
                    <SelectItem value="2">Option 2</SelectItem>
                 </SelectContent>
               </Select>
            </div>
          </div>
        </section>

        {/* Chips & Tags */}
        <section className="space-y-4">
          <h2 className="text-xl font-display font-bold">Chips & Tags</h2>
          <div className="flex flex-wrap gap-2">
            <Chip selected={selectedChip === "all"} onClick={() => setSelectedChip("all")}>All</Chip>
            <Chip selected={selectedChip === "code"} onClick={() => setSelectedChip("code")}>CodeCraft</Chip>
            <Chip selected={selectedChip === "dance"} onClick={() => setSelectedChip("dance")}>Nritya</Chip>
          </div>
          <div className="flex flex-wrap gap-2 pt-4">
            <Tag>Default</Tag>
            <Tag variant="vermilion">Live</Tag>
            <Tag variant="muted">Ended</Tag>
            <Tag variant="outline">Waitlist</Tag>
          </div>
        </section>

        {/* Overlays */}
        <section className="space-y-4">
          <h2 className="text-xl font-display font-bold">Overlays & Popups</h2>
          <div className="flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger asChild><Button>Open Dialog</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Action</DialogTitle>
                  <DialogDescription>Are you sure you want to do this?</DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-6">
                   <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
                   <Button variant="primary">Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild><Button variant="secondary">Open Sheet</Button></SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Notifications</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-4">
                   <p className="text-sm">Notification 1</p>
                   <p className="text-sm">Notification 2</p>
                </div>
              </SheetContent>
            </Sheet>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild><Button variant="outline">Hover me</Button></TooltipTrigger>
                <TooltipContent>This is a tooltip</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <ToastProvider>
              <Button variant="ghost" onClick={() => setToastOpen(true)}>Show Toast</Button>
              <Toast open={toastOpen} onOpenChange={setToastOpen} variant="promotion">
                <div className="flex flex-col">
                  <ToastTitle>Promotion Available!</ToastTitle>
                  <ToastDescription>A seat opened up for your waitlisted event.</ToastDescription>
                </div>
                <ToastAction altText="View">View</ToastAction>
                <ToastClose />
              </Toast>
              <ToastViewport />
            </ToastProvider>
          </div>
        </section>

        {/* Complex Components */}
        <section className="space-y-4">
          <h2 className="text-xl font-display font-bold">Complex Components</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-ink-soft">Ticket Card & Seat Meter</h3>
              <TicketCard>
                <TicketCardHeader>
                  <h3 className="font-display font-bold text-lg">Web Dev Workshop</h3>
                  <p className="text-sm text-ink-soft">CodeCraft • Today, 2 PM</p>
                </TicketCardHeader>
                <TicketCardTearLine />
                <TicketCardFooter>
                   <SeatMeter taken={ticketsTaken} capacity={30} />
                   <Button size="sm" className="mt-4 w-full" onClick={() => setTicketsTaken(prev => prev + 1)}>
                      Add Seat (Animated)
                   </Button>
                </TicketCardFooter>
              </TicketCard>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-ink-soft">Countdown Ring</h3>
              <div className="flex justify-center p-6 border-2 border-dashed border-ink/20 rounded-ticket">
                 <CountdownRing 
                    durationSeconds={60} 
                    expiresAt={new Date(Date.now() + 60000).toISOString()} 
                 />
              </div>
            </div>

            <div className="space-y-4 md:col-span-2">
              <h3 className="text-sm font-semibold text-ink-soft">Seat Grids (Small & Large)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 border-2 border-dashed border-ink/20 rounded-ticket">
                 <div>
                    <p className="mb-2 text-xs font-semibold uppercase">Small (20 seats)</p>
                    <SeatGrid capacity={20} taken={12} userStatus="confirmed" />
                 </div>
                 <div>
                    <p className="mb-2 text-xs font-semibold uppercase">Large (100 seats)</p>
                    <SeatGrid capacity={100} taken={85} userStatus="confirmed" />
                 </div>
              </div>
            </div>

            <div className="space-y-4 md:col-span-2">
              <h3 className="text-sm font-semibold text-ink-soft">Waitlist Queue</h3>
              <div className="p-4 border-2 border-dashed border-ink/20 rounded-ticket bg-paper-deep/30">
                 <WaitlistQueue 
                    currentUserId="user-1"
                    entries={[
                      { userId: "user-2", position: 1 },
                      { userId: "user-1", position: 2 },
                      { userId: "user-3", position: 3 },
                    ]}
                 />
              </div>
            </div>

            <div className="space-y-4 md:col-span-2">
              <h3 className="text-sm font-semibold text-ink-soft">Timeline</h3>
              <Timeline>
                 <TimelineItem status="past">
                    <p className="text-sm font-semibold text-ink-soft">10:00 AM - Design Sync</p>
                 </TimelineItem>
                 <TimelineItem status="confirmed">
                    <p className="text-sm font-semibold">1:00 PM - Lunch</p>
                 </TimelineItem>
                 <TimelineItem status="waitlisted" isClash>
                    <p className="text-sm font-semibold">2:00 PM - Workshop (Waitlist)</p>
                 </TimelineItem>
                 <TimelineItem status="promoted_pending" isClash>
                    <p className="text-sm font-semibold">2:00 PM - React Meetup (Action Req!)</p>
                 </TimelineItem>
              </Timeline>
            </div>
          </div>
        </section>

        {/* States */}
        <section className="space-y-4">
          <h2 className="text-xl font-display font-bold">States</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="space-y-2">
               <Skeleton className="h-12 w-full" />
               <Skeleton className="h-24 w-full" />
               <Skeleton className="h-8 w-3/4" />
             </div>
             <EmptyState 
                icon={<AlertCircle className="w-6 h-6" />}
                title="No events found"
                description="Try adjusting your filters or search query."
                action={<Button variant="outline">Clear Filters</Button>}
             />
          </div>
          <ErrorState />
        </section>

      </main>

      <OfflineBanner />
      <BottomNav />
    </div>
  );
}
