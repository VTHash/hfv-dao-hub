// LiveFeed.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
/* -------------------------------------------------------
   AGENT CONFIG
-------------------------------------------------------- */
const DEFAULT_DAO_AGENTS = ["daoSummarizer"];
const AI_AGENTS = ["daoSummarizer", "aiSummarizer"];

/* Per-DAO agent overrides */
const AGENT_ENDPOINTS = {
  Lido: ["stakingAnalyst", "daoSummarizer"],
  Arbitrum: ["daoSummarizer"],
  Optimism: ["daoSummarizer"],
  MakerDAO: ["daoSummarizer"],
  ENS: ["daoSummarizer"],
  Uniswap: ["daoSummarizer"],
  "The Graph": ["daoSummarizer"],
  Gitcoin: ["daoSummarizer"],
  Gnosis: ["daoSummarizer"],
  Safe: ["daoSummarizer"],
  Numerai: ["daoSummarizer"],
  Worldcoin: ["daoSummarizer"],
  GaiaNet: ["daoSummarizer"],
  Autonolas: ["daoSummarizer"],
  Cortex: ["daoSummarizer"],
  "Alethea AI": ["daoSummarizer"],
  Botto: ["daoSummarizer"],
  Bittensor: ["daoSummarizer"],
  "Fetch.ai": ["daoSummarizer"],
  "SingularityNET": ["daoSummarizer"],
  Aave: ["daoSummarizer"],
  Compound: ["daoSummarizer"],
  dYdX: ["daoSummarizer"],
  DEXE: ["daoSummarizer"],
  Ocean: ["daoSummarizer"],
  Mantle: ["daoSummarizer"],
};

/* -------------------------------------------------------
   Helpers
-------------------------------------------------------- */

// "The Graph" -> "thegraph"
const slug = (s = "") =>
  s.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "").replace(/(^-|-$)/g, "");

// choose a local image path from /public (png primary, then jpg, then svg)
function resolveLocalLogo(item) {
  if (item?.logo) {
    let p = item.logo.trim().replace(/^public\//, "");
    if (!p.startsWith("/")) p = "/" + p;
    return p;
  }
  const base = "/" + slug(item?.name || "");
  return `${base}.png`;
}

/* small concurrency guard so we don't hammer your server */
async function runWithLimit(tasks, limit = 2) {
  const results = [];
  const queue = [...tasks];

  async function worker() {
    while (queue.length) {
      const job = queue.shift();
      results.push(await job());
    }
  }
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/* POST an agent by slug, e.g. "daoSummarizer" or "aiSummarizer" */
async function callAgent(slug, payload) {
  try {
    const res = await fetch(`/.netlify/functions/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `Agent ${slug} failed`);
    }
    const data = await res.json().catch(() => ({}));
    if (typeof data === "string") return data;
    if (data?.result) return data.result;
    if (data?.text) return data.text;
    return JSON.stringify(data);
  } catch (e) {
    return `⚠️ ${slug}: ${e.message}`;
  }
}

/* -------------------------------------------------------
   Component
-------------------------------------------------------- */
export default function LiveFeed() {
  const [rowsDao, setRowsDao] = useState([]);
  const [rowsAi, setRowsAi] = useState([]);
  const [agentOut, setAgentOut] = useState({}); // key: `${type}:${name}` -> { agent: text }
  const [loading, setLoading] = useState(true);

  /* ------------ Loaders ------------ */
  async function loadDaos() {
    const { data, error } = await supabase
      .from("daos")
      .select("id,name,description,url,logo,tags,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("DAOs load error:", error.message);
      setRowsDao([]);
    } else {
      setRowsDao(data || []);
    }
  }

  async function loadAiAgents() {
    // expects a table "aiagents" with same schema as daos
    const { data, error } = await supabase
      .from("aiagents")
      .select("id,name,description,url,logo,tags,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("AI Agents load error:", error.message);
      setRowsAi([]);
    } else {
      setRowsAi(data || []);
    }
  }

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadDaos(), loadAiAgents()]);
    setLoading(false);
  }

  /* ------------ Effects ------------ */
  // initial load + subscribe to both tables
  useEffect(() => {
    loadAll();

    const chDaos = supabase
      .channel("live-daos")
      .on("postgres_changes", { event: "*", schema: "public", table: "daos" }, () => {
        loadDaos();
      })
      .subscribe();

    const chAgents = supabase
      .channel("live-aiagents")
      .on("postgres_changes", { event: "*", schema: "public", table: "aiagents" }, () => {
        loadAiAgents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chDaos);
      supabase.removeChannel(chAgents);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // run agents when lists change
  useEffect(() => {
    const runFor = async (type, item) => {
      const key = `${type}:${item.name}`;
      const agentNames =
        type === "dao" ? AGENT_ENDPOINTS[item.name] || DEFAULT_DAO_AGENTS : AI_AGENTS;

      const tasks = agentNames.map((ag) => async () => {
        const text = await callAgent(ag, { q: item.name, name: item.name, url: item.url, kind: type });
        return { agent: ag, text };
      });

      const results = await runWithLimit(tasks, 2);
      setAgentOut((prev) => ({
        ...prev,
        [key]: results.reduce((acc, r) => ({ ...acc, [r.agent]: r.text }), {}),
      }));
    };

    rowsDao.forEach((d) => runFor("dao", d));
    rowsAi.forEach((a) => runFor("ai", a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsDao, rowsAi]);

  /* ------------ Derived list (merged) ------------ */
  const items = useMemo(() => {
    const daos = (rowsDao || []).map((d) => ({ ...d, __type: "dao" }));
    const ais = (rowsAi || []).map((a) => ({ ...a, __type: "ai" }));
    // Mix them together by created_at (newest first)
    const all = [...daos, ...ais].sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return tb - ta;
    });
    return all;
  }, [rowsDao, rowsAi]);

  return (
    <section style={{ marginTop: 24 }}>
      <h2 className="section-title">Live Feed</h2>

      {loading && <div className="muted">Loading items…</div>}
      {!loading && items.length === 0 && <div className="muted">No items found.</div>}

      <div className="feed-grid">
        {items.map((it) => {
          const logoSrc = resolveLocalLogo(it);
          const key = `${it.__type}:${it.name}`;
          const outputs = agentOut[key] || {};
          const agentNames =
            it.__type === "dao"
              ? AGENT_ENDPOINTS[it.name] || DEFAULT_DAO_AGENTS
              : AI_AGENTS;

          return (
            <article key={(it.id || it.name) + ":" + it.__type} className="card">
              <div className="card-head">
                <img
                  className="avatar"
                  src={logoSrc}
                  width={40}
                  height={40}
                  alt={it.name}
                  onError={(e) => {
                    const tried = e.currentTarget.getAttribute("data-tried") || "png";
                    if (tried === "png") {
                      e.currentTarget.src = "/" + slug(it.name) + ".jpg";
                      e.currentTarget.setAttribute("data-tried", "jpg");
                    } else if (tried === "jpg") {
                      e.currentTarget.src = "/" + slug(it.name) + ".svg";
                      e.currentTarget.setAttribute("data-tried", "svg");
                    } else {
                      e.currentTarget.src = "/hfv-logo.png";
                    }
                  }}
                  style={{ borderRadius: 8 }}
                />
                <div className="title-wrap">
                  <h3 className="card-title">
                    {it.name || (it.__type === "dao" ? "Unknown DAO" : "Unknown Agent")}
                  </h3>
                  <div className="meta">
                    <span className="pill" title="Type" style={{ marginRight: 6 }}>
                      {it.__type.toUpperCase()}
                    </span>
                    {it.created_at && <span className="sep"> • </span>}
                    {it.created_at && (
                      <time className="muted">
                        {new Date(it.created_at).toLocaleString()}
                      </time>
                    )}
                    {it.url && (
                      <>
                        <span className="sep"> • </span>
                        <a className="ext" href={it.url} target="_blank" rel="noreferrer">
                          {safeHostname(it.url)} ↗
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {it.description && <p className="desc">{it.description}</p>}

              {/* Agent outputs */}
              <div className="agents-out">
                {agentNames.map((ag) => (
                  <div key={ag} className="agent-block">
                    <div className="pill" style={{ marginBottom: 6 }}>{ag}</div>
                    <pre className="agent-pre">{outputs[ag] ? outputs[ag] : "…running"}</pre>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <style>{`
        .feed-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }
        .card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 14px;
        }
        .card-head {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 8px;
        }
        .avatar { object-fit: contain; }
        .card-title { margin: 0; }
        .meta { font-size: 12px; opacity: .8; display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
        .sep { opacity: .6; }
        .desc { margin: 8px 0 12px 0; opacity: .95; }
        .pill {
          display: inline-block;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
        }
        .agent-block + .agent-block { margin-top: 8px; }
        .agent-pre {
          white-space: pre-wrap;
          font-size: 12px;
          line-height: 1.45;
          margin: 4px 0 0 0;
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          padding: 8px;
        }
        .ext { font-size: 12px; opacity: .9; }
      `}</style>
    </section>
  );
}

/* Utility */
function safeHostname(url = "") {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
