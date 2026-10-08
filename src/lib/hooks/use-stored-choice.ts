"use client";

import { useCallback, useSyncExternalStore } from "react";

const CHANGE_EVENT = "pit:stored-choice";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Used when localStorage is unavailable (private mode, quota), so a choice still lasts until reload. */
const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

/**
 * One of `options`, remembered in localStorage. The server and the first
 * client render use `fallback`, so hydration never mismatches; the stored
 * value applies right after. Unknown stored values fall back too.
 */
export function useStoredChoice<T extends string>(
  key: string,
  options: readonly T[],
  fallback: T,
): [T, (next: T) => void] {
  const stored = useSyncExternalStore(subscribe, () => read(key), () => null);
  const value = options.find((option) => option === stored) ?? fallback;

  const setValue = useCallback(
    (next: T) => {
      memory.set(key, next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Kept in memory instead.
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [key],
  );

  return [value, setValue];
}
