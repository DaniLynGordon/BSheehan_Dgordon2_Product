import { useState } from "react";
import { format } from "date-fns";
import { Link } from "wouter";
import {
  useListConnections,
  getListConnectionsQueryKey,
  useCreateConnection,
  useDeleteConnection,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, User, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";

type NewConnectionForm = {
  name: string;
  notes: string;
  followUpDate: string;
};

export default function ConnectionsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: connections, isLoading } = useListConnections({
    query: { queryKey: getListConnectionsQueryKey() },
  });

  const createConnection = useCreateConnection({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListConnectionsQueryKey() });
        toast({ title: "Connection added!" });
        setAddOpen(false);
        reset();
      },
    },
  });

  const deleteConnection = useDeleteConnection({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListConnectionsQueryKey() });
        toast({ title: "Connection deleted." });
        setDeleteId(null);
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

  const filtered = (connections ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Connections</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLoading ? "..." : `${connections?.length ?? 0} people`}
          </p>
        </div>
        <Button
          data-testid="button-add-connection"
          onClick={() => setAddOpen(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add person
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-testid="input-search-connections"
          type="search"
          placeholder="Search connections..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-card-border">
          <User className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">
            {search ? "No matches found" : "No connections yet"}
          </p>
          <p className="text-muted-foreground text-sm mb-4">
            {search ? "Try a different name." : "Add your first networking contact to get started."}
          </p>
          {!search && (
            <Button onClick={() => setAddOpen(true)} variant="outline" size="sm" className="gap-2">
              <Plus className="w-3.5 h-3.5" />
              Add person
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((conn) => (
            <div
              key={conn.id}
              data-testid={`card-connection-${conn.id}`}
              className="bg-card border border-card-border rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-semibold text-sm">
                  {conn.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <Link href={`/connections/${conn.id}`} className="flex-1 min-w-0">
                <a className="block">
                  <p className="font-medium text-foreground hover:text-primary transition-colors truncate">
                    {conn.name}
                  </p>
                  {conn.notes && (
                    <p className="text-sm text-muted-foreground truncate">{conn.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Added {format(new Date(conn.createdAt), "MMM d, yyyy")}
                  </p>
                </a>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  data-testid={`button-delete-connection-${conn.id}`}
                  onClick={() => setDeleteId(conn.id)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <Link href={`/connections/${conn.id}`}>
                  <a className="p-2 text-muted-foreground hover:text-primary transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add dialog */}
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
                onClick={() => { setAddOpen(false); reset(); }}
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

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete connection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will also delete all follow-ups for this connection. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              onClick={() => deleteId !== null && deleteConnection.mutate({ id: deleteId })}
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
