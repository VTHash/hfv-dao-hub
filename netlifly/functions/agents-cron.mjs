export const config = { schedule: "*/30 * * * *" }; // every 30 minutes

export async function handler() {
  try {
    const base = process.env.URL || "";
    const targets = await import("../../config/targets.json", { assert: { type: "json" } }).then(m => m.default);

    const jobs = [];

    for (const d of targets.daos) {
      jobs.push(fetch(`${base}/api/agents?type=dao&slug=${d.slug}`));
    }
    for (const a of targets.ai) {
      jobs.push(fetch(`${base}/api/agents?type=ai&slug=${a.slug}`));
    }

    await Promise.allSettled(jobs);
    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error("agents-cron error:", e);
    return { statusCode: 500, body: e.message };
  }
}