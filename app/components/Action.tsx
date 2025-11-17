"use client";
export type ActionInputType =
  | "text"
  | "array"
  | "number"
  | "password"
  | "email";
import React, { useState } from "react";
import { useForm } from "../hooks/useForm";
import { getLogs, clearLogs } from "../server/logs/getLogs";
import { JSONView } from "./JSON";

export type ActionProps<T, Args extends unknown[]> = {
  action: (...args: Args) => Promise<T>;
  args?: Args;
  config?: {
    optimistic?: boolean;
    optimisticFn?: (...args: Args) => T;
  };
  children?: React.ReactNode;
  // input?: boolean; (removed)
  inputParams?: Array<{
    label: string;
    name: string;
    type?: ActionInputType;
    placeholder?: string;
    defaultValue?: any;
  }>;
  result?: React.ComponentType<ReturnType<typeof useForm<T, Args>>>;
  renderOutput?: boolean;
  title?: string;
  /**
   * When true the Action will inject a logger into the action as the final
   * argument. The action can receive a logger and call it with progress
   * updates: (arg1, arg2, logger) => Promise<T>
   */
  passLogger?: boolean;
};

/**
 * Action: Pluggable client component for async form submission
 *
 * @example
 * <Action action={myAction} args={[...]} config={{optimistic: true, optimisticFn}}>
 *
 * // To receive logs from inside your action, accept a final `logger` argument
 * // Example:
 * // async function myAction(arg1, arg2, logger) {
 * //   logger('info', 'Starting step 1')
 * //   await doStep1()
 * //   logger('debug', 'Step 1 complete')
 * //   return result
 * // }
 *   <input ... />
 *   <button type="submit">Submit</button>
 * </Action>
 */
export function Action<T, Args extends unknown[]>({
  action,
  args,
  config,
  children,
  result: ResultComponent,
  renderOutput = false,
  title = "Action Form",
  inputParams = [],
  passLogger = false,
}: ActionProps<T, Args>) {
  // Form state and helpers
  const [showResponse, setShowResponse] = useState(renderOutput);
  const [showLogs, setShowLogs] = useState(true);
  const [logs, setLogs] = useState<
    Array<{
      time: string;
      level: "info" | "success" | "error" | "debug";
      text: string;
    }>
  >([]);
  const logRef = React.useRef<HTMLDivElement | null>(null);

  const addLog = React.useCallback(
    (level: "info" | "success" | "error" | "debug", text: string) => {
      const now = new Date();
      const time = now.toLocaleTimeString();
      setLogs((prev) => [...prev, { time, level, text }]);
    },
    []
  );

  // Inject the local logger into the action so it can emit status updates
  // from inside the action implementation by declaring a logger parameter.
  // Example action signature to receive logger: (arg1, arg2, logger) => Promise<T>
  // Use formState with optional logId so server actions get a primitive id to write logs to
  const [logId] = React.useState(
    () =>
      `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  );
  // Pass logId to the server so it will mirror logs to our server side store
  const formStateWithLog = useForm<T, Args>(action, {
    args,
    config,
    logger: passLogger ? addLog : undefined,
    logId,
  });
  // prefer formStateWithLog for things like submit so it includes logId
  const {
    loading,
    error,
    submit,
    data,
    setArgs,
    args: formArgs,
  } = formStateWithLog;
  // track server log polling
  const serverSeenRef = React.useRef(0);
  const eventSourceRef = React.useRef<EventSource | null>(null);
  React.useEffect(() => {
    // Prefer Server-Sent Events for realtime logs. If EventSource is not
    // available (or SSE fails) fall back to polling via `getLogs`.
    let timer: NodeJS.Timeout | null = null;
    let usingSSE = false;

    function startPolling() {
      async function poll() {
        try {
          const serverLogs = await getLogs(logId);
          if (serverLogs && serverLogs.length > serverSeenRef.current) {
            const newLogs = serverLogs.slice(serverSeenRef.current);
            for (const l of newLogs) {
              addLog(
                (l.level as any) || "info",
                l.message || JSON.stringify(l.extra || {})
              );
            }
            serverSeenRef.current = serverLogs.length;
          }
        } catch (e) {
          // ignore
        }
        timer = setTimeout(poll, 700);
      }
      timer = setTimeout(poll, 700);
    }

    async function startSSE() {
      if (typeof window === "undefined") return false;
      try {
        // clear any previous logs first
        await clearLogs(logId);
      } catch (e) {
        // ignore
      }
      serverSeenRef.current = 0;

      const url = `/api/logs/stream?logId=${encodeURIComponent(logId)}`;
      try {
        const es = new EventSource(url);
        eventSourceRef.current = es;
        usingSSE = true;
        es.onmessage = (ev: MessageEvent) => {
          try {
            const data = JSON.parse(ev.data);
            addLog((data.level as any) || "info", data.message || JSON.stringify(data.extra || {}));
          } catch (err) {
            addLog("info", ev.data ?? String(ev));
          }
        };
        es.onerror = (err) => {
          // If SSE fails, close and fall back to polling
          try {
            es.close();
          } catch (e) {}
          usingSSE = false;
          startPolling();
        };
        return true;
      } catch (err) {
        return false;
      }
    }

    if (logId && showLogs) {
      // Try SSE first; if not available, fall back to polling
      startSSE()
        .then((ok) => {
          if (!ok) startPolling();
        })
        .catch(() => startPolling());
    }

    return () => {
      if (timer) clearTimeout(timer);
      try {
        if (eventSourceRef.current) eventSourceRef.current.close();
      } catch (e) {}
    };
  }, [logId, showLogs]);

  // Memoize actionUrl for performance
  const actionUrl = React.useMemo(() => {
    return typeof action === "function" && action.name
      ? `/api/${action.name}`
      : undefined;
  }, [action]);

  // Handlers
  const handleSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      addLog("info", "Submit clicked — queuing action...");
      // If we have an optimistic config, log it first
      if (config?.optimistic) {
        addLog(
          "debug",
          "Optimistic update enabled — applying optimistic value"
        );
      }
      addLog("info", `Calling action${actionUrl ? ` (${actionUrl})` : ""}...`);
      // Clear server logs for this run (if any) so we start fresh
      try {
        await clearLogs(logId);
      } catch (e) {
        // ignore
      }
      serverSeenRef.current = 0;

      try {
        await submit();
        // submit itself sets errors/data inside the hook — read from form state
        if (error) {
          addLog("error", `Action failed: ${error.message}`);
        } else {
          addLog("success", `Action completed successfully`);
        }
      } catch (err) {
        // Shouldn't normally throw but just in case
        addLog("error", `Unexpected error: ${String(err)}`);
      }
    },
    [submit, addLog, config, actionUrl, error]
  );

  const toggleResponse = React.useCallback(() => {
    setShowResponse((prev) => !prev);
  }, []);

  // Auto-scroll logs to bottom when they update
  React.useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const toggleLogs = React.useCallback(() => {
    setShowLogs((prev) => !prev);
  }, []);

  // Render form fields
  const renderFields = () => {
    if (inputParams.length === 0) return children;
    return inputParams.map((param, idx) => {
      const value = formArgs[idx] ?? param.defaultValue ?? "";
      if (param.type === "array") {
        return (
          <div key={param.name} className="flex flex-col gap-1">
            <label className="text-gray-300 text-sm font-medium mb-1">
              {param.label}
            </label>
            <input
              type="text"
              className="px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white"
              value={Array.isArray(value) ? value.join(",") : value}
              onChange={(e) => {
                const newArgs = [...formArgs];
                newArgs[idx] = e.target.value.split(",").map((v) => v.trim());
                setArgs(newArgs as Args);
              }}
              placeholder={param.placeholder || `Comma separated values`}
            />
          </div>
        );
      }
      return (
        <div key={param.name} className="flex flex-col gap-1">
          <label className="text-gray-300 text-sm font-medium mb-1">
            {param.label}
          </label>
          <input
            type={param.type || "text"}
            className="px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white"
            value={value}
            onChange={(e) => {
              const newArgs = [...formArgs];
              newArgs[idx] = e.target.value;
              setArgs(newArgs as Args);
            }}
            placeholder={param.placeholder || param.label}
          />
        </div>
      );
    });
  };

  // Main render
  return (
    <section className="w-full max-w-3xl mx-auto my-10 p-8 bg-linear-to-br from-gray-900 to-black rounded-2xl shadow-2xl border border-gray-700/50 flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col gap-3 border-b border-gray-700/50 pb-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {actionUrl}
          </h2>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-blue-400">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span>Processing...</span>
          </div>
        )}
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Form Fields */}
        <div className="flex flex-col gap-4">{renderFields()}</div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-950/50 border border-red-800 rounded-lg">
            <span className="text-red-300 text-sm font-bold mb-2 block">
              Error:
            </span>
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
              <JSONView
                data={
                  error instanceof Error
                    ? {
                        name: error.name,
                        message: error.message,
                        stack: error.stack,
                        ...Object.getOwnPropertyNames(error)
                          .filter(
                            (key) => !["name", "message", "stack"].includes(key)
                          )
                          .reduce((acc, key) => {
                            acc[key] = (error as any)[key];
                            return acc;
                          }, {} as Record<string, unknown>),
                      }
                    : error
                }
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-700/50">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-semibold shadow-lg hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex items-center gap-2"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {loading ? "Submitting..." : "Submit"}
          </button>
          <button
            type="button"
            onClick={toggleResponse}
            className="px-4 py-2 rounded-lg bg-gray-700/80 text-gray-200 font-medium hover:bg-gray-600 active:scale-95 transition-all border border-gray-600"
          >
            {showResponse ? "Hide" : "Show"} Response
          </button>
          <button
            type="button"
            onClick={toggleLogs}
            className="px-4 py-2 rounded-lg bg-gray-700/80 text-gray-200 font-medium hover:bg-gray-600 active:scale-95 transition-all border border-gray-600"
          >
            {showLogs ? "Hide" : "Show"} Logs
          </button>
        </div>

        {/* Response Display */}
        {showResponse && (
          <div className="mt-2">
            {ResultComponent ? (
              <ResultComponent {...formStateWithLog} />
            ) : (
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
                <JSONView data={data} />
              </div>
            )}
          </div>
        )}

        {/* Terminal-like Logs */}
        {showLogs && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-200">
                Status Logs
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="px-3 py-1 text-xs rounded bg-gray-800 text-white border border-gray-600"
                >
                  Clear
                </button>
              </div>
            </div>
            <div
              ref={logRef}
              className="h-48 overflow-auto bg-black/80 border border-gray-800 rounded-lg p-3 text-sm font-mono text-green-300"
            >
              {logs.length === 0 ? (
                <div className="text-gray-400">
                  No logs yet — submit the form to begin
                </div>
              ) : (
                logs.map((l, idx) => (
                  <div key={idx} className="whitespace-pre-wrap">
                    <span className="text-gray-500 mr-2">[{l.time}]</span>
                    <span
                      className={`${
                        l.level === "error"
                          ? "text-red-400"
                          : l.level === "success"
                          ? "text-green-400"
                          : l.level === "debug"
                          ? "text-yellow-300"
                          : "text-green-300"
                      }`}
                    >
                      {l.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </form>
    </section>
  );
}
