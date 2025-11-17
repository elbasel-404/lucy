import { Action } from "./components/Action";
import { convertToMarkdown } from "./server/ai/convertToMarkdown";
import { getAiResponse } from "./server/ai/getAiResponse";
import { retrieveSavedInfo } from "./server/ai/retrieveSavedInfo";
import { getSearchResults } from "./server/web/getSearchResults";
import { scrapeWebpage } from "./server/web/scrapeWebpage";
import { webdownloadPage } from "./server/web/webdownloadPage";
// import { generateImage } from "./server/generateImage";

export default async function Home() {
  return (
    <main>
      <Action
        action={getAiResponse}
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
