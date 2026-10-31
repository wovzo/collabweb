"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCampaigns() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("campaigns")
        .select(`
          *,
          applications(count)
        `)
        .eq("brand_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setCampaigns(data);
      setLoading(false);
    }

    fetchCampaigns();
  }, []);

  if (loading) return <div className="p-8">Loading campaigns...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">All Campaigns</h1>
        <Link href="/dashboard/brand/campaigns/new" className="bg-[#FF6A00] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#E55A00] transition flex items-center gap-2 shadow-sm">
          <Plus className="w-5 h-5" />
          New Campaign
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {campaigns.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No campaigns yet. Click "New Campaign" to create one!
            </div>
          ) : (
            campaigns.map((campaign, i) => {
              const count = campaign.applications?.[0]?.count;
              const applicantsCount = typeof count === 'number' ? count : 0;
              return (
                <div key={i} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{campaign.title}</h3>
                      <p className="text-sm text-gray-500">{(campaign.platform || '').toUpperCase()} • ₹{campaign.budget}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      campaign.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                  
                  <div className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {campaign.description}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-purple-50 text-purple-700 px-3 py-1 rounded-md text-sm font-medium">
                      {applicantsCount} Applicants
                    </div>
                    {campaign.escrow_funded || campaign.escrow_status === "funded" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-md border border-green-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-green-600" /> Escrow Funded
                      </span>
                    ) : (
                      <Link 
                        href="/dashboard/brand/escrow" 
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-md border border-amber-200 transition"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Fund Escrow
                      </Link>
                    )}
                    {applicantsCount > 0 && (
                      <Link href="/dashboard/brand/influencers" className="text-[#FF6A00] text-sm font-medium hover:underline ml-2">
                        View Applicants
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
