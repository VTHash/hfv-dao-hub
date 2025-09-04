import React, { useMemo, useState } from "react";
import { AGENTS, TAGS_AI } from "../shared/agents.js";
import DaoCard from "../shared/DaoCard.jsx";

export default function AIAgents() {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("All");

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    return AGENTS.filter(a => {
      const matchQ =
        !query ||
        a.name.toLowerCase().includes(query) ||
        (a.short && a.short.toLowerCase().includes(query)) ||
        (a.description && a.description.toLowerCase().includes(query));
      const matchTag = tag === "All" || a.tags.includes(tag);
      return matchQ && matchTag;
    });
  }, [q, tag]);

  return (
    <section>
      <div className="hub-head">
        <h2 className="title">AI / Agents</h2>
        <p className="sub">
          Browse AI- and agent-centric Web3 projects. Search by name, filter by tag, and open their apps or governance.
        </p>
      </div>

      <div className="toolbar">
        <div className="search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, tag… (e.g., 'Agents', 'Inference', 'Marketplace')"
            aria-label="Search AI/Agents"
          />
        </div>
        <div className="filters">
          {TAGS_AI.map(t => (
            <button
              key={t}
              className={`pill ${tag === t ? "active" : ""}`}
              onClick={() => setTag(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid">
        {visible.map(agent => (
          <DaoCard key={agent.id} dao={agent} />
        ))}
        {visible.length === 0 && (
          <div className="empty">No results. Try another keyword or tag.</div>
        )}
      </div>
    </section>
  );
}
