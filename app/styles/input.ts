import { cva } from "cva";

export const input = cva({
  base: "block w-full rounded border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
  variants: {
    intent: {
      primary: ["border-blue-500", "bg-white", "text-gray-900"],
      error: ["border-red-500", "bg-white", "text-red-700"],
    },
    size: {
      small: ["text-sm", "py-1"],
      medium: ["text-base", "py-2"],
      large: ["text-lg", "py-3"],
    },
    disabled: {
      false: null,
      true: ["opacity-50", "cursor-not-allowed"],
    },
  },
  compoundVariants: [
    {
      intent: "primary",
      disabled: false,
      class: "focus:border-blue-600",
    },
    {
      intent: "error",
      disabled: false,
      class: "focus:border-red-600",
    },
  ],
  defaultVariants: {
    intent: "primary",
    size: "medium",
    disabled: false,
  },
});
