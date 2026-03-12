"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { SubmissionFormValues } from "@/lib/types";
import {
  getSubmissions,
  getSubmissionsByTask,
  getSubmissionsByUser,
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

export function useSubmissionsByUser(userId: string) {
  return useQuery({
    queryKey: ["submissions", "user", userId],
    queryFn: () => getSubmissionsByUser(userId),
    enabled: !!userId,
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
      userId,
    }: {
      values: SubmissionFormValues;
      userId: string;
    }) => createSubmission(values, userId),
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
