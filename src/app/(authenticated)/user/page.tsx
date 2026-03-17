"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import { SearchIcon, LoaderIcon, InboxIcon, MousePointerClickIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Task, TaskType, TaskPhase, SubmissionData } from "@/lib/types";
import {
  SocialMediaPostingDataSchema,
  EmailSendingDataSchema,
  SocialMediaLikingDataSchema,
} from "@/lib/types";
import { getActivePhase, getWorkerVisiblePhases, getReleasedSlots, getDripFeedState } from "@/lib/derived";
import { useAuth } from "@/features/auth/auth-context";
import { useTasks } from "@/features/tasks/hooks";
import { useCreateSubmission, useSubmissions } from "@/features/submissions/hooks";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

type SortMode = "latest" | "highest_reward";

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  social_media_posting: "Social Media Post",
  email_sending: "Email Sending",
  social_media_liking: "Social Media Like",
};

const TASK_TYPE_COLORS: Record<TaskType, { bg: string; text: string }> = {
  social_media_posting: { bg: "#E0E0E2", text: "#3a3a3c" },
  email_sending: { bg: "#B5BAD0", text: "#2e3348" },
  social_media_liking: { bg: "#7389AE", text: "#ffffff" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatReward(reward: number): string {
  return `$${reward.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// TaskTypeBadge
// ---------------------------------------------------------------------------

function TaskTypeBadge({ taskType }: { taskType: TaskType }) {
  const colors = TASK_TYPE_COLORS[taskType];
  return (
    <Badge
      variant="outline"
      className="border-transparent"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {TASK_TYPE_LABELS[taskType]}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// TaskCard
// ---------------------------------------------------------------------------

function TaskCard({
  task,
  isSelected,
  onClick,
  index,
  activePhase,
  availableSlots,
}: {
  task: Task;
  isSelected: boolean;
  onClick: () => void;
  index: number;
  activePhase: TaskPhase | null;
  availableSlots: number;
}) {
  const displayReward = activePhase ? activePhase.reward : task.reward;

  return (
    <Card
      size="sm"
      className={cn(
        "animate-in-up cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm",
        isSelected && "ring-2 ring-primary"
      )}
      style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1">{task.title}</CardTitle>
          <span className="shrink-0 text-sm font-semibold text-green-600 dark:text-green-400">
            {formatReward(displayReward)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <TaskTypeBadge taskType={task.task_type} />
          <span className="text-xs text-muted-foreground">
            {availableSlots} slot{availableSlots !== 1 ? "s" : ""} available
          </span>
          {activePhase && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {activePhase.phase_name}
            </Badge>
          )}
        </div>
        <p className="mt-2.5 line-clamp-2 text-sm text-muted-foreground">
          {task.description}
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// TaskCardSkeleton
// ---------------------------------------------------------------------------

function TaskCardSkeleton() {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-14" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="mt-2 h-8 w-full" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SubmissionForm
// ---------------------------------------------------------------------------

const SUBMISSION_SCHEMAS = {
  social_media_posting: SocialMediaPostingDataSchema,
  email_sending: EmailSendingDataSchema,
  social_media_liking: SocialMediaLikingDataSchema,
} as const;

function SubmissionForm({
  task,
  activePhaseId,
  onSuccess,
}: {
  task: Task;
  activePhaseId: string | null;
  onSuccess?: () => void;
}) {
  const { user } = useAuth();
  const createSubmission = useCreateSubmission();

  const schema = SUBMISSION_SCHEMAS[task.task_type];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { task_type: task.task_type } as z.infer<typeof schema>,
  });

  const needsPostUrl =
    task.task_type === "social_media_posting" ||
    task.task_type === "social_media_liking";

  const needsEmailContent = task.task_type === "email_sending";

  function onSubmit(values: z.infer<typeof schema>) {
    if (!user) {
      toast.error("You must be logged in to submit");
      return;
    }

    createSubmission.mutate(
      {
        values: { task_id: task.id, phase_id: activePhaseId, data: values as SubmissionData },
        userId: user.id,
      },
      {
        onSuccess: () => {
          reset();
          onSuccess?.();
        },
      }
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h3 className="text-sm font-semibold">Submit your work</h3>

      {needsPostUrl && (
        <div className="space-y-1.5">
          <Label htmlFor="post-url">Post URL</Label>
          <Input
            id="post-url"
            type="url"
            placeholder="https://..."
            {...register("post_url" as never)}
          />
          {"post_url" in errors && errors.post_url && (
            <p className="text-xs text-destructive">{errors.post_url.message as string}</p>
          )}
        </div>
      )}

      {needsEmailContent && (
        <div className="space-y-1.5">
          <Label htmlFor="email-content">Email Content</Label>
          <Textarea
            id="email-content"
            placeholder="Paste the email content you sent..."
            {...register("email_content" as never)}
          />
          {"email_content" in errors && errors.email_content && (
            <p className="text-xs text-destructive">{errors.email_content.message as string}</p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="evidence-url">Evidence Screenshot URL</Label>
        <Input
          id="evidence-url"
          type="url"
          placeholder="https://..."
          {...register("evidence_screenshot_url" as never)}
        />
        {"evidence_screenshot_url" in errors && errors.evidence_screenshot_url && (
          <p className="text-xs text-destructive">{errors.evidence_screenshot_url.message as string}</p>
        )}
      </div>

      <Button type="submit" disabled={createSubmission.isPending}>
        {createSubmission.isPending && (
          <LoaderIcon className="animate-spin" />
        )}
        {createSubmission.isPending ? "Submitting..." : "Submit"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// TaskDetail
// ---------------------------------------------------------------------------

function TaskDetail({
  task,
  activePhase,
  visiblePhases,
  availableSlots,
  onSubmissionSuccess,
}: {
  task: Task;
  activePhase: TaskPhase | null;
  visiblePhases: TaskPhase[];
  availableSlots: number;
  onSubmissionSuccess?: () => void;
}) {
  const displayReward = activePhase ? activePhase.reward : task.reward;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{task.title}</h2>
          <TaskTypeBadge taskType={task.task_type} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatReward(displayReward)}
          </span>
          <span>
            {availableSlots} slot{availableSlots !== 1 ? "s" : ""} available
          </span>
        </div>
      </div>

      {/* Active phase info */}
      {activePhase && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
              Current Phase
            </Badge>
            <span className="text-sm font-medium">{activePhase.phase_name}</span>
          </div>
          {activePhase.instructions && (
            <p className="text-sm text-muted-foreground">{activePhase.instructions}</p>
          )}
        </div>
      )}

      {/* Past phases the worker submitted to */}
      {visiblePhases.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Your phases</p>
          <div className="flex items-center gap-1">
            {visiblePhases.map((phase) => (
              <Badge
                key={phase.id}
                variant={phase.id === activePhase?.id ? "default" : "secondary"}
                className="text-[10px]"
              >
                {phase.phase_name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Drip feed waiting notice */}
      {task.drip_feed.drip_enabled && getDripFeedState(task) === "waiting" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          More slots will be available soon. Check back later.
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold">Description</h3>
        <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
          {task.description}
        </p>
      </div>

      {task.details && (
        <div>
          <h3 className="text-sm font-semibold">Details</h3>
          <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
            {task.details}
          </p>
        </div>
      )}

      <Separator />

      {availableSlots > 0 ? (
        <SubmissionForm
          task={task}
          activePhaseId={activePhase?.id ?? null}
          onSuccess={onSubmissionSuccess}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No slots currently available.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UserTasksPage() {
  const { user } = useAuth();
  const { data: tasks, isLoading, isError, refetch } = useTasks();
  const { data: allSubmissions } = useSubmissions();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useQueryState("q", { defaultValue: "", clearOnDefault: true });
  const [sort, setSort] = useQueryState("sort", parseAsStringLiteral(["latest", "highest_reward"] as const).withDefault("latest").withOptions({ clearOnDefault: true }));
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Phase / drip helpers
  const getTaskActivePhase = useCallback(
    (task: Task): TaskPhase | null => {
      if (task.phases.length === 0) return null;
      return getActivePhase(task, allSubmissions ?? []);
    },
    [allSubmissions]
  );

  const getAvailableSlots = useCallback(
    (task: Task): number => {
      const released = getReleasedSlots(task);
      if (task.phases.length > 0) {
        const active = getActivePhase(task, allSubmissions ?? []);
        return active ? Math.min(active.slots, released) : 0;
      }
      return released;
    },
    [allSubmissions]
  );

  // Filter and sort
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    let result = tasks;

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q));
    }

    // Sort
    if (sort === "latest") {
      result = [...result].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else {
      result = [...result].sort((a, b) => b.reward - a.reward);
    }

    return result;
  }, [tasks, search, sort]);

  const visibleTasks = filteredTasks.slice(0, visibleCount);
  const hasMore = visibleCount < filteredTasks.length;

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((c) => c + PAGE_SIZE);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId || !tasks) return null;
    return tasks.find((t) => t.id === selectedTaskId) ?? null;
  }, [selectedTaskId, tasks]);

  // Visible phases for the selected task (active + user's past phases)
  const selectedVisiblePhases = useMemo(() => {
    if (!selectedTask || !user) return [];
    return getWorkerVisiblePhases(selectedTask, allSubmissions ?? [], user.id);
  }, [selectedTask, allSubmissions, user]);

  // Reset visible count when search/sort changes
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      void setSearch(e.target.value);
      setVisibleCount(PAGE_SIZE);
    },
    [setSearch]
  );

  const handleSortChange = useCallback((mode: SortMode) => {
    void setSort(mode);
    setVisibleCount(PAGE_SIZE);
  }, [setSort]);

  // Desktop: select task; Mobile: open sheet
  const handleTaskClick = useCallback(
    (taskId: string) => {
      setSelectedTaskId(taskId);
      // Only open the sheet on mobile (< md breakpoint = 768px)
      if (window.matchMedia("(max-width: 767px)").matches) {
        setSheetOpen(true);
      }
    },
    []
  );

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      setSheetOpen(open);
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b px-4 pt-5 pb-4">
          <h1>Available Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse tasks and submit your work.
          </p>
        </div>
        <div className="flex-1 p-4">
          <div className="grid gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <TaskCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: error
  // ---------------------------------------------------------------------------

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-destructive">
          Failed to load tasks. Please try again.
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render helpers for selected task
  // ---------------------------------------------------------------------------

  const selectedActivePhase = selectedTask ? getTaskActivePhase(selectedTask) : null;
  const selectedAvailableSlots = selectedTask ? getAvailableSlots(selectedTask) : 0;
  const selectedDisplayReward = selectedTask
    ? (selectedActivePhase ? selectedActivePhase.reward : selectedTask.reward)
    : 0;

  // ---------------------------------------------------------------------------
  // Render: main
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-4 pt-5 pb-4">
        <h1>Available Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse tasks and submit your work.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <div className="relative flex-1 min-w-[180px]">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search tasks..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        <div className="flex gap-1">
          <Button
            variant={sort === "latest" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSortChange("latest")}
          >
            Latest
          </Button>
          <Button
            variant={sort === "highest_reward" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSortChange("highest_reward")}
          >
            Highest Reward
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Task list */}
        <div
          className={cn(
            "flex min-h-0 flex-col",
            // On desktop, take 40% when a task is selected, otherwise full
            "w-full md:w-2/5 md:border-r"
          )}
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid gap-3 p-4">
              {visibleTasks.length === 0 ? (
                <div className="animate-in-fade flex flex-col items-center gap-3 py-12 text-center">
                  <div className="rounded-full bg-muted p-3">
                    <InboxIcon className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">No tasks available</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {search.trim()
                        ? "Try a different search term"
                        : "Check back later for new tasks"}
                    </p>
                  </div>
                </div>
              ) : (
                visibleTasks.map((task, i) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isSelected={selectedTaskId === task.id}
                    onClick={() => handleTaskClick(task.id)}
                    index={i}
                    activePhase={getTaskActivePhase(task)}
                    availableSlots={getAvailableSlots(task)}
                  />
                ))
              )}
              {/* Infinite scroll sentinel / end-of-list */}
              {hasMore ? (
                <div ref={sentinelRef} className="flex justify-center py-4">
                  <LoaderIcon className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTasks.length > 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  You&apos;ve reached the end
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Desktop detail panel */}
        <div className="hidden flex-1 overflow-y-auto md:block">
          {selectedTask ? (
            <div className="p-6">
              <TaskDetail
                task={selectedTask}
                activePhase={selectedActivePhase}
                visiblePhases={selectedVisiblePhases}
                availableSlots={selectedAvailableSlots}
              />
            </div>
          ) : (
            <div className="animate-in-fade flex h-full flex-col items-center justify-center gap-2 text-center">
              <MousePointerClickIcon className="size-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Select a task to view details
              </p>
              <p className="text-xs text-muted-foreground/70">
                Click any task on the left to get started
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile sheet */}
      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] md:hidden">
          {selectedTask ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedTask.title}</SheetTitle>
                <SheetDescription>
                  {TASK_TYPE_LABELS[selectedTask.task_type]} &middot;{" "}
                  {formatReward(selectedDisplayReward)}
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="flex-1 px-4 pb-4">
                <TaskDetail
                  task={selectedTask}
                  activePhase={selectedActivePhase}
                  visiblePhases={selectedVisiblePhases}
                  availableSlots={selectedAvailableSlots}
                  onSubmissionSuccess={() => setSheetOpen(false)}
                />
              </ScrollArea>
            </>
          ) : (
            <SheetHeader>
              <SheetTitle>Task Details</SheetTitle>
              <SheetDescription>Select a task to view details</SheetDescription>
            </SheetHeader>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
