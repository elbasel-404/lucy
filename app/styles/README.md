# Styles Pattern Documentation (CVA Beta)

This folder contains style definitions using the [CVA (Class Variance Authority)](https://beta.cva.style/) pattern for building reusable, composable, and type-safe Tailwind CSS component styles in a Next.js project.

## Pattern Overview

Each file in this folder exports a style object created with the `cva` function. The pattern allows you to define:

- **Base styles**: Common classes applied to every variant, via the `base` property.
- **Variants**: Named options (e.g., `intent`, `size`, `disabled`) that change the appearance.
- **Compound Variants**: Classes applied when specific combinations of variants are active.
- **Default Variants**: Default values for each variant.

This approach enables consistent, scalable styling for UI components. CVA is framework-agnostic and works especially well with Tailwind CSS.

## What's New in CVA Beta

- **Shorter import**: Use `import { cva } from "cva";` (no longer `class-variance-authority`).
- **Single parameter**: All options are passed in an object to `cva({ ... })`.
- **New `compose` API**: Shallow merge multiple CVA components into one with `compose`.
- **New `defineConfig` API**: Extend CVA with custom config (see [defineConfig](https://beta.cva.style/api-reference#defineconfig)).
- **No more `null` for disabling variants**: Use explicit options like `unset` instead.
- **TypeScript improvements**: Use `VariantProps<typeof yourComponent>` to extract variant types.

## How to Create a New Style File

1. **Create a new file** in this folder (e.g., `badge.ts`).
2. **Import `cva`**:
   ```ts
   import { cva } from "cva";
   ```
3. **Define your style object**:
   ```ts
   export const badge = cva({
     base: "inline-block px-2 py-1 rounded text-xs font-semibold",
     variants: {
       color: {
         success: "bg-green-500 text-white",
         error: "bg-red-500 text-white",
         warning: "bg-yellow-500 text-black",
         unset: null, // disables variant
       },
       size: {
         small: "text-xs",
         medium: "text-sm",
       },
     },
     compoundVariants: [{ color: "success", size: "medium", class: "shadow" }],
     defaultVariants: {
       color: "success",
       size: "small",
     },
   });
   ```
4. **Export the style object** for use in your components.

## Example: `button.ts`

### Elements

- **Base**: `inline-flex items-center justify-center font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500`
- **Variants**:
  - `intent`:
    - `primary`: `bg-blue-500 text-white border-transparent`
    - `secondary`: `bg-white text-gray-800 border-gray-400`
  - `size`:
    - `small`: `text-sm py-1 px-2`
    - `medium`: `text-base py-2 px-4`
    - `large`: `text-lg py-3 px-6`
  - `disabled`:
    - `true`: `opacity-50 cursor-not-allowed`
    - `false`: no extra classes
- **Compound Variants**:
  - `intent: primary` & `disabled: false`: `hover:bg-blue-600`
  - `intent: secondary` & `disabled: false`: `hover:bg-gray-100`
  - `intent: primary` & `size: medium`: `uppercase`
- **Default Variants**:
  - `intent: primary`
  - `size: medium`
  - `disabled: false`

## Advanced Usage

- **Composing components**: Use `compose` to merge multiple CVA components:
  ```ts
  import { cva, compose } from "cva";
  const box = cva({ base: "box", variants: { margin: { sm: "m-2" } } });
  const card = cva({ base: "card", variants: { shadow: { md: "shadow-md" } } });
  export const composed = compose(box, card);
  ```
- **Extending components**: Pass extra classes via `class` or `className`:
  ```ts
  button({ class: "m-4" });
  button({ className: "m-4" });
  ```
- **Polymorphism**: CVA is framework-agnostic. For React, you can use the `asChild` prop with [@radix-ui/react-slot](https://www.radix-ui.com/docs/primitives/utilities/slot) for polymorphic components.
- **TypeScript**: Extract variant types with `VariantProps<typeof button>`.

## Usage in Components

Import the style object and use it to generate class names:

```tsx
import { button } from "../styles/button";

<button className={button({ intent: "primary", size: "large" })}>
  Click me
</button>;
```

## References

- [CVA Beta Documentation](https://beta.cva.style/)
- [API Reference](https://beta.cva.style/api-reference)
- [Tailwind CSS Integration](https://beta.cva.style/examples/react/tailwindcss)
- [TypeScript Usage](https://beta.cva.style/getting-started/typescript)

---

For each new style file, follow the same pattern: define base styles, variants, compound variants, and defaults. Document the available options in the file or in this README as needed. For advanced patterns, see the CVA beta docs for composing, extending, and polymorphic components.
