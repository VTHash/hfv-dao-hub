import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'

// Use service role key (never expose to frontend)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Example: fetch latest proposals from Snapshot
async function fetchSnapshot(space = 'makerdao.eth') {
  const query = {
    query: `{
      proposals(first: 5, where: { space_in: ["${space}"]}, orderBy: "created", orderDirection: desc) {
        id
        title
        created
      }
    }`
  }

  const res = await fetch('https://hub.snapshot.org/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query)
  })
  const json = await res.json()
  return json.data.proposals.map(p => ({
    content: p.title,
    author: space,
    source_type: 'dao',
    source_slug: space,
    created_at: new Date(p.created * 1000).toISOString()
  }))
}

// Example: fetch trending AI agents (static demo)
async function fetchAgents() {
  return [
    {
      content: 'Bittensor releases roadmap update',
      author: 'Bittensor',
      source_type: 'agent',
      source_slug: 'bittensor',
      created_at: new Date().toISOString()
    },
    {
      content: 'Fetch.ai announces new partnership',
      author: 'Fetch.ai',
      source_type: 'agent',
      source_slug: 'fetch',
      created_at: new Date().toISOString()
    }
  ]
}

async function ingest() {
  const daoPosts = await fetchSnapshot('makerdao.eth')
  const aiPosts = await fetchAgents()

  const posts = [...daoPosts, ...aiPosts]

  const { data, error } = await supabase.from('posts').insert(posts)
  if (error) {
    console.error('Insert failed:', error.message)
  } else {
    console.log(`Inserted ${data.length} posts.`)
  }
}

ingest()
