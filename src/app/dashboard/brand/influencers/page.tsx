"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function InfluencersPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchApplicants() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch applications for this brand's campaigns
      const { data } = await supabase
        .from("applications")
        .select(`
          id,
          status,
          created_at,
          profiles:influencer_id (name, id),
          campaigns:campaign_id (title, id)
        `)
        // we can't directly filter by brand_id on campaigns if we start from applications easily without inner join
        // For now, let's just fetch all applications and filter in JS since we only have a few records
        .order("created_at", { ascending: false });

      // We need to only show applications for campaigns owned by this brand
      const { data: myCampaigns } = await supabase
        .from("campaigns")
        .select("id")
        .eq("brand_id", user.id);

      if (data && myCampaigns) {
        const myCampaignIds = myCampaigns.map(c => c.id);
        const filteredApps = (data as any[]).filter(app => {
          const cId = Array.isArray(app.campaigns) ? app.campaigns[0]?.id : app.campaigns?.id;
          return myCampaignIds.includes(cId);
        });
        setApplications(filteredApps);
      }
      
      setLoading(false);
    }

    fetchApplicants();
  }, []);

  const updateStatus = async (appId: string, newStatus: string) => {
    await supabase.from("applications").update({ status: newStatus }).eq("id", appId);
    setApplications(apps => apps.map(app => app.id === appId ? { ...app, status: newStatus } : app));
  };

  if (loading) return <div className="p-8">Loading applicants...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Influencer Applications</h1>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {applications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No influencers have applied to your campaigns yet.
            </div>
          ) : (
            applications.map((app) => (
              <div key={app.id} className="p-6 hover:bg-gray-50 transition">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-xl">
                      {app.profiles?.name?.[0]?.toUpperCase() || 'I'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{app.profiles?.name || 'Unknown Influencer'}</h3>
                      <p className="text-sm text-gray-500">Applied for: <span className="font-medium text-gray-700">{app.campaigns?.title}</span></p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium mr-2 ${
                      app.status === 'accepted' ? 'bg-green-100 text-green-700' :
                      app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {app.status.toUpperCase()}
                    </span>
                    
                    {app.status === 'pending' && (
                      <>
                        <button onClick={() => updateStatus(app.id, 'accepted')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                          Accept
                        </button>
                        <button onClick={() => updateStatus(app.id, 'rejected')} className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition">
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
