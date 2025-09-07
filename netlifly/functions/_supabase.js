import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function insertPost(row) {
  const payload = {
    title: row.title ?? "",
    content: row.content ?? "",
    author: row.author ?? "system",
    source_type: row.source_type ?? "agent",
    source: row.source ?? "unknown",
    url: row.url ?? null,
    tags: row.tags ?? null
  };
  const { error } = await supabaseAdmin.from("posts").insert([payload]);
  if (error) throw error;
  return payload;
}