"use client";

import { useMemo, useState, useCallback } from "react";
import { useQueryState } from "nuqs";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
  PlusIcon,
  ListFilterIcon,
  Loader2Icon,
  CheckCircle2Icon,
  ClockIcon,
  XCircleIcon,
  BarChart3Icon,
  UploadIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Task, TaskType, Submission } from "@/lib/types";
import { getActivePhase, getPhaseProgress, getDripProgress } from "@/lib/derived";
import {
  useAllTasks,
  useDeleteTask,
  useBulkUpdateTasks,
} from "@/features/tasks/hooks";
import { useSubmissions } from "@/features/submissions/hooks";
import { TaskComposer } from "@/features/tasks/task-composer";
import { BulkUpload } from "@/features/tasks/bulk-upload";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  social_media_posting: "Social Media Posting",
  email_sending: "Email Sending",
  social_media_liking: "Social Media Liking",
};

const TASK_TYPE_COLORS: Record<TaskType, { bg: string; text: string }> = {
  social_media_posting: { bg: "#E0E0E2", text: "#3a3a3c" },
  email_sending: { bg: "#B5BAD0", text: "#2e3348" },
  social_media_liking: { bg: "#7389AE", text: "#ffffff" },
};

const ALL_TASK_TYPES: TaskType[] = [
  "social_media_posting",
  "email_sending",
  "social_media_liking",
];

// ---------------------------------------------------------------------------
// Submission counts helper
// ---------------------------------------------------------------------------

interface SubmissionCounts {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

const EMPTY_COUNTS: SubmissionCounts = {
  total: 0,
  approved: 0,
  pending: 0,
  rejected: 0,
};

function buildSubmissionCountsMap(
  submissions: Submission[] | undefined,
): Map<string, SubmissionCounts> {
  const map = new Map<string, SubmissionCounts>();
  if (!submissions) return map;

  for (const sub of submissions) {
    let counts = map.get(sub.task_id);
    if (!counts) {
      counts = { total: 0, approved: 0, pending: 0, rejected: 0 };
      map.set(sub.task_id, counts);
    }
    counts.total += 1;
    counts[sub.status] += 1;
  }

  return map;
}

// ---------------------------------------------------------------------------
// Sort header button
// ---------------------------------------------------------------------------

function SortableHeader({
  column,
  children,
}: {
  column: { getIsSorted: () => false | "asc" | "desc"; toggleSorting: (desc?: boolean) => void };
  children: React.ReactNode;
}) {
  const sorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      size="xs"
      className="-ml-2 h-7"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {children}
      {sorted === "asc" ? (
        <ArrowUpIcon className="ml-1 size-3" />
      ) : sorted === "desc" ? (
        <ArrowDownIcon className="ml-1 size-3" />
      ) : (
        <ArrowUpDownIcon className="ml-1 size-3 text-muted-foreground/50" />
      )}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation dialog
// ---------------------------------------------------------------------------

function DeleteConfirmDialog({
  task,
  open,
  onOpenChange,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const deleteTask = useDeleteTask();

  const handleConfirm = useCallback(() => {
    if (!task) return;
    deleteTask.mutate(task.id, {
      onSuccess: () => onOpenChange(false),
    });
  }, [task, deleteTask, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Task</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">
              {task?.title ?? "this task"}
            </span>
            ? This action can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteTask.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteTask.isPending}
          >
            {deleteTask.isPending && (
              <Loader2Icon className="size-4 animate-spin" />
            )}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Bulk edit dialog
// ---------------------------------------------------------------------------

function BulkEditDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onSuccess: () => void;
}) {
  const bulkUpdate = useBulkUpdateTasks();
  const [amount, setAmount] = useState("");
  const [campaignId, setCampaignId] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const values: { amount: number; campaign_id: string } = {
        amount: amount !== "" ? Number(amount) : 0,
        campaign_id: campaignId,
      };

      // Only proceed if at least one field has a value
      if (amount === "" && campaignId === "") return;

      bulkUpdate.mutate(
        { ids: selectedIds, values },
        {
          onSuccess: () => {
            onOpenChange(false);
            setAmount("");
            setCampaignId("");
            onSuccess();
          },
        },
      );
    },
    [amount, campaignId, selectedIds, bulkUpdate, onOpenChange, onSuccess],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setAmount("");
          setCampaignId("");
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Bulk Edit Tasks</DialogTitle>
          <DialogDescription>
            Update {selectedIds.length} selected task
            {selectedIds.length === 1 ? "" : "s"}. Leave a field blank to skip
            it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bulk-amount">Amount</Label>
            <Input
              id="bulk-amount"
              type="number"
              min={0}
              placeholder="Leave blank to skip"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bulk-campaign">Campaign ID</Label>
            <Input
              id="bulk-campaign"
              placeholder="Leave blank to skip"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={bulkUpdate.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                bulkUpdate.isPending || (amount === "" && campaignId === "")
              }
            >
              {bulkUpdate.isPending && (
                <Loader2Icon className="size-4 animate-spin" />
              )}
              Update
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style={{ width: 32 }}><Skeleton className="h-4 w-4" /></TableHead>
            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead><Skeleton className="h-4 w-10" /></TableHead>
            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead><Skeleton className="h-4 w-14" /></TableHead>
            <TableHead><Skeleton className="h-4 w-12" /></TableHead>
            <TableHead><Skeleton className="h-4 w-14" /></TableHead>
            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead style={{ width: 40 }} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-4" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-8" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-14" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-14" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              <TableCell><Skeleton className="h-4 w-6" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="rounded-full bg-muted p-3">
        <ListFilterIcon className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No tasks yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first task to get started.
        </p>
      </div>
      <Button onClick={onCreateClick}>
        <PlusIcon className="size-4" />
        Create Task
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-sm text-destructive">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task detail panel
// ---------------------------------------------------------------------------

function TaskDetailPanel({
  task,
  counts,
  taskSubmissions,
  onEdit,
  onDelete,
}: {
  task: Task;
  counts: SubmissionCounts;
  taskSubmissions: Submission[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const slotsLeft = Math.max(0, task.amount - counts.approved);
  const isCompleted = slotsLeft === 0;
  const progress = task.amount > 0 ? Math.min(100, (counts.approved / task.amount) * 100) : 0;

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b">
        <SheetTitle className="pr-8 text-lg">{task.title}</SheetTitle>
        <SheetDescription className="mt-1.5 flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-transparent"
            style={{
              backgroundColor: TASK_TYPE_COLORS[task.task_type].bg,
              color: TASK_TYPE_COLORS[task.task_type].text,
            }}
          >
            {TASK_TYPE_LABELS[task.task_type]}
          </Badge>
          <Badge variant={isCompleted ? "secondary" : "outline"}>
            {isCompleted ? "Completed" : "Active"}
          </Badge>
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-8 overflow-y-auto p-4">
        {/* Submissions overview */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Submissions
          </h4>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {counts.approved} of {task.amount} slots filled
              </span>
              <span className="font-medium tabular-nums">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isCompleted ? "bg-emerald-500" : "bg-primary",
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2.5">
              <BarChart3Icon className="size-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-sm font-medium tabular-nums">{counts.total}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2.5">
              <CheckCircle2Icon className="size-3.5 text-emerald-600" />
              <div>
                <p className="text-xs text-muted-foreground">Approved</p>
                <p className="text-sm font-medium tabular-nums text-emerald-600">{counts.approved}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2.5">
              <ClockIcon className="size-3.5 text-amber-600" />
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-sm font-medium tabular-nums text-amber-600">{counts.pending}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2.5">
              <XCircleIcon className="size-3.5 text-red-600" />
              <div>
                <p className="text-xs text-muted-foreground">Rejected</p>
                <p className="text-sm font-medium tabular-nums text-red-600">{counts.rejected}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-2.5">
            <span className="text-xs text-muted-foreground">Slots remaining</span>
            <span className="text-sm font-medium tabular-nums">{slotsLeft}</span>
          </div>
        </div>

        {/* Phases */}
        {task.phases.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Phases
            </h4>
            <div className="space-y-2">
              {task.phases
                .sort((a, b) => a.phase_index - b.phase_index)
                .map((phase) => {
                  const phaseProgress = getPhaseProgress(phase, taskSubmissions);
                  const isActive = getActivePhase(task, taskSubmissions)?.id === phase.id;
                  const pct = phase.slots > 0 ? Math.min(100, (phaseProgress.approved / phase.slots) * 100) : 0;

                  return (
                    <div
                      key={phase.id}
                      className={cn(
                        "rounded-lg border p-2.5",
                        isActive ? "border-primary/30 bg-primary/5" : "bg-muted/30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{phase.phase_name}</span>
                          {isActive && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                              Active
                            </Badge>
                          )}
                          {phaseProgress.isComplete && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-300 text-emerald-600">
                              Complete
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {phaseProgress.approved}/{phase.slots}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            phaseProgress.isComplete ? "bg-emerald-500" : isActive ? "bg-primary" : "bg-muted-foreground/30"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>${phase.reward.toFixed(2)} reward</span>
                        <span>{phase.slots} slots</span>
                        {phaseProgress.pending > 0 && (
                          <span className="text-amber-600">{phaseProgress.pending} pending</span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Drip Feed */}
        {task.drip_feed.drip_enabled && (() => {
          const drip = getDripProgress(task);
          const pct = drip.totalSlots > 0 ? Math.min(100, (drip.releasedSlots / drip.totalSlots) * 100) : 0;
          return (
            <div className="space-y-3">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Drip Feed
              </h4>
              <div className="rounded-lg border bg-muted/30 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      drip.state === "active" && "border-emerald-300 bg-emerald-50 text-emerald-700",
                      drip.state === "waiting" && "border-amber-300 bg-amber-50 text-amber-700",
                      drip.state === "completed" && "border-muted text-muted-foreground",
                    )}
                  >
                    {drip.state}
                  </Badge>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {drip.releasedSlots} / {drip.totalSlots} released
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>{drip.dripAmount} slots every {drip.dripIntervalMinutes}min</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Task details */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Details
          </h4>

          <div className="space-y-2 text-sm">
            {task.description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Description</p>
                <p className="mt-0.5 leading-relaxed">{task.description}</p>
              </div>
            )}
            {task.details && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Details</p>
                <p className="mt-0.5 leading-relaxed">{task.details}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-medium tabular-nums">{task.amount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reward</p>
              <p className="font-medium tabular-nums">${task.reward.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Campaign ID</p>
              <p className="font-medium break-all text-xs">{task.campaign_id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Multiple submissions</p>
              <p className="font-medium">{task.allow_multiple_submissions ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="font-medium">{new Date(task.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Updated</p>
              <p className="font-medium">{new Date(task.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions footer */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={onEdit}>
            <PencilIcon className="size-3.5" />
            Edit Task
          </Button>
          <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={onDelete}>
            <Trash2Icon className="size-3.5" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function AdminTasksPage() {
  // Data fetching
  const tasksQuery = useAllTasks();
  const submissionsQuery = useSubmissions();

  const tasks = tasksQuery.data ?? [];
  const submissionCountsMap = useMemo(
    () => buildSubmissionCountsMap(submissionsQuery.data),
    [submissionsQuery.data],
  );

  // UI state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useQueryState("q", { defaultValue: "", clearOnDefault: true });

  // Composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  // Bulk upload state
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Bulk edit dialog state
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  // Detail panel state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Task type filter
  const [typeFilter, setTypeFilter] = useQueryState("type", { defaultValue: "all", clearOnDefault: true });

  // Handlers
  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setComposerOpen(true);
  }, []);

  const handleDelete = useCallback((task: Task) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditingTask(undefined);
    setComposerOpen(true);
  }, []);

  const handleComposerClose = useCallback((open: boolean) => {
    setComposerOpen(open);
    if (!open) setEditingTask(undefined);
  }, []);

  // Column definitions
  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={
              table.getIsSomePageRowsSelected() &&
              !table.getIsAllPageRowsSelected()
            }
            onCheckedChange={(checked) =>
              table.toggleAllPageRowsSelected(!!checked)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(checked) => row.toggleSelected(!!checked)}
              aria-label="Select row"
            />
          </div>
        ),
        enableSorting: false,
        enableGlobalFilter: false,
        size: 32,
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <SortableHeader column={column}>Title</SortableHeader>
        ),
        cell: ({ row }) => {
          return (
            <span
              className="max-w-[200px] truncate font-medium"
              title={row.original.title}
            >
              {row.original.title}
            </span>
          );
        },
        enableGlobalFilter: true,
      },
      {
        accessorKey: "task_type",
        header: "Type",
        cell: ({ row }) => {
          const type = row.original.task_type;
          return (
            <Badge
              variant="outline"
              className="border-transparent"
              style={{ backgroundColor: TASK_TYPE_COLORS[type].bg, color: TASK_TYPE_COLORS[type].text }}
            >
              {TASK_TYPE_LABELS[type]}
            </Badge>
          );
        },
        filterFn: "equals",
        enableGlobalFilter: false,
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <SortableHeader column={column}>Amount</SortableHeader>
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.amount}</span>
        ),
        enableGlobalFilter: false,
      },
      {
        accessorKey: "reward",
        header: ({ column }) => (
          <SortableHeader column={column}>Reward</SortableHeader>
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            ${row.original.reward.toFixed(2)}
          </span>
        ),
        enableGlobalFilter: false,
      },
      {
        accessorKey: "campaign_id",
        header: "Campaign",
        cell: ({ row }) => (
          <span
            className="max-w-[80px] truncate text-xs text-muted-foreground"
            title={row.original.campaign_id}
          >
            {row.original.campaign_id.slice(0, 8)}...
          </span>
        ),
        enableSorting: false,
        enableGlobalFilter: false,
      },
      {
        id: "phases",
        header: "Phases",
        cell: ({ row }) => {
          const task = row.original;
          if (task.phases.length === 0) {
            return <span className="text-xs text-muted-foreground">&mdash;</span>;
          }
          const subs = submissionsQuery.data ?? [];
          const taskSubs = subs.filter((s: Submission) => s.task_id === task.id);
          return (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                {task.phases
                  .sort((a, b) => a.phase_index - b.phase_index)
                  .map((phase) => {
                    const progress = getPhaseProgress(phase, taskSubs);
                    return (
                      <div
                        key={phase.id}
                        className={cn(
                          "size-2 rounded-full",
                          progress.isComplete
                            ? "bg-emerald-500"
                            : progress.total > 0
                              ? "bg-amber-500"
                              : "bg-muted-foreground/30"
                        )}
                        title={`${phase.phase_name}: ${progress.approved}/${phase.slots}`}
                      />
                    );
                  })}
              </div>
              <span className="text-xs text-muted-foreground">
                {task.phases.length}
              </span>
            </div>
          );
        },
        enableSorting: false,
        enableGlobalFilter: false,
      },
      {
        id: "drip",
        header: "Drip",
        cell: ({ row }) => {
          const task = row.original;
          if (!task.drip_feed.drip_enabled) {
            return <span className="text-xs text-muted-foreground">&mdash;</span>;
          }
          const drip = getDripProgress(task);
          return (
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  drip.state === "active" && "border-emerald-300 bg-emerald-50 text-emerald-700",
                  drip.state === "waiting" && "border-amber-300 bg-amber-50 text-amber-700",
                  drip.state === "completed" && "border-muted bg-muted text-muted-foreground",
                )}
              >
                {drip.state}
              </Badge>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {drip.releasedSlots}/{drip.totalSlots}
              </span>
            </div>
          );
        },
        enableSorting: false,
        enableGlobalFilter: false,
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <SortableHeader column={column}>Created</SortableHeader>
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.created_at).toLocaleDateString()}
          </span>
        ),
        enableGlobalFilter: false,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-xs">
                  <MoreHorizontalIcon className="size-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(row.original)}>
                <PencilIcon className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => handleDelete(row.original)}
              >
                <Trash2Icon className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        ),
        enableSorting: false,
        enableGlobalFilter: false,
        size: 40,
      },
    ],
    [handleEdit, handleDelete, submissionsQuery.data],
  );

  // Filtered data for task type filter (handled outside tanstack because
  // the Select uses "all" as a sentinel which doesn't play well with column
  // filter values).
  const filteredTasks = useMemo(() => {
    const active = tasks.filter((t) => t.deleted_at === null);
    if (typeFilter === "all") return active;
    return active.filter((t) => t.task_type === typeFilter);
  }, [tasks, typeFilter]);

  // Table instance
  const table = useReactTable({
    data: filteredTasks,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: (value: string) => void setGlobalFilter(value),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: true,
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  // Selected row IDs
  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  );

  const isLoading = tasksQuery.isLoading || submissionsQuery.isLoading;

  return (
    <div className="px-6 pt-8 pb-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Task Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your tasks, create new ones, and track progress.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setBulkUploadOpen(true)} className="shrink-0">
            <UploadIcon className="size-4" />
            <span className="hidden sm:inline">Bulk Import</span>
          </Button>
          <Button onClick={handleCreate} className="shrink-0">
            <PlusIcon className="size-4" />
            <span className="hidden sm:inline">Create Task</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>
      </div>

      {/* Toolbar — always visible */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {/* Search */}
          <Input
            placeholder="Search by title..."
            value={globalFilter}
            onChange={(e) => void setGlobalFilter(e.target.value)}
            className="min-w-0 flex-1 sm:max-w-xs"
          />

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={(v) => void setTypeFilter(v ?? "all")}>
            <SelectTrigger className="w-[140px] shrink-0 sm:w-[180px]">
              <span className="flex flex-1 text-left line-clamp-1">
                {typeFilter === "all" ? "All Types" : TASK_TYPE_LABELS[typeFilter as TaskType]}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ALL_TASK_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {TASK_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkEditOpen(true)}
            >
              Bulk Edit
            </Button>
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="mt-3">
          <TableSkeleton />
        </div>
      )}

      {/* Error state */}
      {!isLoading && tasksQuery.isError && (
        <ErrorState
          message={
            tasksQuery.error instanceof Error
              ? tasksQuery.error.message
              : "Failed to load tasks."
          }
          onRetry={() => void tasksQuery.refetch()}
        />
      )}

      {/* Empty state */}
      {!isLoading && !tasksQuery.isError && tasks.length === 0 && (
        <div className="animate-in-up">
          <EmptyState onCreateClick={handleCreate} />
        </div>
      )}

      {/* Table */}
      {!isLoading && !tasksQuery.isError && tasks.length > 0 && (<>
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className={cn("cursor-pointer", selectedTask?.id === row.original.id && "bg-muted/50")}
                  onClick={() => setSelectedTask(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()} ({filteredTasks.length} tasks)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
      </>)}

      {/* Dialogs */}
      <TaskComposer
        open={composerOpen}
        onOpenChange={handleComposerClose}
        task={editingTask}
      />

      <BulkUpload
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
      />

      <DeleteConfirmDialog
        task={taskToDelete}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />

      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        selectedIds={selectedIds}
        onSuccess={() => setRowSelection({})}
      />

      {/* Task detail sheet */}
      <Sheet
        open={selectedTask !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null);
        }}
      >
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          {selectedTask && (
            <TaskDetailPanel
              task={selectedTask}
              counts={submissionCountsMap.get(selectedTask.id) ?? EMPTY_COUNTS}
              taskSubmissions={(submissionsQuery.data ?? []).filter((s) => s.task_id === selectedTask.id)}
              onEdit={() => {
                handleEdit(selectedTask);
                setSelectedTask(null);
              }}
              onDelete={() => {
                handleDelete(selectedTask);
                setSelectedTask(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
