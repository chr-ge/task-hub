"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { TaskFormValues } from "@/lib/types";
import {
  getTasks,
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  bulkUpdateTasks,
  bulkCreateTasks,
  simulateDripRelease,
} from "@/lib/repositories";

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: getTasks,
  });
}

export function useAllTasks() {
  return useQuery({
    queryKey: ["tasks", "all"],
    queryFn: getAllTasks,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ["tasks", id],
    queryFn: () => getTaskById(id),
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: TaskFormValues) => createTask(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created");
    },
    onError: () => {
      toast.error("Failed to create task");
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: Partial<TaskFormValues>;
    }) => updateTask(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated");
    },
    onError: () => {
      toast.error("Failed to update task");
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
    onError: () => {
      toast.error("Failed to delete task");
    },
  });
}

export function useBulkUpdateTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ids,
      values,
    }: {
      ids: string[];
      values: Pick<TaskFormValues, "amount" | "campaign_id">;
    }) => bulkUpdateTasks(ids, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tasks updated");
    },
    onError: () => {
      toast.error("Failed to update tasks");
    },
  });
}

export function useBulkCreateTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (valuesList: TaskFormValues[]) => bulkCreateTasks(valuesList),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tasks created");
    },
    onError: () => {
      toast.error("Failed to create tasks");
    },
  });
}

export function useSimulateDripRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => simulateDripRelease(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
