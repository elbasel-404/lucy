# GitHub Copilot Repository Instructions

## High-Level Overview

This repository is a Next.js application bootstrapped with `create-next-app`. It uses TypeScript, React, and Tailwind CSS (with CVA for composable styles). The project is modular, with clear separation between UI components, server logic, hooks, utilities, and styles. The codebase is organized for maintainability and scalability.

- **Languages/Frameworks**: TypeScript, React, Next.js, Tailwind CSS, CVA
- **Project Type**: Web application
- **Main entry**: `app/page.tsx`
- **Key folders**: `app/components`, `app/server`, `app/hooks`, `app/utils`, `app/styles`, `app/types`, `app/json`

## Build, Run, and Validate

- **Install dependencies**: `pnpm install` (recommended)
- **Start development server**: `pnpm dev` (or `npm run dev`, `yarn dev`, `bun dev`)
- **Access app**: [http://localhost:3000](http://localhost:3000)
- **Edit main page**: `app/page.tsx` (auto-updates on save)
- **Deploy**: Use [Vercel](https://vercel.com/) for easiest deployment

## Project Layout & Key Files

- `app/components/`: React components (e.g., `Action.tsx`)
- `app/server/`: API handlers and server logic (e.g., `action.ts`, `generateImage.ts`)
  - `ai/`: AI-related logic (e.g., `getAiExplanation.ts`)
  - `http/`: HTTP utilities (e.g., `normalizeUrl.ts`)
  - `io/`: IO utilities (e.g., `readJson.ts`)
- `app/hooks/`: Custom React hooks (e.g., `useForm.ts`)
- `app/utils/`: Utility functions (e.g., `saveFile.ts`)
- `app/styles/`: CVA-based Tailwind style definitions
- `app/types/`: TypeScript type definitions
- `app/json/`: JSON data or utilities

## Patterns & Best Practices

- Use functional React components and custom hooks for UI and logic.
- Encapsulate reusable logic in `app/utils` and `app/hooks`.
- Use CVA for scalable, type-safe styling in `app/styles`.
- Organize server logic by feature (AI, HTTP, IO) in `app/server`.
- Place shared types in `app/types`.

## Validation & Testing

- Always run `pnpm install` before building or running.
- Validate changes by running the dev server and checking [http://localhost:3000](http://localhost:3000).
- No explicit test or lint scripts found; add them as needed for CI/CD.

## Additional Notes

- For more details, see the README files in each folder.
- Trust these instructions for onboarding and code changes. Search only if information is missing or incorrect.
- After every change to the repository, update the relevant changelog(s) and README(s) to document the modification. This ensures traceability and keeps documentation current for all contributors and Copilot agents.

---

For more on Copilot custom instructions, see [GitHub Docs](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions?tool=vscode).
