import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

/* -------------------------------------------------------
   CONFIG: which agents to run for each DAO (by name)
   - If a DAO isn't listed here, it will use DEFAULT_AGENTS
   - Values are agent endpoint slugs handled by your server
-------------------------------------------------------- */
const DEFAULT_AGENTS = ["daoSummarizer"];
const AGENT_ENDPOINTS = {
  Lido: ["stakingAnalyst", "daoSummarizer"],
  Arbitrum: ["daoSummarizer"],
  Optimism: ["daoSummarizer"],
  MakerDAO: ["daoSummarizer"],
  ENS: ["daoSummarizer"],
  Uniswap: ["daoSummarizer"],
  "The Graph": ["daoSummarizer"],
  "Gitcoin": ["daoSummarizer"],
  "Gnosis": ["daoSummarizer"],
  "Safe": ["daoSummarizer"],
  "Numerai": ["daoSummarizer"],
  "Worldcoin": ["daoSummarizer"],
  "GaiaNet": ["daoSummarizer"],
  "Autonolas": ["daoSummarizer"],
  "Cortex": ["daoSummarizer"],
  "Alethea AI": ["daoSummarizer"],
  "Botto": ["daoSummarizer"],
  "Bittensor": ["daoSummarizer"],
  "Fetch.ai": ["daoSummarizer"],
  "SingularityNET": ["daoSummarizer"],
  Aave: ["daoSummarizer"],
  Compound: ["daoSummarizer"],
  dYdX: ["daoSummarizer"],
  DEXE: ["daoSummarizer"],
  Ocean: ["daoSummarizer"],
  Mantle: ["daoSummarizer"]
};

/* -------------------------------------------------------
   Helpers
-------------------------------------------------------- */

// turn "The Graph" -> "thegraph"
const slug = (s = "") =>
  s.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "").replace(/(^-|-$)/g, "");

// choose a local image path from /public (png/jpg/svg)
function resolveLocalLogo(dao) {
  // 1) explicit logo field (e.g. "lido.png" or "/lido.png")
  if (dao?.logo) {
    let p = dao.logo.trim().replace(/^public\//, "");
    if (!p.startsWith("/")) p = "/" + p;
    return p;
  }

  // 2) guess by name (try .png, .jpg, .svg)
  const base = "/" + slug(dao?.name || "");
  return `${base}.png`; // our primary convention
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
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () =>
    worker()
  );
  await Promise.all(workers);
  return results;
}

/* POST an agent by slug, e.g. "daoSummarizer" */
async function callAgent(slug, payload) {
  try {
    const res = await fetch(`/api/agents/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {})
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `Agent ${slug} failed`);
    }
    const data = await res.json().catch(() => ({}));
    // normalize possible shapes coming from your agents.js
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
  const [daos, setDaos] = useState([]);
  const [agentOut, setAgentOut] = useState({}); // { [daoName]: { [agent]: result } }
  const [loading, setLoading] = useState(true);

  // fetch daos from supabase
  async function loadDaos() {
    setLoading(true);
    const { data, error } = await supabase
      .from("daos")
      .select("id,name,description,url,logo,tags,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("DAOs load error:", error.message);
      setDaos([]);
    } else {
      setDaos(data || []);
    }
    setLoading(false);
  }

  // run agents for a single dao and stash the results
  async function runAgentsForDao(dao) {
    const list = AGENT_ENDPOINTS[dao.name] || DEFAULT_AGENTS;
    const tasks = list.map((ag) => async () => {
      const text = await callAgent(ag, { q: dao.name, dao: dao.name, url: dao.url });
      return { agent: ag, text };
    });
    const results = await runWithLimit(tasks, 2);
    setAgentOut((prev) => ({
      ...prev,
      [dao.name]: results.reduce((acc, r) => ({ ...acc, [r.agent]: r.text }), {})
    }));
  }

  // initial load + subscribe to changes
  useEffect(() => {
    loadDaos();

    const ch = supabase
      .channel("live-daos")
      .on("postgres_changes", { event: "*", schema: "public", table: "daos" }, () => {
        loadDaos();
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  // whenever DAOs change, (re)run agents for each one
  useEffect(() => {
    if (!daos?.length) return;
    daos.forEach((d) => runAgentsForDao(d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daos]);

  const items = useMemo(() => daos || [], [daos]);

  return (
    <section style={{ marginTop: 24 }}>
      <h2 className="section-title">Live Feed</h2>

      {loading && <div className="muted">Loading DAOs…</div>}
      {!loading && items.length === 0 && <div className="muted">No DAOs found.</div>}

      <div className="feed-grid">
        {items.map((dao) => {
          const logoSrc = resolveLocalLogo(dao);
          const outputs = agentOut[dao.name] || {};
          const agentNames = AGENT_ENDPOINTS[dao.name] || DEFAULT_AGENTS;

          return (
            <article key={dao.id || dao.name} className="card">
              <div className="card-head">
                <img
                  className="avatar"
                  src={logoSrc}
                  width={40}
                  height={40}
                  alt={dao.name}
                  onError={(e) => {
                    // try .jpg then .svg, then fallback to HFV logo
                    const tried = e.currentTarget.getAttribute("data-tried") || "png";
                    if (tried === "png") {
                      e.currentTarget.src = "/" + slug(dao.name) + ".jpg";
                      e.currentTarget.setAttribute("data-tried", "jpg");
                    } else if (tried === "jpg") {
                      e.currentTarget.src = "/" + slug(dao.name) + ".svg";
                      e.currentTarget.setAttribute("data-tried", "svg");
                    } else {
                      e.currentTarget.src = "/hfv-logo.png";
                    }
                  }}
                  style={{ borderRadius: 8 }}
                />
                <div className="title-wrap">
                  <h3 className="card-title">{dao.name || "Unknown DAO"}</h3>
                  <div className="meta">
                    {dao.url && (
                      <a className="ext" href={dao.url} target="_blank" rel="noreferrer">
                        {new URL(dao.url).hostname} ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {dao.description && <p className="desc">{dao.description}</p>}

              {/* Agents output */}
              <div className="agents-out">
                {agentNames.map((ag) => (
                  <div key={ag} className="agent-block">
                    <div className="pill" style={{ marginBottom: 6 }}>{ag}</div>
                    <pre className="agent-pre">
                      {outputs[ag] ? outputs[ag] : "…running"}
                    </pre>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      {/* minimal styles if you don't have these already */}
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
        .meta { font-size: 12px; opacity: .8; }
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