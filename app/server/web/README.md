# scrapeWebpage

Server-side helper to fetch an HTML page and extract only plain, human-readable text.

## Usage

Import and call it from server-side code (Next.js server actions or edge functions):

```ts
import { scrapeWebpage } from "./scrapeWebpage";

const { text, error } = await scrapeWebpage("https://example.com", {
  maxChars: 50_000,
});
if (error) {
  // handle error
}
// text contains all visible text content joined with double newlines between blocks
```

## Notes

- This runs on the server only (uses fetch). Use it in server components or API routes.
- The function uses cheerio to parse HTML and removes script/style/head elements.
- You can pass an optional maxChars to limit the size of the returned text (default 150k characters).
- If the content-type header is not text/html, the function returns an error.
