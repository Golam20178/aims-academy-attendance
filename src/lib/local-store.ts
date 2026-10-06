"use client";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  Database,
  databaseSchema,
  emptyDatabase,
  migrateDatabase,
} from "./academy";
const KEY = "aims-academy-v1";
type Snapshot = { db: Database; authenticated: boolean; error: string | null };
let snapshot: Snapshot | null = null;
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((fn) => fn());
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const db = raw ? migrateDatabase(JSON.parse(raw)) : emptyDatabase();
    // Persist schema migrations under the same key while retaining real records.
    if (raw && JSON.parse(raw).version !== db.version) {
      localStorage.setItem(KEY, JSON.stringify(db));
    }
    snapshot = {
      db,
      authenticated: sessionStorage.getItem("aims-admin") === "demo",
      error: null,
    };
  } catch {
    snapshot = {
      db: emptyDatabase(),
      authenticated: false,
      error:
        "Saved data could not be read. Export a backup before making changes; your original browser data has not been overwritten.",
    };
  }
  emit();
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  if (!snapshot) queueMicrotask(load);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) load();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}
const getSnapshot = () => snapshot;
const getServerSnapshot = () => null;
export function useAcademy() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
export function saveDatabase(db: Database) {
  if (!snapshot) return false;
  if (snapshot.error) {
    toast.error("Restore a valid backup before editing damaged local data.");
    return false;
  }
  try {
    databaseSchema.parse(db);
    localStorage.setItem(KEY, JSON.stringify(db));
    snapshot = { ...snapshot, db };
    emit();
    return true;
  } catch {
    toast.error("Could not save. Browser storage may be unavailable or full.");
    return false;
  }
}
export function restoreDatabase(db: Database) {
  try {
    localStorage.setItem(KEY, JSON.stringify(databaseSchema.parse(db)));
    snapshot = {
      db,
      authenticated: snapshot?.authenticated ?? false,
      error: null,
    };
    emit();
    return true;
  } catch {
    toast.error("Could not restore backup.");
    return false;
  }
}
export function signIn(email: string, password: string) {
  if (
    email.trim().toLowerCase() !== "admin@aims.local" ||
    password !== "AimsDemo123!"
  )
    return false;
  try {
    sessionStorage.setItem("aims-admin", "demo");
    if (snapshot) snapshot = { ...snapshot, authenticated: true };
    emit();
    return true;
  } catch {
    toast.error("Enable browser storage to use local login.");
    return false;
  }
}
export function signOut() {
  sessionStorage.removeItem("aims-admin");
  if (snapshot) snapshot = { ...snapshot, authenticated: false };
  emit();
}
