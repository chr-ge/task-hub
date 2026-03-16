"use client";

import { useMemo, useState, useCallback } from "react";
import { useQueryState, parseAsStringLiteral, parseAsBoolean } from "nuqs";
import { Loader2Icon, CheckIcon, XIcon, LayersIcon, InboxIcon, ExternalLinkIcon, ImageIcon, MailIcon } from "lucide-react";

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

const TASK_TYPE_COLORS: Record<Task["task_type"], { bg: string; text: string }> = {
  social_media_posting: { bg: "#E0E0E2", text: "#3a3a3c" },
  email_sending: { bg: "#B5BAD0", text: "#2e3348" },
  social_media_liking: { bg: "#7389AE", text: "#ffffff" },
};

function TaskTypeBadge({ type }: { type: Task["task_type"] }) {
  const colors = TASK_TYPE_COLORS[type];
  return (
    <Badge
      variant="outline"
      className="border-transparent font-normal"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
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
  showActions = true,
  onSelect,
  selectedId,
}: {
  submissions: Submission[];
  taskMap: Map<string, Task>;
  userMap: Map<string, string>;
  reviewMutation: ReturnType<typeof useReviewSubmission>;
  page: number;
  showActions?: boolean;
  onSelect: (submission: Submission) => void;
  selectedId: string | null;
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
            <TableHead>Reviewed</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.map((s) => {
            const task = taskMap.get(s.task_id);
            return (
              <TableRow
                key={s.id}
                className={cn("cursor-pointer", selectedId === s.id && "bg-muted/50")}
                onClick={() => onSelect(s)}
              >
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
                <TableCell className="text-muted-foreground">
                  {s.reviewed_at ? formatDate(s.reviewed_at) : "\u2014"}
                </TableCell>
                {showActions && (
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
                )}
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
  showActions = true,
  onSelect,
  selectedId,
}: {
  submissions: Submission[];
  taskMap: Map<string, Task>;
  userMap: Map<string, string>;
  reviewMutation: ReturnType<typeof useReviewSubmission>;
  showActions?: boolean;
  onSelect: (submission: Submission) => void;
  selectedId: string | null;
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
                <TableHead>Reviewed</TableHead>
                {showActions && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {g.submissions.map((s) => (
                <TableRow
                  key={s.id}
                  className={cn("cursor-pointer", selectedId === s.id && "bg-muted/50")}
                  onClick={() => onSelect(s)}
                >
                  <TableCell className="font-medium">
                    {userMap.get(s.user_id) ?? s.user_id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(s.submitted_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.reviewed_at ? formatDate(s.reviewed_at) : "\u2014"}
                  </TableCell>
                  {showActions && (
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
                  )}
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
// Submission detail panel
// ---------------------------------------------------------------------------

function SubmissionDetailPanel({
  submission,
  task,
  userName,
  reviewMutation,
}: {
  submission: Submission;
  task: Task | undefined;
  userName: string;
  reviewMutation: ReturnType<typeof useReviewSubmission>;
}) {
  const data = submission.data;

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b">
        <SheetTitle>Submission Details</SheetTitle>
        <SheetDescription>
          Submitted by {userName} on {formatDate(submission.submitted_at)}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          <StatusBadge status={submission.status} />
          {submission.reviewed_at && (
            <span className="text-xs text-muted-foreground">
              Reviewed {formatDate(submission.reviewed_at)}
            </span>
          )}
        </div>

        {/* Task info */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Task
          </h4>
          <p className="text-sm font-medium">{task?.title ?? "Unknown task"}</p>
          {task && (
            <div className="flex items-center gap-2">
              <TaskTypeBadge type={task.task_type} />
              <span className="text-xs text-muted-foreground">
                ${task.reward.toFixed(2)} reward
              </span>
            </div>
          )}
          {task?.description && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {task.description}
            </p>
          )}
        </div>

        {/* Submission data */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Submission Data
          </h4>

          {(data.task_type === "social_media_posting" ||
            data.task_type === "social_media_liking") && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
                <ExternalLinkIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Post URL</p>
                  <p className="mt-0.5 break-all text-sm">{data.post_url}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
                <ImageIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Evidence Screenshot</p>
                  <p className="mt-0.5 break-all text-sm">{data.evidence_screenshot_url}</p>
                </div>
              </div>
            </div>
          )}

          {data.task_type === "email_sending" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
                <MailIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Email Content</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm">{data.email_content}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
                <ImageIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Evidence Screenshot</p>
                  <p className="mt-0.5 break-all text-sm">{data.evidence_screenshot_url}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Worker info */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Worker
          </h4>
          <p className="text-sm">{userName}</p>
          <p className="text-xs text-muted-foreground">ID: {submission.user_id}</p>
        </div>
      </div>

      {/* Actions footer */}
      {submission.status === "pending" && (
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={reviewMutation.isPending && reviewMutation.variables?.id === submission.id}
              onClick={() =>
                reviewMutation.mutate({ id: submission.id, status: "approved" })
              }
            >
              {reviewMutation.isPending &&
              reviewMutation.variables?.id === submission.id &&
              reviewMutation.variables?.status === "approved" ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <CheckIcon className="size-3.5" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={reviewMutation.isPending && reviewMutation.variables?.id === submission.id}
              onClick={() =>
                reviewMutation.mutate({ id: submission.id, status: "rejected" })
              }
            >
              {reviewMutation.isPending &&
              reviewMutation.variables?.id === submission.id &&
              reviewMutation.variables?.status === "rejected" ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <XIcon className="size-3.5" />
              )}
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminSubmissionsPage() {
  const [statusFilter, setStatusFilter] = useQueryState("status", parseAsStringLiteral(["all", "pending", "approved", "rejected"] as const).withDefault("all").withOptions({ clearOnDefault: true }));
  const [groupByTask, setGroupByTask] = useQueryState("grouped", parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true }));
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

  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

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
      void setStatusFilter(value as StatusFilter);
      setPage(0);
    },
    [setStatusFilter],
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
          variant="outline"
          className={groupByTask ? "bg-card text-primary border-border shadow-sm" : ""}
          onClick={() => {
            void setGroupByTask(!groupByTask);
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
            showActions={statusFilter === "all" || statusFilter === "pending"}
            onSelect={setSelectedSubmission}
            selectedId={selectedSubmission?.id ?? null}
          />
        ) : (
          <>
            <FlatTable
              submissions={filtered}
              taskMap={taskMap}
              userMap={userMap}
              reviewMutation={reviewMutation}
              page={page}
              showActions={statusFilter === "all" || statusFilter === "pending"}
              onSelect={setSelectedSubmission}
              selectedId={selectedSubmission?.id ?? null}
            />
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {/* Submission detail sheet */}
      <Sheet
        open={selectedSubmission !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSubmission(null);
        }}
      >
        <SheetContent side="right" className="sm:max-w-md w-full p-0">
          {selectedSubmission && (
            <SubmissionDetailPanel
              submission={selectedSubmission}
              task={taskMap.get(selectedSubmission.task_id)}
              userName={
                userMap.get(selectedSubmission.user_id) ??
                selectedSubmission.user_id.slice(0, 8)
              }
              reviewMutation={reviewMutation}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
