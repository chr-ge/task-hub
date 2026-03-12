"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { v4 as uuidv4 } from "uuid";
import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Task, TaskFormValues } from "@/lib/types";
import { TaskFormValuesSchema } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCreateTask, useUpdateTask } from "./hooks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskComposerProps {
  task?: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TASK_TYPE_LABELS: Record<TaskFormValues["task_type"], string> = {
  social_media_posting: "Social Media Posting",
  email_sending: "Email Sending",
  social_media_liking: "Social Media Liking",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function TaskComposer({ task, open, onOpenChange, onSuccess }: TaskComposerProps) {
  const isEditing = !!task;

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(TaskFormValuesSchema),
    defaultValues: getDefaults(task),
  });

  // Reset form values when the sheet opens or the task changes
  useEffect(() => {
    if (open) {
      reset(getDefaults(task));
    }
  }, [open, task, reset]);

  const isPending = createTask.isPending || updateTask.isPending || isSubmitting;

  async function onSubmit(values: TaskFormValues) {
    if (isEditing) {
      await updateTask.mutateAsync({ id: task.id, values });
    } else {
      await createTask.mutateAsync(values);
    }
    onOpenChange(false);
    onSuccess?.();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Task" : "Create Task"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the task details below."
              : "Fill in the details to create a new task."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 px-4"
        >
          {/* Task Type */}
          <fieldset disabled={isPending} className="flex flex-col gap-1.5">
            <Label htmlFor="task_type">Task Type</Label>
            <Controller
              control={control}
              name="task_type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="task_type"
                    className="w-full"
                    aria-invalid={!!errors.task_type}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(TASK_TYPE_LABELS) as [
                        TaskFormValues["task_type"],
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.task_type && (
              <p className="text-xs text-destructive">{errors.task_type.message}</p>
            )}
          </fieldset>

          {/* Title */}
          <fieldset disabled={isPending} className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              {...register("title")}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </fieldset>

          {/* Description */}
          <fieldset disabled={isPending} className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              {...register("description")}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </fieldset>

          {/* Details */}
          <fieldset disabled={isPending} className="flex flex-col gap-1.5">
            <Label htmlFor="details">Details</Label>
            <Textarea
              id="details"
              rows={5}
              {...register("details")}
              aria-invalid={!!errors.details}
            />
            {errors.details && (
              <p className="text-xs text-destructive">{errors.details.message}</p>
            )}
          </fieldset>

          {/* Amount */}
          <fieldset disabled={isPending} className="flex flex-col gap-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min={1}
              {...register("amount", { valueAsNumber: true })}
              aria-invalid={!!errors.amount}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </fieldset>

          {/* Reward */}
          <fieldset disabled={isPending} className="flex flex-col gap-1.5">
            <Label htmlFor="reward">Reward</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="reward"
                type="number"
                min={0}
                step={0.01}
                className="pl-7"
                {...register("reward", { valueAsNumber: true })}
                aria-invalid={!!errors.reward}
              />
            </div>
            {errors.reward && (
              <p className="text-xs text-destructive">{errors.reward.message}</p>
            )}
          </fieldset>

          {/* Allow Multiple Submissions */}
          <fieldset disabled={isPending} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name="allow_multiple_submissions"
                render={({ field }) => (
                  <Switch
                    id="allow_multiple_submissions"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="allow_multiple_submissions">
                Allow Multiple Submissions
              </Label>
            </div>
            {errors.allow_multiple_submissions && (
              <p className="text-xs text-destructive">
                {errors.allow_multiple_submissions.message}
              </p>
            )}
          </fieldset>

          {/* Campaign ID */}
          <fieldset disabled={isPending} className="flex flex-col gap-1.5">
            <Label htmlFor="campaign_id">Campaign ID</Label>
            <Input
              id="campaign_id"
              {...register("campaign_id")}
              aria-invalid={!!errors.campaign_id}
            />
            {errors.campaign_id && (
              <p className="text-xs text-destructive">
                {errors.campaign_id.message}
              </p>
            )}
          </fieldset>

          {/* Submit */}
          <SheetFooter className="px-0">
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending && (
                <Loader2Icon className={cn("size-4 animate-spin")} />
              )}
              {isEditing ? "Save Changes" : "Create Task"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDefaults(task?: Task): TaskFormValues {
  if (task) {
    return {
      task_type: task.task_type,
      title: task.title,
      description: task.description,
      details: task.details,
      amount: task.amount,
      reward: task.reward,
      allow_multiple_submissions: task.allow_multiple_submissions,
      campaign_id: task.campaign_id,
    };
  }

  return {
    task_type: "social_media_posting",
    title: "",
    description: "",
    details: "",
    amount: 10,
    reward: 5,
    allow_multiple_submissions: false,
    campaign_id: uuidv4(),
  };
}

export { TaskComposer };
export type { TaskComposerProps };
