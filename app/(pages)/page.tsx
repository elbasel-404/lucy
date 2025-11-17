import { Action } from "../components/Action";
import { convertToMarkdown } from "../server/ai/convertToMarkdown";
import { getAiResponse } from "../server/ai/getAiResponse";
import { retrieveSavedInfo } from "../server/ai/retrieveSavedInfo";
import { getSearchResults } from "../server/web/getSearchResults";
import { searchToAi } from "../server/workflow/searchToAi";
import { scrapeWebpage } from "../server/web/scrapeWebpage";
import { webdownloadPage } from "../server/web/webdownloadPage";
import { gatherInfo } from "../server/workflow/gatherInfo";

export default async function Home() {
  return (
    <main>
      <Action
        action={gatherInfo}
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
    </main>
  );
}
