# server

This folder contains server-side logic and API handlers for the application.

## Files

- **action.ts**: Handles server-side actions, likely for API endpoints or business logic.
- **generateImage.ts**: Contains logic for generating images, possibly using external APIs or libraries.
- **get.ts**: Implements GET request handling for server endpoints.
- **getSearchResults.ts**: Utility to fetch search results from DuckDuckGo by scraping the HTML results page (cheerio) instead of the Instant Answer API.

### getSearchResults usage

This helper scrapes DuckDuckGo search results HTML and returns a parsed list of results. It uses `cheerio` to extract titles, links, and snippets.

Example usage in server code:

```ts
import { getSearchResults } from "./getSearchResults";

const r = await getSearchResults("open source ai");
console.log(r.results);
```

Notes: The function scrapes DuckDuckGo's HTML page and uses a server-side fetch with the `force-cache` option so Next.js can cache identical queries.

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

- **workflow/**: Higher-level sequences that combine search, scraping, AI, and I/O.
  - **searchToAi.ts**: Runs a search and returns an AI summary of the top results.
  - **gatherInfo.ts**: Orchestrates a deep search + scrape + convert flow. It:
    1. Runs a DuckDuckGo search for the user prompt
    2. Downloads and converts the top N result pages to Markdown via `webdownloadPage`
    3. Runs `retrieveSavedInfo` to find the most relevant saved docs
    4. Asks the AI to synthesize a final answer using those documents and returns an object with metadata and the `answer`
    - The function checks whether the `docs/<normalized-filename>.md` file exists and will skip downloads for already-scraped pages unless you pass `options.force = true`.

Example:

```ts
import { gatherInfo } from "./workflow/gatherInfo";

const result = await gatherInfo("How to minimize commit size in git?");
console.log(result.answer);
```

## Patterns

- Modular server-side logic.
- API route handlers and utilities.
- Separation of concerns by feature (AI, HTTP, IO).

---
