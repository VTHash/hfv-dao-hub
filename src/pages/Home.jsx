import React from "react";
import { Link } from "react-router-dom";
import TokenTicker from "../components/TokenTicker.jsx";
export default function Home() {
  return (
    <section className="hero">
      <div className="hero-content">
        
        <h1 className="hero-title">HFV DAO Hub</h1>
        <p className="hero-sub">
          Your curated gateway to top DAO apps & AI/Agents.
        </p>
        <div className="hero-actions">
          <Link to="/hub" className="btn primary">Explore DAO & AI</Link>
          <a href="https://deepdao.io/" target="_blank" rel="noreferrer" className="btn ghost">
            DAO Analytics (DeepDAO)
          </a>
        </div>
        </div>
<div style={{marginTop:20}}>
  <TokenTicker />
      </div>
    </section>
  );
}
