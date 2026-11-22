import { Firecrawl } from "firecrawl";
import { loadEnvFile } from "./env.js";

loadEnvFile();

export function createClient() {
  return new Firecrawl({
    apiKey: process.env.FIRECRAWL_API_KEY || undefined,
    apiUrl: process.env.FIRECRAWL_API_URL || undefined,
    timeoutMs: 45_000,
  });
}
