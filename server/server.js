// server/server.js
import express from "express";
import cors from "cors";

// NOTE: these files are in the SAME folder as server.js
import feedRouter from "./feed.js";
import agentRouter from "./agentRouter.js";

const app = express();

// CORS for local dev + prod
app.use(cors({
  origin: ["http://localhost:5173", "https://hfv-hub.org"],
}));

app.use(express.json());

// Simple health check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Mount routers
app.use("/api", feedRouter);
app.use("/api", agentRouter);

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});