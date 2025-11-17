# server

This folder contains server-side logic and API handlers for the application.

## Files

- **action.ts**: Handles server-side actions, likely for API endpoints or business logic.
- **generateImage.ts**: Contains logic for generating images, possibly using external APIs or libraries.
- **get.ts**: Implements GET request handling for server endpoints.
- **getSearchResults.ts**: Utility to fetch search results from DuckDuckGo's Instant Answer API for a given query.

### getSearchResults usage

This helper queries the DuckDuckGo Instant Answer API and returns a parsed list of results.

Example usage in server code:

```ts
import { getSearchResults } from "./getSearchResults";

const r = await getSearchResults("open source ai");
console.log(r.results);
```

Notes: The function uses `fetchWithCache` to avoid refetching identical queries in short succession.

- **post.ts**: Implements POST request handling for server endpoints.
- **validate.ts**: Contains validation logic for server-side data.

### Subfolders

- **ai/**: Contains AI-related server logic.
  - **getAiExplanation.ts**: Generates explanations using AI models.
  - **getAiResponse.ts**: Handles AI responses.
  - **getAiSummary.ts**: Summarizes data using AI.
- **http/**: HTTP utilities for server logic.
  - **normalizeUrl.ts**: Normalizes URLs for consistent processing.
  - **quicktypeToZod.ts**: Converts Quicktype schemas to Zod validation schemas.
- **io/**: Input/output utilities for server logic.
  - **dynamicImportType.ts**: Dynamically imports types.
  - **fileExists.ts**: Checks for file existence.
  - **readJson.ts**: Reads and parses JSON files.

## Patterns

- Modular server-side logic.
- API route handlers and utilities.
- Separation of concerns by feature (AI, HTTP, IO).

---
