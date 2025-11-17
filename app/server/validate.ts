import { z, ZodSchema, ZodError } from "zod";
import { log } from "../utils/log";

export type ValidationResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: ZodError;
    };

export function validate<T>(
  schema: ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const parsed = schema.parse(data);
    log({ message: "Validation success", extra: { data } });
    return { success: true, data: parsed };
  } catch (error) {
    log({ message: "Validation error", extra: { error } });
    return { success: false, error: error as ZodError };
  }
}
