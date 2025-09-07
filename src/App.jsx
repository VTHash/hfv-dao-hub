import React, { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Hub from "./pages/Hub.jsx";
import LiveFeed from "./components/LiveFeed.jsx";
import { createClient } from "@supabase/supabase-js";
// Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [instruments, setInstruments] = useState([]);

  useEffect(() => {
    getInstruments();
  }, []);

  async function getInstruments() {
    const { data, error } = await supabase.from("instruments").select();
    if (error) {
      console.error("Error fetching instruments:", error.message || error);

    } else {
      setInstruments(data ?? []);
    }
  }

  return (
    <div className="app">
      {/* Topbar */}
      <header className="topbar">
        <Link to="/" className="brand">
          <img src="/hfv-logo.png" alt="HFV Logo" className="brand-logo" />
          <span>HFV DAO Hub</span>
        </Link>

        <nav className="nav">
          <NavLink to="/" end className="navlink">
            Home
          </NavLink>
          <NavLink to="/hub" className="navlink">
            Hub
          </NavLink>
        </nav>
      </header>

      {/* Main */}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/hub" element={<Hub />} />
        </Routes>

        {/* Instruments list (Supabase) */}
        <section style={{ marginTop: "2rem" }}>
          <ul>
            {instruments.map((instrument) => (
              <li key={instrument.id ?? instrument.name}>{instrument.name}</li>
            ))}
          </ul>
        </section>

        {/* Live Feed */}
        <section style={{ marginTop: "2rem" }}>
          <div className="tiny">LiveFeed </div>
          <h1>HFV Hub</h1>
          <LiveFeed />
        </section>
         </main>
      {/* Footer */}
      <footer className="footer">
        <div>© {new Date().getFullYear()} HFV Protocol</div>
        <div className="tiny">© HFV transparent by design</div>
      </footer>
    </div>
)}