import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";

/* -----------------------------
   Helpers
------------------------------*/

// Parse your pipe-separated meta content: key=value | key=value | ...
function parseMeta(content = "") {
  const meta = {};
  if (!content || typeof content !== "string") return meta;

  content.split("|").forEach((pair) => {
    const [k, ...rest] = pair.trim().split("=");
    const key = (k || "").trim();
    const val = rest.join("=").trim().replace(/^"|"$/g, ""); // keep '=' inside values, strip outer quotes
    if (key && val) meta[key] = val;
  });

  return meta;
}

/** AI/DAO source → filename (without extension) in /public */
const ALIASES = {
  // AI / Agents
  askhfv: "hfv-logo",
  fetch: "fetch",
  fetchai: "fetch",
  singularitynet: "singularitynet",
  bittensor: "bittensor",
  autonolas: "autonolas",
  numerai: "numerai",
  cortex: "cortex",
  alethea: "alethea",
  botto: "botto",
  ocean: "ocean",
  worldcoin: "worldcoin",
  gaianet: "gaianet",

  // DAOs
  aave: "aave",
  arbitrum: "arbitrum",
  ens: "ens",
  gnosis: "gnosis",
  lido: "lido",
  makerdao: "makerdao",
  compound: "compound",
  dydx: "dydx",
  dexe: "dexe",
  optimism: "optimism",
  safe: "safe",
  thegraph: "thegraph",
  uniswap: "uniswap",
  mantle: "mantle-mnt-logo", // svg special

  // Misc / site
  hfv: "hfv-logo",
  "hfv-logo": "hfv-logo",
  gitcoin: "gitcoin",
};

/** Files that are .jpg in /public (everything else is .png, except mantle svg) */
const JPG = new Set(["botto", "gitcoin", "singularitynet"]);

/** Build a public path from a slug or path (never external) */
function toLocalImage(slugOrPath = "") {
  if (!slugOrPath) return "";

  // Already looks like a public path
  if (slugOrPath.startsWith("/")) return slugOrPath;

  // Clean and strip extension/public/
  let slug = String(slugOrPath)
    .trim()
    .replace(/^public\//i, "")
    .toLowerCase()
    .replace(/\.(png|jpg|jpeg|webp|gif|svg)$/i, "");

  // Special svg
  if (slug === "mantle" || slug === "mantle-mnt-logo") return "/mantle-mnt-logo.svg";

  const ext = JPG.has(slug) ? "jpg" : "png";
  return `/${slug}.${ext}`;
}

/** Decide which local avatar to use for a post */
function pickLocalAvatar(p, meta) {
  // 1) meta.avatar hint (e.g., "gaianet" or "/gaianet.png")
  if (meta?.avatar) {
    // If they wrote something like "gaianet" or "GaiaNet"
    const hint = meta.avatar.trim();
    const mapped = ALIASES[hint.toLowerCase()] || hint;
    return toLocalImage(mapped);
  }

  // 2) based on source
  const src = (p.source || "").trim().toLowerCase();
  const mapped = ALIASES[src] || src || "hfv-logo";
  return toLocalImage(mapped);
}

/* -----------------------------
   Component
------------------------------*/

export default function HomeFeed() {
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | empty | error
  const [errMsg, setErrMsg] = useState("");

  // Fetch newest first
  async function load() {
    setStatus("loading");
    const { data, error } = await supabase
      .from("posts")
      .select("id,title,content,author,source_type,source,url,tags,created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error(error);
      setErrMsg(error.message);
      setStatus("error");
      return;
    }

    setPosts(data || []);
    setStatus(data && data.length ? "ready" : "empty");
  }

  // Realtime refresh on posts changes
  useEffect(() => {
    load();

    const channel = supabase
      .channel("posts-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => load()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Precompute derived fields for rendering
  const rendered = useMemo(() => {
    return (posts || []).map((p) => {
      const meta = parseMeta(p?.content || "");
      const avatar = pickLocalAvatar(p, meta);
      const desc = meta.desc || p.content || "";
      const chip =
        (p.tags || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean) || [];

      return { ...p, meta, avatar, desc, chip };
    });
  }, [posts]);

  return (
    <section style={{ marginTop: 24 }}>
      <h2 className="section-title">Live Posts</h2>

      {status === "loading" && <div className="muted">Loading latest posts…</div>}
      {status === "error" && <div className="error">Failed to load posts: {errMsg}</div>}
      {status === "empty" && <div className="muted">No posts yet. Check back soon.</div>}

      {status === "ready" && (
        <div className="feed-grid">
          {rendered.map((p) => (
            <article key={p.id} className="card">
              <div className="card-head">
                {/* Local avatar from /public only */}
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
                    {}
                  </div>
                </div>
              </div>

              {p.desc && <p className="desc">{p.desc}</p>}

              {!!p.chip.length && (
                <div className="chips">
                  {p.chip.map((tag) => (
                    <span key={tag} className="chip">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* If you still want to show external links as a button */}
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
