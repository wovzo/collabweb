'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadApps() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          created_at,
          campaigns (
            title,
            budget,
            profiles:brand_id (name)
          )
        `)
        .eq('influencer_id', user.id)
        .order('created_at', { ascending: false })
      
      if (data) setApplications(data)
      setLoading(false)
    }
    loadApps()
  }, [])

  if (loading) return <div className="p-8">Loading applications...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
      
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {applications.map(app => (
            <div key={app.id} className="p-6 hover:bg-gray-50 transition flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{app.campaigns?.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Brand: <span className="font-medium text-gray-700">{app.campaigns?.profiles?.name || 'Unknown'}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Budget: <span className="font-medium text-green-600">₹{app.campaigns?.budget}</span>
                </p>
              </div>
              <div>
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${
                  app.status === 'accepted' ? 'bg-green-100 text-green-700' :
                  app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {app.status}
                </span>
              </div>
            </div>
          ))}
          {applications.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              You haven't applied to any campaigns yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
