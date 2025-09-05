import 'dotenv/config';
import fs from 'fs';
import fetch from 'node-fetch';
import pRetry from 'p-retry';
import { ethers } from 'ethers';
import { Client } from 'pg';
import { getRandomValues } from 'crypto';
import { summarize } from "server/llm.ts";

type TConfig = ReturnType<typeof JSON.parse>;
const cfg: TConfig = JSON.parse(fs.readFileSync(process.cwd() + '/config/targets.json','utf8'));

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

const ws = new ethers.WebSocketProvider(cfg.rpcWebsocket);
const http = new ethers.JsonRpcProvider(cfg.rpcHttp);

// ---- ABIs (minimal) ----
const GOV_ABI = [
  "event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)",
  "event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)"
];
const STAKING_ABI = [
  "event Staked(address indexed user, uint256 amount, uint256 duration)",
  "event Unstaked(address indexed user, uint256 amount)",
  "event Claimed(address indexed user, uint256 amount)"
];
const PAIR_ABI = [
  "event Swap(address indexed sender,uint256 amount0In,uint256 amount1In,uint256 amount0Out,uint256 amount1Out,address indexed to)",
  "event Mint(address indexed sender,uint256 amount0,uint256 amount1)",
  "event Burn(address indexed sender,uint256 amount0,uint256 amount1,address indexed to)",
  "event Sync(uint112 reserve0,uint112 reserve1)"
];

// ---- helpers ----
async function aiSummarize(kind: string, title: string, body: string) {
  if (!process.env.LLM_API_URL || !process.env.LLM_API_KEY) return null;
  const prompt = `Summarize ${kind} in <=5 bullets, neutral; add 3 tags.\nTitle: ${title}\nBody:\n${body || ""}`;
  const r = await fetch(process.env.LLM_API_URL!, {
    method: 'POST',
    headers: { 'content-type':'application/json', authorization:`Bearer ${process.env.LLM_API_KEY}` },
    body: JSON.stringify({ input: prompt })
  });
  if (!r.ok) return null;
  const j = await r.json();
  return (j.summary || j.output || '').toString();
}

async function upsertProposal(p: any) {
  await db.query(
    `insert into proposals(id,source,org,title,body,status,link,start_ts,end_ts)
     values($1,$2,$3,$4,$5,$6,$7,$8,$9)
     on conflict (id) do update set title=excluded.title, body=excluded.body, status=excluded.status, link=excluded.link`,
    [p.id, p.source, p.org, p.title, p.body, p.status, p.link, p.start_ts, p.end_ts]
  );
  if (process.env.LLM_API_KEY) {
    const sum = await aiSummarize('proposal', p.title, p.body || '');
    if (sum) {
      await db.query(
        `insert into ai_summaries(entity_type,entity_id,summary,tags) values('proposal',$1,$2,$3)
         on conflict do nothing`,
        [p.id, sum, []]
      );
    }
  }
}

// ---- Snapshot poller ----
const SNAPSHOT_URL = "https://hub.snapshot.org/graphql";
async function pollSnapshot() {
  const query = `
  query Proposals($spaces:[String!]){
    proposals(first:50, where:{ space_in:$spaces, state:"active" }, orderBy:"created", orderDirection:desc){
      id title body state start end link space{ id name }
    }
  }`;
  const r = await fetch(SNAPSHOT_URL, {
    method:'POST',
    headers:{ 'content-type':'application/json' },
    body: JSON.stringify({ query, variables:{ spaces: cfg.snapshotSpaces } })
  });
  if (!r.ok) throw new Error('snapshot failed');
  const j = await r.json();
  for (const pr of j?.data?.proposals || []) {
    await upsertProposal({
      id: pr.id,
      source: 'snapshot',
      org: pr.space?.id,
      title: pr.title,
      body: pr.body?.slice(0, 16000) || '',
      status: pr.state,
      link: pr.link,
      start_ts: new Date(pr.start * 1000),
      end_ts: new Date(pr.end * 1000)
    });
  }
}

// ---- Tally poller ----
const TALLY_URL = "https://api.tally.xyz/query";
async function pollTally() {
  if (!process.env.TALLY_API_KEY) return;
  const query = `
  query Proposals($input: ProposalsInput!) {
    proposals(input:$input){ nodes{ id title body status link organization{ id name } createdAt } }
  }`;
  for (const org of cfg.tallyOrgs) {
    const variables = { input: { pagination:{limit:50}, filter:{ organizationId:{ eq: org.orgId } }, sort:{ field:"CREATED_AT", order:"DESC" } } };
    const r = await fetch(TALLY_URL, {
      method:'POST',
      headers:{ 'content-type':'application/json', 'Api-Key': process.env.TALLY_API_KEY! },
      body: JSON.stringify({ query, variables })
    });
    if (!r.ok) continue;
    const j = await r.json();
    for (const pr of j?.data?.proposals?.nodes || []) {
      await upsertProposal({
        id: pr.id,
        source: 'tally',
        org: org.name,
        title: pr.title,
        body: (pr.body||'').slice(0, 16000),
        status: pr.status,
        link: pr.link,
        start_ts: null,
        end_ts: null
      });
    }
  }
}

// ---- Safe poller ----
async function pollSafes() {
  for (const s of cfg.safes) {
    const r = await fetch(`${process.env.SAFE_TX_BASE}/api/v1/safes/${s.address}/multisig-transactions/?executed=true&ordering=-executionDate&limit=20`);
    if (!r.ok) continue;
    const j = await r.json();
    for (const tx of j?.results || []) {
      await db.query(
        `insert into safe_tx(safe_address, tx_hash, to_address, method, value_usd, ts)
         values($1,$2,$3,$4,$5,$6) on conflict do nothing`,
        [Buffer.from(s.address.slice(2),'hex'), Buffer.from(tx.transactionHash?.slice(2) || '', 'hex'),
         Buffer.from((tx.to || '').slice(2) || '', 'hex'), tx.methodName || null, null, tx.executionDate ? new Date(tx.executionDate) : new Date()]
      );
    }
  }
}

// ---- On-chain listeners ----
function listenGovernors(){
  for (const g of cfg.governors) {
    const c = new ethers.Contract(g.address, GOV_ABI, ws);
    c.on('ProposalCreated', async (id, proposer, targets, values, signatures, calldatas, startBlock, endBlock, desc) => {
      const title = (desc || '').split('\n')[0].slice(0,140);
      await upsertProposal({
        id: `onchain:${g.address}:${id.toString()}`,
        source: 'onchain',
        org: g.name,
        title,
        body: desc || '',
        status: 'active',
        link: null,
        start_ts: null,
        end_ts: null
      });
    });
    c.on('VoteCast', async (voter, proposalId, support, weight, reason, ev) => {
      await db.query(
        `insert into votes(proposal_id,voter,weight,direction,tx_hash) values($1,$2,$3,$4,$5)`,
        [`onchain:${g.address}:${proposalId.toString()}`, Buffer.from(voter.slice(2),'hex'), weight.toString(), String(support), Buffer.from(ev.log.transactionHash.slice(2),'hex')]
      );
    });
  }
}

function listenStaking(){
  for (const s of cfg.stakingContracts) {
    const c = new ethers.Contract(s.address, STAKING_ABI, ws);
    c.on('Staked', async (user, amount, duration, ev) => {
      await db.query(`insert into staking_events(contract,evt,user,amount,duration,tx_hash) values($1,'Staked',$2,$3,$4,$5)`,
        [Buffer.from(s.address.slice(2),'hex'), Buffer.from(user.slice(2),'hex'), amount.toString(), Number(duration), Buffer.from(ev.log.transactionHash.slice(2),'hex')]);
    });
    c.on('Unstaked', async (user, amount, ev) => {
      await db.query(`insert into staking_events(contract,evt,user,amount,tx_hash) values($1,'Unstaked',$2,$3,$4)`,
        [Buffer.from(s.address.slice(2),'hex'), Buffer.from(user.slice(2),'hex'), amount.toString(), Buffer.from(ev.log.transactionHash.slice(2),'hex')]);
    });
    c.on('Claimed', async (user, amount, ev) => {
      await db.query(`insert into staking_events(contract,evt,user,amount,tx_hash) values($1,'Claimed',$2,$3,$4)`,
        [Buffer.from(s.address.slice(2),'hex'), Buffer.from(user.slice(2),'hex'), amount.toString(), Buffer.from(ev.log.transactionHash.slice(2),'hex')]);
    });
  }
}

function listenPairs(){
  for (const p of cfg.lpPairs) {
    const c = new ethers.Contract(p.address, PAIR_ABI, ws);
    c.on('Swap', async (sender, a0In, a1In, a0Out, a1Out, to, ev) => {
      await db.query(`insert into lp_events(pair,evt,amount0,amount1,sender,receiver,tx_hash) values($1,'swap',$2,$3,$4,$5,$6)`,
        [Buffer.from(p.address.slice(2),'hex'), (a0In+a1In).toString(), (a0Out+a1Out).toString(),
         Buffer.from(sender.slice(2),'hex'), Buffer.from(to.slice(2),'hex'), Buffer.from(ev.log.transactionHash.slice(2),'hex')]);
    });
    c.on('Mint', async (sender, a0, a1, ev) => {
      await db.query(`insert into lp_events(pair,evt,amount0,amount1,sender,tx_hash) values($1,'mint',$2,$3,$4,$5)`,
        [Buffer.from(p.address.slice(2),'hex'), a0.toString(), a1.toString(), Buffer.from(sender.slice(2),'hex'), Buffer.from(ev.log.transactionHash.slice(2),'hex')]);
    });
    c.on('Burn', async (sender, a0, a1, to, ev) => {
      await db.query(`insert into lp_events(pair,evt,amount0,amount1,sender,receiver,tx_hash) values($1,'burn',$2,$3,$4,$5,$6)`,
        [Buffer.from(p.address.slice(2),'hex'), a0.toString(), a1.toString(), Buffer.from(sender.slice(2),'hex'), Buffer.from(to.slice(2),'hex'), Buffer.from(ev.log.transactionHash.slice(2),'hex')]);
    });
  }
}

// --- Optional: Social placeholders for AI/Agents (add real ingestors later) ---
async function seedAgentsAsSocial() {
  // This simply keeps agents visible until you wire Twitter/GitHub/RSS
  for (const name of (cfg.aiAgents||[])) {
    await db.query(
      `insert into social_posts(project, platform, title, url, ts)
       values($1,$2,$3,$4, now())
       on conflict do nothing`,
      [name, 'info', `${name} — updates`, null]
    );
  }
}

// ---- periodic pollers ----
async function tick() {
  await pRetry(pollSnapshot, { retries: 3 });
  await pRetry(pollTally, { retries: 3 });
  await pRetry(pollSafes, { retries: 3 });
  setTimeout(tick, 60_000); // every 60s
}

// boot
listenGovernors();
listenStaking();
listenPairs();
tick();

console.log("HFV Indexer running. RPC:",
cfg.rpcHttp || process.env.ALCHEMY_HTTP);