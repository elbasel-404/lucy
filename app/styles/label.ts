import { cva } from "cva";

export const label = cva({
  base: "block font-medium mb-1 text-gray-700",
  variants: {
    size: {
      small: "text-xs",
      medium: "text-sm",
      large: "text-base",
    },
    color: {
      default: "text-gray-700",
      error: "text-red-600",
      info: "text-blue-600",
    },
  },
  defaultVariants: {
    size: "medium",
    color: "default",
  },
});
