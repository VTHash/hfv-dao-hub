import React, { useMemo, useState } from "react";
import DaoCard from "../shared/DaoCard.jsx";
import { DAOS, TAGS as DAO_TAGS } from "../shared/daos.js";
import { AGENTS, TAGS_AI } from "../shared/agents.js";

const TABS = [
  { key: "dao", label: "DAO Apps" },
  { key: "ai", label: "AI / Agents" },
];

export default function Hub() {
  const [tab, setTab] = useState("dao");

  // Keep independent states per tab
  const [qDao, setQDao] = useState("");
  const [tagDao, setTagDao] = useState("All");

  const [qAi, setQAi] = useState("");
  const [tagAi, setTagAi] = useState("All");

  const daoVisible = useMemo(() => {
    const q = qDao.trim().toLowerCase();
    return DAOS.filter(d => {
      const matchQ =
        !q ||
        d.name.toLowerCase().includes(q) ||
        (d.short && d.short.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q));
      const matchTag = tagDao === "All" || d.tags.includes(tagDao);
      return matchQ && matchTag;
    });
  }, [qDao, tagDao]);

  const aiVisible = useMemo(() => {
    const q = qAi.trim().toLowerCase();
    return AGENTS.filter(a => {
      const matchQ =
        !q ||
        a.name.toLowerCase().includes(q) ||
        (a.short && a.short.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q));
      const matchTag = tagAi === "All" || a.tags.includes(tagAi);
      return matchQ && matchTag;
    });
  }, [qAi, tagAi]);

  const isDao = tab === "dao";
  const TAGS = isDao ? DAO_TAGS : TAGS_AI;

  return (
    <section>
      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="hub-head">
        <h2 className="title">{isDao ? "DAO Apps" : "AI / Agents"}</h2>
        <p className="sub">
          {isDao
            ? "Search & filter DAO apps. Open App, Governance, Forum, Vote, or Snapshot."
            : "Search & filter AI- and agent-centric projects. Open their apps or governance."}
        </p>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search">
          {isDao ? (
            <input
              value={qDao}
              onChange={(e) => setQDao(e.target.value)}
              placeholder="Search by name, tag… (e.g., 'L2', 'lending')"
              aria-label="Search DAO Apps"
            />
          ) : (
            <input
              value={qAi}
              onChange={(e) => setQAi(e.target.value)}
              placeholder="Search by name, tag… (e.g., 'Agents', 'Inference')"
              aria-label="Search AI / Agents"
            />
          )}
        </div>
        <div className="filters">
          {TAGS.map(t => (
            <button
              key={t}
              className={`pill ${
                (isDao ? tagDao : tagAi) === t ? "active" : ""
              }`}
              onClick={() => (isDao ? setTagDao(t) : setTagAi(t))}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid">
        {(isDao ? daoVisible : aiVisible).map(item => (
          <DaoCard key={item.id} dao={item} />
        ))}
        {(isDao ? daoVisible : aiVisible).length === 0 && (
          <div className="empty">No results. Try another keyword or tag.</div>
        )}
      </div>
    </section>
  );
}