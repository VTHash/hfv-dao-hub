import React, { useEffect, useState } from "react";

function Section({ title, children }) {
  return (
    <section className="card" style={{ maxWidth: 980, marginBottom: 12 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {children}
    </section>
  );
}

export default function HomeFeed() {
  const [data, setData] = useState({ recommendations: null, items: [] });

  useEffect(() => {
    fetch("/api/feed").then(r => r.json()).then(setData).catch(()=>{});
  }, []);

  const rec = data.recommendations;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {rec && (
        <Section title="Recommended for you">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Governance */}
            <div className="card" style={{ background: "rgba(0,255,154,.04)" }}>
              <h3 style={{ marginTop: 0 }}>Governance — Hot Now</h3>
              <ul className="list">
                {rec.governance.map((g, i) => (
                  <li key={i}>
                    <b>{g.org}</b> — {g.title}
                    {g.link && <a href={g.link} target="_blank" rel="noreferrer" style={{ marginLeft: 6, color: "#00ff9a" }}>↗</a>}
                    <div className="muted" style={{ fontSize: 12 }}>Heat {g.heat}</div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Staking */}
            <div className="card" style={{ background: "rgba(0,255,154,.04)" }}>
              <h3 style={{ marginTop: 0 }}>Staking — Trending</h3>
              <ul className="list">
                {rec.staking.map((s, i) => (
                  <li key={i}><b>Contract</b> {s.contract?.slice?.(0,8) || s.contract} — Score {s.score.toFixed(2)}</li>
                ))}
              </ul>
            </div>

            {/* Pools */}
            <div className="card" style={{ background: "rgba(0,255,154,.04)" }}>
              <h3 style={{ marginTop: 0 }}>Pools — 24h Volume</h3>
              <ul className="list">
                {rec.pools.map((p, i) => (
                  <li key={i}><b>Pair</b> {p.pair?.slice?.(0,8) || p.pair} — Vol {Math.round(p.volume)}</li>
                ))}
              </ul>
            </div>

            {/* AI Agents */}
            <div className="card" style={{ background: "rgba(0,255,154,.04)" }}>
              <h3 style={{ marginTop: 0 }}>AI Agents — Trending</h3>
              <ul className="list">
                {rec.agents.map((a, i) => (
                  <li key={i}><b>{a.name || a}</b> — {a.count != null ? `${a.count} posts` : "info"}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      )}

      <Section title="Live Feed">
        <ul className="list">
          {data.items.map((it, i) => (
            <li key={i} style={{ margin: "8px 0" }}>
              <span style={{ marginRight: 6 }}>
                {it.kind === "proposal" ? "🗳️" :
                 it.kind === "treasury" ? "💰" :
                 it.kind === "staking" ? "📈" :
                 it.kind === "pool" ? "💧" :
                 it.kind === "ai-agent" ? "🤖" :
                 it.kind === "social" ? "📰" : "✨"}
              </span>
              <b>{it.title}</b>
              {it.link && <a href={it.link} target="_blank" rel="noreferrer" style={{ marginLeft: 8, color: "#00ff9a" }}>↗</a>}
              <div className="muted" style={{ fontSize: "0.8em" }}>
                {new Date(it.ts).toLocaleString()} · {it.source}
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}