import express from "express";
import { Client as Pg } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

// DB client
const pg = new Pg({ connectionString: process.env.DATABASE_URL });
await pg.connect();

// ---- load config safely (relative to this file) ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cfgPath = path.resolve(__dirname, "../config/targets.json");
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));

// for filtering proposals to only your listed DAOs/spaces
const DAO_NAMES = (cfg.daos || []).map(d => d.name);
const SNAPSHOT_IDS = (cfg.daos || [])
  .map(d => d.snapshot)
  .filter(Boolean);

function scoreRecency(ts) {
  // 0..1 exponential decay ~48h half-life
  const ageMs = Date.now() - new Date(ts).getTime();
  const halfLife = 48 * 3600 * 1000;
  return Math.exp(-Math.log(2) * (ageMs / halfLife));
}

// ---- Route ----
router.get("/feed", async (req, res) => {
  try {
    const user = (req.query.address || "").toString().toLowerCase();

    // --- Pull recent items ---
    const [proposalsQ, votesQ, stakingQ, lpQ, safesQ, socialsQ] = await Promise.all([
      pg.query(
        `select id, org, title, link, status, start_ts, end_ts, created_at
           from proposals
          where (org = any($1) or org = any($2))
          order by created_at desc
          limit 100`,
        [DAO_NAMES, SNAPSHOT_IDS]
      ),
      pg.query(
        `select proposal_id, voter, weight, direction, ts
           from votes
          where ts > now() - interval '3 days'`
      ),
      pg.query(
        `select contract, evt, user, amount, duration, ts
           from staking_events
          where ts > now() - interval '3 days'
          order by ts desc
          limit 200`
      ),
      pg.query(
        `select pair, evt, amount0, amount1, ts
           from lp_events
          where ts > now() - interval '1 day'
          order by ts desc
          limit 400`
      ),
      pg.query(
        `select safe_address, tx_hash, to_address, method, value_usd, ts
           from safe_tx
          where ts > now() - interval '3 days'
          order by ts desc
          limit 100`
      ),
      pg
        .query(
          `select project, platform, title, url, ts
             from social_posts
            where ts > now() - interval '2 days'
            order by ts desc
            limit 100`
        )
        .catch(() => ({ rows: [] }))
    ]);

    const proposals = proposalsQ.rows;
    const votes = votesQ.rows;
    const staking = stakingQ.rows;
    const lp = lpQ.rows;
    const safes = safesQ.rows;
    const socials = socialsQ.rows;

    // --- Aggregate metrics for recommendations ---

    // 1) Governance heat: recency + vote flow
    const govHeatAll = proposals
      .map(p => {
        const end = p.end_ts || p.created_at;
        const rec = scoreRecency(end || p.created_at);
        const vcount = votes.filter(v => v.proposal_id === p.id).length;
        const score = rec * 0.6 + Math.min(1, vcount / 20) * 0.4;
        return { ...p, heat: score };
      })
      .sort((a, b) => b.heat - a.heat);

    // 2) Staking activity by contract (last 72h)
    const byStakeContract = {};
    for (const s of staking) {
      const key = s.contract?.toString?.("hex") || String(s.contract);
      if (!byStakeContract[key]) {
        byStakeContract[key] = { events: 0, staked: 0n, claims: 0n, last: s.ts };
      }
      byStakeContract[key].events++;
      if (s.evt === "Staked") byStakeContract[key].staked += BigInt(s.amount || "0");
      if (s.evt === "Claimed") byStakeContract[key].claims += BigInt(s.amount || "0");
      if (new Date(s.ts) > new Date(byStakeContract[key].last)) byStakeContract[key].last = s.ts;
    }
    const stakeRanksAll = Object.entries(byStakeContract)
      .map(([k, v]) => ({
        contract: k,
        score: v.events + Number(v.staked / (10n ** 18n)) * 0.001,
        last: v.last
      }))
      .sort((a, b) => b.score - a.score);

    // 3) LP 24h volume proxy
    const lpAgg = {};
    for (const e of lp) {
      const key = e.pair?.toString?.("hex") || String(e.pair);
      const amt0 = Number(e.amount0 || 0);
      const amt1 = Number(e.amount1 || 0);
      if (!lpAgg[key]) lpAgg[key] = { volume: 0, last: e.ts };
      lpAgg[key].volume += Math.abs(amt0) + Math.abs(amt1);
      if (new Date(e.ts) > new Date(lpAgg[key].last)) lpAgg[key].last = e.ts;
    }
    const lpRanksAll = Object.entries(lpAgg)
      .map(([k, v]) => ({ pair: k, volume: v.volume, last: v.last }))
      .sort((a, b) => b.volume - a.volume);

    // 4) Agents trending by social counts
    const agentSet = new Set(cfg.aiAgents || []);
    const agentCounts = {};
    for (const s of socials) {
      if (!agentSet.has(s.project)) continue;
      agentCounts[s.project] = (agentCounts[s.project] || 0) + 1;
    }
    const agentRanks =
      Object.keys(agentCounts).length
        ? Object.entries(agentCounts)
            .map(([name, c]) => ({ name, count: c }))
            .sort((a, b) => b.count - a.count)
        : (cfg.aiAgents || []).slice(0, 3).map(n => ({ name: n, count: 0 }));

    // --- Recommendations (optionally personalized) ---
    let recs = {
      governance: govHeatAll.slice(0, 5).map(p => ({
        org: p.org,
        title: p.title,
        link: p.link,
        endsAt: p.end_ts,
        heat: Number(p.heat.toFixed(3))
      })),
      staking: stakeRanksAll.slice(0, 3),
      pools: lpRanksAll.slice(0, 3),
      agents: agentRanks.slice(0, 5)
    };

    // personalize: boost proposals user voted in
    if (user) {
      const myVotes = votes.filter(v => Buffer.isBuffer(v.voter) && ("0x" + v.voter.toString("hex")).toLowerCase() === user);
      const ids = new Set(myVotes.map(v => v.proposal_id));
      const mine = proposals.filter(p => ids.has(p.id)).slice(0, 3);
      if (mine.length) {
        recs.governance = [
          ...mine.map(p => ({ org: p.org, title: p.title, link: p.link, endsAt: p.end_ts, heat: 1 })),
          ...recs.governance.filter(x => !mine.find(m => m.title === x.title))
        ].slice(0, 5);
      }
    }

    // --- Live feed items (mixed) ---
    const items = [];

    for (const p of proposals.slice(0, 50)) {
      items.push({
        kind: "proposal",
        title: `[${p.org}] ${p.title}`,
        link: p.link,
        ts: p.created_at,
        source: "governance",
        tags: [p.status || "active"]
      });
    }

    for (const t of safes.slice(0, 30)) {
      items.push({
        kind: "treasury",
        title: `Treasury executed ${t.method || "tx"}`,
        link: t.tx_hash ? `https://etherscan.io/tx/${t.tx_hash.toString("hex")}` : null,
        ts: t.ts,
        source: "treasury",
        tags: []
      });
    }

    for (const s of staking.slice(0, 50)) {
      items.push({
        kind: "staking",
        title: `${s.evt} ${s.amount}`,
        link: null,
        ts: s.ts,
        source: "staking",
        tags: []
      });
    }

    for (const e of lp.slice(0, 50)) {
      items.push({
        kind: "pool",
        title: `LP ${e.evt}: ${e.amount0}/${e.amount1}`,
        link: null,
        ts: e.ts,
        source: "lp",
        tags: []
      });
    }

    for (const sp of socials.slice(0, 30)) {
      items.push({
        kind: "social",
        title: `[${sp.project}] ${sp.title || sp.platform}`,
        link: sp.url || null,
        ts: sp.ts,
        source: sp.platform,
        tags: []
      });
    }

    // Sort by timestamp desc and respond
    items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

    res.json({
      updatedAt: new Date().toISOString(),
      recommendations: recs,
      items: items.slice(0, 120)
    });
  } catch (err) {
    console.error("feed error", err);
    res.status(500).json({ error: "feed failed" });
  }
});

export default router;