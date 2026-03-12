"use client";

import { useMemo, useState, useCallback } from "react";
import { Loader2Icon, CheckIcon, XIcon, LayersIcon, InboxIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Submission, SubmissionStatus, Task, User } from "@/lib/types";
import { useSubmissions } from "@/features/submissions/hooks";
import { useReviewSubmission } from "@/features/submissions/hooks";
import { useAllTasks } from "@/features/tasks/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;
const USERS_STORAGE_KEY = "task-hub:users";

type StatusFilter = "all" | SubmissionStatus;

const STATUS_FILTERS: StatusFilter[] = ["all", "pending", "approved", "rejected"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadUserMap(): Map<string, string> {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return new Map();
    const users: User[] = JSON.parse(raw);
    const map = new Map<string, string>();
    for (const u of users) {
      map.set(u.id, u.name);
    }
    return map;
  } catch {
    return new Map();
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSubmissionPreview(data: Submission["data"]): string {
  switch (data.task_type) {
    case "social_media_posting":
    case "social_media_liking":
      return data.post_url;
    case "email_sending":
      return data.email_content.length > 80
        ? data.email_content.slice(0, 80) + "\u2026"
        : data.email_content;
  }
}

function taskTypeLabel(type: Task["task_type"]): string {
  switch (type) {
    case "social_media_posting":
      return "Posting";
    case "social_media_liking":
      return "Liking";
    case "email_sending":
      return "Email";
  }
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <Badge
      variant={
        status === "approved"
          ? "default"
          : status === "rejected"
            ? "destructive"
            : "secondary"
      }
      className={cn(
        status === "approved" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
        status === "pending" && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      )}
    >
      {status}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Task type badge
// ---------------------------------------------------------------------------

function TaskTypeBadge({ type }: { type: Task["task_type"] }) {
  return (
    <Badge variant="outline" className="font-normal">
      {taskTypeLabel(type)}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Action buttons
// ---------------------------------------------------------------------------

function ReviewActions({
  submissionId,
  reviewMutation,
}: {
  submissionId: string;
  reviewMutation: ReturnType<typeof useReviewSubmission>;
}) {
  const isPending =
    reviewMutation.isPending &&
    reviewMutation.variables?.id === submissionId;

  const pendingStatus = isPending ? reviewMutation.variables?.status : null;

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="xs"
        variant="ghost"
        className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950"
        disabled={isPending}
        onClick={() =>
          reviewMutation.mutate({ id: submissionId, status: "approved" })
        }
      >
        {pendingStatus === "approved" ? (
          <Loader2Icon className="size-3 animate-spin" />
        ) : (
          <CheckIcon className="size-3" />
        )}
        Approve
      </Button>
      <Button
        size="xs"
        variant="ghost"
        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
        disabled={isPending}
        onClick={() =>
          reviewMutation.mutate({ id: submissionId, status: "rejected" })
        }
      >
        {pendingStatus === "rejected" ? (
          <Loader2Icon className="size-3 animate-spin" />
        ) : (
          <XIcon className="size-3" />
        )}
        Reject
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton rows
// ---------------------------------------------------------------------------

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-14" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-40" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Flat table
// ---------------------------------------------------------------------------

function FlatTable({
  submissions,
  taskMap,
  userMap,
  reviewMutation,
  page,
}: {
  submissions: Submission[];
  taskMap: Map<string, Task>;
  userMap: Map<string, string>;
  reviewMutation: ReturnType<typeof useReviewSubmission>;
  page: number;
}) {
  const start = page * PAGE_SIZE;
  const pageItems = submissions.slice(start, start + PAGE_SIZE);

  if (pageItems.length === 0) {
    return (
      <div className="animate-in-fade flex flex-col items-center gap-3 py-12 text-center">
        <div className="rounded-full bg-muted p-3">
          <InboxIcon className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No submissions match filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Reviewed</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.map((s) => {
            const task = taskMap.get(s.task_id);
            return (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  {userMap.get(s.user_id) ?? s.user_id.slice(0, 8)}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {task?.title ?? "Unknown task"}
                </TableCell>
                <TableCell>
                  {task ? <TaskTypeBadge type={task.task_type} /> : "\u2014"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={s.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(s.submitted_at)}
                </TableCell>
                <TableCell className="max-w-[260px] truncate text-muted-foreground">
                  {getSubmissionPreview(s.data)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.reviewed_at ? formatDate(s.reviewed_at) : "\u2014"}
                </TableCell>
                <TableCell className="text-right">
                  {s.status === "pending" ? (
                    <ReviewActions
                      submissionId={s.id}
                      reviewMutation={reviewMutation}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">{"\u2014"}</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grouped view
// ---------------------------------------------------------------------------

interface TaskGroup {
  task: Task | undefined;
  taskId: string;
  submissions: Submission[];
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
}

function GroupedView({
  submissions,
  taskMap,
  userMap,
  reviewMutation,
}: {
  submissions: Submission[];
  taskMap: Map<string, Task>;
  userMap: Map<string, string>;
  reviewMutation: ReturnType<typeof useReviewSubmission>;
}) {
  const groups = useMemo(() => {
    const groupMap = new Map<string, Submission[]>();
    for (const s of submissions) {
      const existing = groupMap.get(s.task_id);
      if (existing) {
        existing.push(s);
      } else {
        groupMap.set(s.task_id, [s]);
      }
    }
    const result: TaskGroup[] = [];
    for (const [taskId, subs] of groupMap) {
      result.push({
        task: taskMap.get(taskId),
        taskId,
        submissions: subs,
        approvedCount: subs.filter((s) => s.status === "approved").length,
        pendingCount: subs.filter((s) => s.status === "pending").length,
        rejectedCount: subs.filter((s) => s.status === "rejected").length,
      });
    }
    return result;
  }, [submissions, taskMap]);

  if (groups.length === 0) {
    return (
      <div className="animate-in-fade flex flex-col items-center gap-3 py-12 text-center">
        <div className="rounded-full bg-muted p-3">
          <InboxIcon className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No submissions match filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.taskId} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2">
            <span className="text-sm font-medium">
              {g.task?.title ?? "Unknown task"}
            </span>
            {g.task && <TaskTypeBadge type={g.task.task_type} />}
            <span className="ml-auto text-xs text-muted-foreground">
              {g.approvedCount}/{g.submissions.length} approved
              {g.pendingCount > 0 && (
                <span className="ml-1 text-amber-600 dark:text-amber-400">
                  &middot; {g.pendingCount} pending
                </span>
              )}
              {g.rejectedCount > 0 && (
                <span className="ml-1 text-red-600 dark:text-red-400">
                  &middot; {g.rejectedCount} rejected
                </span>
              )}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Reviewed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {g.submissions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {userMap.get(s.user_id) ?? s.user_id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(s.submitted_at)}
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate text-muted-foreground">
                    {getSubmissionPreview(s.data)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.reviewed_at ? formatDate(s.reviewed_at) : "\u2014"}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.status === "pending" ? (
                      <ReviewActions
                        submissionId={s.id}
                        reviewMutation={reviewMutation}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">{"\u2014"}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t px-2 py-3">
      <span className="text-xs text-muted-foreground">
        Page {page + 1} of {totalPages}
      </span>
      <div className="flex items-center justify-end gap-1">
        <Button
          size="xs"
          variant="outline"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          size="xs"
          variant="outline"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminSubmissionsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [groupByTask, setGroupByTask] = useState(false);
  const [page, setPage] = useState(0);

  const {
    data: submissions,
    isLoading: submissionsLoading,
    isError: submissionsError,
    refetch: refetchSubmissions,
  } = useSubmissions();

  const {
    data: tasks,
    isLoading: tasksLoading,
    isError: tasksError,
    refetch: refetchTasks,
  } = useAllTasks();

  const reviewMutation = useReviewSubmission();

  const userMap = useMemo(() => loadUserMap(), []);

  const taskMap = useMemo(() => {
    const map = new Map<string, Task>();
    if (tasks) {
      for (const t of tasks) {
        map.set(t.id, t);
      }
    }
    return map;
  }, [tasks]);

  // Counts per status (unfiltered)
  const statusCounts = useMemo(() => {
    const counts = { all: 0, pending: 0, approved: 0, rejected: 0 };
    if (!submissions) return counts;
    counts.all = submissions.length;
    for (const s of submissions) {
      counts[s.status]++;
    }
    return counts;
  }, [submissions]);

  // Filter + sort
  const filtered = useMemo(() => {
    if (!submissions) return [];
    let result =
      statusFilter === "all"
        ? [...submissions]
        : submissions.filter((s) => s.status === statusFilter);
    result.sort(
      (a, b) =>
        new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
    );
    return result;
  }, [submissions, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Reset page when filter changes
  const handleFilterChange = useCallback(
    (value: unknown) => {
      setStatusFilter(value as StatusFilter);
      setPage(0);
    },
    [],
  );

  const isLoading = submissionsLoading || tasksLoading;
  const isError = submissionsError || tasksError;

  // Error state
  if (isError && !isLoading) {
    return (
      <div className="px-6 pt-8 pb-6">
        <h1>Submissions Review</h1>
        <div className="mt-6 flex flex-col items-center gap-3 py-12 text-sm text-muted-foreground">
          <p>Failed to load submissions.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void refetchSubmissions();
              void refetchTasks();
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pt-8 pb-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Submissions Review</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Review, approve, or reject user submissions.
          </p>
        </div>
        <Button
          size="sm"
          variant={groupByTask ? "secondary" : "outline"}
          onClick={() => {
            setGroupByTask((prev) => !prev);
            setPage(0);
          }}
        >
          <LayersIcon className="size-3.5" />
          Group by task
        </Button>
      </div>

      {/* Status filter tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={handleFilterChange}
        className="mt-4"
      >
        <TabsList variant="line">
          {STATUS_FILTERS.map((f) => (
            <TabsTrigger key={f} value={f}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1 tabular-nums text-muted-foreground">
                {isLoading ? "\u2014" : statusCounts[f]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Content */}
      <div className="mt-4">
        {isLoading ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card"><Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Reviewed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SkeletonRows count={8} />
            </TableBody>
          </Table></div>
        ) : filtered.length === 0 ? (
          <div className="animate-in-fade flex flex-col items-center gap-3 py-12 text-center">
            <div className="rounded-full bg-muted p-3">
              <InboxIcon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {submissions && submissions.length === 0
                  ? "No submissions yet"
                  : "No submissions match filters"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {submissions && submissions.length === 0
                  ? "Submissions will appear here once workers complete tasks"
                  : "Try adjusting the status filter above"}
              </p>
            </div>
          </div>
        ) : groupByTask ? (
          <GroupedView
            submissions={filtered}
            taskMap={taskMap}
            userMap={userMap}
            reviewMutation={reviewMutation}
          />
        ) : (
          <>
            <FlatTable
              submissions={filtered}
              taskMap={taskMap}
              userMap={userMap}
              reviewMutation={reviewMutation}
              page={page}
            />
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
