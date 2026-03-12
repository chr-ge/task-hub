import type { User, UserRole } from "@/lib/types";
import { getStorageItem } from "@/lib/storage";
import { simulateReadDelay } from "@/lib/delay";

const STORAGE_KEY = "task-hub:users";

function readUsers(): User[] {
  return getStorageItem<User[]>(STORAGE_KEY) ?? [];
}

export async function getUsers(): Promise<User[]> {
  await simulateReadDelay();
  return readUsers();
}

export async function getUserById(id: string): Promise<User | null> {
  await simulateReadDelay();
  const users = readUsers();
  return users.find((u) => u.id === id) ?? null;
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
  await simulateReadDelay();
  const users = readUsers();
  return users.filter((u) => u.role === role);
}
