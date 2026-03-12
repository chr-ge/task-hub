import { v4 as uuidv4 } from "uuid";

import type { Submission, SubmissionFormValues } from "@/lib/types";
import { getStorageItem, setStorageItem } from "@/lib/storage";
import { simulateReadDelay, simulateWriteDelay } from "@/lib/delay";

const STORAGE_KEY = "task-hub:submissions";

function readSubmissions(): Submission[] {
  return getStorageItem<Submission[]>(STORAGE_KEY) ?? [];
}

function writeSubmissions(submissions: Submission[]): void {
  setStorageItem<Submission[]>(STORAGE_KEY, submissions);
}

export async function getSubmissions(): Promise<Submission[]> {
  await simulateReadDelay();
  return readSubmissions();
}

export async function getSubmissionsByTask(
  taskId: string,
): Promise<Submission[]> {
  await simulateReadDelay();
  const submissions = readSubmissions();
  return submissions.filter((s) => s.task_id === taskId);
}

export async function getSubmissionsByUser(
  userId: string,
): Promise<Submission[]> {
  await simulateReadDelay();
  const submissions = readSubmissions();
  return submissions.filter((s) => s.user_id === userId);
}

export async function createSubmission(
  values: SubmissionFormValues,
  userId: string,
): Promise<Submission> {
  await simulateWriteDelay();
  const submission: Submission = {
    ...values,
    id: uuidv4(),
    user_id: userId,
    status: "pending",
    submitted_at: new Date().toISOString(),
    reviewed_at: null,
  };
  const submissions = readSubmissions();
  submissions.push(submission);
  writeSubmissions(submissions);
  return submission;
}

export async function reviewSubmission(
  id: string,
  status: "approved" | "rejected",
): Promise<Submission> {
  await simulateWriteDelay();
  const submissions = readSubmissions();
  const index = submissions.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error(`Submission with id "${id}" not found`);
  }
  const updated: Submission = {
    ...submissions[index],
    status,
    reviewed_at: new Date().toISOString(),
  };
  submissions[index] = updated;
  writeSubmissions(submissions);
  return updated;
}
