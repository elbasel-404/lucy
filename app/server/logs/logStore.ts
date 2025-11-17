// In-memory log store for mapping logIds to arrays of log entries
// Entries: { time: string, level: string, message: string, extra?: any }
const store = new Map<string, Array<any>>();
// listeners keyed by logId -> set of callbacks
const listeners = new Map<string, Set<(entry: any) => void>>();

export function addServerLog(
  logId: string,
  entry: { level: string; message: string; extra?: any }
) {
  if (!logId) return;
  const arr = store.get(logId) || [];
  arr.push({ time: new Date().toISOString(), ...entry });
  // limit to last 200 entries
  if (arr.length > 200) arr.splice(0, arr.length - 200);
  store.set(logId, arr);
  // notify listeners for real-time streaming
  const set = listeners.get(String(logId));
  if (set) {
    for (const cb of Array.from(set)) cb(arr[arr.length - 1]);
  }
}

export function getServerLogs(logId: string) {
  return store.get(logId) || [];
}

export function clearServerLogs(logId: string) {
  store.delete(logId);
}

export function listServerLogIds() {
  return Array.from(store.keys());
}

export function subscribeServerLogs(logId: string, cb: (entry: any) => void) {
  const set = listeners.get(logId) || new Set();
  set.add(cb);
  listeners.set(logId, set);
  return () => {
    const s = listeners.get(logId);
    if (!s) return;
    s.delete(cb);
    if (s.size === 0) listeners.delete(logId);
  };
}
