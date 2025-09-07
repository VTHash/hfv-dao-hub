import React from 'react';
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function LiveFeed() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    loadPosts();

    // realtime listener
    const channel = supabase
      .channel("posts-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        loadPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error loading posts:", error);
      return;
    }

    // Filter out rows with no displayable text
    const cleaned = (data || []).map((row) => {
      const looksLikeConfig = (row.content || row.context || "").includes("| model=");
      return {
        id: row.id,
        title: row.title || null,
        content: looksLikeConfig ? null : (row.content || row.context || null),
        author: row.author || "system",
        url: row.url || null,
        created_at: row.created_at,
      };
    });

    setPosts(cleaned);
  }

  return (
    <div>
      <h2>Live Posts</h2>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <strong>{post.title || "Untitled"}</strong>
            <div>{post.content || "[no content]"}</div>
            <small>
              by {post.author} • {new Date(post.created_at).toLocaleString()}
            </small>
            {post.url && (
              <div>
                <a href={post.url} target="_blank" rel="noreferrer">
                  {post.url}
                </a>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}