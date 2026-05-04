import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { format, startOfToday } from "date-fns";
import {
  useGetConnection,
  getGetConnectionQueryKey,
  useUpdateConnection,
  useDeleteConnection,
  useListFollowUps,
  getListFollowUpsQueryKey,
  useCreateFollowUp,
  useCompleteFollowUp,
  useDeleteFollowUp,
  useUpdateFollowUp,
  getListConnectionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, CheckCircle, Trash2, Pencil, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function ConnectionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addFollowUpOpen, setAddFollowUpOpen] = useState(false);
  const [deleteFollowUpId, setDeleteFollowUpId] = useState<number | null>(null);
  const [rescheduleFollowUpId, setRescheduleFollowUpId] = useState<number | null>(null);

  const { data: connection, isLoading: connLoading } = useGetConnection(id, {
    query: { queryKey: getGetConnectionQueryKey(id), enabled: !!id },
  });

  const { data: followUps, isLoading: fuLoading } = useListFollowUps(
    { connectionId: id },
    { query: { queryKey: getListFollowUpsQueryKey({ connectionId: id }) } },
  );

  const updateConnection = useUpdateConnection({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetConnectionQueryKey(id) });
        toast({ title: "Connection updated." });
        setEditOpen(false);
      },
    },
  });

  const deleteConnectionMut = useDeleteConnection({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListConnectionsQueryKey() });
        toast({ title: "Connection deleted." });
        setLocation("/connections");
      },
    },
  });

  const createFollowUp = useCreateFollowUp({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListFollowUpsQueryKey({ connectionId: id }) });
        toast({ title: "Follow-up scheduled!" });
        setAddFollowUpOpen(false);
        followUpForm.reset();
      },
    },
  });

  const completeFollowUp = useCompleteFollowUp({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListFollowUpsQueryKey({ connectionId: id }) });
        toast({ title: "Follow-up marked complete!" });
      },
    },
  });

  const deleteFollowUpMut = useDeleteFollowUp({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListFollowUpsQueryKey({ connectionId: id }) });
        toast({ title: "Follow-up deleted." });
        setDeleteFollowUpId(null);
      },
    },
  });

  const updateFollowUpMut = useUpdateFollowUp({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListFollowUpsQueryKey({ connectionId: id }) });
        toast({ title: "Follow-up rescheduled!" });
        setRescheduleFollowUpId(null);
        rescheduleForm.reset();
      },
    },
  });

  const editForm = useForm<{ name: string; notes: string }>({
    defaultValues: { name: connection?.name ?? "", notes: connection?.notes ?? "" },
  });

  const followUpForm = useForm<{ scheduledDate: string }>({ defaultValues: { scheduledDate: "" } });
  const rescheduleForm = useForm<{ scheduledDate: string }>({ defaultValues: { scheduledDate: "" } });

  const openEdit = () => {
    editForm.reset({ name: connection?.name ?? "", notes: connection?.notes ?? "" });
    setEditOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Back */}
      <button
        data-testid="button-back"
        onClick={() => setLocation("/connections")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to connections
      </button>

      {/* Connection card */}
      {connLoading ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : !connection ? (
        <p className="text-muted-foreground">Connection not found.</p>
      ) : (
        <div className="bg-card rounded-2xl border border-card-border p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-xl">
                  {connection.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1
                  data-testid="text-connection-name"
                  className="text-xl font-bold text-foreground"
                >
                  {connection.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Added {format(new Date(connection.createdAt), "MMMM d, yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                data-testid="button-edit-connection"
                variant="outline"
                size="sm"
                onClick={openEdit}
                className="gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>
              <Button
                data-testid="button-delete-connection"
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          {connection.notes && (
            <div className="mt-4 pt-4 border-t border-card-border">
              <p className="text-sm text-muted-foreground leading-relaxed">{connection.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Follow-ups section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Follow-ups</h2>
          <Button
            data-testid="button-add-followup"
            size="sm"
            variant="outline"
            onClick={() => setAddFollowUpOpen(true)}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Schedule
          </Button>
        </div>

        {fuLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : !followUps || followUps.length === 0 ? (
          <div className="text-center py-10 bg-card rounded-2xl border border-card-border">
            <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No follow-ups yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {followUps.map((fu) => {
              const overdue = new Date(fu.scheduledDate) < startOfToday() && !fu.completedAt;
              return (
                <div
                  key={fu.id}
                  data-testid={`followup-item-${fu.id}`}
                  className={cn(
                    "flex items-center gap-4 py-3 px-4 rounded-xl border",
                    fu.completedAt
                      ? "border-card-border bg-muted/50"
                      : overdue
                      ? "border-orange-200 bg-orange-50/40 dark:bg-orange-950/20 dark:border-orange-800"
                      : "border-card-border bg-card",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-sm",
                          fu.completedAt
                            ? "text-muted-foreground line-through"
                            : overdue
                            ? "text-orange-600 font-medium"
                            : "text-foreground font-medium",
                        )}
                      >
                        {format(new Date(fu.scheduledDate), "MMMM d, yyyy")}
                      </span>
                      {fu.completedAt && (
                        <Badge variant="secondary" className="text-xs">Completed</Badge>
                      )}
                      {overdue && (
                        <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                          Overdue
                        </Badge>
                      )}
                    </div>
                    {fu.completedAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Done on {format(new Date(fu.completedAt), "MMM d")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!fu.completedAt && (
                      <>
                        <Button
                          data-testid={`button-complete-followup-${fu.id}`}
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
                          data-testid={`button-reschedule-followup-${fu.id}`}
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            rescheduleForm.reset({ scheduledDate: "" });
                            setRescheduleFollowUpId(fu.id);
                          }}
                          className="h-8 text-xs gap-1 text-muted-foreground"
                          title="Reschedule"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    <button
                      data-testid={`button-delete-followup-${fu.id}`}
                      onClick={() => setDeleteFollowUpId(fu.id)}
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
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit connection</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((data) =>
              updateConnection.mutate({ id, data: { name: data.name, notes: data.notes || null } }),
            )}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                data-testid="input-edit-name"
                {...editForm.register("name", { required: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={3} data-testid="input-edit-notes" {...editForm.register("notes")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateConnection.isPending} data-testid="button-save-edit">
                {updateConnection.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add follow-up dialog */}
      <Dialog open={addFollowUpOpen} onOpenChange={setAddFollowUpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule follow-up</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={followUpForm.handleSubmit((data) =>
              createFollowUp.mutate({
                data: { connectionId: id, scheduledDate: new Date(data.scheduledDate).toISOString() },
              }),
            )}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input
                type="date"
                data-testid="input-followup-date"
                {...followUpForm.register("scheduledDate", { required: true })}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setAddFollowUpOpen(false); followUpForm.reset(); }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createFollowUp.isPending}
                data-testid="button-save-followup"
              >
                {createFollowUp.isPending ? "Scheduling..." : "Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete connection confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {connection?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the connection and all follow-ups. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete-connection"
              onClick={() => deleteConnectionMut.mutate({ id })}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete follow-up confirm */}
      <AlertDialog open={deleteFollowUpId !== null} onOpenChange={() => setDeleteFollowUpId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete follow-up?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete-followup"
              onClick={() =>
                deleteFollowUpId !== null &&
                deleteFollowUpMut.mutate({ id: deleteFollowUpId })
              }
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule follow-up dialog */}
      <Dialog
        open={rescheduleFollowUpId !== null}
        onOpenChange={(open) => { if (!open) { setRescheduleFollowUpId(null); rescheduleForm.reset(); } }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reschedule follow-up</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={rescheduleForm.handleSubmit((data) => {
              if (rescheduleFollowUpId !== null) {
                updateFollowUpMut.mutate({
                  id: rescheduleFollowUpId,
                  data: { scheduledDate: new Date(data.scheduledDate).toISOString() },
                });
              }
            })}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>New date *</Label>
              <Input
                type="date"
                data-testid="input-reschedule-date"
                {...rescheduleForm.register("scheduledDate", { required: true })}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setRescheduleFollowUpId(null); rescheduleForm.reset(); }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateFollowUpMut.isPending}
                data-testid="button-save-reschedule"
              >
                {updateFollowUpMut.isPending ? "Saving..." : "Reschedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
