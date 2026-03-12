"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { SubmissionFormValues } from "@/lib/types";
import {
  getSubmissions,
  getSubmissionsByTask,
  getSubmissionsByWorker,
  createSubmission,
  reviewSubmission,
} from "@/lib/repositories";

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

export function useSubmissions() {
  return useQuery({
    queryKey: ["submissions"],
    queryFn: getSubmissions,
  });
}

export function useSubmissionsByTask(taskId: string) {
  return useQuery({
    queryKey: ["submissions", "task", taskId],
    queryFn: () => getSubmissionsByTask(taskId),
    enabled: !!taskId,
  });
}

export function useSubmissionsByWorker(workerId: string) {
  return useQuery({
    queryKey: ["submissions", "worker", workerId],
    queryFn: () => getSubmissionsByWorker(workerId),
    enabled: !!workerId,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

export function useCreateSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      values,
      workerId,
    }: {
      values: SubmissionFormValues;
      workerId: string;
    }) => createSubmission(values, workerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      toast.success("Submission created");
    },
    onError: () => {
      toast.error("Failed to create submission");
    },
  });
}

export function useReviewSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "approved" | "rejected";
    }) => reviewSubmission(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      toast.success("Submission reviewed");
    },
    onError: () => {
      toast.error("Failed to review submission");
    },
  });
}
