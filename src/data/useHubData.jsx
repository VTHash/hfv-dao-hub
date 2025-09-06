import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// get recent proposals + social + agents
export function useData() {
  const [loading, setLoading] = useState(true)
  const [daos, setDaos] = useState([])
  const [proposals, setProposals] = useState([])
  const [agents, setAgents] = useState([])
  const [social, setSocial] = useState([])
  useEffect(() => {
    let isMounted = true
    ;(async () => {
      setLoading(true)
      const [d1, d2, d3, d4] = await Promise.all([
        supabase.from('daos').select('*').order('name'),
        supabase.from('proposals').select('*').order('end_ts', { ascending: false }).limit(30),
        supabase.from('ai_agents').select('*').order('name'),
        supabase.from('social_posts').select('*').order('ts', { ascending: false }).limit(50)
      ])
      if (!isMounted) return
      setDaos(d1.data || [])
      setProposals(d2.data || [])
      setAgents(d3.data || [])
      setSocial(d4.data || [])
      setLoading(false)
    })()

    // live updates on social feed (optional)
    const channel = supabase
      .channel('social-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, () => {
        supabase.from('social_posts').select('*').order('ts', { ascending: false }).limit(50).then(r => {
          setSocial(r.data || [])
        })
      })
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  return { loading, daos, proposals, agents, social }
}