"use client";
export type ActionInputType =
  | "text"
  | "array"
  | "number"
  | "password"
  | "email";
import React, { useState } from "react";
import { useForm } from "../hooks/useForm";
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
};

/**
 * Action: Pluggable client component for async form submission
 *
 * @example
 * <Action action={myAction} args={[...]} config={{optimistic: true, optimisticFn}}>
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
}: ActionProps<T, Args>) {
  // Form state and helpers
  const formState = useForm<T, Args>(action, { args, config });
  const { loading, error, submit, data, setArgs, args: formArgs } = formState;
  const [showResponse, setShowResponse] = useState(renderOutput);

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
      await submit();
    },
    [submit]
  );

  const toggleResponse = React.useCallback(() => {
    setShowResponse((prev) => !prev);
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
        </div>

        {/* Response Display */}
        {showResponse && (
          <div className="mt-2">
            {ResultComponent ? (
              <ResultComponent {...formState} />
            ) : (
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
                <JSONView data={data} />
              </div>
            )}
          </div>
        )}
      </form>
    </section>
  );
}
