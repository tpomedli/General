import { formatScrape, webResults } from "./format.js";
import { assertQuery, assertUrl, clampLimit, publicHttpUrl } from "./validate.js";

function searchItems(data) {
  const web = webResults(data);
  return web
    .map((item) => ({
      title: typeof item?.title === "string" && item.title.trim() ? item.title.trim() : item?.url || "Untitled",
      url: publicHttpUrl(item?.url),
      description: typeof item?.description === "string" ? item.description.replace(/\s+/g, " ").trim().slice(0, 180) : "",
    }))
    .filter((item) => item.url);
}

function mapLinks(data) {
  const links = Array.isArray(data?.links) ? data.links : [];
  const seen = new Set();
  const urls = [];
  for (const link of links) {
    const url = publicHttpUrl(typeof link === "string" ? link : link?.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

export async function scrapePage(client, rawUrl) {
  const url = assertUrl(rawUrl);
  const doc = await client.scrape(url, { formats: ["markdown"] });
  const title = typeof doc?.metadata?.title === "string" ? doc.metadata.title : "";
  return { mode: "scrape", url, title, markdown: formatScrape(doc) };
}

export async function searchWeb(client, rawQuery, rawLimit) {
  const query = assertQuery(rawQuery);
  const limit = clampLimit(rawLimit, { fallback: 5, max: 8 });
  const data = await client.search(query, { limit });
  return { mode: "search", query, results: searchItems(data) };
}

export async function mapSite(client, rawUrl, rawLimit) {
  const url = assertUrl(rawUrl);
  const limit = clampLimit(rawLimit, { fallback: 20, max: 40 });
  const data = await client.map(url, { limit });
  return { mode: "map", url, links: mapLinks(data) };
}
