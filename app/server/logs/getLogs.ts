"use server";
import { getServerLogs, clearServerLogs } from "./logStore";

export async function getLogs(logId: string) {
  if (!logId) return [];
  return getServerLogs(logId);
}

export async function clearLogs(logId: string) {
  if (!logId) return;
  clearServerLogs(logId);
}
