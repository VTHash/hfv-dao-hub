import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

/** Always use local /public images */
function localLogo(slugOrKey, explicitFile) {
  if (explicitFile) return `/${String(explicitFile).replace(/^public\//, "")}`;
  if (!slugOrKey) return "/hfv-logo.png";
  const base = String(slugOrKey).toLowerCase();
  // prefer .png, fallback to .jpg automatically via onError
  return `/${base}.png`;
}

export default function LiveFeed() {
  const [rows, setRows] = useState([]);
  const [expanded, setExpanded] = useState(null); // id of expanded card
  const [liveCache, setLiveCache] = useState({}); // { sourceKey: [posts] }
  const [loadingLive, setLoadingLive] = useState(null); // sourceKey currently loading

  // --- DATA LOAD -------------------------------------------------------------
  async function load() {
    // If you use the unified view suggested earlier:
    const { data, error } = await supabase
      .from("v_feed_all")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("feed error:", error.message);
      return;
    }

    const mapped = (data || []).map((r, index) => ({
  id: r.row_id ? `${r.kind}-${r.row_id}` : `${r.kind}-fallback-${index}`,
  kind: r.kind,
  title: r.title,
  desc: r.description,
  url: r.external_url,
  source_type: r.source_type,
  source: r.source_key,
  tags: (r.tags || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean),
  avatar: localLogo(r.slug || r.source_key, r.logo_file),
}));


    setRows(mapped);
  }

  useEffect(() => {
    load();
    // refresh when new posts arrive
    const ch = supabase
      .channel("feed-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  // --- LIVE EXPANDER --------------------------------------------------------
  async function loadLiveFor(sourceKey) {
    if (!sourceKey) return;
    // already cached?
    if (liveCache[sourceKey]) return;

    setLoadingLive(sourceKey);
    const { data, error } = await supabase
      .from("posts")
      .select("id, content, created_at, source")
      .eq("source", sourceKey)
      .order("created_at", { ascending: false })
      .limit(5);

    setLoadingLive(null);

    if (error) {
      console.error("live agent pull failed:", error.message);
      setLiveCache(prev => ({ ...prev, [sourceKey]: [{ id: "err", content: `⚠️ ${error.message}` }] }));
      return;
    }

    setLiveCache(prev => ({ ...prev, [sourceKey]: data || [] }));
  }

  function toggleExpand(row) {
    const next = expanded === row.id ? null : row.id;
    setExpanded(next);
    if (next) loadLiveFor(row.source); // lazy load live text
  }

  const cards = useMemo(() => rows, [rows]);

  // --- RENDER ---------------------------------------------------------------
  return (
    <section style={{ marginTop: 24 }}>
      <h2 className="section-title">HFV Hub</h2>

      <div className="feed-grid">
        {cards.map(p => {
          const isExpanded = expanded === p.id;
          const liveItems = liveCache[p.source];

          return (
            <article key={p.id} className={`card ${isExpanded ? "card-open" : ""}`}>
              {/* header */}
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
                    onError={(e) => {
                      // fallback from .png to .jpg if needed
                      if (!e.target.dataset.triedJpg) {
                        e.target.dataset.triedJpg = "1";
                        e.target.src = p.avatar.replace(/\.png$/i, ".jpg");
                      }
                    }}
                  />
                )}

                <div className="title-wrap">
                  <h3 className="card-title">
                    {p.title || p.source || "Untitled"}
                  </h3>
                  <div className="meta">
                    <span className="pill">{p.source_type}</span>
                    {p.source && <span className="sep"> • </span>}
                    {p.source && <span className="muted">{p.source}</span>}
                  </div>
                </div>

                {/* actions */}
                <div className="actions">
                  {p.url && (
                    <a className="ext" href={p.url} target="_blank" rel="noreferrer">
                      Open link ↗
                    </a>
                  )}
                  {/* Show Live only for agents or daos that have matching agent posts */}
                  <button className="ghost" onClick={() => toggleExpand(p)}>
                    {isExpanded ? "Hide live" : "Live agent"}
                  </button>
                </div>
              </div>

              {/* body */}
              {p.desc && <p className="desc">{p.desc}</p>}

              {!!p.tags.length && (
                <div className="chips">
                  {p.tags.map(tag => (
                    <span key={tag} className="chip">#{tag}</span>
                  ))}
                </div>
              )}

              {/* expandable panel */}
              <div className="live-wrap" style={{ display: isExpanded ? "block" : "none" }}>
                {loadingLive === p.source && (
                  <div className="muted">Loading live updates…</div>
                )}

                {liveItems && liveItems.length === 0 && (
                  <div className="muted">No live updates yet.</div>
                )}

                {liveItems && liveItems.length > 0 && (
                  <ul className="live-list">
                    {liveItems.map(item => (
                      <li key={item.id} className="live-item">
                        <div className="live-dot" />
                        <div className="live-text">{item.content}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}