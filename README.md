# General

A small command-line client for [Firecrawl](https://github.com/firecrawl/firecrawl). It scrapes a page to markdown, searches the web, and maps the URLs on a site.

## Setup

```bash
npm install
cp .env.example .env
```

`FIRECRAWL_API_KEY` is optional. Scrape and search use Firecrawl's keyless free tier when it is empty. Set `FIRECRAWL_API_URL` when you want a local server, such as `http://localhost:3002` from `firecrawl-local serve`.

## Commands

```bash
npm run scrape -- https://firecrawl.dev
npm run search -- "open source web crawlers" --limit 5
npm run map -- https://firecrawl.dev --limit 20
```

Node.js 22 or newer is required.
