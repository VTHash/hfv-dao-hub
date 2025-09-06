import React from 'react'
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function LiveFeed() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
  if (!supabase) {
    console.error('Supabase client not initialized')
    return
  }

  fetchData()

  const channel = supabase
    .channel('any')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, payload => {
      console.log('Change received!', payload)
      fetchData()
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])


  async function fetchData() {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error(error)
    else setPosts(data)
  }

  return (
    <div>
      <h2>Live Posts</h2>
      <ul>
        {posts.map(post => (
          <li key={post.id}>{post.content}</li>
        ))}
      </ul>
    </div>
  )
}
