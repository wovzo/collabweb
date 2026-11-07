'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Send, 
  X, 
  RotateCcw, 
  Sparkles, 
  FileText,
  CheckCircle,
  Eye
} from 'lucide-react'

interface Application {
  id: string
  status: 'pending' | 'accepted' | 'rejected' | 'submitted' | 'revision_requested' | 'completed'
  pitch?: string
  submission_url?: string
  submission_notes?: string
  revision_notes?: string
  submitted_at?: string
  completed_at?: string
  created_at?: string
  campaigns?: {
    id: string
    title: string
    budget: string | number
    requirements?: string
    platform?: string
    profiles?: {
      name: string
    }
  }
}

const DEFAULT_CREATOR_APPLICATIONS: Application[] = [
  {
    id: 'app-demo-1',
    status: 'submitted',
    pitch: 'Creating a 4K style Reel featuring your Diwali festive collection.',
    submission_url: 'https://instagram.com/reel/festive_collab',
    submission_notes: 'Live reel posted with 45k impressions and 1.2k saves',
    submitted_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    campaigns: {
      id: 'c-1',
      title: 'Diwali Festive Apparel Launch',
      budget: 15000,
      requirements: 'Niche: Fashion • Min 5k followers',
      platform: 'Instagram / Reel',
      profiles: { name: 'FabIndia Apparel' }
    }
  },
  {
    id: 'app-demo-2',
    status: 'pending',
    pitch: 'Reviewing the organic plant protein shake after gym workouts.',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    campaigns: {
      id: 'c-2',
      title: 'Organic Plant Protein Shake Review',
      budget: 8500,
      requirements: 'Niche: Fitness • Active audience',
      platform: 'Instagram / Reel',
      profiles: { name: 'HealthMax Nutrition' }
    }
  }
];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'action_needed' | 'completed'>('all')

  // Submission modal state
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [submissionUrl, setSubmissionUrl] = useState('')
  const [submissionNotes, setSubmissionNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    // Instant hydration from local storage
    try {
      const localApps = JSON.parse(localStorage.getItem('wovzo_submitted_applications') || '[]');
      if (Array.isArray(localApps) && localApps.length > 0) {
        setApplications(localApps);
      }
    } catch (_) {}

    loadApps()
  }, [])

  async function loadApps() {
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('timeout'), 1500));
      const userRes: any = await Promise.race([supabase.auth.getUser(), timeoutPromise]).catch(() => null);
      const user = userRes?.data?.user;
      if (!user) return;

      const { data }: any = await Promise.race([
        supabase
          .from('applications')
          .select(`
            id,
            status,
            pitch,
            submission_url,
            submission_notes,
            revision_notes,
            submitted_at,
            completed_at,
            created_at,
            campaigns (
              id,
              title,
              budget,
              requirements,
              platform,
              profiles:brand_id (name)
            )
          `)
          .eq('influencer_id', user.id)
          .order('created_at', { ascending: false }),
        timeoutPromise
      ]).catch(() => ({ data: null }));

      if (Array.isArray(data)) {
        try {
          const localApps = JSON.parse(localStorage.getItem('wovzo_submitted_applications') || '[]');
          const remoteCampIds = new Set(data.map((a: any) => a.campaign_id || a.campaigns?.id || a.id));
          const uniqueLocal = localApps.filter((a: any) => !remoteCampIds.has(a.campaign_id || a.campaigns?.id || a.id));
          setApplications([...uniqueLocal, ...data] as any[]);
        } catch (_) {
          setApplications(data as any[]);
        }
      }
    } catch (_) {}
  }

  const openSubmitModal = (app: Application) => {
    setSelectedApp(app)
    setSubmissionUrl(app.submission_url || '')
    setSubmissionNotes(app.submission_notes || '')
    setErrorMsg('')
  }

  const handleDeliverableSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedApp) return
    if (!submissionUrl.trim()) {
      setErrorMsg('Please enter your live post URL.')
      return
    }

    setSubmitting(true)
    setErrorMsg('')

    try {
      const payload: any = {
        status: 'submitted',
        submission_url: submissionUrl.trim(),
        submission_notes: submissionNotes.trim(),
        submitted_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('applications')
        .update(payload)
        .eq('id', selectedApp.id)

      if (error) {
        // If columns don't exist, try status update only
        console.warn('Columns might be missing, updating status only:', error)
        const { error: simpleErr } = await supabase
          .from('applications')
          .update({ status: 'submitted' })
          .eq('id', selectedApp.id)

        if (simpleErr) throw simpleErr
      }

      // Update local state
      setApplications(prev =>
        prev.map(app =>
          app.id === selectedApp.id
            ? {
                ...app,
                status: 'submitted',
                submission_url: submissionUrl.trim(),
                submission_notes: submissionNotes.trim(),
                submitted_at: new Date().toISOString()
              }
            : app
        )
      )

      setSelectedApp(null)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit deliverable.')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter applications
  const filteredApps = applications.filter(app => {
    if (activeTab === 'action_needed') {
      return app.status === 'accepted' || app.status === 'revision_requested'
    }
    if (activeTab === 'completed') {
      return app.status === 'completed'
    }
    return true
  })

  const actionNeededCount = applications.filter(
    a => a.status === 'accepted' || a.status === 'revision_requested'
  ).length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Applications & Deliverables</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track your campaign statuses, submit live post proofs, and view brand approvals.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-sm font-medium">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-sm font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({applications.length})
          </button>
          <button
            onClick={() => setActiveTab('action_needed')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'action_needed'
                ? 'bg-[#FF6A00] text-white shadow-sm font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Submit Proof
            {actionNeededCount > 0 && (
              <span className={`px-1.5 py-0.2 text-xs rounded-full ${activeTab === 'action_needed' ? 'bg-white text-[#FF6A00]' : 'bg-[#FF6A00] text-white'}`}>
                {actionNeededCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'completed'
                ? 'bg-white text-gray-900 shadow-sm font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredApps.map(app => {
          const brandName = (app.campaigns as any)?.profiles?.name || 'Brand'
          const budget = app.campaigns?.budget

          return (
            <div
              key={app.id}
              className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                {/* Campaign Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-orange-50 text-[#FF6A00] border border-orange-200">
                      🏢 {brandName}
                    </span>
                    <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-md border border-green-200">
                      Payout: ₹{budget}
                    </span>
                    <span className="text-xs text-gray-400">
                      Applied {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'recently'}
                    </span>
                  </div>

                  <h3 className="font-bold text-xl text-gray-900">
                    {app.campaigns?.title || 'Collaboration Campaign'}
                  </h3>

                  {/* Pitch snippet if available */}
                  {app.pitch && (
                    <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded-lg border border-gray-100 max-w-2xl">
                      💬 <span className="font-medium">My Pitch:</span> "{app.pitch}"
                    </p>
                  )}
                </div>

                {/* Status Badge & Action */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  {/* Status Badges */}
                  {app.status === 'pending' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-3.5 h-3.5" />
                      Pending Brand Review
                    </span>
                  )}

                  {app.status === 'accepted' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      <Sparkles className="w-3.5 h-3.5" />
                      Accepted • Ready to Post
                    </span>
                  )}

                  {app.status === 'submitted' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-50 text-[#FF6A00] border border-orange-200">
                      <Clock className="w-3.5 h-3.5 animate-pulse" />
                      Proof Submitted • Under Review
                    </span>
                  )}

                  {app.status === 'revision_requested' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Revision Requested
                    </span>
                  )}

                  {app.status === 'completed' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completed & Approved 🎉
                    </span>
                  )}

                  {app.status === 'rejected' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                      Not Selected
                    </span>
                  )}

                  {/* Primary CTA Buttons */}
                  {(app.status === 'accepted' || app.status === 'revision_requested') && (
                    <button
                      onClick={() => openSubmitModal(app)}
                      className="bg-[#FF6A00] hover:bg-[#E55A00] text-white px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-sm shadow-orange-500/20"
                    >
                      <Send className="w-4 h-4" />
                      {app.status === 'revision_requested' ? 'Resubmit Proof' : 'Submit Proof of Work'}
                    </button>
                  )}

                  {app.submission_url && (
                    <a
                      href={app.submission_url.startsWith('http') ? app.submission_url : `https://${app.submission_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" />
                      View Post <ExternalLink className="w-3 h-3 text-gray-400" />
                    </a>
                  )}
                </div>
              </div>

              {/* Revision Request Feedback Box */}
              {app.status === 'revision_requested' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-red-900">Brand Feedback for Revision:</p>
                    <p className="text-red-700 mt-1">
                      {app.revision_notes || 'Brand requested changes to the submitted content. Please review campaign requirements, make updates, and resubmit.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Submitted Proof Details Box */}
              {app.status === 'submitted' && app.submission_notes && (
                <div className="mt-4 p-3 bg-orange-50/50 border border-orange-100 rounded-xl text-xs text-gray-600 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#FF6A00] shrink-0" />
                  <span>
                    <strong className="text-gray-900">My Notes:</strong> {app.submission_notes}
                  </span>
                </div>
              )}
            </div>
          )
        })}

        {filteredApps.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500 space-y-3">
            <div className="w-12 h-12 bg-orange-50 text-[#FF6A00] rounded-2xl flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-800 text-lg">No applications found</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {activeTab === 'action_needed'
                ? "You don't have any deliverables waiting for submission right now."
                : activeTab === 'completed'
                ? "No completed collaborations yet. Once brand approves your submitted work, it will appear here."
                : "Explore active campaigns and apply to start collaborating with top brands!"}
            </p>
          </div>
        )}
      </div>

      {/* Deliverable Proof Submission Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-orange-50 text-[#FF6A00] border border-orange-200">
                  Deliverable Submission
                </span>
                <h3 className="text-xl font-bold text-gray-900 mt-1">
                  {selectedApp.campaigns?.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
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

            <form onSubmit={handleDeliverableSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Live Content Link / URL <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Paste the public link to your Instagram Reel, Post, YouTube Video, or Drive link.
                </p>
                <input
                  type="url"
                  required
                  placeholder="https://www.instagram.com/reel/..."
                  value={submissionUrl}
                  onChange={e => setSubmissionUrl(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Notes & Details (Optional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Add metrics, coupon code used, posting time, or any message for the brand.
                </p>
                <textarea
                  rows={3}
                  placeholder="e.g. Posted at 7 PM IST, tagged @brand_official in reel and caption. Pinned comment added."
                  value={submissionNotes}
                  onChange={e => setSubmissionNotes(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#FF6A00] hover:bg-[#E55A00] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50 shadow-md shadow-orange-500/20"
                >
                  {submitting ? 'Submitting...' : 'Submit for Brand Approval'}
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
