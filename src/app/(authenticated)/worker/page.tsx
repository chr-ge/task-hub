"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { SearchIcon, LoaderIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Task, TaskType, SubmissionData } from "@/lib/types";
import { useAuth } from "@/features/auth/auth-context";
import { useTasks } from "@/features/tasks/hooks";
import { useCreateSubmission } from "@/features/submissions/hooks";

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

const TASK_TYPE_VARIANT: Record<TaskType, "default" | "secondary" | "outline"> =
  {
    social_media_posting: "default",
    email_sending: "secondary",
    social_media_liking: "outline",
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
  return (
    <Badge variant={TASK_TYPE_VARIANT[taskType]}>
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
}: {
  task: Task;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      size="sm"
      className={cn(
        "cursor-pointer transition-colors hover:bg-muted/50",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1">{task.title}</CardTitle>
          <span className="shrink-0 text-sm font-semibold text-green-600 dark:text-green-400">
            {formatReward(task.reward)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <TaskTypeBadge taskType={task.task_type} />
          <span className="text-xs text-muted-foreground">
            {task.amount} slot{task.amount !== 1 ? "s" : ""} remaining
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
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

function SubmissionForm({
  task,
  onSuccess,
}: {
  task: Task;
  onSuccess?: () => void;
}) {
  const { user } = useAuth();
  const createSubmission = useCreateSubmission();

  const [postUrl, setPostUrl] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [emailContent, setEmailContent] = useState("");

  const clearForm = useCallback(() => {
    setPostUrl("");
    setEvidenceUrl("");
    setEmailContent("");
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!user) {
        toast.error("You must be logged in to submit");
        return;
      }

      let data: SubmissionData;

      switch (task.task_type) {
        case "social_media_posting":
          data = {
            task_type: "social_media_posting",
            post_url: postUrl,
            evidence_screenshot_url: evidenceUrl,
          };
          break;
        case "email_sending":
          data = {
            task_type: "email_sending",
            email_content: emailContent,
            evidence_screenshot_url: evidenceUrl,
          };
          break;
        case "social_media_liking":
          data = {
            task_type: "social_media_liking",
            post_url: postUrl,
            evidence_screenshot_url: evidenceUrl,
          };
          break;
      }

      createSubmission.mutate(
        {
          values: { task_id: task.id, data },
          workerId: user.id,
        },
        {
          onSuccess: () => {
            clearForm();
            onSuccess?.();
          },
        }
      );
    },
    [
      user,
      task.task_type,
      task.id,
      postUrl,
      evidenceUrl,
      emailContent,
      createSubmission,
      clearForm,
      onSuccess,
    ]
  );

  const needsPostUrl =
    task.task_type === "social_media_posting" ||
    task.task_type === "social_media_liking";

  const needsEmailContent = task.task_type === "email_sending";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-semibold">Submit your work</h3>

      {needsPostUrl && (
        <div className="space-y-1.5">
          <Label htmlFor="post-url">Post URL</Label>
          <Input
            id="post-url"
            type="url"
            placeholder="https://..."
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            required
          />
        </div>
      )}

      {needsEmailContent && (
        <div className="space-y-1.5">
          <Label htmlFor="email-content">Email Content</Label>
          <Textarea
            id="email-content"
            placeholder="Paste the email content you sent..."
            value={emailContent}
            onChange={(e) => setEmailContent(e.target.value)}
            required
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="evidence-url">Evidence Screenshot URL</Label>
        <Input
          id="evidence-url"
          type="url"
          placeholder="https://..."
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
          required
        />
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
  onSubmissionSuccess,
}: {
  task: Task;
  onSubmissionSuccess?: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{task.title}</h2>
          <TaskTypeBadge taskType={task.task_type} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatReward(task.reward)}
          </span>
          <span>
            {task.amount} slot{task.amount !== 1 ? "s" : ""} remaining
          </span>
        </div>
      </div>

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

      <SubmissionForm task={task} onSuccess={onSubmissionSuccess} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WorkerTasksPage() {
  const { data: tasks, isLoading, isError, refetch } = useTasks();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("latest");
  const [page, setPage] = useState(0);

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

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedTasks = filteredTasks.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE
  );

  const selectedTask = useMemo(() => {
    if (!selectedTaskId || !tasks) return null;
    return tasks.find((t) => t.id === selectedTaskId) ?? null;
  }, [selectedTaskId, tasks]);

  // Reset page when search/sort changes
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setPage(0);
    },
    []
  );

  const handleSortChange = useCallback((mode: SortMode) => {
    setSort(mode);
    setPage(0);
  }, []);

  // Desktop: select task; Mobile: open sheet
  const handleTaskClick = useCallback(
    (taskId: string) => {
      setSelectedTaskId(taskId);
      // Open sheet on mobile
      setSheetOpen(true);
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
        <div className="border-b p-4">
          <h1 className="text-lg font-semibold">Available Tasks</h1>
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
  // Render: main
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <h1 className="text-lg font-semibold">Available Tasks</h1>
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
      <div className="flex flex-1 overflow-hidden">
        {/* Task list */}
        <div
          className={cn(
            "flex flex-col overflow-hidden",
            // On desktop, take 40% when a task is selected, otherwise full
            "w-full md:w-2/5 md:border-r"
          )}
        >
          <ScrollArea className="flex-1">
            <div className="grid gap-3 p-4">
              {pagedTasks.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No tasks available
                </div>
              ) : (
                pagedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isSelected={selectedTaskId === task.id}
                    onClick={() => handleTaskClick(task.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {currentPage + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages - 1}
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Desktop detail panel */}
        <div className="hidden flex-1 overflow-y-auto md:block">
          {selectedTask ? (
            <div className="p-6">
              <TaskDetail task={selectedTask} />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a task to view details
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
                  {formatReward(selectedTask.reward)}
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="flex-1 px-4 pb-4">
                <TaskDetail
                  task={selectedTask}
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
