import { Action } from "./components/Action";
import { getAiResponse } from "./server/ai/getAiResponse";
import { generateImage } from "./server/generateImage";

export default async function Home() {
  return (
    <main>
      <h1>Lucy</h1>
      <Action action={getAiResponse} args={["hello"]} />
    </main>
  );
}
