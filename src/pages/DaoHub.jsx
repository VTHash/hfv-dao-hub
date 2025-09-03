import React, { useMemo, useState } from "react";
import { DAOS, TAGS } from "../shared/daos.js";
import DaoCard from "../shared/DaoCard.jsx";

export default function DaoHub() {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("All");

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    return DAOS.filter(d => {
      const matchQ =
        !query ||
        d.name.toLowerCase().includes(query) ||
        (d.short && d.short.toLowerCase().includes(query)) ||
        (d.description && d.description.toLowerCase().includes(query));
      const matchTag = tag === "All" || d.tags.includes(tag);
      return matchQ && matchTag;
    });
  }, [q, tag]);

  return (
    <section>
      <div className="hub-head">
        <h2 className="title">DAO Apps</h2>
        <p className="sub">
          Search & filter. Click a card to open governance, forum, or vote portals in a new tab.
        </p>
      </div>

      <div className="toolbar">
        <div className="search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, tag… (e.g., 'L2', 'lending', 'snapshot')"
            aria-label="Search DAOs"
          />
        </div>
        <div className="filters">
          {TAGS.map(t => (
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
        {visible.map(dao => (
          <DaoCard key={dao.id} dao={dao} />
        ))}
        {visible.length === 0 && (
          <div className="empty">No results. Try another keyword or tag.</div>
        )}
      </div>
    </section>
  );
}