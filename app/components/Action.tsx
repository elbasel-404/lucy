"use client";
import React from "react";
import { useForm } from "../hooks/useForm";

// Props for Action component
// - action: async callback (server action)
// - args: arguments for callback
// - config: optional optimistic config
// - children: form fields and submit button
export type ActionProps<T, Args extends unknown[]> = {
  action: (...args: Args) => Promise<T>;
  args?: Args;
  config?: {
    optimistic?: boolean;
    optimisticFn?: (...args: Args) => T;
  };
  children?: React.ReactNode;
  result?: React.ComponentType<ReturnType<typeof useForm<T, Args>>>;
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
}: ActionProps<T, Args>) {
  const formState = useForm<T, Args>(action, { args, config });
  const { loading, error, submit } = formState;

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submit();
  };

  return (
    <form onSubmit={handleSubmit}>
      {children ? children : <button type="submit">Submit</button>}
      {/* Show loading or error state */}
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "red" }}>{error.message}</div>}
      {result && React.createElement(result, formState)}
    </form>
  );
}
