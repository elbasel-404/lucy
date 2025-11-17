import { Action } from "./components/Action";
import { getAiResponse } from "./server/ai/getAiResponse";
import { getSearchResults } from "./server/web/getSearchResults";
import { scrapeWebpage } from "./server/web/scrapeWebpage";
// import { generateImage } from "./server/generateImage";

export default async function Home() {
  return (
    <main>
      <Action
        action={scrapeWebpage}
        args={["hello"]}
        title="getAiResponse"
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
