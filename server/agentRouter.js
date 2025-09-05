import express from "express";
import { Agents } from "./agents.js";

const router = express.Router();

// Simple keyword router (fallback to daoSummarizer)
function routeFor(q, agent) {
  if (agent && Agents[agent]) return agent;
  const s = (q||"").toLowerCase();
  if (s.includes("apy") || s.includes("stake") || s.includes("liquidity")) return "stakingAnalyst";
  if (s.includes("agent") || s.includes("ai")) return "aiRecommender";
  return "daoSummarizer";
}

// POST /api/ask { q: "...", agent?: "daoSummarizer"|"stakingAnalyst"|"aiRecommender" }
router.post("/ask", express.json(), async (req, res) => {
  try {
    const q = (req.body?.q || "").toString().slice(0, 2000);
    const agentKey = routeFor(q, req.body?.agent);
    const answer = await Agents[agentKey]({ q, user: req.user || null });
    res.json({ agent: agentKey, answer });
  } catch (e) {
    res.status(500).json({ error: e.message || "agent failed" });
  }
});

export default router;