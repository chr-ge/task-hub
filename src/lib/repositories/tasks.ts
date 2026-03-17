import { v4 as uuidv4 } from "uuid";

import type { Task, TaskFormValues } from "@/lib/types";
import { getStorageItem, setStorageItem } from "@/lib/storage";
import { simulateReadDelay, simulateWriteDelay } from "@/lib/delay";

const STORAGE_KEY = "task-hub:tasks";

function readTasks(): Task[] {
  return getStorageItem<Task[]>(STORAGE_KEY) ?? [];
}

function writeTasks(tasks: Task[]): void {
  setStorageItem<Task[]>(STORAGE_KEY, tasks);
}

export async function getTasks(): Promise<Task[]> {
  await simulateReadDelay();
  const tasks = readTasks();
  return tasks.filter((t) => t.deleted_at === null);
}

export async function getAllTasks(): Promise<Task[]> {
  await simulateReadDelay();
  return readTasks();
}

export async function getTaskById(id: string): Promise<Task | null> {
  await simulateReadDelay();
  const tasks = readTasks();
  return tasks.find((t) => t.id === id) ?? null;
}

export async function createTask(values: TaskFormValues): Promise<Task> {
  await simulateWriteDelay();
  const now = new Date().toISOString();
  const task: Task = {
    ...values,
    id: uuidv4(),
    phases: (values.phases ?? []).map((p) => ({
      ...p,
      id: p.id ?? uuidv4(),
    })),
    drip_feed: values.drip_feed ?? { drip_enabled: false },
    drip_last_released_at: null,
    drip_released_count: 0,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  const tasks = readTasks();
  tasks.push(task);
  writeTasks(tasks);
  return task;
}

export async function updateTask(
  id: string,
  values: Partial<TaskFormValues>,
): Promise<Task> {
  await simulateWriteDelay();
  const tasks = readTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) {
    throw new Error(`Task with id "${id}" not found`);
  }
  const updated: Task = {
    ...tasks[index],
    ...values,
    updated_at: new Date().toISOString(),
  };
  tasks[index] = updated;
  writeTasks(tasks);
  return updated;
}

export async function deleteTask(id: string): Promise<void> {
  await simulateWriteDelay();
  const tasks = readTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) {
    throw new Error(`Task with id "${id}" not found`);
  }
  tasks[index] = {
    ...tasks[index],
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  writeTasks(tasks);
}

export async function bulkUpdateTasks(
  ids: string[],
  values: Pick<TaskFormValues, "amount" | "campaign_id">,
): Promise<Task[]> {
  await simulateWriteDelay();
  const tasks = readTasks();
  const now = new Date().toISOString();
  const updatedTasks: Task[] = [];

  for (const id of ids) {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Task with id "${id}" not found`);
    }
    const updated: Task = {
      ...tasks[index],
      ...values,
      updated_at: now,
    };
    tasks[index] = updated;
    updatedTasks.push(updated);
  }

  writeTasks(tasks);
  return updatedTasks;
}

export async function bulkCreateTasks(
  valuesList: TaskFormValues[],
): Promise<Task[]> {
  await simulateWriteDelay();
  const now = new Date().toISOString();
  const tasks = readTasks();
  const created: Task[] = [];

  for (const values of valuesList) {
    const task: Task = {
      ...values,
      id: uuidv4(),
      phases: (values.phases ?? []).map((p) => ({
        ...p,
        id: p.id ?? uuidv4(),
      })),
      drip_feed: values.drip_feed ?? { drip_enabled: false },
      drip_last_released_at: null,
      drip_released_count: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    tasks.push(task);
    created.push(task);
  }

  writeTasks(tasks);
  return created;
}

export async function simulateDripRelease(taskId: string): Promise<Task> {
  await simulateWriteDelay();
  const tasks = readTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) throw new Error(`Task with id "${taskId}" not found`);

  const task = tasks[index];
  const dripAmount = task.drip_feed.drip_amount ?? 5;

  const updated: Task = {
    ...task,
    drip_released_count: task.drip_released_count + dripAmount,
    drip_last_released_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  tasks[index] = updated;
  writeTasks(tasks);
  return updated;
}
