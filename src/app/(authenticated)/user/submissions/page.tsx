"use client";

import { useMemo, useState } from "react";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import {
  InboxIcon,
  ClockIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ArrowUpDownIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Task, Submission, SubmissionStatus } from "@/lib/types";
import { useAuth } from "@/features/auth/auth-context";
import { useTasks } from "@/features/tasks/hooks";
import { useSubmissionsByUser } from "@/features/submissions/hooks";
import { StatusBadge, TaskTypeBadge } from "@/components/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type StatusFilter = "all" | SubmissionStatus;
const STATUS_FILTERS: StatusFilter[] = ["all", "pending", "approved", "rejected"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Submission Card
// ---------------------------------------------------------------------------

function SubmissionCard({
  submission,
  task,
}: {
  submission: Submission;
  task: Task | undefined;
}) {
  const phase = submission.phase_id
    ? task?.phases.find((p) => p.id === submission.phase_id)
    : null;
  const reward = phase ? phase.reward : (task?.reward ?? 0);

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {task?.title ?? "Unknown task"}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {task && (
            <TaskTypeBadge type={task.task_type} />
          )}
          {phase && (
            <Badge variant="outline" className="text-[10px]">
              {phase.phase_name}
            </Badge>
          )}
          <StatusBadge status={submission.status} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <ClockIcon className="size-3" />
            Submitted {formatDate(submission.submitted_at)}
          </span>
          {submission.reviewed_at && (
            <span className="flex items-center gap-1">
              {submission.status === "approved" ? (
                <CheckCircle2Icon className="size-3 text-emerald-600" />
              ) : (
                <XCircleIcon className="size-3 text-red-600" />
              )}
              Reviewed {formatDate(submission.reviewed_at)}
            </span>
          )}
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          submission.status === "approved"
            ? "text-emerald-600"
            : submission.status === "pending"
              ? "text-amber-600"
              : "text-muted-foreground line-through"
        )}
      >
        ${reward.toFixed(2)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function SubmissionSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14" />
            </div>
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-5 w-14" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WorkerSubmissionsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: submissions, isLoading: subsLoading, isError, refetch } = useSubmissionsByUser(userId);

  const isLoading = tasksLoading || subsLoading;

  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsStringLiteral(["all", "pending", "approved", "rejected"] as const)
      .withDefault("all")
      .withOptions({ clearOnDefault: true })
  );
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const taskMap = useMemo(() => {
    const map = new Map<string, Task>();
    if (tasks) for (const t of tasks) map.set(t.id, t);
    return map;
  }, [tasks]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = { all: 0, pending: 0, approved: 0, rejected: 0 };
    if (!submissions) return counts;
    counts.all = submissions.length;
    for (const s of submissions) counts[s.status]++;
    return counts;
  }, [submissions]);

  // Filtered and sorted
  const filteredSubmissions = useMemo(() => {
    if (!submissions) return [];
    const result =
      statusFilter === "all" ? [...submissions] : submissions.filter((s) => s.status === statusFilter);
    result.sort((a, b) => {
      const diff = new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
      return sortOrder === "newest" ? diff : -diff;
    });
    return result;
  }, [submissions, statusFilter, sortOrder]);

  // Error state
  if (isError && !isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-destructive">Failed to load submissions.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 pt-5 pb-4">
        <h1>My Submissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View your past task submissions and their status.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => void setStatusFilter(v as StatusFilter)}
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

        <Button
          variant="outline"
          size="xs"
          onClick={() => setSortOrder((o) => (o === "newest" ? "oldest" : "newest"))}
        >
          <ArrowUpDownIcon className="size-3" />
          {sortOrder === "newest" ? "Newest" : "Oldest"}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <SubmissionSkeleton />
        ) : filteredSubmissions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
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
                  ? "Complete tasks to see your submissions here."
                  : "Try changing the status filter."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSubmissions.map((sub) => (
              <SubmissionCard
                key={sub.id}
                submission={sub}
                task={taskMap.get(sub.task_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
