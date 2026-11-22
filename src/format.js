export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const positionals = [];
  let limit;

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--limit") {
      limit = Number(rest[i + 1]);
      i += 1;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      limit = Number(arg.slice("--limit=".length));
      continue;
    }
    positionals.push(arg);
  }

  return {
    command,
    input: positionals.join(" ").trim(),
    limit: Number.isFinite(limit) ? limit : undefined,
  };
}

export function formatScrape(doc) {
  const markdown = typeof doc?.markdown === "string" ? doc.markdown.trim() : "";
  const title = doc?.metadata?.title;
  if (title && markdown && !markdown.startsWith("# ") && !markdown.includes(title)) {
    return `# ${title}\n\n${markdown}`;
  }
  return markdown;
}

function snippet(text, max = 180) {
  const flat = String(text).replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trimEnd()}…`;
}

export function webResults(data) {
  const web = data == null ? undefined : data.web;
  return Array.isArray(web) ? web : [];
}

export function formatSearch(data) {
  const web = webResults(data);

  if (web.length === 0) {
    return "No web results.";
  }

  return web
    .map((item, index) => {
      const title = item.title || item.url || "Untitled";
      const url = item.url ? `\n${item.url}` : "";
      const description = item.description ? `\n${snippet(item.description)}` : "";
      return `${index + 1}. ${title}${url}${description}`;
    })
    .join("\n\n");
}

export function formatMap(data) {
  const links = Array.isArray(data?.links) ? data.links : [];
  return links
    .map((link) => (typeof link === "string" ? link : link?.url))
    .filter(Boolean)
    .join("\n");
}
