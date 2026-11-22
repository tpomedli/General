# General

A scraper for [Firecrawl](https://github.com/firecrawl/firecrawl). The web app scrapes a page to markdown, searches the web, and maps the URLs on a site. The command line does the same three jobs.

The link list starts with the Claude connector page: <https://ultimatewebscraper.com/claude>.

## Setup

```bash
npm install
cp .env.example .env
```

`FIRECRAWL_API_KEY` is optional. Scrape and search use Firecrawl's keyless free tier when it is empty. Set `FIRECRAWL_API_URL` when you want a local server, such as `http://localhost:3002` from `firecrawl-local serve`.

## Web app

```bash
npm start
```

Open <http://127.0.0.1:4173>. Choose Scrape, Search, or Map, then run it. The Claude link is filled in and can be scraped from the list.

## Commands

```bash
npm run scrape -- https://firecrawl.dev
npm run search -- "open source web crawlers" --limit 5
npm run map -- https://firecrawl.dev --limit 20
```

Node.js 22 or newer is required.
