import fetch from "node-fetch";

const MODEL = process.env.LLM_MODEL || "gpt-4o-mini";

export async function summarize(kind, title, body) {
  const prompt = [
    `Summarize this ${kind} in <= 5 concise bullets, neutral tone.`,
    `Add 3 short tags at the end like: [tag1, tag2, tag3].`,
    `Title: ${title || "(no title)"}`,
    `Content:\n${(body || "").slice(0, 8000)}`
  ].join("\n\n");

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: "You are a precise governance/DeFi summarizer." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || "LLM error");
  return j.choices?.[0]?.message?.content?.trim() || "";
}