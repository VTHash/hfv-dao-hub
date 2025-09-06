import { summarize } from "./llm.js";
import { recentProposals, recentTreasury, recentStaking, recentLP, trendingAgents } from "./agentTools.js";

export const Agents = {
  async daoSummarizer({ q }) {
    const [props, treas] = await Promise.all([recentProposals(25), recentTreasury(15)]);
    const context =
      `Recent proposals:\n` +
      props.map(p => `- [${p.org}] ${p.title} (${p.status}) ${p.summary ? "– " + p.summary : ""}`).join("\n") +
      `\n\nRecent treasury moves:\n` +
      treas.map(t => `- ${t.method || "tx"} at ${new Date(t.ts).toISOString()}`).join("\n");

    const system = "You are an expert DAO governance analyst. Be concise, neutral, and action-oriented.";
    const user = `Question: ${q}\n\nContext:\n${context}\n\nOutput: bullet points (max 8), include links if provided.`;
    return await chatLLM(system, user);
  },

  async stakingAnalyst({ q }) {
    const [stakes, lps] = await Promise.all([recentStaking(40), recentLP(40)]);
    const context =
      `Staking events (latest first):\n` +
      stakes.map(s => `- ${s.evt} ${s.amount} at ${new Date(s.ts).toISOString()}`).join("\n") +
      `\n\nLP activity (24h proxy):\n` +
      lps.map(l => `- ${l.evt} ${l.amount0}/${l.amount1} at ${new Date(l.ts).toISOString()}`).join("\n");

    const system = "You are a DeFi yield strategist. Explain risks, APY drivers, and liquidity impact.";
    const user = `User question: ${q}\n\nData:\n${context}\n\nReply: bullets (<=8), highlight best options and caveats.`;
    return await chatLLM(system, user);
  },

  async aiRecommender({ q }) {
    const agents = await trendingAgents(12);
    const props = await recentProposals(12);
    const context =
      `Trending AI/Agent projects (by social mentions):\n` +
      agents.map(a => `- ${a.project}: ${a.posts} posts (48h)`).join("\n") +
      `\n\nLatest governance proposals:\n` +
      props.map(p => `- [${p.org}] ${p.title}`).join("\n");

    const system = "You recommend DAOs/AI agents based on activity and relevance. Keep it crisp.";
    const user = `User intent: ${q}\n\nSignals:\n${context}\n\nOutput: top 5 recommendations with 1-line reason each.`;
    return await chatLLM(system, user);
  },
};