import { format, isToday, startOfToday } from "date-fns";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useCompleteFollowUp,
  useGetProgressStats,
  getGetProgressStatsQueryKey,
  getListConnectionsQueryKey,
} from "@workspace/api-client-react";
import type { FollowUp } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, AlertCircle, TrendingUp, Plus, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreateConnection } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { useState } from "react";

function StatCard({
  label,
  value,
  icon: Icon,
  variant = "default",
  isLoading,
}: {
  label: string;
  value: number | undefined;
  icon: React.ElementType;
  variant?: "default" | "warning" | "primary";
  isLoading: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-card rounded-2xl border border-card-border p-5 shadow-sm",
        variant === "warning" && value && value > 0
          ? "border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800"
          : "",
        variant === "primary" ? "border-primary/20 bg-primary/5" : "",
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center",
            variant === "warning" && value && value > 0
              ? "bg-orange-100 dark:bg-orange-900/30"
              : "bg-primary/10",
          )}
        >
          <Icon
            className={cn(
              "w-4 h-4",
              variant === "warning" && value && value > 0 ? "text-orange-500" : "text-primary",
            )}
          />
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-12 mb-1" />
      ) : (
        <p
          data-testid={`stat-${label.toLowerCase().replace(/ /g, "-")}`}
          className="text-3xl font-bold text-foreground mb-1"
        >
          {value ?? 0}
        </p>
      )}
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function FollowUpCard({
  followUp,
  onComplete,
  isCompleting,
  overdue,
}: {
  followUp: FollowUp;
  onComplete: (id: number) => void;
  isCompleting: boolean;
  overdue?: boolean;
}) {
  const today = isToday(new Date(followUp.scheduledDate));

  return (
    <div
      data-testid={`followup-card-${followUp.id}`}
      className={cn(
        "flex items-center gap-4 py-3 px-4 rounded-xl border transition-all",
        overdue
          ? "border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800"
          : "border-card-border bg-card",
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">{followUp.connection?.name}</p>
        <p className={cn("text-xs mt-0.5", overdue ? "text-orange-500" : "text-muted-foreground")}>
          {overdue ? "Overdue — " : today ? "Today — " : ""}
          {format(new Date(followUp.scheduledDate), "MMM d, yyyy")}
        </p>
      </div>
      {followUp.completedAt ? (
        <Badge variant="secondary" className="text-xs">
          Done
        </Badge>
      ) : (
        <Button
          data-testid={`button-complete-${followUp.id}`}
          size="sm"
          variant="outline"
          onClick={() => onComplete(followUp.id)}
          disabled={isCompleting}
          className="h-8 text-xs gap-1.5 shrink-0"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Done
        </Button>
      )}
    </div>
  );
}

type NewConnectionForm = {
  name: string;
  notes: string;
  followUpDate: string;
};

export default function DashboardPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);

  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });

  const { data: progress, isLoading: progressLoading } = useGetProgressStats({
    query: { queryKey: getGetProgressStatsQueryKey() },
  });

  const completeFollowUp = useCompleteFollowUp({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        qc.invalidateQueries({ queryKey: getGetProgressStatsQueryKey() });
        toast({ title: "Follow-up marked complete!" });
      },
    },
  });

  const createConnection = useCreateConnection({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListConnectionsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({ title: "Connection added!" });
        setAddOpen(false);
        reset();
      },
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<NewConnectionForm>({
    defaultValues: { name: "", notes: "", followUpDate: "" },
  });

  const onSubmit = (data: NewConnectionForm) => {
    createConnection.mutate({
      data: {
        name: data.name,
        notes: data.notes || null,
        followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString() : null,
      },
    });
  };

  const handleComplete = (id: number) => {
    completeFollowUp.mutate({ id });
  };

  const followThroughRate = progress?.followThroughRate ?? 0;
  const reminderItems = summary?.reminderFollowUps ?? [];
  const todayItems = summary?.todayFollowUps ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your networking activity at a glance
          </p>
        </div>
        <Button
          data-testid="button-add-connection"
          onClick={() => setAddOpen(true)}
          className="gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add person
        </Button>
      </div>

      {/* Reminder banner for long-term follow-ups due soon */}
      {!isLoading && reminderItems.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
          <Bell className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Reminder: {reminderItems.length} long-term follow-up
              {reminderItems.length > 1 ? "s are" : " is"} coming up in the next 5 days
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              These were scheduled 30+ days out — time to start thinking about them.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Due today"
          value={summary?.todayCount}
          icon={Clock}
          isLoading={isLoading}
        />
        <StatCard
          label="Overdue"
          value={summary?.overdueCount}
          icon={AlertCircle}
          variant="warning"
          isLoading={isLoading}
        />
        <StatCard
          label="Upcoming"
          value={summary?.upcomingCount}
          icon={CalendarIcon}
          isLoading={isLoading}
        />
        <StatCard
          label="Follow-through"
          value={followThroughRate}
          icon={TrendingUp}
          variant="primary"
          isLoading={progressLoading}
        />
      </div>

      {/* Follow-through ring */}
      {!progressLoading && (
        <div className="bg-card rounded-2xl border border-card-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Follow-through rate</h2>
            <Link href="/progress">
              <a className="text-sm text-primary hover:underline">See details</a>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - followThroughRate / 100)}`}
                  className="transition-all duration-700"
                />
              </svg>
              <span
                data-testid="text-follow-through-rate"
                className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground"
              >
                {followThroughRate}%
              </span>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{progress?.onTimeCount ?? 0}</span>{" "}
                on-time out of{" "}
                <span className="font-medium text-foreground">
                  {progress?.totalScheduled ?? 0}
                </span>{" "}
                scheduled
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {progress?.totalCompleted ?? 0}
                </span>{" "}
                total completed
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overdue */}
      {!isLoading && summary && summary.overdueCount > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              Overdue
            </h2>
            <Link href="/follow-ups">
              <a className="text-sm text-primary hover:underline">View all</a>
            </Link>
          </div>
          <div className="space-y-2">
            {summary.overdueFollowUps.map((f) => (
              <FollowUpCard
                key={f.id}
                followUp={f}
                onComplete={handleComplete}
                isCompleting={completeFollowUp.isPending}
                overdue
              />
            ))}
          </div>
        </div>
      )}

      {/* Due today */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Due today
          </h2>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : todayItems.length === 0 ? (
          <div className="text-center py-8 bg-card rounded-2xl border border-card-border">
            <p className="text-muted-foreground text-sm">Nothing due today.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayItems.map((f: FollowUp) => (
              <FollowUpCard
                key={f.id}
                followUp={f}
                onComplete={handleComplete}
                isCompleting={completeFollowUp.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming this week */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Upcoming this week</h2>
          <Link href="/follow-ups">
            <a className="text-sm text-primary hover:underline">View all</a>
          </Link>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : (summary?.weekFollowUps ?? []).filter((f) => !isToday(new Date(f.scheduledDate)))
            .length === 0 ? (
          <div className="text-center py-10 bg-card rounded-2xl border border-card-border">
            <p className="text-muted-foreground text-sm">No upcoming follow-ups this week.</p>
            <button
              data-testid="button-add-from-empty"
              onClick={() => setAddOpen(true)}
              className="text-primary text-sm hover:underline mt-1 inline-block"
            >
              Add a connection to get started
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {(summary?.weekFollowUps ?? [])
              .filter((f) => !isToday(new Date(f.scheduledDate)))
              .map((f) => (
                <FollowUpCard
                  key={f.id}
                  followUp={f}
                  onComplete={handleComplete}
                  isCompleting={completeFollowUp.isPending}
                />
              ))}
          </div>
        )}
      </div>

      {/* Add connection dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add connection</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                data-testid="input-connection-name"
                placeholder="e.g. Alex Chen"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="text-destructive text-xs">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                data-testid="input-connection-notes"
                placeholder="Where you met, what you discussed..."
                rows={3}
                {...register("notes")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="followUpDate">Schedule a follow-up</Label>
              <Input
                id="followUpDate"
                data-testid="input-connection-followup-date"
                type="date"
                {...register("followUpDate")}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddOpen(false);
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button
                data-testid="button-submit-connection"
                type="submit"
                disabled={createConnection.isPending}
              >
                {createConnection.isPending ? "Adding..." : "Add connection"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
