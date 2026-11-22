import { pathToFileURL } from "node:url";
import { createClient } from "./client.js";
import { formatMap, formatScrape, formatSearch, parseArgs } from "./format.js";

const usage = `Usage:
  npm run scrape -- https://example.com
  npm run search -- "open source web crawlers" --limit 5
  npm run map -- https://example.com --limit 20

Reads FIRECRAWL_API_KEY and FIRECRAWL_API_URL from the environment.
Scrape and search work without a key on Firecrawl's keyless free tier.`;

export { createClient };

export async function run(argv, client = createClient()) {
  const { command, input, limit } = parseArgs(argv);

  if (!command || command === "--help" || command === "-h") {
    return { exitCode: command ? 0 : 1, output: usage };
  }

  if (!input) {
    return { exitCode: 1, output: `Missing input for "${command}".\n\n${usage}` };
  }

  if (command === "scrape") {
    const doc = await client.scrape(input, { formats: ["markdown"] });
    return { exitCode: 0, output: formatScrape(doc) };
  }

  if (command === "search") {
    const data = await client.search(input, { limit: limit ?? 5 });
    return { exitCode: 0, output: formatSearch(data) };
  }

  if (command === "map") {
    const data = await client.map(input, limit ? { limit } : undefined);
    return { exitCode: 0, output: formatMap(data) };
  }

  return { exitCode: 1, output: `Unknown command "${command}".\n\n${usage}` };
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  run(process.argv.slice(2))
    .then(({ exitCode, output }) => {
      const stream = exitCode === 0 ? console.log : console.error;
      if (output) stream(output);
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
