import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient"; // <-- your existing client


function parseMeta(content = "") {

  const meta = {};
  content.split("|").forEach(pair => {
    const [k, ...rest] = pair.trim().split("=");
    const v = rest.join("=").trim(); // keep '=' that may appear in values
    if (k && v) meta[k.trim()] = v.replace(/^"|"$/g, "");
  });
  return meta;
}

// Simple image url test
const isImg = (u = "") => /^https?:\/\/.+\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(u);

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
    } else {
      setPosts(data || []);
      setStatus((data && data.length) ? "ready" : "empty");
    }
  }

  // Realtime: refresh on any change to posts
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

  const rendered = useMemo(() => {
    return posts.map(p => {
      const meta = parseMeta(p.content);
      const avatar =
        (p.url && isImg(p.url) && p.url) ||
        meta.avatar ||
        "https://hfv-hub.org/avatars/default.png";

      const desc = meta.desc || p.content || "";
      const chip = (p.tags || "").split(",").map(s => s.trim()).filter(Boolean);

      return { ...p, avatar, desc, chip };
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
          {rendered.map(p => (
            <article key={p.id} className="card">
              <div className="card-head">
                <img className="avatar" src={p.avatar} alt={p.source || p.title} />
                <div className="title-wrap">
                  <h3 className="card-title">{p.title || p.source || "Untitled"}</h3>
                  <div className="meta">
                    <span className="pill">{p.source_type}</span>
                    {p.author && <span className="sep">•</span>}
                    {p.author && <span className="muted">{p.author}</span>}
                    {p.created_at && <span className="sep">•</span>}
                    {p.created_at && (
                      <time className="muted">
                        {new Date(p.created_at).toLocaleString()}
                      </time>
                    )}
                  </div>
                </div>
              </div>

              {p.desc && <p className="desc">{p.desc}</p>}

              {!!p.chip.length && (
                <div className="chips">
                  {p.chip.map(tag => (
                    <span key={tag} className="chip">#{tag}</span>
                  ))}
                </div>
              )}

              {(p.url && !isImg(p.url)) && (
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

