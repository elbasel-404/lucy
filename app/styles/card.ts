import { cva } from "cva";

export const card = cva({
  base: "rounded-lg shadow-md bg-white p-6 transition-shadow",
  variants: {
    elevation: {
      none: "shadow-none",
      low: "shadow-sm",
      medium: "shadow-md",
      high: "shadow-lg",
    },
    border: {
      true: "border border-gray-200",
      false: "border-none",
    },
  },
  compoundVariants: [
    {
      elevation: "high",
      border: true,
      class: "border-blue-500",
    },
  ],
  defaultVariants: {
    elevation: "medium",
    border: false,
  },
});
