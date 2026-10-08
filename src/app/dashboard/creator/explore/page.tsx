'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ExplorePage() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [appliedIds, setAppliedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadExplore() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch all active campaigns
      const { data: camps } = await supabase
        .from('campaigns')
        .select('*, profiles:brand_id (name)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      
      // Fetch user applications
      const { data: apps } = await supabase
        .from('applications')
        .select('campaign_id')
        .eq('influencer_id', user.id)

      if (camps) setCampaigns(camps)
      if (apps) setAppliedIds(apps.map(a => a.campaign_id))
      setLoading(false)
    }
    loadExplore()
  }, [])

  const handleApply = async (campaignId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('applications').insert({
      campaign_id: campaignId,
      influencer_id: user.id,
      status: 'pending'
    })
    
    setAppliedIds(prev => [...prev, campaignId])
  }

  if (loading) return <div className="p-8">Loading campaigns...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Find Campaigns</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map(camp => {
          const hasApplied = appliedIds.includes(camp.id)
          return (
            <div key={camp.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-full uppercase tracking-wider">
                  {camp.platform}
                </span>
                <span className="font-bold text-green-600">₹{camp.budget}</span>
              </div>
              
              <h3 className="font-bold text-lg text-gray-900 mb-1">{camp.title}</h3>
              <p className="text-sm text-gray-500 mb-4 flex-1">{camp.description}</p>
              
              <div className="flex items-center gap-2 mb-6">
                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                  {camp.profiles?.name?.[0]?.toUpperCase() || 'B'}
                </div>
                <span className="text-sm font-medium text-gray-700">{camp.profiles?.name || 'Unknown Brand'}</span>
              </div>
              
              <button
                onClick={() => handleApply(camp.id)}
                disabled={hasApplied}
                className={`w-full py-2.5 rounded-lg font-medium transition ${
                  hasApplied 
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                }`}
              >
                {hasApplied ? 'Applied' : 'Apply Now'}
              </button>
            </div>
          )
        })}
        {campaigns.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
            No active campaigns available right now. Check back later!
          </div>
        )}
      </div>
    </div>
  )
}
