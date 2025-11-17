import { Action } from "../components/Action";
import Workflow from "../components/Workflow";
import { convertToMarkdown } from "../server/ai/convertToMarkdown";
import { getAiResponse } from "../server/ai/getAiResponse";
import { retrieveSavedInfo } from "../server/ai/retrieveSavedInfo";
import { getSearchResults } from "../server/web/getSearchResults";
import { scrapeWebpage } from "../server/web/scrapeWebpage";
import { webdownloadPage } from "../server/web/webdownloadPage";

export default async function Home() {
  return (
    <main>
      <Action
        action={webdownloadPage}
        renderOutput
        inputParams={[
          {
            label: "prompt",
            name: "prompt",
            defaultValue: "",
            placeholder: "prompt",
            type: "text",
          },
        ]}
      />
      <Workflow
        title="Demo Workflow"
        steps={[
          {
            action: getSearchResults,
          },
          {
            action: scrapeWebpage,
            title: "Scrape Example.com (or first result)",
            description:
              "Pulls page text from example.com or first search result",
          },
          {
            action: getAiResponse,
          },
        ]}
      />
    </main>
  );
}
