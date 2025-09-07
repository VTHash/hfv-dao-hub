import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

/* ---------- helpers ---------- */

// normalize path inside /public
function localImgPath(file) {
  if (!file) return "";
  let p = String(file).trim().replace(/^['"]|['"]$/g, "");
  if (p.startsWith("public/")) p = p.slice("public/".length);
  if (!p.startsWith("/")) p = "/" + p;
  return p;
}

// build logo path for AI agent from key
function agentLogo(key) {
  if (!key) return "/hfv-logo.png"; // fallback
  return localImgPath(`${key.toLowerCase()}.png`);
}

/* ---------- component ---------- */

export default function LiveFeed() {
  const [feed, setFeed] = useState([]);
  const [err, setErr] = useState("");

  async function fetchData() {
    setErr("");

    const [postsRes, daosRes, agentsRes] = await Promise.all([
      supabase
        .from("posts")
        .select("id,title,content,author,source_type,source,url,tags,created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("daos")
        .select("id,name,description,url,logo,tags,created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("ai_agents")
        .select("id,key,name,description,created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const errs = [postsRes.error, daosRes.error, agentsRes.error]
      .filter(Boolean)
      .map((e) => e.message)
      .join(" • ");
    if (errs) setErr(errs);

    const mappedPosts = (postsRes.data || []).map((p) => ({
      id: `post:${p.id}`,
      kind: "post",
      title: p.title || p.source || "Untitled",
      desc: p.content || "",
      logo: "/hfv-logo.png", // fallback logo
      url: p.url || "",
      created_at: p.created_at,
      tags: p.tags || "",
    }));

    const mappedDaos = (daosRes.data || []).map((d) => ({
      id: `dao:${d.id}`,
      kind: "dao",
      title: d.name,
      desc: d.description || "",
      logo: localImgPath(d.logo || "hfv-logo.png"),
      url: d.url || "",
      created_at: d.created_at,
      tags: d.tags || "",
    }));

    const mappedAgents = (agentsRes.data || []).map((a) => ({
      id: `agent:${a.id}`,
      kind: "agent",
      title: a.name,
      desc: a.description || "",
      logo: agentLogo(a.key),
      url: "",
      created_at: a.created_at,
      tags: "",
    }));

    const merged = [...mappedPosts, ...mappedDaos, ...mappedAgents].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    setFeed(merged);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("live-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "daos" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_agents" }, fetchData)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <section style={{ marginTop: 24 }}>
      <h2 className="section-title">Live Feed</h2>
      {err && <div className="error">Load error: {err}</div>}
      {feed.length === 0 && !err && <div className="muted">No activity yet.</div>}

      <ul className="feed-list">
        {feed.map((item) => (
          <li key={item.id} className="feed-card">
            {item.logo && (
              <img
                src={item.logo}
                alt={item.title}
                width={36}
                height={36}
                style={{ borderRadius: 8, marginRight: 12 }}
              />
            )}
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <strong>{item.title}</strong>
                <span className="pill">{item.kind}</span>
              </div>
              {item.desc && <div className="muted">{item.desc}</div>}
              {item.url && (
                <a href={item.url} target="_blank" rel="noreferrer">
                  link ↗
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
