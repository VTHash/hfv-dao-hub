import React from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Hub from "./pages/Hub.jsx";

export default function App() {
  return (
    <div className="app">
      {/* Topbar */}
      <header className="topbar">
       <Link to="/" className="brand">
      <img
        src="/hfv-logo.png"
        alt="HFV Logo"
        className="brand-logo"
      />
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
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/hub" element={<Hub />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div>© {new Date().getFullYear()} HFV Protocol</div>
        <div className="tiny">© HFV  transparent by design</div>
      </footer>
    </div>
  );
}