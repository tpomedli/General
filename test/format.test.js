import assert from "node:assert/strict";
import test from "node:test";
import { formatMap, formatScrape, formatSearch, parseArgs } from "../src/format.js";

test("parseArgs keeps multi-word search input and a limit", () => {
  const parsed = parseArgs(["search", "open", "source", "crawlers", "--limit", "3"]);
  assert.deepEqual(parsed, {
    command: "search",
    input: "open source crawlers",
    limit: 3,
  });
});

test("parseArgs accepts --limit=N", () => {
  const parsed = parseArgs(["map", "https://example.com", "--limit=20"]);
  assert.equal(parsed.command, "map");
  assert.equal(parsed.input, "https://example.com");
  assert.equal(parsed.limit, 20);
});

test("formatScrape adds a title when the markdown has none", () => {
  const text = formatScrape({
    markdown: "Hello from the page.",
    metadata: { title: "Example" },
  });
  assert.equal(text, "# Example\n\nHello from the page.");
});

test("formatSearch prints numbered web results", () => {
  const text = formatSearch({
    web: [{ title: "Firecrawl", url: "https://firecrawl.dev", description: "Web data API" }],
  });
  assert.match(text, /^1\. Firecrawl\nhttps:\/\/firecrawl\.dev\nWeb data API$/);
});

test("formatSearch shortens long page text", () => {
  const text = formatSearch({
    web: [{ title: "Docs", url: "https://example.com", description: "word ".repeat(80) }],
  });
  const description = text.split("\n")[2];
  assert.ok(description.endsWith("…"));
  assert.ok(description.length <= 180);
});

test("formatMap accepts string and object links", () => {
  const text = formatMap({
    links: ["https://example.com", { url: "https://example.com/about" }],
  });
  assert.equal(text, "https://example.com\nhttps://example.com/about");
});
