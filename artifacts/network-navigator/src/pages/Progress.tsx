import { format } from "date-fns";
import { Link } from "wouter";
import {
  useGetProgressStats,
  getGetProgressStatsQueryKey,
} from "@workspace/api-client-react";
import { CheckCircle, TrendingUp, Clock, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function StatBox({
  label,
  value,
  sub,
  icon: Icon,
  isLoading,
}: {
  label: string;
  value: string | number | undefined;
  sub?: string;
  icon: React.ElementType;
  isLoading: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl border border-card-border p-5 shadow-sm">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-16 mb-1" />
      ) : (
        <p
          data-testid={`stat-${label.toLowerCase().replace(/ /g, "-")}`}
          className="text-3xl font-bold text-foreground mb-1"
        >
          {value ?? 0}
        </p>
      )}
      <p className="text-sm text-muted-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ProgressPage() {
  const { data: progress, isLoading } = useGetProgressStats({
    query: { queryKey: getGetProgressStatsQueryKey() },
  });

  const rate = progress?.followThroughRate ?? 0;
  const circumference = 2 * Math.PI * 52;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Progress</h1>
        <p className="text-muted-foreground text-sm mt-1">Your follow-through history</p>
      </div>

      {/* Big ring */}
      <div className="bg-card rounded-2xl border border-card-border p-8 shadow-sm flex flex-col items-center text-center">
        <div className="relative w-36 h-36 mb-4">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={isLoading ? circumference : circumference * (1 - rate / 100)}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isLoading ? (
              <Skeleton className="h-9 w-14" />
            ) : (
              <>
                <span
                  data-testid="text-rate-big"
                  className="text-4xl font-bold text-foreground"
                >
                  {rate}%
                </span>
              </>
            )}
          </div>
        </div>
        <h2 className="font-semibold text-foreground mb-1">On-time follow-through rate</h2>
        <p className="text-sm text-muted-foreground">
          {!isLoading &&
            `${progress?.onTimeCount ?? 0} of ${progress?.totalScheduled ?? 0} completed on time`}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatBox
          label="Total scheduled"
          value={progress?.totalScheduled}
          icon={Clock}
          isLoading={isLoading}
        />
        <StatBox
          label="Completed"
          value={progress?.totalCompleted}
          icon={CheckCircle}
          isLoading={isLoading}
        />
        <StatBox
          label="On time"
          value={progress?.onTimeCount}
          sub="completed by original due date"
          icon={Award}
          isLoading={isLoading}
        />
      </div>

      {/* Completed history */}
      <div>
        <h2 className="font-semibold text-foreground mb-4">Completed follow-ups</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : !progress || progress.completedFollowUps.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-card-border">
            <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">No completed follow-ups yet</p>
            <p className="text-muted-foreground text-sm">
              Complete your first follow-up to see your progress here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {progress.completedFollowUps.map((fu) => {
              const onTime =
                fu.completedAt && new Date(fu.completedAt) <= new Date(fu.originalDueDate);
              return (
                <div
                  key={fu.id}
                  data-testid={`completed-followup-${fu.id}`}
                  className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-4 shadow-sm"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      onTime ? "bg-green-100 dark:bg-green-900/30" : "bg-orange-100 dark:bg-orange-900/30",
                    )}
                  >
                    <CheckCircle
                      className={cn(
                        "w-4 h-4",
                        onTime ? "text-green-600" : "text-orange-500",
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/connections/${fu.connectionId}`}>
                      <a className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block">
                        {fu.connection?.name}
                      </a>
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Completed {fu.completedAt ? format(new Date(fu.completedAt), "MMM d, yyyy") : ""}
                      {onTime ? " · On time" : " · Late"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
