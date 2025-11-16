// useForm: A custom hook for handling async form submissions with optional optimistic UI updates.
// - callback: The async server action to call on submit.
// - options.config.optimistic: If true, enables optimistic UI updates using options.config.optimisticFn.
// - options.config.optimisticFn: Required if optimistic is true. Returns the optimistic value.
// - options.args: Arguments to pass to callback and optimisticFn.
// Returns: { loading, data, error, submit }
import { useState, useOptimistic } from "react";

/**
 * Config for optional optimistic updates in useForm.
 * @template Args - Argument tuple type for callback and optimisticFn
 * @template T - Return type of callback and optimisticFn
 * @property {boolean} [optimistic] - If true, enables optimistic UI updates
 * @property {(args: Args) => T} [optimisticFn] - Function to get optimistic value (required if optimistic is true)
 */
type Config<Args extends unknown[], T> = {
  optimistic?: boolean;
  optimisticFn?: (...args: Args) => T;
};

/**
 * Options for useForm.
 * @template Args - Argument tuple type for callback and optimisticFn
 * @template T - Return type of callback and optimisticFn
 * @property {Config<Args, T>} [config] - Optimistic config
 * @property {Args} [args] - Arguments for callback and optimisticFn
 */
type UseFormOptions<Args extends unknown[], T> = {
  config?: Config<Args, T>;
  args?: Args;
};

/**
 * Return type for useForm.
 * @template T - Return type of callback
 * @property {boolean} loading - Is the form submitting?
 * @property {T | null} data - Result data
 * @property {Error | null} error - Error if any
 * @property {() => Promise<void>} submit - Call to submit the form
 */
type UseFormReturn<T> = {
  loading: boolean;
  data: T | null;
  error: Error | null;
  submit: () => Promise<void>;
};

/**
 * useForm - Custom React hook for async form submission with optional optimistic UI updates.
 *
 * @template T - Return type of the async callback
 * @template Args - Argument tuple type for callback and optimisticFn
 * @param {(...args: Args) => Promise<T>} callback - Async server action to call on submit
 * @param {UseFormOptions<Args, T>} [options] - Optional config and args
 * @returns {UseFormReturn<T>} Object containing loading, data, error, and submit handler
 *
 * @example
 * const { loading, data, error, submit } = useForm(async (x: number) => await doSomething(x), {
 *   config: {
 *     optimistic: true,
 *     optimisticFn: (x) => getOptimisticValue(x)
 *   },
 *   args: [42]
 * });
 */
export function useForm<T, Args extends unknown[]>(
  callback: (...args: Args) => Promise<T>,
  options?: UseFormOptions<Args, T>
): UseFormReturn<T> {
  const { config = {}, args = [] as unknown as Args } = options || {};
  // Track loading, data, and error state
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Track optimistic data if enabled
  const [optimisticData, setOptimistic] = useOptimistic<T | null>(null);

  // Submit handler
  const submit = async () => {
    setLoading(true);
    setError(null);
    if (config.optimistic) {
      // Require optimisticFn if optimistic is enabled
      if (typeof config.optimisticFn !== "function") {
        setError(
          new Error("optimisticFn must be provided when optimistic is true")
        );
        setLoading(false);
        return;
      }
      // Optimistically update UI
      const optimisticValue = config.optimisticFn(...args);
      setOptimistic(optimisticValue);
      setData(optimisticValue);
    }
    try {
      // Await server action
      const result = await callback(...args);
      setData(result);
      if (config.optimistic) {
        setOptimistic(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Return state and submit handler
  return {
    loading,
    data: config.optimistic ? optimisticData : data,
    error,
    submit,
  };
}
