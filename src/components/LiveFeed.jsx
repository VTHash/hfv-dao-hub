import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

// --- helpers ---------------------------------------------------------------
function logoFromName(name = "") {
  if (!name) return "/hfv-logo.png"; // fallback
  const clean = name.trim().toLowerCase();

  // normalize common differences
  const map = {
    askhfv: "askhfv.png",
    autonolas: "autonolas.png",
    botto: "botto.jpg",
    bittensor: "bittensor.png",
    ocean: "ocean.png",
    alethea: "alethea.png",
    numerai: "numerai.png",
    gaianet: "gaianet.png",
    cortex: "cortex.png",
    worldcoin: "worldcoin.png",
    fetchai: "fetch.png", // your file is fetch.png
    singularitynet: "singularitynet.jpg",
    arbitrum: "arbitrum.png",
    compound: "compound.png",
    dexe: "dexe.png",
    dydx: "dydx.png",
    ens: "ens.png",
    gitcoin: "gitcoin.jpg",
    gnosis: "gnosis.png",
    lido: "lido.png",
    makerdao: "makerdao.png",
    mantle: "mantle.png",
    optimism: "optimism.png",
    safe: "safe.png",
    thegraph: "thegraph.png",
  };

  if (map[clean]) return `/${map[clean]}`;
  return `/hfv-logo.png`; // fallback if not found
}
// return a safe path that always points inside /public
function localImg(pathLike = "") {
  if (!pathLike || typeof pathLike !== "string") return "";
  let p = pathLike.trim().replace(/^['"]|['"]$/g, "");
  if (p.startsWith("public/")) p = p.slice("public/".length);
  if (!p.startsWith("/")) p = "/" + p;
  return p;
}

const AGENT_IMAGE_MAP = {
  askhfv: "/askhfv.png", // if you don't actually have this, it will fall back later
  autonolas: "/autonolas.png",
  botto: "/botto.jpg",
  bittensor: "/bittensor.png",
  ocean: "/ocean.png",
  alethea: "/alethea.png",
  numerai: "/numerai.png",
  gaianet: "/gaianet.png",
  cortex: "/cortex.png",
  worldcoin: "/worldcoin.png",
  fetchai: "/fetch.png", // note: your file is fetch.png
  singularitynet: "/singularitynet.jpg",
};

// small convenience
function agentAvatar(key) {
  return AGENT_IMAGE_MAP[key] || "/hfv-logo.png";
}

// split tags "a,b,c" -> ["a","b","c"]
function toChips(v = "") {
  return String(v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// --- component -------------------------------------------------------------

export default function LiveFeed() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | empty | error
  const [err, setErr] = useState("");

  async function fetchAll() {
    setStatus("loading");
    setErr("");

    const [postsRes, daosRes, agentsRes] = await Promise.all([
      supabase
        .from("posts")
        .select("id,title,content,author,source_type,source,url,tags,created_at")
        .order("created_at", { ascending: false })
        .limit(40),

      supabase
        .from("daos")
        .select("id,name,description,url,logo,tags,created_at")
        .order("created_at", { ascending: false })
        .limit(40),

      supabase
        .from("ai_agents")
        .select("id,key,name,description,endpoint,active,created_at") // no external avatar_url; we’ll map to /public/<key>.png
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

    if (postsRes.error || daosRes.error || agentsRes.error) {
      console.error("Load errors:", postsRes.error, daosRes.error, agentsRes.error);
      setErr(
        postsRes.error?.message ||
          daosRes.error?.message ||
          agentsRes.error?.message ||
          "Failed loading data"
      );
      setStatus("error");
      return;
    }

    // normalize to one shape consumed by the renderer
    const posts = (postsRes.data || []).map((p) => {
      const chip = toChips(p.tags);
      return {
        id: `post-${p.id}`,
        kind: "post",
        title: p.title || p.source || "Untitled",
        desc: p.content || "",
        author: p.author || "",
        source_type: p.source_type || "post",
        source: p.source || "",
        url: p.url || "",
        chip,
        // for posts we try to derive a local avatar from source/name
        avatar: logoFromName(p.source || p.title),
      };
    });

    // DAOs (use the logo filename from the table)
const daos = (daosRes.data || []).map((d) => ({
  id: `dao-${d.id}`,
  kind: "dao",
  title: d.name || "Unknown DAO",
  desc: d.description || "",
  author: "",
  source_type: "dao",
  source: "DAO Registry",
  url: d.url || "",
  chip: toChips(d.tags),
  avatar: localImg(d.logo || "/hfv-logo.png"), // <-- trusts your /public file
}));


    // AI Agents (map key -> exact /public filename)
const agents = (agentsRes.data || []).map((a) => ({
  id: `agent-${a.id}`,
  kind: "agent",
  title: a.name || a.key || "AI Agent",
  desc: a.description || "",
  author: "",
  source_type: "agent",
  source: a.key || "",
  url: "", // keep empty so it won’t render an external link button
  chip: a.active ? ["active"] : [],
  avatar: agentAvatar(a.key || ""),
}));

    const merged = [...posts, ...daos, ...agents];

    setItems(merged);
    setStatus(merged.length ? "ready" : "empty");
  }

  useEffect(() => {
    fetchAll();

    // Realtime refresh on any change in these tables
    const ch = supabase
      .channel("live-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "daos" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_agents" }, fetchAll)
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  const rendered = useMemo(() => items, [items]);

  return (
    <section style={{ marginTop: "2rem" }}>
      <h2 className="section-title">Live Feed</h2>

      {status === "loading" && <div className="muted">Loading…</div>}
      {status === "error" && <div className="error">Failed to load: {err}</div>}
      {status === "empty" && <div className="muted">No items yet.</div>}

      {status === "ready" && (
        <div className="feed-grid">
          {rendered.map((p) => (
            <article key={p.id} className="card">
              <div className="card-head">
                {p.avatar && (
                  <img
                    className="avatar"
                    src={p.avatar}
                    alt={p.source || p.title || "avatar"}
                    width={36}
                    height={36}
                    style={{ borderRadius: 8 }}
                    loading="lazy"
                  />
                )}

                <div className="title-wrap">
                  <h3 className="card-title">{p.title || p.source || "Untitled"}</h3>
                  <div className="meta">
                    <span className="pill">{p.source_type}</span>
                    {p.author && <span className="sep"> • </span>}
                    {p.author && <span className="muted">{p.author}</span>}
                  </div>
                </div>
              </div>

              {p.desc && <p className="desc">{p.desc}</p>}

              {!!(p.chip?.length || 0) && (
                <div className="chips">
                  {p.chip.map((tag) => (
                    <span key={tag} className="chip">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Only show as a button if it's NOT a local /public image path */}
              {p.url && !p.url.startsWith("/") && (
                <a className="ext" href={p.url} target="_blank" rel="noreferrer">
                  Open link ↗
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}