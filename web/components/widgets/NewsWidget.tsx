"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../lib/api";
import { isSafeHttpUrl } from "../../lib/links";
import { useWidgetSymbol, type WidgetInstance } from "../../store/terminal";
import AppIcon from "../AppIcon";
import { usePreferences } from "../../store/preferences";

type NewsItem = { title: string; link: string; publisher: string; publishedAt: string | null };
type AiState = { loading: boolean; text?: string; error?: string };

export default function NewsWidget({ widget }: { widget: WidgetInstance }) {
  const symbol = useWidgetSymbol(widget);
  const refreshSeconds = usePreferences((s) => s.refreshSeconds);
  const [mode, setMode] = useState<"symbol" | "global">("symbol");
  const [summaries, setSummaries] = useState<Record<string, AiState>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["news", mode, symbol],
    queryFn: () => apiGet<NewsItem[]>(mode === "symbol" ? `/api/news?symbol=${encodeURIComponent(symbol)}` : "/api/news"),
    refetchInterval: refreshSeconds * 1000,
  });

  const askAI = async (item: NewsItem, index: number) => {
    const id = item.link || item.title + index;
    setExpanded(id);
    setSummaries((current) => ({ ...current, [id]: { loading: true } }));
    try {
      const response = await apiPost<{ text: string }>("/api/ai/chat", {
        messages: [{ role: "user", content: [
          "Analyze this news item for a financial-market research workflow.",
          "Separate confirmed facts from implications and uncertainty. Explain which assets/sectors could be affected, the likely time horizon, and what data would confirm or invalidate the interpretation.",
          "Do not make a personalized buy/sell recommendation. If the headline alone is insufficient, say so.",
          "",
          "Headline: " + item.title,
          "Publisher: " + item.publisher,
          "Published: " + (item.publishedAt ?? "unknown"),
          "Related symbol: " + symbol,
          "Source URL: " + item.link,
        ].join("\n") }],
        context: { activeSymbol: symbol, selectedNews: { title: item.title, publisher: item.publisher, publishedAt: item.publishedAt, url: item.link } },
      });
      setSummaries((current) => ({ ...current, [id]: { loading: false, text: response.text } }));
    } catch (error) {
      setSummaries((current) => ({ ...current, [id]: { loading: false, error: (error as Error).message } }));
    }
  };

  return (
    <div className="news-workspace">
      <div className="news-toolbar">
        <div className="news-filter-group">
          <button className={"term-btn " + (mode === "symbol" ? "active" : "")} onClick={() => setMode("symbol")}>{symbol}</button>
          <button className={"term-btn " + (mode === "global" ? "active" : "")} onClick={() => setMode("global")}>GLOBAL</button>
        </div>
        <button className="news-refresh" onClick={() => refetch()} disabled={isFetching}><AppIcon name="refresh" size={14}/>{isFetching ? "Updating" : "Refresh"}</button>
      </div>
      {isLoading && <div className="news-state"><span className="news-loading-dot"/> Loading market headlines…</div>}
      {isError && <div className="news-state news-error">News feed unavailable. Check the API server and configured RSS sources.</div>}
      {!isLoading && !isError && data.length === 0 && <div className="news-state">No headlines returned for this filter.</div>}
      <div className="news-list">
        {data.map((item, index) => {
          const id = item.link || item.title + index;
          const ai = summaries[id];
          const isExpanded = expanded === id;
          return (
            <article key={id} className={"news-card " + (isExpanded ? "expanded" : "")}>
              <div className="news-card-main">
                <div className="news-meta"><span className="news-source">{item.publisher}</span><span>{item.publishedAt ? new Date(item.publishedAt).toLocaleString() : "Time unavailable"}</span></div>
                {isSafeHttpUrl(item.link) ? <a className="news-headline" href={item.link} target="_blank" rel="noreferrer">{item.title}<AppIcon name="external-link" size={13}/></a> : <div className="news-headline">{item.title}</div>}
                <div className="news-actions"><button className="news-ai-button" onClick={() => void askAI(item,index)} disabled={ai?.loading}><AppIcon name="sparkles" size={14}/>{ai?.loading ? "Analyzing…" : ai?.text ? "Refresh AI analysis" : "Analyze with AI"}</button>{ai?.text && <button className="news-plain-button" onClick={()=>setExpanded(isExpanded?null:id)}>{isExpanded?"Hide analysis":"View analysis"}</button>}</div>
              </div>
              {isExpanded && <div className="news-ai-panel"><div className="news-ai-heading"><AppIcon name="brain" size={15}/> AI NEWS BRIEF <span>HEADLINE-BASED ANALYSIS</span></div>{ai?.loading ? <div className="ai-thinking"><i/><i/><i/> Analyzing headline and market context…</div> : ai?.error ? <div className="news-ai-error">{ai.error}</div> : <div className="news-ai-text">{ai?.text ?? "Choose Analyze with AI to generate a brief."}</div>}<p className="news-ai-disclaimer">AI analysis may be incomplete. Headline-only context is not a substitute for reading the source article.</p></div>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
