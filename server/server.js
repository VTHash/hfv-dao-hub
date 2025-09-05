import feedRouter from "./server/feed.js";
app.use("/api", feedRouter);
import { Client as Pg } from "pg";
const pg = new Pg({ connectionString: process.env.DATABASE_URL });
await pg.connect();

// AI & analytics feeds
app.get("/api/intel/proposals", async (_req,res)=>{
  const { rows } = await pg.query(
    `select p.*, s.summary
     from proposals p
     left join lateral (
       select summary from ai_summaries a where a.entity_type='proposal' and a.entity_id=p.id
       order by a.created_at desc limit 1
     ) s on true
     order by p.created_at desc limit 100`);
  res.json(rows);
});

app.get("/api/intel/treasury-moves", async (_req,res)=>{
  const { rows } = await pg.query("select * from safe_tx order by ts desc limit 50");
  res.json(rows);
});

app.get("/api/intel/lp-events", async (_req,res)=>{
  const { rows } = await pg.query("select * from lp_events order by ts desc limit 100");
  res.json(rows);
});

app.get("/api/intel/staking-events", async (_req,res)=>{
  const { rows } = await pg.query("select * from staking_events order by ts desc limit 100");
  res.json(rows);
});

app.post("/api/ask", express.json(), async (req,res)=>{
  const q = (req.body?.q || "").toString().slice(0, 2000);

  // lightweight retrieval: last proposals + safe moves
  const [props, safes] = await Promise.all([
    pg.query("select title,org,status from proposals order by created_at desc limit 20"),
    pg.query("select method,value_usd from safe_tx order by ts desc limit 20")
  ]);

  const context = `Recent proposals:\n${props.rows.map(r=>`- [${r.org}] ${r.title} (${r.status})`).join('\n')}\n\nTreasury moves:\n${safes.rows.map(r=>`- ${r.method||'tx'} $${r.value_usd||'?'}`).join('\n')}`;

  const prompt = `You are HFV Governance Assistant.\nQuestion: ${q}\n\nContext:\n${context}\nAnswer concisely with bullets if helpful.`;
  const r = await fetch(process.env.LLM_API_URL, {
    method:'POST',
    headers:{ 'content-type':'application/json', authorization:`Bearer ${process.env.LLM_API_KEY}` },
    body: JSON.stringify({ input: prompt })
  });
  const j = await r.json().catch(()=> ({}));
  res.json({ answer: j.summary || j.output || "No answer." });
});

function dailyReportTemplate({ proposals, safes, staking }) {
  return `
HFV Daily Governance & DeFi Report

Proposals (${proposals.length}):
${proposals.map(p=>`- [${p.source}] ${p.org||''}: ${p.title}`).join('\n')}

Treasury Moves (${safes.length}):
${safes.map(t=>`- ${t.method||'tx'} at ${t.ts}`).join('\n')}

Staking Activity (${staking.length}):
${staking.map(s=>`- ${s.evt} ${s.amount}`).join('\n')}
`.trim();
}

async function buildDailyReport(){
  const [p,sf,st] = await Promise.all([
    pg.query("select source,org,title from proposals where created_at > now()-interval '24 hours' order by created_at desc"),
    pg.query("select method, ts from safe_tx where ts > now()-interval '24 hours' order by ts desc"),
    pg.query("select evt, amount from staking_events where ts > now()-interval '24 hours'")
  ]);
  const raw = dailyReportTemplate({ proposals:p.rows, safes:sf.rows, staking:st.rows });
  let summary = raw;
  if (process.env.LLM_API_KEY) {
    const r = await fetch(process.env.LLM_API_URL, {
      method:'POST', headers:{ 'content-type':'application/json', authorization:`Bearer ${process.env.LLM_API_KEY}` },
      body: JSON.stringify({ input: `Summarize the following daily DAO/DeFi activity in <=12 bullets:\n\n${raw}` })
    });
    const j = await r.json().catch(()=> ({}));
    summary = j.summary || j.output || raw;
  }
  // store as alert to render in UI
  await pg.query("insert into alerts(kind,subject,severity,payload) values($1,$2,$3,$4)",
    ['daily', 'HFV daily report','info', JSON.stringify({ raw, summary })]);
}

// run every 24h (simple interval; swap to proper cron in prod)
setInterval(buildDailyReport, 24*60*60*1000);