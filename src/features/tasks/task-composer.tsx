"use client";

import { useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { v4 as uuidv4 } from "uuid";
import { Loader2Icon, PlusIcon, Trash2Icon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Task, TaskFormValues } from "@/lib/types";
import { TaskFormValuesSchema } from "@/lib/types";
import { TASK_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(TaskFormValuesSchema),
    defaultValues: getDefaults(task),
  });

  const { fields: phaseFields, append: appendPhase, remove: removePhase, move: movePhase } = useFieldArray({
    control,
    name: "phases",
  });

  // Reset form values when the dialog opens or the task changes
  useEffect(() => {
    if (open) {
      reset(getDefaults(task));
    }
  }, [open, task, reset]);

  const isPending = createTask.isPending || updateTask.isPending || isSubmitting;

  async function onSubmit(values: TaskFormValues) {
    // Ensure phase indices are sequential
    const cleanedValues = {
      ...values,
      phases: values.phases.map((p, i) => ({ ...p, phase_index: i })),
    };

    if (isEditing) {
      await updateTask.mutateAsync({ id: task.id, values: cleanedValues });
    } else {
      await createTask.mutateAsync(cleanedValues);
    }
    onOpenChange(false);
    onSuccess?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "Create Task"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the task details below."
              : "Fill in the details to create a new task."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
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
                    <span className="flex flex-1 text-left line-clamp-1">
                      {TASK_TYPE_LABELS[field.value]}
                    </span>
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

          {/* Amount & Reward side by side */}
          <div className="grid grid-cols-2 gap-3">
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
          </div>

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

          {/* Phases */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Phases</Label>
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={isPending}
                onClick={() =>
                  appendPhase({
                    id: uuidv4(),
                    phase_name: "",
                    phase_index: phaseFields.length,
                    slots: 10,
                    instructions: "",
                    reward: 5,
                  })
                }
              >
                <PlusIcon className="size-3.5" />
                Add Phase
              </Button>
            </div>

            {phaseFields.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No phases — task will behave as a standard single-stage task.
              </p>
            ) : (
              <div className="space-y-3">
                {phaseFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-lg border bg-muted/20 p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Phase {index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={isPending}
                            onClick={() => movePhase(index, index - 1)}
                          >
                            <ChevronUpIcon className="size-3.5" />
                          </Button>
                        )}
                        {index < phaseFields.length - 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={isPending}
                            onClick={() => movePhase(index, index + 1)}
                          >
                            <ChevronDownIcon className="size-3.5" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-destructive hover:text-destructive"
                          disabled={isPending}
                          onClick={() => removePhase(index)}
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    <fieldset disabled={isPending} className="space-y-2">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`phase-name-${index}`} className="text-xs">Name</Label>
                        <Input
                          id={`phase-name-${index}`}
                          placeholder="e.g. Content Creation"
                          {...register(`phases.${index}.phase_name`)}
                        />
                        {errors.phases?.[index]?.phase_name && (
                          <p className="text-xs text-destructive">{errors.phases[index]?.phase_name?.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor={`phase-slots-${index}`} className="text-xs">Slots</Label>
                          <Input
                            id={`phase-slots-${index}`}
                            type="number"
                            min={1}
                            {...register(`phases.${index}.slots`, { valueAsNumber: true })}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor={`phase-reward-${index}`} className="text-xs">Reward</Label>
                          <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-muted-foreground">$</span>
                            <Input
                              id={`phase-reward-${index}`}
                              type="number"
                              min={0}
                              step={0.01}
                              className="pl-6"
                              {...register(`phases.${index}.reward`, { valueAsNumber: true })}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`phase-instructions-${index}`} className="text-xs">Instructions</Label>
                        <Textarea
                          id={`phase-instructions-${index}`}
                          rows={2}
                          placeholder="What workers need to do in this phase..."
                          {...register(`phases.${index}.instructions`)}
                        />
                      </div>
                    </fieldset>

                    {/* Hidden fields for id and phase_index */}
                    <input type="hidden" {...register(`phases.${index}.id`)} />
                    <input type="hidden" {...register(`phases.${index}.phase_index`, { valueAsNumber: true })} value={index} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Drip Feed */}
          <fieldset disabled={isPending} className="space-y-3">
            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name="drip_feed.drip_enabled"
                render={({ field }) => (
                  <Switch
                    id="drip_enabled"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="drip_enabled">Enable Drip Feed</Label>
            </div>

            {watch("drip_feed.drip_enabled") && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="drip_amount" className="text-xs">Release Amount</Label>
                  <Input
                    id="drip_amount"
                    type="number"
                    min={1}
                    placeholder="5"
                    {...register("drip_feed.drip_amount", { valueAsNumber: true })}
                  />
                  <p className="text-[10px] text-muted-foreground">Slots per release</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="drip_interval" className="text-xs">Interval (min)</Label>
                  <Input
                    id="drip_interval"
                    type="number"
                    min={1}
                    placeholder="360"
                    {...register("drip_feed.drip_interval", { valueAsNumber: true })}
                  />
                  <p className="text-[10px] text-muted-foreground">Minutes between releases</p>
                </div>
              </div>
            )}
          </fieldset>

          {/* Submit */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && (
                <Loader2Icon className={cn("size-4 animate-spin")} />
              )}
              {isEditing ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
      phases: task.phases.map((p) => ({
        id: p.id,
        phase_name: p.phase_name,
        phase_index: p.phase_index,
        slots: p.slots,
        instructions: p.instructions,
        reward: p.reward,
      })),
      drip_feed: task.drip_feed,
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
    phases: [],
    drip_feed: { drip_enabled: false },
  };
}

export { TaskComposer };
export type { TaskComposerProps };
