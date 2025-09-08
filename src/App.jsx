import React from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Hub from "./pages/Hub.jsx";
import LiveFeed from "./components/LiveFeed.jsx";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <img src="/hfv-logo.png" alt="HFV Logo" className="brand-logo" />
          <span>HFV DAO Hub</span>
        </Link>

        <nav className="nav">
          <NavLink to="/" end className="navlink">Home</NavLink>
          <NavLink to="/hub" className="navlink">Hub</NavLink>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/hub" element={<Hub />} />
        </Routes>

        <section style={{ marginTop: "2rem" }}>
          
          
          <LiveFeed />
        </section>
      </main>

      <footer className="footer">
        <div>© {new Date().getFullYear()} HFV Protocol</div>
        <div className="tiny">© HFV transparent by design</div>
      </footer>
    </div>
  );
}
