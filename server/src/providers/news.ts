import { XMLParser } from "fast-xml-parser";
import { db } from "../db.js";

export type NewsItem = {
  title: string;
  link: string;
  publisher: string;
  publishedAt: string | null;
  symbol: string | null;
};

const parser = new XMLParser({ ignoreAttributes: false });
const UA = "OpenTerminal/1.0";

async function fetchRss(url: string, publisher: string, symbol: string | null): Promise<NewsItem[]> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`rss ${res.status}`);
  const doc = parser.parse(await res.text());
  const rssItems = doc?.rss?.channel?.item ?? doc?.channel?.item ?? [];
  const atomItems = doc?.feed?.entry ?? [];
  const normalize = (items: any, atom = false): NewsItem[] => {
    const list = Array.isArray(items) ? items : items ? [items] : [];
    return list.filter((item: any) => item?.title && item?.link).map((item: any) => {
      const rawLink = atom ? (Array.isArray(item.link) ? item.link.find((link: any) => link?.["@_rel"] === "alternate") ?? item.link[0] : item.link) : item.link;
      const link = typeof rawLink === "string" ? rawLink : rawLink?.["@_href"] ?? rawLink?.["#text"] ?? "";
      const title = String(typeof item.title === "object" ? item.title["#text"] ?? "" : item.title);
      const published = item.pubDate ?? item.published ?? item.updated ?? item["dc:date"] ?? null;
      let publishedAt: string | null = null;
      if (published) { const date = new Date(published); if (Number.isFinite(date.getTime())) publishedAt = date.toISOString(); }
      const source = item.source?.["#text"] ?? item.author?.name ?? item.author ?? publisher;
      return { title, link: String(link), publisher: String(source), publishedAt, symbol };
    }).filter((item: NewsItem) => item.title && /^https:\/\//i.test(item.link));
  };
  return [...normalize(rssItems), ...normalize(atomItems, true)];
}

export async function customNews(symbol: string | null = null): Promise<NewsItem[]> {
  const envUrls = (process.env.RSS_FEEDS ?? "").split(",").map((value) => value.trim()).filter(Boolean).map((url) => ({ url, label: "" }));
  const savedUrls = db.prepare("SELECT url, label FROM rss_feeds WHERE enabled = 1").all() as Array<{ url: string; label: string }>;
  const unique = new Map<string, { url: string; label: string }>();
  for (const item of [...envUrls, ...savedUrls]) unique.set(item.url, item);
  const allowed = [...unique.values()].filter(({ url: value }) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname !== "localhost" && !url.hostname.endsWith(".local") && !url.hostname.endsWith(".internal");
    } catch { return false; }
  }).slice(0, 20);
  const results = await Promise.allSettled(allowed.map(({ url, label }) => fetchRss(url, label || new URL(url).hostname, symbol)));
  return results.filter((result) => result.status === "fulfilled").flatMap((result) => (result as PromiseFulfilledResult<NewsItem[]>).value);
}

export async function symbolNews(symbol: string): Promise<NewsItem[]> {
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
  const results = await Promise.allSettled([fetchRss(url, "Yahoo Finance", symbol), customNews(symbol)]);
  return dedupe(results.filter((result) => result.status === "fulfilled").flatMap((result) => (result as PromiseFulfilledResult<NewsItem[]>).value));
}

export async function topNews(query = "stock market"): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const results = await Promise.allSettled([fetchRss(url, "Google News", null), customNews(null)]);
  return dedupe(results.filter((result) => result.status === "fulfilled").flatMap((result) => (result as PromiseFulfilledResult<NewsItem[]>).value));
}

/** Merge, de-duplicate by normalized title, newest first. */
export function dedupe(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const item of items) {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}
