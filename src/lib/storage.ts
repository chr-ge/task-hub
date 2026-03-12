function isLocalStorageAvailable(): boolean {
  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, "test");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function getStorageItem<T>(key: string): T | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  const raw = localStorage.getItem(key);
  if (raw === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed as T;
  } catch {
    return null;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
}

export function removeStorageItem(key: string): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  localStorage.removeItem(key);
}
