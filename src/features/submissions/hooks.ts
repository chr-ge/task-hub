"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { SubmissionFormValues, Submission } from "@/lib/types";
import {
  getSubmissions,
  getSubmissionsByTask,
  getSubmissionsByUser,
  getSubmissionsByPhase,
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

export function useSubmissionsByPhase(phaseId: string) {
  return useQuery({
    queryKey: ["submissions", "phase", phaseId],
    queryFn: () => getSubmissionsByPhase(phaseId),
    enabled: !!phaseId,
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
    onMutate: async ({ values, userId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["submissions"] });
      await queryClient.cancelQueries({ queryKey: ["submissions", "user", userId] });

      // Snapshot previous values
      const previousSubmissions = queryClient.getQueryData<Submission[]>(["submissions"]);
      const previousUserSubmissions = queryClient.getQueryData<Submission[]>(["submissions", "user", userId]);

      // Create optimistic submission
      const optimisticSubmission: Submission = {
        id: crypto.randomUUID(),
        task_id: values.task_id,
        phase_id: values.phase_id ?? null,
        user_id: userId,
        status: "pending",
        data: values.data,
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
      };

      // Optimistically update the submissions cache
      if (previousSubmissions) {
        queryClient.setQueryData<Submission[]>(
          ["submissions"],
          [...previousSubmissions, optimisticSubmission]
        );
      }
      if (previousUserSubmissions) {
        queryClient.setQueryData<Submission[]>(
          ["submissions", "user", userId],
          [...previousUserSubmissions, optimisticSubmission]
        );
      }

      return { previousSubmissions, previousUserSubmissions, userId };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousSubmissions) {
        queryClient.setQueryData(["submissions"], context.previousSubmissions);
      }
      if (context?.previousUserSubmissions && context?.userId) {
        queryClient.setQueryData(["submissions", "user", context.userId], context.previousUserSubmissions);
      }
      toast.error("Failed to create submission");
    },
    onSuccess: () => {
      toast.success("Submission created");
    },
    onSettled: (_data, _err, vars) => {
      // Always refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      if (vars) {
        queryClient.invalidateQueries({ queryKey: ["submissions", "user", vars.userId] });
      }
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
