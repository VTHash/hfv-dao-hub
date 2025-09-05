import { Client as Pg } from "pg";
export const pg = new Pg({ connectionString: process.env.DATABASE_URL });
await pg.connect();

export async function recentProposals(limit = 20) {
  const q = `
    select p.id, p.source, p.org, p.title, p.status, p.link, p.created_at,
           s.summary
      from proposals p
 left join lateral (
       select summary from ai_summaries a
        where a.entity_type='proposal' and a.entity_id=p.id
     order by a.created_at desc limit 1
      ) s on true
  order by p.created_at desc limit $1`;
  const { rows } = await pg.query(q, [limit]);
  return rows;
}

export async function recentTreasury(limit = 20) {
  const { rows } = await pg.query(
    "select method, tx_hash, ts from safe_tx order by ts desc limit $1", [limit]
  );
  return rows;
}

export async function recentStaking(limit = 40) {
  const { rows } = await pg.query(
    "select evt, amount, ts from staking_events order by ts desc limit $1", [limit]
  );
  return rows;
}

export async function recentLP(limit = 40) {
  const { rows } = await pg.query(
    "select evt, amount0, amount1, ts from lp_events order by ts desc limit $1", [limit]
  );
  return rows;
}

export async function trendingAgents(limit = 10) {
  const { rows } = await pg.query(
    `select project, count(*) as posts
       from social_posts
   where ts > now() - interval '48 hours'
   group by project
   order by count(*) desc
   limit $1`, [limit]
  );
  return rows;
}
