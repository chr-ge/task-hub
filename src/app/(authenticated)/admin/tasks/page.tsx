"use client";

import { useMemo, useState, useCallback } from "react";
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
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Task, TaskType, Submission } from "@/lib/types";
import {
  useAllTasks,
  useDeleteTask,
  useBulkUpdateTasks,
} from "@/features/tasks/hooks";
import { useSubmissions } from "@/features/submissions/hooks";
import { TaskComposer } from "@/features/tasks/task-composer";

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
  SelectValue,
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  social_media_posting: "Social Media Posting",
  email_sending: "Email Sending",
  social_media_liking: "Social Media Liking",
};

const TASK_TYPE_BADGE_VARIANT: Record<TaskType, "default" | "secondary" | "outline"> = {
  social_media_posting: "default",
  email_sending: "secondary",
  social_media_liking: "outline",
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
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
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
  const [globalFilter, setGlobalFilter] = useState("");

  // Composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Bulk edit dialog state
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  // Task type filter
  const [typeFilter, setTypeFilter] = useState<string>("all");

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
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(!!checked)}
            aria-label="Select row"
          />
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
          const isDeleted = row.original.deleted_at !== null;
          return (
            <span
              className={cn(
                "max-w-[200px] truncate font-medium",
                isDeleted && "text-muted-foreground line-through",
              )}
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
            <Badge variant={TASK_TYPE_BADGE_VARIANT[type]}>
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
        id: "submissions",
        header: "Submissions",
        cell: ({ row }) => {
          const counts =
            submissionCountsMap.get(row.original.id) ?? EMPTY_COUNTS;
          return (
            <div className="flex items-center gap-1.5 text-xs tabular-nums">
              <span title="Total">{counts.total}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-green-600" title="Approved">
                {counts.approved}
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="text-yellow-600" title="Pending">
                {counts.pending}
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="text-red-600" title="Rejected">
                {counts.rejected}
              </span>
            </div>
          );
        },
        enableSorting: false,
        enableGlobalFilter: false,
      },
      {
        id: "slots_left",
        header: "Slots Left",
        cell: ({ row }) => {
          const counts =
            submissionCountsMap.get(row.original.id) ?? EMPTY_COUNTS;
          const slotsLeft = Math.max(0, row.original.amount - counts.approved);
          return <span className="tabular-nums">{slotsLeft}</span>;
        },
        enableSorting: false,
        enableGlobalFilter: false,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const isDeleted = row.original.deleted_at !== null;
          if (isDeleted) {
            return <Badge variant="destructive">Deleted</Badge>;
          }
          const counts =
            submissionCountsMap.get(row.original.id) ?? EMPTY_COUNTS;
          const slotsLeft = Math.max(0, row.original.amount - counts.approved);
          if (slotsLeft === 0) {
            return <Badge variant="secondary">Completed</Badge>;
          }
          return <Badge variant="outline">Active</Badge>;
        },
        enableSorting: false,
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
        ),
        enableSorting: false,
        enableGlobalFilter: false,
        size: 40,
      },
    ],
    [submissionCountsMap, handleEdit, handleDelete],
  );

  // Filtered data for task type filter (handled outside tanstack because
  // the Select uses "all" as a sentinel which doesn't play well with column
  // filter values).
  const filteredTasks = useMemo(() => {
    if (typeFilter === "all") return tasks;
    return tasks.filter((t) => t.task_type === typeFilter);
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
    onGlobalFilterChange: setGlobalFilter,
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

  // Loading state
  if (tasksQuery.isLoading || submissionsQuery.isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Task Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your tasks, create new ones, and track progress.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <TableSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (tasksQuery.isError) {
    return (
      <div className="p-6">
        <div>
          <h1 className="text-lg font-semibold">Task Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your tasks, create new ones, and track progress.
          </p>
        </div>
        <ErrorState
          message={
            tasksQuery.error instanceof Error
              ? tasksQuery.error.message
              : "Failed to load tasks."
          }
          onRetry={() => void tasksQuery.refetch()}
        />
      </div>
    );
  }

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className="p-6">
        <div>
          <h1 className="text-lg font-semibold">Task Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your tasks, create new ones, and track progress.
          </p>
        </div>
        <EmptyState onCreateClick={handleCreate} />
        <TaskComposer
          open={composerOpen}
          onOpenChange={handleComposerClose}
          task={editingTask}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Task Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your tasks, create new ones, and track progress.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <PlusIcon className="size-4" />
          Create Task
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/* Search */}
        <Input
          placeholder="Search by title..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs"
        />

        {/* Type filter */}
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
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

        {/* Bulk actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
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

      {/* Submissions legend */}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span>Submissions:</span>
        <span>Total</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-green-600">Approved</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-yellow-600">Pending</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-red-600">Rejected</span>
      </div>

      {/* Table */}
      <div className="mt-3">
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
                  className={cn(
                    row.original.deleted_at !== null && "opacity-60",
                  )}
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

      {/* Dialogs */}
      <TaskComposer
        open={composerOpen}
        onOpenChange={handleComposerClose}
        task={editingTask}
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
    </div>
  );
}
