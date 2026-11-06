'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Sparkles, Send, X, Check, Building2, Tag, Calendar, AlertCircle } from 'lucide-react'

export default function ExplorePage() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [appliedIds, setAppliedIds] = useState<string[]>([])
  const [hideApplied, setHideApplied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  // Apply Modal state
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
  const [pitch, setPitch] = useState('')
  const [applying, setApplying] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const categories = ['All', 'Fashion & Lifestyle', 'Tech & Gadgets', 'Fitness & Health', 'Beauty & Cosmetics', 'Food & Dining']

  useEffect(() => {
    async function loadExplore() {
      try {
        // 1. Load locally cached applied IDs (offline/demo persistent)
        try {
          const cached = JSON.parse(localStorage.getItem('wovzo_applied_campaigns') || '[]')
          if (Array.isArray(cached) && cached.length > 0) {
            setAppliedIds(cached)
          }
        } catch (_) {}

        const { data: { user } } = await supabase.auth.getUser()

        // Fetch all active campaigns
        const { data: camps } = await supabase
          .from('campaigns')
          .select('*, profiles:brand_id (name)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
        
        if (camps) setCampaigns(camps)

        // Fetch user applications from Supabase if user exists
        if (user) {
          const { data: apps } = await supabase
            .from('applications')
            .select('campaign_id')
            .eq('influencer_id', user.id)

          if (apps && apps.length > 0) {
            const dbIds = apps.map(a => a.campaign_id)
            setAppliedIds(prev => {
              const merged = Array.from(new Set([...prev, ...dbIds]))
              try { localStorage.setItem('wovzo_applied_campaigns', JSON.stringify(merged)) } catch (_) {}
              return merged
            })
          }
        }
      } catch (err) {
        console.error('Error loading campaigns:', err)
      } finally {
        setLoading(false)
      }
    }
    loadExplore()
  }, [])

  const openApplyModal = (campaign: any) => {
    // Restrict user from submitting again if already applied
    if (appliedIds.includes(campaign.id)) {
      return
    }
    setSelectedCampaign(campaign)
    setPitch('')
    setErrorMsg('')
    setSuccessMsg('')
  }

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCampaign) return
    if (appliedIds.includes(selectedCampaign.id)) {
      setErrorMsg('You have already applied to this campaign!')
      return
    }

    if (!pitch.trim()) {
      setErrorMsg('⚠️ Proposal box cannot be empty! Please write your pitch or ideas before submitting.')
      return
    }

    setApplying(true)
    setErrorMsg('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'demo_user'

      // Try inserting with pitch first
      if (user) {
        const { error } = await supabase.from('applications').insert({
          campaign_id: selectedCampaign.id,
          influencer_id: userId,
          status: 'pending',
          pitch: pitch.trim() || null
        })

        if (error) {
          if (error.code === '23505') {
            throw new Error('You have already applied to this campaign!')
          }
          console.warn('Inserting without pitch due to schema:', error)
          const { error: simpleErr } = await supabase.from('applications').insert({
            campaign_id: selectedCampaign.id,
            influencer_id: userId,
            status: 'pending'
          })
          if (simpleErr && simpleErr.code === '23505') {
            throw new Error('You have already applied to this campaign!')
          }
        }
      }

      setAppliedIds(prev => {
        const updated = Array.from(new Set([...prev, selectedCampaign.id]))
        try { localStorage.setItem('wovzo_applied_campaigns', JSON.stringify(updated)) } catch (_) {}
        return updated
      })
      setSuccessMsg('Application submitted successfully!')
      setTimeout(() => {
        setSelectedCampaign(null)
      }, 1200)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit application.')
    } finally {
      setApplying(false)
    }
  }

  const filteredCampaigns = campaigns.filter(camp => {
    // If Hide Applied toggle is active, filter out applied ones
    if (hideApplied && appliedIds.includes(camp.id)) {
      return false
    }

    const matchesSearch = 
      (camp.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (camp.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (camp.profiles?.name || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = 
      selectedCategory === 'All' || 
      (camp.requirements || '').toLowerCase().includes(selectedCategory.toLowerCase()) ||
      (camp.title || '').toLowerCase().includes(selectedCategory.toLowerCase())

    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-[#FF6A00] border-t-transparent rounded-full animate-spin"></div>
        <p>Discovering top brand campaigns...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Explore Brand Campaigns</h1>
        <p className="text-sm text-gray-500 mt-1">
          Discover paid sponsorships, submit your collaboration pitch, and get hired.
        </p>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search campaigns, brands, keywords..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent transition"
          />
        </div>

        {/* Categories & Filter Options */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setHideApplied(!hideApplied)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
              hideApplied
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Check className={`w-3.5 h-3.5 ${hideApplied ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span>Hide Applied {appliedIds.length > 0 && `(${appliedIds.length})`}</span>
          </button>
          <div className="h-4 w-px bg-gray-200 mx-0.5 hidden sm:block"></div>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#FF6A00] text-white shadow-sm shadow-orange-500/20'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCampaigns.map(camp => {
          const hasApplied = appliedIds.includes(camp.id)
          const brandName = camp.profiles?.name || 'Brand Partner'

          return (
            <div 
              key={camp.id} 
              className={`bg-white rounded-2xl shadow-sm border p-6 flex flex-col justify-between hover:shadow-md transition duration-200 ${
                hasApplied ? 'border-emerald-200/80 bg-emerald-50/10' : 'border-gray-100 hover:border-orange-100'
              }`}
            >
              <div>
                {/* Top Badge & Budget */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-3 py-1 bg-orange-50 text-[#FF6A00] text-xs font-bold rounded-full uppercase tracking-wider border border-orange-200">
                      {camp.platform || 'Instagram / Reel'}
                    </span>
                    {hasApplied && (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1 border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Already Applied
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block font-normal">Fixed Payout</span>
                    <span className="font-extrabold text-lg text-green-600">₹{camp.budget}</span>
                  </div>
                </div>
                
                {/* Title & Description */}
                <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{camp.title}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">{camp.description}</p>
                
                {/* Requirements / Deliverables preview */}
                {camp.requirements && (
                  <div className="mb-4 p-2.5 bg-gray-50 rounded-xl text-xs text-gray-600 border border-gray-100">
                    <p className="line-clamp-2">
                      <strong className="text-gray-800">Criteria:</strong> {camp.requirements}
                    </p>
                  </div>
                )}
              </div>

              <div>
                {/* Brand Info */}
                <div className="flex items-center gap-2.5 pt-4 mb-4 border-t border-gray-100">
                  <div className="w-8 h-8 bg-orange-100 text-[#FF6A00] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    {brandName[0]?.toUpperCase() || 'B'}
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-xs font-semibold text-gray-900 block truncate">{brandName}</span>
                    <span className="text-[11px] text-gray-400 block">Verified Brand</span>
                  </div>
                </div>
                
                {/* Action Button */}
                <button
                  onClick={() => openApplyModal(camp)}
                  disabled={hasApplied}
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
                    hasApplied 
                      ? 'bg-emerald-50 text-emerald-700 cursor-not-allowed border border-emerald-200 font-bold' 
                      : 'bg-[#FF6A00] hover:bg-[#E55A00] text-white shadow-sm shadow-orange-500/25 active:scale-[0.99] cursor-pointer'
                  }`}
                >
                  {hasApplied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      Already Applied
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Apply with Pitch
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}

        {filteredCampaigns.length === 0 && (
          <div className="col-span-full p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 space-y-3">
            <p className="text-base font-semibold text-gray-800">
              {hideApplied && campaigns.length > 0
                ? "You have applied to all matching campaigns in this view!"
                : "No campaigns match your search."}
            </p>
            <p className="text-xs text-gray-400">
              {hideApplied && campaigns.length > 0
                ? "Turn off 'Hide Applied' to review your submitted campaigns."
                : "Try adjusting your filters or search keywords."}
            </p>
            {hideApplied && campaigns.length > 0 && (
              <button
                type="button"
                onClick={() => setHideApplied(false)}
                className="mt-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-[#FF6A00] font-bold text-xs rounded-xl border border-orange-200 cursor-pointer transition"
              >
                Show All Campaigns
              </button>
            )}
          </div>
        )}
      </div>

      {/* Application Pitch Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-orange-50 text-[#FF6A00] border border-orange-200">
                  Campaign Proposal
                </span>
                <h3 className="text-xl font-bold text-gray-900 mt-1">
                  Apply for {selectedCampaign.title}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Brand: <span className="font-semibold text-gray-700">{selectedCampaign.profiles?.name || 'Brand'}</span> • Payout: <span className="font-bold text-green-600">₹{selectedCampaign.budget}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-200 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                {successMsg}
              </div>
            )}

            {!successMsg && (
              <form onSubmit={handleApplySubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-semibold text-gray-800">
                      Your Pitch / Collaboration Proposal <span className="text-red-500 font-bold">*</span>
                    </label>
                    <span className="text-[11px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                      Required
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    Tell the brand why you are a great fit, your follower demographics, or how you plan to present their product.
                  </p>
                  <textarea
                    rows={4}
                    placeholder="e.g. Hi! I have 45K engaged followers in the fashion niche. I'll shoot a 4K aesthetic Reel showcasing the product with clear CTA, and deliver within 3 days."
                    value={pitch}
                    onChange={e => {
                      setPitch(e.target.value)
                      if (errorMsg) setErrorMsg('')
                    }}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none transition ${
                      errorMsg 
                        ? 'border-red-400 bg-red-50/20 ring-2 ring-red-200' 
                        : 'border-gray-300 focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent'
                    }`}
                  />
                  {errorMsg && (
                    <p className="text-xs font-semibold text-red-600 mt-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {errorMsg}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCampaign(null)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={applying}
                    className="bg-[#FF6A00] hover:bg-[#E55A00] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50 shadow-md shadow-orange-500/20 cursor-pointer"
                  >
                    {applying ? 'Submitting...' : 'Submit Proposal'}
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
