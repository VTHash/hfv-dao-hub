import fetch from "node-fetch";
import { writePost } from "./_supabase.mjs";
import fs from "fs";
import * as Agents from "/server/agents.js";
const TARGETS = JSON.parse(fs.readFileSync("config/targets.json", "utf8"));

/* ---------------- LLM (OpenAI) ---------------- */
async function chatLLM({ system, user }) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || "LLM error");
  return j.choices?.[0]?.message?.content?.trim() || "";
}

/* --------------- DAO data (example via Tally) --------------- */
/* Replace with your real tally GraphQL/API helper if you have it */
async function fetchDaoProposals(slug, limit = 8) {
  // Example placeholder. Swap to your own tallyQuery.
  const key = process.env.TALLY_API_KEY;
  if (!key) return [];
  const endpoint = `https://api.tally.xyz/organization/${slug}/proposals?limit=${limit}`;
  const r = await fetch(endpoint, { headers: { "Api-Key": key } });
  if (!r.ok) return [];
  const j = await r.json();
  // normalize best-effort
  const list = j?.proposals || j?.data || [];
  return list.map(p => ({
    title: p.title || p.name || "Proposal",
    status: p.status || p.state || "",
    url: p.url || p.link || ""
  }));
}

/* --------------- AI data (example sources) --------------- */
/* You can wire each AI project to its official feed/API. Here we just stub. */
async function fetchAiActivity(slug, limit = 8) {
  // TODO: replace with each project's real feed (RSS, API, subgraph)
  // For now, return empty; the LLM can still summarize static context if needed.
  return [];
}

/* ---------------- Summarizers ---------------- */
async function runDaoSummarizer({ slug }) {
  const proposals = await fetchDaoProposals(slug, 10);
  const context = proposals.length
    ? proposals.map(p => `• ${p.title} [${p.status}] ${p.url}`).join("\n")
    : "No recent proposals found.";
  const system = "You are a concise, neutral DAO governance analyst.";
  const user = `Summarize the most important current governance items for ${slug}.\n\n${context}\n\nReturn 5-8 bullets + 3 short tags.`;
  return chatLLM({ system, user });
}

async function runAiSummarizer({ slug }) {
  const items = await fetchAiActivity(slug, 10);
  const context = items.length
    ? items.map(it => `• ${it.title || it.name} ${it.url || ""}`).join("\n")
    : `Summarize the latest known updates and ecosystem status for ${slug}.`;
  const system = "You are a concise, neutral AI/crypto analyst.";
  const user = `Summarize recent updates for AI project ${slug}.\n\n${context}\n\nReturn 5-8 bullets + 3 short tags.`;
  return chatLLM({ system, user });
}

/* ---------------- HTTP entry ---------------- */
export async function handler(event) {
  try {
    // Accept both query params and JSON body
    const method = event.httpMethod || "GET";
    const url = new URL(event.rawUrl);
    const qType = url.searchParams.get("type"); // 'dao' | 'ai'
    const qSlug = url.searchParams.get("slug") || "";
    let type = qType, slug = qSlug;

    if (method === "POST" && event.body) {
      const b = JSON.parse(event.body);
      type = b.type || type;
      slug = b.slug || slug;
    }

    if (!type || !slug) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "Missing type or slug" })
      };
    }

    if (type !== "dao" && type !== "ai") {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "type must be 'dao' or 'ai'" })
      };
    }

    let summary = "";
    if (type === "dao") summary = await runDaoSummarizer({ slug });
    if (type === "ai") summary = await runAiSummarizer({ slug });

    // write to posts
    await writePost({
      title: `${type.toUpperCase()} • ${slug}`,
      content: summary,
      author: `agents/${type}Summarizer`,
      source_type: type,
      source: slug,
      url: null,
      tags: `${type},${slug}`
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error("agents fn error:", e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) };
  }
}