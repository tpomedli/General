# General

A search page for your Mac. One query returns one list. With `BRAVE_SEARCH_API_KEY` set, results come from Brave Search. Without it, results come from Wikipedia and DuckDuckGo instant answers.

Paste a page or a video address to list video files that address links to, then download them. This saves direct files such as `.mp4` and `.webm`. Players that hide the file, including YouTube, are left alone.

The command line can still scrape, search, and map with Firecrawl.

## Setup

```bash
npm install
cp .env.example .env
```

## On a Mac

Double-click `mac/Search.command`. The first time, macOS may ask you to confirm opening a file from the internet. It installs dependencies if needed, starts the app, and opens it in the browser. Node.js 22 or newer has to be installed.

## Web app

```bash
npm start
```

Open <http://127.0.0.1:4173>. Search from the box. On a result, choose Linked videos. On a page or file address, the direct videos are listed above the results.

## Commands

```bash
npm run scrape -- https://example.com
npm run search -- "open source web crawlers" --limit 5
npm run map -- https://example.com --limit 20
```

Node.js 22 or newer is required.
