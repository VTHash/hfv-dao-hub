import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <section className="hero">
      <div className="hero-content">
        <img
        src="/hfv-logo.png"
        alt="HFV Protocol Logo"
        />
        <h1 className="hero-title">HFV DAO Hub</h1>
        <p className="hero-sub">
          Your curated gateway to top DAO apps & AI/Agents projetcs. Green glow, clean UX.
        </p>
        <div className="hero-actions">
          <Link to="/hub" className="btn primary">Explore DAO & AI</Link>
          <a href="https://deepdao.io/" target="_blank" rel="noreferrer" className="btn ghost">
            DAO Analytics (DeepDAO)
          </a>
        </div>

        {/* TODO: Add your custom homepage blocks (HFV stats, announcements, etc.) */}
      </div>
    </section>
  );
}