import { useState } from "react";
import { format, isToday, startOfToday } from "date-fns";
import { Link } from "wouter";
import {
  useListFollowUps,
  getListFollowUpsQueryKey,
  useCompleteFollowUp,
  useDeleteFollowUp,
  useUpdateFollowUp,
  getGetDashboardSummaryQueryKey,
  getGetProgressStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Trash2, Bell, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "pending" | "completed" | "overdue";

export default function FollowUpsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const queryParams =
    status === "all" ? {} : { status: status as "pending" | "completed" | "overdue" };

  const { data: followUps, isLoading } = useListFollowUps(queryParams, {
    query: { queryKey: getListFollowUpsQueryKey(queryParams) },
  });

  const completeFollowUp = useCompleteFollowUp({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListFollowUpsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        qc.invalidateQueries({ queryKey: getGetProgressStatsQueryKey() });
        toast({ title: "Follow-up completed!" });
      },
    },
  });

  const updateFollowUp = useUpdateFollowUp({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListFollowUpsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({ title: "Follow-up rescheduled." });
        setRescheduleId(null);
        rescheduleForm.reset();
      },
    },
  });

  const deleteFollowUp = useDeleteFollowUp({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListFollowUpsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({ title: "Follow-up deleted." });
        setDeleteId(null);
      },
    },
  });

  const rescheduleForm = useForm<{ scheduledDate: string }>({ defaultValues: { scheduledDate: "" } });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Follow-ups</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLoading ? "..." : `${followUps?.length ?? 0} ${status === "all" ? "total" : status}`}
          </p>
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-36" data-testid="select-followup-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : !followUps || followUps.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-card-border">
          <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">No follow-ups here</p>
          <p className="text-muted-foreground text-sm mb-4">
            {status === "all"
              ? "Add connections and schedule follow-ups to stay in touch."
              : `No ${status} follow-ups right now.`}
          </p>
          {status === "all" && (
            <Link href="/connections">
              <a className="text-primary text-sm hover:underline">Go to connections</a>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {followUps.map((fu) => {
            const overdue = new Date(fu.scheduledDate) < startOfToday() && !fu.completedAt;
            const today = isToday(new Date(fu.scheduledDate)) && !fu.completedAt;
            return (
              <div
                key={fu.id}
                data-testid={`followup-row-${fu.id}`}
                className={cn(
                  "bg-card border rounded-2xl p-4 shadow-sm flex items-center gap-4",
                  fu.completedAt
                    ? "border-card-border opacity-70"
                    : overdue
                    ? "border-orange-200 bg-orange-50/40 dark:bg-orange-950/20 dark:border-orange-800"
                    : "border-card-border",
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/connections/${fu.connectionId}`}>
                      <a className="font-medium text-foreground hover:text-primary transition-colors text-sm">
                        {fu.connection?.name}
                      </a>
                    </Link>
                    {fu.completedAt && (
                      <Badge variant="secondary" className="text-xs">Done</Badge>
                    )}
                    {overdue && (
                      <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                        Overdue
                      </Badge>
                    )}
                    {today && (
                      <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                        Today
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {format(new Date(fu.scheduledDate), "MMM d, yyyy")}
                      {fu.completedAt &&
                        ` • Done ${format(new Date(fu.completedAt), "MMM d")}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!fu.completedAt && (
                    <>
                      <Button
                        data-testid={`button-complete-${fu.id}`}
                        size="sm"
                        variant="outline"
                        onClick={() => completeFollowUp.mutate({ id: fu.id })}
                        disabled={completeFollowUp.isPending}
                        className="h-8 text-xs gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Done
                      </Button>
                      <Button
                        data-testid={`button-reschedule-${fu.id}`}
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRescheduleId(fu.id);
                          rescheduleForm.reset({ scheduledDate: "" });
                        }}
                        className="h-8 text-xs"
                      >
                        Reschedule
                      </Button>
                    </>
                  )}
                  <button
                    data-testid={`button-delete-${fu.id}`}
                    onClick={() => setDeleteId(fu.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reschedule dialog */}
      <Dialog open={rescheduleId !== null} onOpenChange={() => setRescheduleId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reschedule follow-up</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={rescheduleForm.handleSubmit((data) =>
              updateFollowUp.mutate({
                id: rescheduleId!,
                data: { scheduledDate: new Date(data.scheduledDate).toISOString() },
              }),
            )}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>New date</Label>
              <Input
                type="date"
                data-testid="input-reschedule-date"
                {...rescheduleForm.register("scheduledDate", { required: true })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRescheduleId(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateFollowUp.isPending}
                data-testid="button-save-reschedule"
              >
                {updateFollowUp.isPending ? "Saving..." : "Reschedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete follow-up?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              onClick={() => deleteId !== null && deleteFollowUp.mutate({ id: deleteId })}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
