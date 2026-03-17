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
import type { Task, Submission } from "@/lib/types";
import { useAuth } from "@/features/auth/auth-context";
import { useTasks } from "@/features/tasks/hooks";
import { useSubmissionsByUser } from "@/features/submissions/hooks";
import { getWorkerEarnings } from "@/lib/derived";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TASK_TYPE_LABELS: Record<Task["task_type"], string> = {
  social_media_posting: "Posting",
  email_sending: "Email",
  social_media_liking: "Liking",
};

const TASK_TYPE_COLORS: Record<Task["task_type"], { bg: string; text: string }> = {
  social_media_posting: { bg: "#E0E0E2", text: "#3a3a3c" },
  email_sending: { bg: "#B5BAD0", text: "#2e3348" },
  social_media_liking: { bg: "#7389AE", text: "#ffffff" },
};

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
          <CardContent className="flex items-center gap-3 pt-4">
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
      <div className="flex flex-col items-center gap-3 py-12 text-center">
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
          className="flex items-center gap-3 rounded-lg border bg-card p-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {item.task?.title ?? "Unknown task"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {item.task && (
                <Badge
                  variant="outline"
                  className="border-transparent text-[10px]"
                  style={{
                    backgroundColor: TASK_TYPE_COLORS[item.task.task_type].bg,
                    color: TASK_TYPE_COLORS[item.task.task_type].text,
                  }}
                >
                  {TASK_TYPE_LABELS[item.task.task_type]}
                </Badge>
              )}
              {item.phaseName && (
                <span className="text-[10px] text-muted-foreground">
                  {item.phaseName}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">
                {formatDate(item.submission.submitted_at)}
              </span>
              <Badge
                variant={
                  item.submission.status === "approved"
                    ? "default"
                    : item.submission.status === "rejected"
                      ? "destructive"
                      : "secondary"
                }
                className={cn(
                  "text-[10px]",
                  item.submission.status === "approved" &&
                    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
                  item.submission.status === "pending" &&
                    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
                )}
              >
                {item.submission.status}
              </Badge>
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
