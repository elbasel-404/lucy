"use client";
import React from "react";
import { useForm } from "../hooks/useForm";

// Props for Action component
// - action: async callback (server action)
// - args: arguments for callback
// - config: optional optimistic config
// - children: form fields and submit button
import { JSONView } from "./JSON";

export type ActionProps<T, Args extends unknown[]> = {
  action: (...args: Args) => Promise<T>;
  args?: Args;
  config?: {
    optimistic?: boolean;
    optimisticFn?: (...args: Args) => T;
  };
  children?: React.ReactNode;
  result?: React.ComponentType<ReturnType<typeof useForm<T, Args>>>;
  renderOutput?: boolean;
  title?: string;
};

// Action: Pluggable client component for async form submission
// Usage: <Action action={myAction} args={[...]} config={{optimistic: true, optimisticFn}}>
//          <input ... />
//          <button type="submit">Submit</button>
//        </Action>
export function Action<T, Args extends unknown[]>({
  action,
  args,
  config,
  children,
  result,
  renderOutput = false,
  title,
}: ActionProps<T, Args>) {
  const formState = useForm<T, Args>(action, { args, config });
  const { loading, error, submit, data } = formState;
  const actionUrl =
    typeof action === "function" && action.name
      ? `/api/${action.name}`
      : undefined;
  const [showResponse, setShowResponse] = React.useState(true);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submit();
  };
  return (
    <section className="w-full max-w-3xl mx-auto my-10 p-8 bg-black rounded-2xl shadow-xl border border-gray-800 flex flex-col gap-6 transition-all duration-200">
      <header className="flex flex-col gap-2 border-b border-gray-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-extrabold text-gray-100 tracking-tight leading-tight">
            {title}
          </h2>
          {actionUrl && (
            <span className="text-sm font-medium bg-gray-900 text-gray-300 rounded px-2 py-1 border border-gray-700">
              {actionUrl}
            </span>
          )}
        </div>
      </header>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {children}
        <div className="flex items-center gap-4 mt-6">
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-700 text-white text-base font-semibold shadow hover:bg-blue-600 transition border border-blue-800"
          >
            Submit
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded bg-gray-700 text-gray-100 text-sm font-semibold shadow hover:bg-gray-600 transition border border-gray-600"
            onClick={() => setShowResponse((v) => !v)}
          >
            {showResponse ? "Hide" : "Show"} Response
          </button>
        </div>
        {showResponse && <JSONView data={data} />}
      </form>
    </section>
  );
}
