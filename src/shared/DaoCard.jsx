import React from "react";

export default function DaoCard({ dao }) {
  return (
    <article className="card">
      <div className="card-inner">
        <div className="card-head">
          {dao.logo ? (
            <img
              src={dao.logo}
              alt={dao.name + " logo"}
              className="dao-logo"
            />
          ) : (
            <div className="avatar">{dao.emoji || "🟢"}</div>
          )}

          <div className="head-text">
            <h3 className="card-title">{dao.name}</h3>
            <div className="tags">
              {dao.tags.map((t) => (
                <span key={t} className="tag">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {dao.description && <p className="desc">{dao.description}</p>}

        <div className="links">
          {dao.app && <a className="btn primary sm" href={dao.app} target="_blank" rel="noreferrer">Open App</a>}
          {dao.governance && <a className="btn ghost sm" href={dao.governance} target="_blank" rel="noreferrer">Governance</a>}
          {dao.forum && <a className="btn ghost sm" href={dao.forum} target="_blank" rel="noreferrer">Forum</a>}
          {dao.vote && <a className="btn ghost sm" href={dao.vote} target="_blank" rel="noreferrer">Vote</a>}
          {dao.snapshot && <a className="btn ghost sm" href={dao.snapshot} target="_blank" rel="noreferrer">Snapshot</a>}
        </div>
      </div>
    </article>
  );
}
