import assert from "node:assert/strict";
import test from "node:test";
import { braveResults, keylessResults } from "../src/search.js";

test("braveResults keeps title, url, and description", () => {
  const results = braveResults({
    web: {
      results: [
        { title: "Example", url: "https://example.com/a", description: "A page" },
        { title: "Skip", url: "javascript:alert(1)", description: "nope" },
      ],
    },
  });
  assert.deepEqual(results, [{ title: "Example", url: "https://example.com/a", description: "A page" }]);
});

test("keylessResults merges Wikipedia and DuckDuckGo without duplicates", () => {
  const results = keylessResults({
    wiki: ["query", ["Example"], ["About"], ["https://en.wikipedia.org/wiki/Example"]],
    duck: {
      Heading: "Example",
      Abstract: "Same page",
      AbstractURL: "https://en.wikipedia.org/wiki/Example",
      RelatedTopics: [{ Text: "Other", FirstURL: "https://example.com/other" }],
    },
  });
  assert.equal(results.length, 2);
  assert.equal(results[0].url, "https://en.wikipedia.org/wiki/Example");
  assert.equal(results[1].title, "Other");
});
