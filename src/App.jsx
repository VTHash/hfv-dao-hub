import React from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import DaoHub from "./pages/DaoHub.jsx";
import Home from "./pages/Home.jsx";

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="logo-dot" /> <span>HFV DAO Hub</span>
        </Link>
        <nav className="nav">
          <NavLink to="/" end className="navlink">Home</NavLink>
          <NavLink to="/daos" className="navlink">DAO Apps</NavLink>
        </nav>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/daos" element={<DaoHub />} />
        </Routes>
      </main>

      <footer className="footer">
        <div>© {new Date().getFullYear()} HFV Protocol</div>
        <div className="tiny">© HFV  transparent by design.</div>
      </footer>
    </div>
  );
}