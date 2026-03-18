"use client";

import { useMemo } from "react";
import {
  DollarSignIcon,
  ClockIcon,
  CheckCircle2Icon,
  TrendingUpIcon,
  InboxIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Task, Submission, SubmissionStatus } from "@/lib/types";
import { useAuth } from "@/features/auth/auth-context";
import { useTasks } from "@/features/tasks/hooks";
import { useSubmissionsByUser } from "@/features/submissions/hooks";
import { getWorkerEarnings } from "@/lib/derived";
import { TaskTypeBadge } from "@/components/shared";

const STATUS_BORDER_COLOR: Record<SubmissionStatus, string> = {
  pending: "border-l-amber-500",
  approved: "border-l-emerald-500",
  rejected: "border-l-red-400",
};

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function SummaryCards({
  earnings,
  submissionCount,
  isLoading,
}: {
  earnings: { total: number; pending: number; approved: number };
  submissionCount: number;
  isLoading: boolean;
}) {
  const cards = [
    {
      label: "Total Earnings",
      value: formatCurrency(earnings.approved),
      icon: <DollarSignIcon className="size-4" />,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Pending",
      value: formatCurrency(earnings.pending),
      icon: <ClockIcon className="size-4" />,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      label: "Approved Tasks",
      value: String(submissionCount),
      icon: <CheckCircle2Icon className="size-4" />,
      color: "text-primary",
      bgColor: "bg-primary/5",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} size="sm">
          <CardContent className="flex items-center gap-3">
            <div className={cn("flex size-9 items-center justify-center rounded-lg", card.bgColor, card.color)}>
              {card.icon}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-6 w-16" />
              ) : (
                <p className={cn("text-xl font-bold tabular-nums", card.color)}>
                  {card.value}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Earnings List
// ---------------------------------------------------------------------------

interface EarningsItem {
  submission: Submission;
  task: Task | undefined;
  reward: number;
  phaseName: string | null;
}

function EarningsList({
  items,
  isLoading,
}: {
  items: EarningsItem[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-5 w-14" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="animate-in-fade flex flex-col items-center gap-3 py-12 text-center">
        <div className="rounded-full bg-muted p-3">
          <InboxIcon className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">No earnings yet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Complete tasks to start earning rewards.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.submission.id}
          className={cn(
            "flex items-center gap-3 rounded-md border border-l-[3px] bg-card px-3.5 py-2.5",
            STATUS_BORDER_COLOR[item.submission.status]
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">
                {item.task?.title ?? "Unknown task"}
              </p>
              {item.task && <TaskTypeBadge type={item.task.task_type} />}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="capitalize">{item.submission.status}</span>
              {item.phaseName && <span>&middot; {item.phaseName}</span>}
              <span>&middot; {formatDate(item.submission.submitted_at)}</span>
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 text-sm font-semibold tabular-nums",
              item.submission.status === "approved"
                ? "text-emerald-600"
                : item.submission.status === "pending"
                  ? "text-amber-600"
                  : "text-muted-foreground line-through"
            )}
          >
            {formatCurrency(item.reward)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WorkerEarningsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const { data: tasks, isLoading: tasksLoading, isError: tasksError, refetch: refetchTasks } = useTasks();
  const { data: submissions, isLoading: submissionsLoading, isError: subsError, refetch: refetchSubs } = useSubmissionsByUser(userId);

  const isLoading = tasksLoading || submissionsLoading;

  const earnings = useMemo(() => {
    if (!submissions || !tasks) return { total: 0, pending: 0, approved: 0 };
    return getWorkerEarnings(userId, submissions, tasks);
  }, [userId, submissions, tasks]);

  const approvedCount = useMemo(
    () => (submissions ?? []).filter((s) => s.status === "approved").length,
    [submissions]
  );

  const earningsItems = useMemo<EarningsItem[]>(() => {
    if (!submissions || !tasks) return [];
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    return [...submissions]
      .filter((s) => s.status !== "rejected")
      .sort(
        (a, b) =>
          new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      )
      .map((sub) => {
        const task = taskMap.get(sub.task_id);
        const phase = sub.phase_id
          ? task?.phases.find((p) => p.id === sub.phase_id)
          : null;
        const reward = phase ? phase.reward : (task?.reward ?? 0);
        return {
          submission: sub,
          task,
          reward,
          phaseName: phase?.phase_name ?? null,
        };
      });
  }, [submissions, tasks]);

  const isError = tasksError || subsError;

  if (isError && !isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-destructive">Failed to load earnings data.</p>
        <Button
          variant="outline"
          onClick={() => {
            void refetchTasks();
            void refetchSubs();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 pt-5 pb-4">
        <div className="flex items-center gap-2">
          <TrendingUpIcon className="size-5 text-primary" />
          <h1>Earnings</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your earnings from completed tasks.
        </p>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <SummaryCards
          earnings={earnings}
          submissionCount={approvedCount}
          isLoading={isLoading}
        />

        <div>
          <h2 className="mb-3 text-sm font-semibold">Recent Activity</h2>
          <EarningsList items={earningsItems} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
